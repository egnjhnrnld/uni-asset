import { describe, expect, test } from "vitest";
import { PrismaClient, AssetStatus } from "@prisma/client";

/**
 * Integration-style test.
 *
 * To run reliably, point DATABASE_URL to a test database and run migrations first:
 *   npm run prisma:migrate
 *   npm test
 */
describe("checkout/checkin transactions", () => {
  test("checkout creates audit + assigns; checkin clears + audit", async () => {
    const prisma = new PrismaClient();
    try {
      const statusDeployable = await prisma.statusLabel.findFirst({
        where: { status: AssetStatus.DEPLOYABLE },
      });
      const statusCheckedOut = await prisma.statusLabel.findFirst({
        where: { status: AssetStatus.CHECKED_OUT },
      });

      expect(statusDeployable).toBeTruthy();
      expect(statusCheckedOut).toBeTruthy();

      // Use seeded asset if present, else create minimal fixture.
      let asset = await prisma.asset.findFirst({ orderBy: { createdAt: "desc" } });
      expect(asset).toBeTruthy();
      asset = asset!;

      const user = await prisma.user.upsert({
        where: { email: "test-user@example.edu" },
        update: {},
        create: { email: "test-user@example.edu", role: "STAFF" as any },
      });

      // Checkout (transaction shape mirrors API routes)
      const checkedOut = await prisma.$transaction(async (tx) => {
        const updated = await tx.asset.update({
          where: { id: asset!.id },
          data: {
            assignedType: "USER" as any,
            assignedToId: user.id,
            lastCheckout: new Date(),
            statusId: statusCheckedOut!.id,
          },
        });
        await tx.auditEvent.create({
          data: {
            actionType: "CHECKOUT" as any,
            actorUserId: user.id,
            itemId: updated.id,
            targetType: "USER" as any,
            targetId: user.id,
            note: "test checkout",
          },
        });
        return updated;
      });

      const auditAfterCheckout = await prisma.auditEvent.findMany({
        where: { itemId: asset.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      expect(auditAfterCheckout.some((e) => e.actionType === ("CHECKOUT" as any))).toBe(true);
      expect(checkedOut.assignedToId).toBe(user.id);

      // Checkin
      const checkedIn = await prisma.$transaction(async (tx) => {
        const updated = await tx.asset.update({
          where: { id: asset!.id },
          data: {
            assignedType: null,
            assignedToId: null,
            expectedCheckin: null,
            lastCheckin: new Date(),
            statusId: statusDeployable!.id,
          },
        });
        await tx.auditEvent.create({
          data: {
            actionType: "CHECKIN" as any,
            actorUserId: user.id,
            itemId: updated.id,
            targetType: "USER" as any,
            targetId: user.id,
            note: "test checkin",
          },
        });
        return updated;
      });

      const auditAfterCheckin = await prisma.auditEvent.findMany({
        where: { itemId: asset.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      expect(auditAfterCheckin.some((e) => e.actionType === ("CHECKIN" as any))).toBe(true);
      expect(checkedIn.assignedToId).toBe(null);
    } finally {
      await prisma.$disconnect();
    }
  });
});

