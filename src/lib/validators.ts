import { z } from "zod";

export const CheckoutSchema = z.object({
  assignedType: z.enum(["USER", "LOCATION"]),
  assignedToId: z.string().min(1),
  expectedCheckin: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});

export const CheckinSchema = z.object({
  checkinAt: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});

export const CreateWorkOrderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["REPAIR", "DEPLOY", "PULLOUT", "INSPECTION"]),
  assignedToUserId: z.string().optional(),
  /// Dev-friendly convenience: allow passing a technician email instead of user id.
  /// In production you should use `assignedToUserId`.
  assignedToEmail: z.string().email().optional(),
  dueAt: z.string().datetime().optional(),
});

export const AddWorkLogSchema = z.object({
  workOrderId: z.string().optional(),
  actionType: z.enum([
    "REPAIR",
    "PULLED_OUT",
    "DEPLOYED",
    "NOTE",
    "FIRMWARE_UPDATE",
    "TONER_REPLACED",
    "BATTERY_REPLACED",
    "INSPECTION",
    "CALIBRATION",
    "NETWORK_CHANGE",
  ]),
  notes: z.string().max(5000).optional(),
  pulledOutAt: z.string().datetime().optional(),
  deployedAt: z.string().datetime().optional(),
});

export const PatchAssetSchema = z.object({
  displayName: z.string().max(200).optional().nullable(),
  internalNotes: z.string().max(20000).optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyExpiresAt: z.string().datetime().optional().nullable(),
  lastServiceAt: z.string().datetime().optional().nullable(),
  nextServiceDueAt: z.string().datetime().optional().nullable(),
});

export const AuditNoteSchema = z.object({
  note: z.string().min(1).max(5000),
});

