import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LocationKind } from "@prisma/client";
import { assetCategoryLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession({ allowAnonymous: true });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [total, byCategory, labRooms, maintenanceSoon] = await prisma.$transaction([
    prisma.asset.count(),
    prisma.asset.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { category: "asc" },
    }),
    prisma.location.count({
      where: { kind: LocationKind.LAB, labNumber: { not: null } },
    }),
    prisma.asset.count({
      where: {
        nextServiceDueAt: { not: null, lte: in30, gte: now },
      },
    }),
  ]);

  const topCategories = [...byCategory]
    .sort((a, b) => ((b as any)._count?.id ?? 0) - ((a as any)._count?.id ?? 0))
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500/90">Inventory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Uni Asset App</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Track lab workstations, office PCs, printers, UPS/AVR, and network gear — with checkout for
            assignable machines, audit history, work logs, and maintenance dates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 no-underline hover:bg-white"
            href="/units"
          >
            Browse assets
          </Link>
          <Link
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 no-underline hover:border-zinc-500"
            href="/labs"
          >
            Lab rooms
          </Link>
          <Link
            className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 no-underline hover:border-zinc-600 hover:text-zinc-200"
            href="/login"
          >
            {session.user ? "Account" : "Login"}
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-950 p-5">
          <div className="text-xs font-medium text-zinc-500">Total assets</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-50">{total}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-950 p-5">
          <div className="text-xs font-medium text-zinc-500">Lab rooms (catalog)</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-50">{labRooms}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-emerald-950/40 to-zinc-950 p-5 ring-1 ring-emerald-500/20">
          <div className="text-xs font-medium text-emerald-400/90">Service due (30 days)</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-50">{maintenanceSoon}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-950 p-5">
          <div className="text-xs font-medium text-zinc-500">Categories tracked</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-50">{byCategory.length}</div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">By category</h2>
          <ul className="mt-4 space-y-3">
            {topCategories.map((row) => (
              <li key={row.category} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{assetCategoryLabel[row.category]}</span>
                <span className="font-mono text-zinc-200">{((row as any)._count?.id ?? 0) as number}</span>
              </li>
            ))}
          </ul>
          <Link href="/units" className="mt-4 inline-block text-xs text-emerald-400 hover:underline">
            Open asset list →
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Quick paths</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            <li>
              <Link className="text-zinc-200 underline-offset-2 hover:underline" href="/units?locationKind=OFFICE">
                Office hardware
              </Link>
            </li>
            <li>
              <Link
                className="text-zinc-200 underline-offset-2 hover:underline"
                href="/units?locationKind=NETWORK_CLOSET"
              >
                Network & MDF
              </Link>
            </li>
            <li>
              <Link className="text-zinc-200 underline-offset-2 hover:underline" href="/units?category=PRINTER">
                Printers
              </Link>
            </li>
            <li>
              <Link className="text-zinc-200 underline-offset-2 hover:underline" href="/units?category=UPS">
                UPS / power
              </Link>
            </li>
            <li>
              <Link className="text-zinc-200 underline-offset-2 hover:underline" href="/labs">
                All lab rooms
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-sm font-semibold text-zinc-200">Dev auth</h2>
        <p className="mt-2 text-sm text-zinc-400">
          With <code className="text-zinc-100">DEV_BYPASS_AUTH=true</code>, send{" "}
          <code className="text-zinc-100">x-dev-user-email</code> on API requests, or use the fields on asset
          pages.
        </p>
      </div>
    </main>
  );
}
