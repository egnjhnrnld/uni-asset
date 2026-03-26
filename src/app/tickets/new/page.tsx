import Link from "next/link";
import { prisma } from "@/lib/db";
import { TicketCreateForm } from "@/components/TicketCreateForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const assetId = typeof sp.assetId === "string" ? sp.assetId : undefined;

  const assets = await prisma.asset.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">New ticket</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create a ticket linked to an asset or location.
            </p>
          </div>
          <Link href="/tickets" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back
          </Link>
        </div>

        <div className="mt-6">
          <TicketCreateForm assets={assets} initialAssetId={assetId} />
        </div>
      </div>
    </main>
  );
}

