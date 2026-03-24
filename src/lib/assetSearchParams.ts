import type { AssetStatus, AssetCategory, LocationKind, Prisma } from "@prisma/client";

export type AssetListSearch = {
  q?: string;
  status?: AssetStatus | "";
  category?: AssetCategory | "";
  departmentId?: string;
  locationId?: string;
  assignedToId?: string;
  locationKind?: LocationKind | "";
  labNumber?: string;
  page?: number;
  pageSize?: number;
};

export function buildAssetWhere(sp: AssetListSearch): Prisma.AssetWhereInput {
  const q = sp.q?.trim();
  const labNum = sp.labNumber ? Number(sp.labNumber) : NaN;

  const locationWhere: Prisma.LocationWhereInput = {};
  if (sp.locationKind) locationWhere.kind = sp.locationKind as LocationKind;
  if (!Number.isNaN(labNum) && labNum > 0) {
    locationWhere.labNumber = labNum;
    locationWhere.kind = "LAB";
  }

  return {
    ...(sp.departmentId ? { departmentId: sp.departmentId } : {}),
    ...(sp.assignedToId ? { assignedToId: sp.assignedToId } : {}),
    ...(sp.category ? { category: sp.category as AssetCategory } : {}),
    ...(sp.status ? { status: { status: sp.status as AssetStatus } } : {}),
    ...(sp.locationId ? { locationId: sp.locationId } : {}),
    ...(!sp.locationId && Object.keys(locationWhere).length ? { location: locationWhere } : {}),
    ...(q
      ? {
          OR: [
            { assetTag: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { terminalNumber: { contains: q, mode: "insensitive" } },
            { ipAddress: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
            { hostname: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export function assetListSearchFromNextSearchParams(
  sp: Record<string, string | string[] | undefined>
): AssetListSearch {
  const g = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };
  return {
    q: g("q"),
    status: (g("status") as AssetStatus | undefined) ?? undefined,
    category: (g("category") as AssetCategory | undefined) ?? undefined,
    departmentId: g("departmentId"),
    locationId: g("locationId"),
    assignedToId: g("assignedToId"),
    locationKind: (g("locationKind") as LocationKind | undefined) ?? undefined,
    labNumber: g("labNumber"),
    page: Math.max(1, Number(g("page") ?? "1")),
    pageSize: Math.min(100, Math.max(10, Number(g("pageSize") ?? "25"))),
  };
}

export function assetListSearchFromUrl(url: URL): AssetListSearch {
  return {
    q: url.searchParams.get("q") ?? undefined,
    status: (url.searchParams.get("status") as AssetStatus | null) ?? undefined,
    category: (url.searchParams.get("category") as AssetCategory | null) ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined,
    locationId: url.searchParams.get("locationId") ?? undefined,
    assignedToId: url.searchParams.get("assignedToId") ?? undefined,
    locationKind: (url.searchParams.get("locationKind") as LocationKind | null) ?? undefined,
    labNumber: url.searchParams.get("labNumber") ?? undefined,
    page: Math.max(1, Number(url.searchParams.get("page") ?? "1")),
    pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "25"))),
  };
}
