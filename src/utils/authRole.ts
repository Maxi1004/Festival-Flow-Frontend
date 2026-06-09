import type { UserRole } from "../types/auth";

export function normalizeRole(role?: string | null): UserRole | null {
  const normalizedRole = role?.trim().toUpperCase();

  if (
    normalizedRole === "ADMIN" ||
    normalizedRole === "PRODUCER" ||
    normalizedRole === "TALENT"
  ) {
    return normalizedRole;
  }

  return null;
}
