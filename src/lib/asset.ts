import { AssetCategory } from "@prisma/client";

/** Categories that support user/location checkout (not racks, printers, UPS, etc.). */
export const CHECKOUTABLE_CATEGORIES: AssetCategory[] = [
  AssetCategory.LAB_DESKTOP,
  AssetCategory.OFFICE_COMPUTER,
];

export function isCheckoutableCategory(category: AssetCategory): boolean {
  return CHECKOUTABLE_CATEGORIES.includes(category);
}
