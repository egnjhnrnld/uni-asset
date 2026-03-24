import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { CheckinSchema } from "@/lib/validators";
import { requestMeta } from "@/lib/http";
import { AssetStatus, AuditActionType, TargetType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session.user, "checkin.perform");

    const { id } = await ctx.params;
    const body = CheckinSchema.parse(await req.json());
    const meta = await requestMeta();

    const result = await prisma.$transaction(async (tx) => {
      const deployableLabel = await tx.statusLabel.findFirst({
        where: { status: AssetStatus.DEPLOYABLE },
        orderBy: { createdAt: "asc" },
      });
      if (!deployableLabel) throw new Error("Missing StatusLabel for DEPLOYABLE");

      const asset = await tx.asset.findUnique({
        where: { id },
      });
      if (!asset) throw new Error("Not found");
      if (!asset.assignedToId && !asset.assignedType) throw new Error("Asset is not checked out");

      const checkinAt = body.checkinAt ? new Date(body.checkinAt) : new Date();

      const updated = await tx.asset.update({
        where: { id },
        data: {
          assignedToId: null,
          assignedType: null,
          expectedCheckin: null,
          lastCheckin: checkinAt,
          statusId: deployableLabel.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          actionType: AuditActionType.CHECKIN,
          actorUserId: session.user!.id,
          itemId: updated.id,
          targetType: asset.assignedToId ? TargetType.USER : undefined,
          targetId: asset.assignedToId ?? undefined,
          note: body.note,
          ip: meta.ip,
          userAgent: meta.userAgent,
          source: meta.source,
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, asset: result });
  } catch (e: any) {
    const message = e?.message ?? "Checkin failed";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

