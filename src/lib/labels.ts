import type { AssetCategory, LocationKind, WorkLogActionType } from "@prisma/client";

export const assetCategoryLabel: Record<AssetCategory, string> = {
  LAB_DESKTOP: "Lab desktop",
  OFFICE_COMPUTER: "Office computer",
  PRINTER: "Printer",
  UPS: "UPS",
  AVR: "AVR",
  NETWORK_SWITCH: "Switch",
  ROUTER: "Router",
  FIREWALL: "Firewall",
  ACCESS_POINT: "Access point",
  MONITOR: "Monitor",
  OTHER: "Other",
};

export const locationKindLabel: Record<LocationKind, string> = {
  LAB: "Lab",
  OFFICE: "Office",
  NETWORK_CLOSET: "Network closet",
  OTHER: "Other",
};

export const workLogActionLabel: Record<WorkLogActionType, string> = {
  REPAIR: "Repair",
  PULLED_OUT: "Pulled out",
  DEPLOYED: "Deployed",
  NOTE: "Note",
  FIRMWARE_UPDATE: "Firmware update",
  TONER_REPLACED: "Toner replaced",
  BATTERY_REPLACED: "Battery replaced",
  INSPECTION: "Inspection",
  CALIBRATION: "Calibration",
  NETWORK_CHANGE: "Network change",
};
