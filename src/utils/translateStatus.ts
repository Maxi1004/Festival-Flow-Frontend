import type { TFunction } from "i18next";

export type TranslatableStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "DRAFT"
  | "ACCEPTED"
  | "REJECTED"
  | "REVIEWING"
  | "SUBMITTED"
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "PENDING"
  | "HIRED"
  | "RECRUITED"
  | "OPEN"
  | "CLOSED"
  | "PAUSED"
  | "COMPLETED";

export function translateStatus(
  t: TFunction,
  status?: string | null,
  fallback = "common.notProvided"
): string {
  const normalizedStatus = status?.trim().toUpperCase();

  if (!normalizedStatus) {
    return t(fallback);
  }

  return t(`status.${normalizedStatus}`, { defaultValue: status });
}
