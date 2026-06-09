import API_URL from "../config/api";
import type {
  Festival,
  FestivalAuditSummary,
  FestivalCleanupPreview,
  FestivalCleanupResult,
  FestivalDuplicateGroup,
  FestivalImportResult,
  FestivalUpdatePayload,
} from "../types/festival";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";

type FestivalListResponse =
  | Festival[]
  | {
      data?: Festival[];
      festivals?: Festival[];
      items?: Festival[];
    };

type FestivalResponse =
  | Festival
  | {
      data?: Festival;
      festival?: Festival;
    };

type FestivalImportResponse =
  | FestivalImportResult
  | {
      data?: FestivalImportResult;
      result?: FestivalImportResult;
    };

function unwrapFestivalList(payload: FestivalListResponse): Festival[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? payload.festivals ?? payload.items ?? [];
}

function unwrapFestival(payload: FestivalResponse): Festival {
  if ("data" in payload || "festival" in payload) {
    const festival = payload.data ?? payload.festival;

    if (festival) {
      return festival;
    }
  }

  return payload as Festival;
}

function unwrapImportResult(payload: FestivalImportResponse): FestivalImportResult {
  if ("data" in payload || "result" in payload) {
    const result = payload.data ?? payload.result;

    if (result) {
      return result;
    }
  }

  return payload as FestivalImportResult;
}

function unwrapData<T>(payload: T | { data?: T; result?: T }): T {
  if (payload && typeof payload === "object") {
    if ("data" in payload && payload.data !== undefined) {
      return payload.data;
    }

    if ("result" in payload && payload.result !== undefined) {
      return payload.result;
    }
  }

  return payload as T;
}

export async function getAdminFestivals(token?: string): Promise<Festival[]> {
  const response = await fetch(`${API_URL}/admin/festivals?limit=1500`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapFestivalList(await parseJsonResponse<FestivalListResponse>(response));
}

export async function importFestivalsExcel(
  file: File,
  token?: string
): Promise<FestivalImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/admin/import-festivals`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, token),
    body: formData,
  });

  return unwrapImportResult(
    await parseJsonResponse<FestivalImportResponse>(response)
  );
}

export async function updateFestival(
  festivalId: string | number,
  payload: FestivalUpdatePayload,
  token?: string
): Promise<Festival> {
  const response = await fetch(`${API_URL}/admin/festivals/${festivalId}`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      token
    ),
    body: JSON.stringify(payload),
  });

  return unwrapFestival(await parseJsonResponse<FestivalResponse>(response));
}

export async function refreshFestivalStatuses(token?: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/festivals/refresh-status`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  if (!response.ok) {
    await parseJsonResponse<unknown>(response);
  }
}

export async function getFestivalAuditSummary(
  token?: string
): Promise<FestivalAuditSummary> {
  const response = await fetch(`${API_URL}/admin/festivals/audit-summary`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapData(
    await parseJsonResponse<
      FestivalAuditSummary | { data?: FestivalAuditSummary }
    >(response)
  );
}

export async function getFestivalDuplicates(
  token?: string
): Promise<FestivalDuplicateGroup[]> {
  const response = await fetch(`${API_URL}/admin/festivals/duplicates`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });
  const payload = await parseJsonResponse<
    | FestivalDuplicateGroup[]
    | {
        data?: FestivalDuplicateGroup[];
        groups?: FestivalDuplicateGroup[];
        duplicates?: FestivalDuplicateGroup[];
      }
  >(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? payload.groups ?? payload.duplicates ?? [];
}

export async function getFestivalCleanupPreview(
  token?: string
): Promise<FestivalCleanupPreview> {
  const response = await fetch(`${API_URL}/admin/festivals/cleanup-preview`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapData(
    await parseJsonResponse<
      | FestivalCleanupPreview
      | { data?: FestivalCleanupPreview; result?: FestivalCleanupPreview }
    >(response)
  );
}

async function runFestivalCleanup(
  endpoint: "cleanup-duplicates" | "cleanup-invalid",
  token?: string
): Promise<FestivalCleanupResult> {
  const response = await fetch(`${API_URL}/admin/festivals/${endpoint}`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      token
    ),
    body: JSON.stringify({ confirm: true }),
  });

  return unwrapData(
    await parseJsonResponse<
      FestivalCleanupResult | { data?: FestivalCleanupResult; result?: FestivalCleanupResult }
    >(response)
  );
}

export function cleanupFestivalDuplicates(
  token?: string
): Promise<FestivalCleanupResult> {
  return runFestivalCleanup("cleanup-duplicates", token);
}

export function cleanupInvalidFestivals(
  token?: string
): Promise<FestivalCleanupResult> {
  return runFestivalCleanup("cleanup-invalid", token);
}
