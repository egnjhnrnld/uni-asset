import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { TicketEventType, TicketPriority, TicketStatus } from "@prisma/client";

const PatchSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assigneeUserId: z.string().optional().nullable(),
  note: z.string().max(5000).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  requirePermission(session.user, "units.read");

  const { id } = await ctx.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      asset: { include: { location: true, department: true, status: true } },
      location: true,
      department: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session.user, "work_orders.write");

    const { id } = await ctx.params;
    const body = PatchSchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.ticket.findUnique({ where: { id } });
      if (!existing) throw new Error("Not found");

      const next = await tx.ticket.update({
        where: { id },
        data: {
          status: body.status,
          priority: body.priority,
          assigneeUserId: body.assigneeUserId === null ? null : body.assigneeUserId,
          resolvedAt:
            body.status === TicketStatus.RESOLVED ? new Date() : undefined,
          closedAt: body.status === TicketStatus.CLOSED ? new Date() : undefined,
        },
      });

      if (body.status && body.status !== existing.status) {
        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            type: TicketEventType.STATUS_CHANGED,
            actorUserId: session.user!.id,
            fromStatus: existing.status,
            toStatus: body.status,
            note: body.note,
          },
        });
      }
      if (body.priority && body.priority !== existing.priority) {
        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            type: TicketEventType.PRIORITY_CHANGED,
            actorUserId: session.user!.id,
            fromPriority: existing.priority,
            toPriority: body.priority,
            note: body.note,
          },
        });
      }
      if (body.assigneeUserId !== undefined && body.assigneeUserId !== existing.assigneeUserId) {
        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            type: body.assigneeUserId ? TicketEventType.ASSIGNED : TicketEventType.UNASSIGNED,
            actorUserId: session.user!.id,
            fromAssigneeUserId: existing.assigneeUserId ?? undefined,
            toAssigneeUserId: body.assigneeUserId ?? undefined,
            note: body.note,
          },
        });
      }

      if (body.note && (!body.status && !body.priority && body.assigneeUserId === undefined)) {
        await tx.ticketEvent.create({
          data: {
            ticketId: id,
            type: TicketEventType.NOTE,
            actorUserId: session.user!.id,
            note: body.note,
          },
        });
      }

      return next;
    });

    return NextResponse.json({ ok: true, ticket: updated });
  } catch (e: any) {
    const message = e?.message ?? "Update failed";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

