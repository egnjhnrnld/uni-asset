import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UnitQrRedirectPage({
  params,
}: {
  params: Promise<{ assetTag: string }>;
}) {
  const { assetTag } = await params;
  const asset = await prisma.asset.findUnique({ where: { assetTag } });
  if (!asset) return notFound();
  // Stable QR landing: /u/{assetTag} -> canonical /units/{id}
  redirect(`/units/${asset.id}`);
}

