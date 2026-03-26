import Link from "next/link";
import { prisma } from "@/lib/db";
import { LocationKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const labs = await prisma.location.findMany({
    where: { kind: LocationKind.LAB, labNumber: { not: null } },
    orderBy: { labNumber: "asc" },
    include: {
      _count: { select: { assets: true } },
    },
  });

  const totalLabAssets = labs.reduce((s, l) => s + l._count.assets, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Lab rooms</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Sixteen teaching labs with roughly 40–50 seats each. Use filters on{" "}
        <Link href="/units" className="text-emerald-400 underline-offset-2 hover:underline">
          Assets
        </Link>{" "}
        to drill into a single room.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium text-zinc-500">Lab locations</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">{labs.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium text-zinc-500">Assets in labs (seed)</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">{totalLabAssets}</div>
        </div>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {labs.map((lab) => (
          <Link
            key={lab.id}
            href={`/units?labNumber=${lab.labNumber}&locationKind=LAB`}
            className="group block rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/40 to-zinc-950 p-4 no-underline transition-colors hover:border-emerald-500/40"
          >
            <div className="text-xs font-medium text-zinc-500">Lab {lab.labNumber}</div>
            <div className="mt-1 font-semibold text-zinc-100 group-hover:text-white">{lab.name}</div>
            <div className="mt-2 text-xs text-zinc-500">
              {lab.building} · Room {lab.room}
            </div>
            <div className="mt-3 text-sm text-emerald-400/90">
              {lab._count.assets} assets <span className="text-zinc-600">→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
