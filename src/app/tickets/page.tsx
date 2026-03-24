import Link from "next/link";
import { prisma } from "@/lib/db";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { Card, Input, Select } from "@/components/ui";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? (sp.status as TicketStatus) : "";
  const priority = typeof sp.priority === "string" ? (sp.priority as TicketPriority) : "";

  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1"));
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { id: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      include: { requester: true, assignee: true, asset: true, location: true },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">Tickets</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Capture, prioritize, assign, and track support requests linked to assets and locations.
            </p>
          </div>
          <Link
            href="/tickets/new"
            className="rounded-md bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 no-underline ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
          >
            New ticket
          </Link>
        </div>

        <Card className="mt-6" title="Filters">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" action="/tickets" method="get">
            <div className="md:col-span-2">
              <div className="mb-1 text-xs font-medium text-zinc-500">Search</div>
              <Input name="q" defaultValue={q} placeholder="title, description, id…" />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-zinc-500">Status</div>
              <Select name="status" defaultValue={status}>
                <option value="">All</option>
                {Object.values(TicketStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-zinc-500">Priority</div>
              <Select name="priority" defaultValue={priority}>
                <option value="">All</option>
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button className="rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-500/30">
                Apply
              </button>
              <Link
                href="/tickets"
                className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 no-underline hover:text-zinc-200"
              >
                Reset
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/30">
          <div className="border-b border-zinc-800/80 px-4 py-3 text-xs text-zinc-500">
            Showing <span className="text-zinc-300">{items.length}</span> of{" "}
            <span className="text-zinc-300">{total}</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead className="bg-zinc-900/40 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Ticket</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Priority</th>
                  <th className="px-4 py-2 text-left font-medium">Requester</th>
                  <th className="px-4 py-2 text-left font-medium">Assignee</th>
                  <th className="px-4 py-2 text-left font-medium">Linked</th>
                  <th className="px-4 py-2 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${t.id}`} className="no-underline">
                        <div className="font-medium text-zinc-100 hover:text-emerald-200">{t.title}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">{t.id}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-200">{t.status}</td>
                    <td className="px-4 py-3 text-zinc-200">{t.priority}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.requester.email}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.assignee?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500">
                      {t.asset ? `Asset: ${t.asset.assetTag}` : t.location ? `Loc: ${t.location.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-zinc-500">
                      {t.updatedAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No tickets found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-400">
            {page > 1 ? (
              <Link
                href={`/tickets?q=${encodeURIComponent(q)}&status=${status}&priority=${priority}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : (
              <span className="text-zinc-600">Previous</span>
            )}
            <span>
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/tickets?q=${encodeURIComponent(q)}&status=${status}&priority=${priority}&page=${page + 1}`}
              >
                Next
              </Link>
            ) : (
              <span className="text-zinc-600">Next</span>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

