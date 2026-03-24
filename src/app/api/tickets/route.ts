import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";
import {
  TicketPriority,
  TicketSource,
  TicketStatus,
  TicketEventType,
  Role,
  LocationKind,
} from "@prisma/client";
import { requestMeta } from "@/lib/http";
import { sendTicketCreatedEmail } from "@/lib/mailer";

const ListSchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assigneeUserId: z.string().optional(),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  source: z.nativeEnum(TicketSource).optional(),
  assetId: z.string().optional(),
  locationName: z.string().max(200).optional(),
  locationBuilding: z.string().max(200).optional(),
  locationRoom: z.string().max(100).optional(),
  departmentId: z.string().optional(),
  assigneeEmail: z.string().email(),
});

const priorityDeadlineHours: Record<TicketPriority, number> = {
  URGENT: 4,
  HIGH: 24,
  NORMAL: 72,
  LOW: 168,
};

export async function GET(req: Request) {
  const session = await getSession();
  requirePermission(session.user, "units.read");

  const url = new URL(req.url);
  const parsed = ListSchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    assigneeUserId: url.searchParams.get("assigneeUserId") ?? undefined,
    assetId: url.searchParams.get("assetId") ?? undefined,
    locationId: url.searchParams.get("locationId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  const skip = (parsed.page - 1) * parsed.pageSize;
  const q = parsed.q?.trim();

  const where = {
    ...(parsed.status ? { status: parsed.status } : {}),
    ...(parsed.priority ? { priority: parsed.priority } : {}),
    ...(parsed.assigneeUserId ? { assigneeUserId: parsed.assigneeUserId } : {}),
    ...(parsed.assetId ? { assetId: parsed.assetId } : {}),
    ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { id: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      include: {
        requester: true,
        assignee: true,
        asset: true,
        location: true,
        department: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: parsed.pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
    items,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    requirePermission(session.user, "work_orders.write");

    const body = CreateSchema.parse(await req.json());
    const meta = await requestMeta();

    const dueAt = new Date(
      Date.now() + priorityDeadlineHours[body.priority ?? TicketPriority.NORMAL] * 60 * 60 * 1000
    );

    const ticket = await prisma.$transaction(async (tx) => {
      const assignee = await tx.user.upsert({
        where: { email: body.assigneeEmail },
        update: {},
        create: {
          email: body.assigneeEmail,
          displayName: body.assigneeEmail.split("@")[0] ?? null,
          role: Role.STAFF,
        },
      });

      let locationId: string | undefined;
      if (body.locationName?.trim()) {
        const name = body.locationName.trim();
        const building = body.locationBuilding?.trim() || undefined;
        const room = body.locationRoom?.trim() || undefined;
        const location = await tx.location.create({
          data: {
            name,
            building,
            room,
            kind: LocationKind.OTHER,
          },
        });
        locationId = location.id;
      }

      const created = await tx.ticket.create({
        data: {
          title: body.title,
          description: body.description,
          priority: body.priority ?? TicketPriority.NORMAL,
          source: body.source ?? TicketSource.WEB,
          requesterUserId: session.user!.id,
          assigneeUserId: assignee.id,
          assetId: body.assetId,
          locationId,
          departmentId: body.departmentId,
          dueAt,
        },
        include: {
          requester: true,
          assignee: true,
          asset: true,
          location: true,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: created.id,
          type: TicketEventType.CREATED,
          actorUserId: session.user!.id,
          note: `Created (source=${body.source ?? TicketSource.WEB}) ip=${meta.ip ?? "-"}`,
        },
      });

      return created;
    });

    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendTicketCreatedEmail({
        ticketId: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        source: ticket.source,
        dueAt: ticket.dueAt?.toISOString() ?? null,
        requesterEmail: ticket.requester.email,
        assigneeEmail: ticket.assignee!.email,
        assetTag: ticket.asset?.assetTag ?? null,
        locationName: ticket.location?.name ?? null,
      });
    } catch (e: any) {
      emailSent = false;
      emailError = e?.message ?? "unknown error";
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          type: TicketEventType.NOTE,
          actorUserId: session.user!.id,
          note: `Email send failed: ${emailError}`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      ticket,
      emailSent,
      emailError,
    });
  } catch (e: any) {
    const message = e?.message ?? "Failed to create ticket";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

