import Link from "next/link";
import { Card, Input, Select } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { AssetStatus, AssetCategory, LocationKind } from "@prisma/client";
import {
  assetListSearchFromNextSearchParams,
  buildAssetWhere,
} from "@/lib/assetSearchParams";
import { CategoryBadge, LocationKindBadge, StatusBadge } from "@/components/Badges";
import { assetCategoryLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

function buildQuery(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const next = { ...base, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession({ allowAnonymous: true });
  const raw = await searchParams;
  const sp = assetListSearchFromNextSearchParams(raw);
  const where = buildAssetWhere(sp);
  const page = sp.page ?? 1;
  const pageSize = sp.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const [locations, departments, items, total] = await prisma.$transaction([
    prisma.location.findMany({ orderBy: [{ labNumber: "asc" }, { name: "asc" }] }),
    prisma.department.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.asset.findMany({
      where,
      include: { department: true, location: true, status: true, assignedTo: true },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const qBase: Record<string, string | undefined> = {
    q: sp.q,
    status: sp.status,
    category: sp.category,
    departmentId: sp.departmentId,
    locationId: sp.locationId,
    locationKind: sp.locationKind,
    labNumber: sp.labNumber,
    pageSize: String(pageSize),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Assets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Labs (16 rooms × 40–50 seats), offices, and network closets — desktops, printers, UPS/AVR, and
            network equipment in one inventory.
          </p>
        </div>
        <div className="text-xs text-zinc-500">
          {session.user ? (
            <span>
              Signed in as <span className="text-zinc-300">{session.user.email}</span>
            </span>
          ) : (
            <span>Use dev auth or Firebase for API actions.</span>
          )}
        </div>
      </div>

      <Card className="mt-8" title="Filters">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" action="/units" method="get">
          <div className="lg:col-span-2">
            <div className="mb-1 text-xs font-medium text-zinc-400">Search</div>
            <Input name="q" defaultValue={sp.q ?? ""} placeholder="Tag, name, serial, IP, hostname…" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Category</div>
            <Select name="category" defaultValue={sp.category ?? ""}>
              <option value="">All categories</option>
              {Object.values(AssetCategory).map((c) => (
                <option key={c} value={c}>
                  {assetCategoryLabel[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Status</div>
            <Select name="status" defaultValue={sp.status ?? ""}>
              <option value="">All</option>
              {Object.values(AssetStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Location type</div>
            <Select name="locationKind" defaultValue={sp.locationKind ?? ""}>
              <option value="">Any</option>
              {Object.values(LocationKind).map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Lab # (1–16)</div>
            <Select name="labNumber" defaultValue={sp.labNumber ?? ""}>
              <option value="">Any lab</option>
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  Lab {n}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Department</div>
            <Select name="departmentId" defaultValue={sp.departmentId ?? ""}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-400">Room / location</div>
            <Select name="locationId" defaultValue={sp.locationId ?? ""}>
              <option value="">All</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {loc.labNumber != null ? ` (Lab ${loc.labNumber})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Apply filters
            </button>
            <Link
              href="/units"
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Reset
            </Link>
          </div>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} assets
        </p>
      </Card>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
          <div className="text-xs text-zinc-500">
            Showing{" "}
            <span className="text-zinc-300">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="text-zinc-300">{total}</span> assets
          </div>
          <div className="text-[11px] text-zinc-600">
            Tip: use the top search bar to jump to asset tag / serial / hostname
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead className="bg-zinc-900/40 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Location</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Assigned</th>
                <th className="px-4 py-2 text-left font-medium">Updated</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const name = a.displayName ?? a.assetTag;
                const line2 = [a.terminalNumber, a.ipAddress, a.serialNumber]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={a.id}
                    className="border-t border-zinc-800/60 hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/units/${a.id}`} className="no-underline">
                        <div className="font-medium text-zinc-100 hover:text-emerald-200">
                          {name}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">{line2 || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={a.category} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-100">
                        {a.location.name}
                        {a.location.labNumber != null ? (
                          <span className="ml-2 text-[11px] text-zinc-500">
                            Lab {a.location.labNumber}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {a.department.name} ·{" "}
                        <LocationKindBadge kind={a.location.kind} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status?.status ?? "DEPLOYABLE"} />
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      {a.assignedTo ? a.assignedTo.email : <span className="text-zinc-500">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500">
                      {a.updatedAt ? a.updatedAt.toISOString().replace("T", " ").slice(0, 19) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/units/${a.id}`} className="text-xs text-emerald-200 hover:text-emerald-300 no-underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No assets match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              href={`/units${buildQuery(qBase, { page: String(page - 1) })}`}
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-600">Previous</span>
          )}
          <span className="px-2 text-sm text-zinc-500">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              href={`/units${buildQuery(qBase, { page: String(page + 1) })}`}
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-600">Next</span>
          )}
        </div>
      ) : null}
    </main>
  );
}
