import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";

export type Permission =
  | "units.read"
  | "units.write"
  | "checkout.perform"
  | "checkin.perform"
  | "work_orders.write"
  | "admin";

const RolePermissions: Record<Role, Permission[]> = {
  UNIVERSITY_ADMIN: [
    "admin",
    "units.read",
    "units.write",
    "checkout.perform",
    "checkin.perform",
    "work_orders.write",
  ],
  STAFF: ["units.read", "checkout.perform", "checkin.perform", "work_orders.write"],
  TECHNICIAN: ["units.read", "checkin.perform", "work_orders.write"],
  REQUESTER: ["units.read"],
};

export function hasPermission(user: SessionUser, permission: Permission) {
  return RolePermissions[user.role]?.includes(permission) ?? false;
}

export function requirePermission(user: SessionUser | null, permission: Permission) {
  if (!user) throw new Error("Unauthorized");
  if (!hasPermission(user, permission)) throw new Error("Forbidden");
}

export function requireAnyPermission(user: SessionUser | null, ...permissions: Permission[]) {
  if (!user) throw new Error("Unauthorized");
  if (!permissions.some((p) => hasPermission(user, p))) throw new Error("Forbidden");
}

