import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireAnyPermission, requirePermission } from "@/lib/rbac";
import { PatchAssetSchema } from "@/lib/validators";
import { AuditActionType, type Prisma } from "@prisma/client";
import { requestMeta } from "@/lib/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  requirePermission(session.user, "units.read");

  const { id } = await ctx.params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      department: true,
      location: true,
      status: true,
      assignedTo: true,
      auditEvents: {
        orderBy: { createdAt: "desc" },
        include: { actor: true },
        take: 100,
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        include: { requestedBy: true, assignedTo: true },
        take: 50,
      },
      workLogEntries: {
        orderBy: { createdAt: "desc" },
        include: { performedBy: true, workOrder: true },
        take: 200,
      },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requireAnyPermission(session.user, "units.write", "work_orders.write");

    const { id } = await ctx.params;
    const body = PatchAssetSchema.parse(await req.json());
    const meta = await requestMeta();

    const data: Prisma.AssetUpdateInput = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
    if (body.purchaseDate !== undefined)
      data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.warrantyExpiresAt !== undefined)
      data.warrantyExpiresAt = body.warrantyExpiresAt ? new Date(body.warrantyExpiresAt) : null;
    if (body.lastServiceAt !== undefined)
      data.lastServiceAt = body.lastServiceAt ? new Date(body.lastServiceAt) : null;
    if (body.nextServiceDueAt !== undefined)
      data.nextServiceDueAt = body.nextServiceDueAt ? new Date(body.nextServiceDueAt) : null;

    const asset = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({ where: { id }, data });
      await tx.auditEvent.create({
        data: {
          actionType: AuditActionType.UPDATE,
          actorUserId: session.user!.id,
          itemId: updated.id,
          note: "Asset record updated (maintenance / metadata)",
          ip: meta.ip,
          userAgent: meta.userAgent,
          source: meta.source,
        },
      });
      return updated;
    });

    return NextResponse.json({ ok: true, asset });
  } catch (e: any) {
    const message = e?.message ?? "Update failed";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

