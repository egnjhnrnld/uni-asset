-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('LAB', 'OFFICE', 'NETWORK_CLOSET', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM (
  'LAB_DESKTOP',
  'OFFICE_COMPUTER',
  'PRINTER',
  'UPS',
  'AVR',
  'NETWORK_SWITCH',
  'ROUTER',
  'FIREWALL',
  'ACCESS_POINT',
  'MONITOR',
  'OTHER'
);

-- AlterEnum WorkLogActionType
ALTER TYPE "WorkLogActionType" ADD VALUE 'FIRMWARE_UPDATE';
ALTER TYPE "WorkLogActionType" ADD VALUE 'TONER_REPLACED';
ALTER TYPE "WorkLogActionType" ADD VALUE 'BATTERY_REPLACED';
ALTER TYPE "WorkLogActionType" ADD VALUE 'INSPECTION';
ALTER TYPE "WorkLogActionType" ADD VALUE 'CALIBRATION';
ALTER TYPE "WorkLogActionType" ADD VALUE 'NETWORK_CHANGE';

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN "kind" "LocationKind" NOT NULL DEFAULT 'OFFICE';
ALTER TABLE "Location" ADD COLUMN "labNumber" INTEGER;

-- AlterTable Asset
ALTER TABLE "Asset" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Asset" ADD COLUMN "category" "AssetCategory" NOT NULL DEFAULT 'LAB_DESKTOP';
ALTER TABLE "Asset" ADD COLUMN "purchaseDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "warrantyExpiresAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "lastServiceAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "nextServiceDueAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN "internalNotes" TEXT;

ALTER TABLE "Asset" ALTER COLUMN "terminalNumber" DROP NOT NULL;
ALTER TABLE "Asset" ALTER COLUMN "ipAddress" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");
CREATE INDEX "Location_kind_labNumber_idx" ON "Location"("kind", "labNumber");
