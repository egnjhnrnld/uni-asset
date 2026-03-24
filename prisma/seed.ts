import {
  PrismaClient,
  AssetCategory,
  AssetStatus,
  LocationKind,
  TicketPriority,
  TicketSource,
  TicketStatus,
  TicketEventType,
} from "@prisma/client";

const prisma = new PrismaClient();

function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}

async function upsertLab(n: number) {
  return prisma.location.upsert({
    where: {
      name_building_room: {
        name: `Lab ${n}`,
        building: "Science",
        room: String(100 + n),
      },
    },
    update: { kind: LocationKind.LAB, labNumber: n },
    create: {
      name: `Lab ${n}`,
      building: "Science",
      room: String(100 + n),
      kind: LocationKind.LAB,
      labNumber: n,
    },
  });
}

async function upsertOffice(i: number) {
  return prisma.location.upsert({
    where: {
      name_building_room: {
        name: `Office ${i}`,
        building: "Main",
        room: String(200 + i),
      },
    },
    update: { kind: LocationKind.OFFICE },
    create: {
      name: `Office ${i}`,
      building: "Main",
      room: String(200 + i),
      kind: LocationKind.OFFICE,
    },
  });
}

async function main() {
  const cs = await prisma.department.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: { name: "Computer Science" },
  });

  const it = await prisma.department.upsert({
    where: { name: "IT / Facilities" },
    update: {},
    create: { name: "IT / Facilities" },
  });

  const deployable = await prisma.statusLabel.upsert({
    where: { name: "Deployable" },
    update: { status: AssetStatus.DEPLOYABLE },
    create: { name: "Deployable", status: AssetStatus.DEPLOYABLE },
  });

  await prisma.statusLabel.upsert({
    where: { name: "Checked Out" },
    update: { status: AssetStatus.CHECKED_OUT },
    create: { name: "Checked Out", status: AssetStatus.CHECKED_OUT },
  });

  // 16 labs (seed ~40 assets each)
  const LABS = 16;
  const LAB_SEATS = 40;
  for (let labNum = 1; labNum <= LABS; labNum++) {
    const lab = await upsertLab(labNum);

    for (let seat = 1; seat <= LAB_SEATS; seat++) {
      const tag = `LAB${pad(labNum)}-DT${pad(seat, 3)}`;
      await prisma.asset.upsert({
        where: { assetTag: tag },
        update: {},
        create: {
          assetTag: tag,
          displayName: `Lab ${labNum} workstation ${seat}`,
          category: AssetCategory.LAB_DESKTOP,
          terminalNumber: `T-${seat}`,
          ipAddress: `10.${labNum}.${seat}.10`,
          serialNumber: `SN-LAB${pad(labNum)}-S${pad(seat, 3)}`,
          hostname: `lab${labNum}-ws${seat}`,
          departmentId: cs.id,
          locationId: lab.id,
          statusId: deployable.id,
          osVersion: "Windows 11",
          ramGb: seat % 5 === 0 ? 8 : 16,
          storageGb: seat % 7 === 0 ? 256 : 512,
          cpu: seat % 4 === 0 ? "Intel i7" : "Intel i5",
        },
      });
    }
  }

  // Offices (seed a mix of PCs + printers)
  const OFFICES = 8;
  const OFFICE_PCS_PER = 5; // 8 * 5 = 40 PCs
  for (let i = 1; i <= OFFICES; i++) {
    const office = await upsertOffice(i);
    for (let s = 1; s <= OFFICE_PCS_PER; s++) {
      const tag = `OFF${pad(i)}-PC${pad(s)}`;
      await prisma.asset.upsert({
        where: { assetTag: tag },
        update: {},
        create: {
          assetTag: tag,
          displayName: `Office ${i} PC ${s}`,
          category: AssetCategory.OFFICE_COMPUTER,
          terminalNumber: `PC-${s}`,
          ipAddress: `10.60.${i}.${s}`,
          serialNumber: `SN-OFF${pad(i)}-PC${pad(s)}`,
          hostname: `office${i}-pc${s}`,
          departmentId: i % 2 === 0 ? cs.id : it.id,
          locationId: office.id,
          statusId: deployable.id,
          osVersion: "Windows 11",
          ramGb: 16,
          storageGb: 512,
          cpu: "Intel i5",
        },
      });
    }
  }

  // Printers (distributed across offices)
  const PRINTERS = 12;
  for (let k = 1; k <= PRINTERS; k++) {
    const officeNum = ((k - 1) % OFFICES) + 1;
    const office = await prisma.location.findFirst({
      where: { kind: LocationKind.OFFICE, name: `Office ${officeNum}` },
    });
    if (!office) continue;
    const tag = `OFF-PRN${pad(k)}`;
    await prisma.asset.upsert({
      where: { assetTag: tag },
      update: {},
      create: {
        assetTag: tag,
        displayName: `Office printer ${k}`,
        category: AssetCategory.PRINTER,
        ipAddress: `10.61.${officeNum}.${k}`,
        serialNumber: `SN-PRN${pad(k)}`,
        macAddress: `00:22:33:${pad(10 + k, 2)}:${pad(20 + k, 2)}:AA`,
        departmentId: cs.id,
        locationId: office.id,
        statusId: deployable.id,
      },
    });
  }

  // Network closet (MDF / Core)
  const netCloset = await prisma.location.upsert({
    where: {
      name_building_room: {
        name: "MDF / Core",
        building: "Main",
        room: "B1",
      },
    },
    update: { kind: LocationKind.NETWORK_CLOSET },
    create: {
      name: "MDF / Core",
      building: "Main",
      room: "B1",
      kind: LocationKind.NETWORK_CLOSET,
    },
  });

  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // UPS / AVR / network gear
  const NET_ASSETS = [
    { tag: "NET-UPS-01", cat: AssetCategory.UPS, serial: "SN-UPS-7788", ip: "10.0.0.10" },
    { tag: "NET-UPS-02", cat: AssetCategory.UPS, serial: "SN-UPS-8899", ip: "10.0.0.11" },
    { tag: "NET-AVR-01", cat: AssetCategory.AVR, serial: "SN-AVR-1122", ip: "10.0.0.20" },
    { tag: "NET-SW-01", cat: AssetCategory.NETWORK_SWITCH, serial: "SN-SW-9900", ip: "10.0.0.2", mac: "00:11:22:33:44:55" },
    { tag: "NET-SW-02", cat: AssetCategory.NETWORK_SWITCH, serial: "SN-SW-9911", ip: "10.0.0.3", mac: "00:11:22:33:44:56" },
    { tag: "NET-RTR-01", cat: AssetCategory.ROUTER, serial: "SN-RTR-2100", ip: "10.0.0.1", mac: "00:11:22:33:44:57" },
    { tag: "NET-FW-01", cat: AssetCategory.FIREWALL, serial: "SN-FW-3300", ip: "10.0.0.6", mac: "00:11:22:33:44:58" },
    { tag: "NET-AP-01", cat: AssetCategory.ACCESS_POINT, serial: "SN-AP-7770", ip: "10.0.0.30", mac: "00:11:22:33:44:59" },
  ] as const;

  for (const a of NET_ASSETS) {
    await prisma.asset.upsert({
      where: { assetTag: a.tag },
      update: {},
      create: {
        assetTag: a.tag,
        displayName: a.tag.replace(/-/g, " "),
        category: a.cat,
        serialNumber: a.serial,
        ipAddress: a.ip,
        macAddress: (a as any).mac ?? null,
        departmentId: it.id,
        locationId: netCloset.id,
        statusId: deployable.id,
        nextServiceDueAt: in90,
      },
    });
  }

  // Keep the original demo tag working for your tests
  const lab1 = await prisma.location.findFirst({
    where: { kind: LocationKind.LAB, labNumber: 1 },
  });
  if (lab1) {
    await prisma.asset.upsert({
      where: { assetTag: "DT-0001" },
      update: {
        category: AssetCategory.LAB_DESKTOP,
        displayName: "Demo lab desktop",
        locationId: lab1.id,
        terminalNumber: "T-01",
        ipAddress: "10.1.1.10",
      },
      create: {
        assetTag: "DT-0001",
        displayName: "Demo lab desktop",
        category: AssetCategory.LAB_DESKTOP,
        terminalNumber: "T-01",
        ipAddress: "10.1.1.10",
        serialNumber: "SN-EXAMPLE-0001",
        hostname: "lab1-ws1",
        departmentId: cs.id,
        locationId: lab1.id,
        statusId: deployable.id,
        osVersion: "Windows 11",
        ramGb: 16,
        storageGb: 512,
        cpu: "Intel i5",
      },
    });
  }

  // Seed a few sample tickets (help desk style)
  const defaultAdminEmail = process.env.DEV_DEFAULT_USER_EMAIL?.trim() || "admin@example.edu";
  const adminUser = await prisma.user.upsert({
    where: { email: defaultAdminEmail },
    update: {},
    create: { email: defaultAdminEmail, displayName: "Admin", role: "UNIVERSITY_ADMIN" as any },
  });
  const techUser = await prisma.user.upsert({
    where: { email: "tech@example.edu" },
    update: {},
    create: { email: "tech@example.edu", displayName: "Tech", role: "TECHNICIAN" as any },
  });

  const demoAsset = await prisma.asset.findFirst({ where: { assetTag: "DT-0001" } });
  if (demoAsset) {
    const t1 = await prisma.ticket.create({
      data: {
        title: "Lab desktop won't boot",
        description: "User reports black screen after power cycle. Please investigate.",
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        source: TicketSource.PHONE,
        requesterUserId: adminUser.id,
        assigneeUserId: techUser.id,
        assetId: demoAsset.id,
        locationId: demoAsset.locationId,
        departmentId: demoAsset.departmentId,
      },
    });
    await prisma.ticketEvent.create({
      data: {
        ticketId: t1.id,
        type: TicketEventType.CREATED,
        actorUserId: adminUser.id,
        note: "Seeded example ticket",
      },
    });
    await prisma.ticketComment.create({
      data: {
        ticketId: t1.id,
        authorUserId: adminUser.id,
        body: "Happened after a power outage. Seat is Lab 1 workstation 1.",
        isInternal: false,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
