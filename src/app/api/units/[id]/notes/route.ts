import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireAnyPermission } from "@/lib/rbac";
import { AuditNoteSchema } from "@/lib/validators";
import { AuditActionType } from "@prisma/client";
import { requestMeta } from "@/lib/http";

/** Append-only audit note (visible on audit timeline). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requireAnyPermission(session.user, "units.write", "work_orders.write");

    const { id } = await ctx.params;
    const body = AuditNoteSchema.parse(await req.json());
    const meta = await requestMeta();

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await prisma.auditEvent.create({
      data: {
        actionType: AuditActionType.NOTE,
        actorUserId: session.user!.id,
        itemId: id,
        note: body.note,
        ip: meta.ip,
        userAgent: meta.userAgent,
        source: meta.source,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const message = e?.message ?? "Failed to add note";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
