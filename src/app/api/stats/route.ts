import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  requirePermission(session.user, "units.read");

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [total, byCategory, labLocationCount, maintenanceSoon, byLocationKindRows] =
    await prisma.$transaction([
      prisma.asset.count(),
      prisma.asset.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      prisma.location.count({
        where: { kind: "LAB", labNumber: { not: null } },
      }),
      prisma.asset.count({
        where: {
          nextServiceDueAt: { not: null, lte: in30, gte: now },
        },
      }),
      prisma.$queryRaw<Array<{ kind: string; c: bigint }>>(
        Prisma.sql`
          SELECT l.kind::text AS kind, COUNT(a.id)::bigint AS c
          FROM "Asset" a
          INNER JOIN "Location" l ON l.id = a."locationId"
          GROUP BY l.kind
        `
      ),
    ]);

  const categoryCounts = Object.fromEntries(
    byCategory.map((r) => [r.category, r._count.id])
  ) as Record<string, number>;

  const locationKindCounts = Object.fromEntries(
    byLocationKindRows.map((r) => [r.kind, Number(r.c)])
  ) as Record<string, number>;

  return NextResponse.json({
    total,
    categoryCounts,
    locationKindCounts,
    labLocationCount,
    maintenanceDueWithin30Days: maintenanceSoon,
  });
}
