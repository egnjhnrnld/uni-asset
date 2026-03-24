import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { TicketEventType } from "@prisma/client";

const CreateSchema = z.object({
  body: z.string().min(1).max(20000),
  isInternal: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session.user, "work_orders.write");

    const { id: ticketId } = await ctx.params;
    const body = CreateSchema.parse(await req.json());

    const comment = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new Error("Not found");

      const created = await tx.ticketComment.create({
        data: {
          ticketId,
          authorUserId: session.user!.id,
          body: body.body,
          isInternal: body.isInternal ?? false,
        },
        include: { author: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          type: TicketEventType.COMMENT,
          actorUserId: session.user!.id,
          note: body.isInternal ? "Internal comment added" : "Comment added",
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, comment });
  } catch (e: any) {
    const message = e?.message ?? "Failed to add comment";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

