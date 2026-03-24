import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { CreateWorkOrderSchema } from "@/lib/validators";
import { requestMeta } from "@/lib/http";
import { WorkOrderStatus, WorkOrderType, WorkLogActionType, Role } from "@prisma/client";
import { devBypassAuthEnabled } from "@/lib/env";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  requirePermission(session.user, "work_orders.write");

  const { id: assetId } = await ctx.params;
  const body = CreateWorkOrderSchema.parse(await req.json());
  const meta = await requestMeta();

  const wo = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Not found");

    let assignedToUserId: string | undefined = body.assignedToUserId;
    if (!assignedToUserId && body.assignedToEmail) {
      if (!devBypassAuthEnabled) {
        throw new Error("assignedToEmail is only supported in dev bypass mode");
      }
      const tech = await tx.user.upsert({
        where: { email: body.assignedToEmail },
        update: {},
        create: {
          email: body.assignedToEmail,
          displayName: body.assignedToEmail.split("@")[0] ?? null,
          role: Role.TECHNICIAN,
        },
      });
      assignedToUserId = tech.id;
    }

    const created = await tx.workOrder.create({
      data: {
        assetId,
        title: body.title,
        description: body.description,
        type: body.type as WorkOrderType,
        status: WorkOrderStatus.OPEN,
        requestedByUserId: session.user!.id,
        assignedToUserId,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      },
    });

    await tx.workLogEntry.create({
      data: {
        assetId,
        workOrderId: created.id,
        actionType: WorkLogActionType.NOTE,
        performedByUserId: session.user!.id,
        notes: `Work order created: ${created.title}`,
        ip: meta.ip,
        userAgent: meta.userAgent,
        source: meta.source,
      },
    });

    return created;
  });

  return NextResponse.json({ ok: true, workOrder: wo });
}

