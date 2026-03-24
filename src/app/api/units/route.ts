import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { assetListSearchFromUrl, buildAssetWhere } from "@/lib/assetSearchParams";

export async function GET(req: Request) {
  const session = await getSession();
  requirePermission(session.user, "units.read");

  const url = new URL(req.url);
  const sp = assetListSearchFromUrl(url);
  const page = sp.page ?? 1;
  const pageSize = sp.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where = buildAssetWhere(sp);

  const [items, total] = await prisma.$transaction([
    prisma.asset.findMany({
      where,
      include: {
        department: true,
        location: true,
        status: true,
        assignedTo: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items,
  });
}
