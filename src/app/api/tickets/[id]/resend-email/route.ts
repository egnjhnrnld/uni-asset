import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { sendTicketCreatedEmail } from "@/lib/mailer";
import { TicketEventType } from "@prisma/client";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    requirePermission(session.user, "work_orders.write");

    const { id } = await ctx.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: true,
        assignee: true,
        asset: true,
        location: true,
      },
    });

    if (!ticket) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (!ticket.assignee) {
      return NextResponse.json(
        { ok: false, error: "Ticket has no assignee email to resend to." },
        { status: 400 }
      );
    }

    let emailSent = true;
    let emailError: string | null = null;

    try {
      await sendTicketCreatedEmail({
        ticketId: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        source: ticket.source,
        dueAt: ticket.dueAt?.toISOString() ?? null,
        requesterEmail: ticket.requester.email,
        assigneeEmail: ticket.assignee.email,
        assetTag: ticket.asset?.assetTag ?? null,
        locationName: ticket.location?.name ?? null,
      });
    } catch (e: any) {
      emailSent = false;
      emailError = e?.message ?? "unknown error";
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          type: TicketEventType.NOTE,
          actorUserId: session.user!.id,
          note: `Resend email failed: ${emailError}`,
        },
      });
    }

    if (emailSent) {
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          type: TicketEventType.NOTE,
          actorUserId: session.user!.id,
          note: "Ticket email resent to assignee",
        },
      });
    }

    return NextResponse.json({ ok: true, emailSent, emailError });
  } catch (e: any) {
    const message = e?.message ?? "Failed to resend email";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

