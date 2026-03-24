import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Input, Select } from "@/components/ui";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { TicketCommentForm } from "@/components/TicketCommentForm";
import { ResendTicketEmailButton } from "@/components/ResendTicketEmailButton";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      asset: true,
      location: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) {
    return (
      <main className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold text-zinc-50">Ticket not found</h1>
          <div className="mt-4">
            <Link href="/tickets">← Back</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-zinc-500">{ticket.id}</div>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{ticket.title}</h1>
            <div className="mt-2 text-sm text-zinc-400">
              Requester: <span className="text-zinc-200">{ticket.requester.email}</span>
              {ticket.assignee ? (
                <>
                  {" "}
                  · Assignee: <span className="text-zinc-200">{ticket.assignee.email}</span>
                </>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Linked:{" "}
              {ticket.asset ? (
                <Link href={`/units/${ticket.asset.id}`} className="text-emerald-200">
                  Asset {ticket.asset.assetTag}
                </Link>
              ) : ticket.location ? (
                <span>{ticket.location.name}</span>
              ) : (
                "—"
              )}
            </div>
          </div>
          <Link href="/tickets" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to tickets
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card title="Status & priority" className="lg:col-span-1">
            <div className="text-sm text-zinc-300">
              <div>Status: {ticket.status}</div>
              <div className="mt-1">Priority: {ticket.priority}</div>
              <div className="mt-3 text-[11px] text-zinc-500">Updates via API (PATCH /api/tickets/:id)</div>
            </div>

            <div className="mt-4">
              <ResendTicketEmailButton ticketId={ticket.id} />
            </div>
          </Card>

          <Card title="Description" className="lg:col-span-2">
            <div className="whitespace-pre-wrap text-sm text-zinc-300">
              {ticket.description ?? "—"}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Timeline (events)" className="">
            <div className="space-y-2">
              {ticket.events.map((e) => (
                <div key={e.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="text-zinc-200">
                      <span className="font-semibold">{e.type}</span>
                      {e.actor ? <span className="text-zinc-500"> · {e.actor.email}</span> : null}
                    </div>
                    <div className="text-zinc-500">{e.createdAt.toISOString()}</div>
                  </div>
                  {e.note ? <div className="mt-2 text-xs text-zinc-300">{e.note}</div> : null}
                </div>
              ))}
              {ticket.events.length === 0 ? <div className="text-sm text-zinc-500">No events yet.</div> : null}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Comments">
              <div className="space-y-3">
                {ticket.comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="text-zinc-200">
                        {c.author.email}
                        {c.isInternal ? <span className="ml-2 text-red-200">internal</span> : null}
                      </div>
                      <div className="text-zinc-500">{c.createdAt.toISOString()}</div>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{c.body}</div>
                  </div>
                ))}
                {ticket.comments.length === 0 ? <div className="text-sm text-zinc-500">No comments yet.</div> : null}
              </div>
            </Card>

            <TicketCommentForm ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </main>
  );
}

