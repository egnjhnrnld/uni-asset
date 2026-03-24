import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { AddWorkLogSchema } from "@/lib/validators";
import { requestMeta } from "@/lib/http";
import { WorkLogActionType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  requirePermission(session.user, "work_orders.write");

  const { id: assetId } = await ctx.params;
  const body = AddWorkLogSchema.parse(await req.json());
  const meta = await requestMeta();

  const entry = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Not found");

    if (body.workOrderId) {
      const wo = await tx.workOrder.findUnique({ where: { id: body.workOrderId } });
      if (!wo || wo.assetId !== assetId) throw new Error("Invalid workOrderId");
    }

    return tx.workLogEntry.create({
      data: {
        assetId,
        workOrderId: body.workOrderId,
        actionType: body.actionType as WorkLogActionType,
        performedByUserId: session.user!.id,
        notes: body.notes,
        pulledOutAt: body.pulledOutAt ? new Date(body.pulledOutAt) : undefined,
        deployedAt: body.deployedAt ? new Date(body.deployedAt) : undefined,
        ip: meta.ip,
        userAgent: meta.userAgent,
        source: meta.source,
      },
    });
  });

  return NextResponse.json({ ok: true, workLogEntry: entry });
}

