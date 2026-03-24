import clsx from "clsx";
import type { AssetCategory, AssetStatus, LocationKind } from "@prisma/client";
import { assetCategoryLabel, locationKindLabel } from "@/lib/labels";

const categoryStyle: Partial<Record<AssetCategory, string>> = {
  LAB_DESKTOP: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  OFFICE_COMPUTER: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  PRINTER: "bg-red-500/15 text-red-200 ring-red-500/30",
  UPS: "bg-red-500/15 text-red-200 ring-red-500/30",
  AVR: "bg-red-500/15 text-red-200 ring-red-500/30",
  MONITOR: "bg-red-500/15 text-red-200 ring-red-500/30",
  NETWORK_SWITCH: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  ROUTER: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  FIREWALL: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  ACCESS_POINT: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  OTHER: "bg-zinc-500/20 text-zinc-300 ring-zinc-600/40",
};

export function CategoryBadge({ category }: { category: AssetCategory }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        categoryStyle[category] ?? "bg-zinc-700/30 text-zinc-200 ring-zinc-600/40"
      )}
    >
      {assetCategoryLabel[category]}
    </span>
  );
}

export function LocationKindBadge({ kind }: { kind: LocationKind }) {
  return (
    <span className="inline-flex rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-zinc-700">
      {locationKindLabel[kind]}
    </span>
  );
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, string> = {
    DEPLOYABLE: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
    CHECKED_OUT: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25",
    MAINTENANCE: "bg-red-500/15 text-red-200 ring-red-500/30",
    ARCHIVED: "bg-red-500/10 text-red-200 ring-red-500/20",
  };
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        map[status]
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
