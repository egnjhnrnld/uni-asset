import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { CheckoutSchema } from "@/lib/validators";
import { requestMeta } from "@/lib/http";
import { AssetStatus, AuditActionType, AssignedType, TargetType } from "@prisma/client";
import { isCheckoutableCategory } from "@/lib/asset";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session.user, "checkout.perform");

    const { id } = await ctx.params;
    const body = CheckoutSchema.parse(await req.json());
    const meta = await requestMeta();

    const result = await prisma.$transaction(async (tx) => {
      const checkedOutLabel = await tx.statusLabel.findFirst({
        where: { status: AssetStatus.CHECKED_OUT },
        orderBy: { createdAt: "asc" },
      });
      if (!checkedOutLabel) throw new Error("Missing StatusLabel for CHECKED_OUT");

      const asset = await tx.asset.findUnique({
        where: { id },
        include: { status: true },
      });
      if (!asset) throw new Error("Not found");
      if (!isCheckoutableCategory(asset.category)) {
        throw new Error("This asset category does not support checkout");
      }

      const currentStatus = asset.status?.status ?? AssetStatus.DEPLOYABLE;
      const available = !asset.assignedToId && currentStatus === AssetStatus.DEPLOYABLE;
      if (!available) throw new Error("Asset not available for checkout");

      const expectedCheckin = body.expectedCheckin ? new Date(body.expectedCheckin) : null;
      const assignedType = body.assignedType === "USER" ? AssignedType.USER : AssignedType.LOCATION;

      const updated = await tx.asset.update({
        where: { id },
        data: {
          assignedType,
          assignedToId: body.assignedType === "USER" ? body.assignedToId : null,
          lastCheckout: new Date(),
          expectedCheckin: expectedCheckin ?? undefined,
          statusId: checkedOutLabel.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          actionType: AuditActionType.CHECKOUT,
          actorUserId: session.user!.id,
          itemId: updated.id,
          targetType: body.assignedType === "USER" ? TargetType.USER : TargetType.LOCATION,
          targetId: body.assignedToId,
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
    const message = e?.message ?? "Checkout failed";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

