import API_URL from "../config/api";
import {
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";

export type CreateRecruitmentPayload = {
  talent_user_id: string;
  project_id: string;
  opportunity_id: string | null;
  // Backend debe aceptar este campo en POST /recruitments para guardar el rol asignado.
  role: string;
  message: string;
};

export type RecruitmentResponse = CreateRecruitmentPayload & {
  id?: string;
  status?: string;
  category?: string | null;
  project_title?: string | null;
  opportunity_title?: string | null;
  producer_name?: string | null;
  producer_email?: string | null;
  project?: {
    id?: string;
    title?: string | null;
  } | null;
  opportunity?: {
    id?: string;
    title?: string | null;
    role_needed?: string | null;
    specialty?: string | null;
  } | null;
  producer?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type RecruitmentFeed = {
  items: RecruitmentResponse[];
  next_cursor: string | null;
};

export type RecruitmentSummary = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  cancelled: number;
};

type RecruitmentEnvelope = {
  data?: RecruitmentResponse;
  recruitment?: RecruitmentResponse;
};

type RecruitmentFeedEnvelope = {
  items?: RecruitmentResponse[];
  next_cursor?: string | null;
};

type RecruitmentSummaryEnvelope =
  | Partial<RecruitmentSummary>
  | { summary?: Partial<RecruitmentSummary> };

const EMPTY_RECRUITMENT_SUMMARY: RecruitmentSummary = {
  total: 0,
  pending: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
};

type RecruitmentListEnvelope = {
  data?: RecruitmentResponse[];
  invitations?: RecruitmentResponse[];
  items?: RecruitmentResponse[];
  records?: RecruitmentResponse[];
  recruitments?: RecruitmentResponse[];
  results?: RecruitmentResponse[];
};

function unwrapRecruitment(
  payload: RecruitmentResponse | RecruitmentEnvelope
): RecruitmentResponse {
  if ("talent_user_id" in payload) {
    return payload;
  }

  return payload.recruitment ?? payload.data ?? (payload as RecruitmentResponse);
}

function unwrapRecruitments(
  payload: RecruitmentResponse[] | RecruitmentListEnvelope
): RecruitmentResponse[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.recruitments ??
    payload.invitations ??
    payload.data ??
    payload.items ??
    payload.records ??
    payload.results ??
    []
  );
}

export async function createRecruitment(
  payload: CreateRecruitmentPayload,
  authenticatedToken?: string
): Promise<RecruitmentResponse> {
  const response = await fetch(`${API_URL}/recruitments`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapRecruitment(
    await parseJsonResponse<RecruitmentResponse | RecruitmentEnvelope>(response)
  );
}

export async function getMyRecruitments(authenticatedToken?: string): Promise<RecruitmentResponse[]> {
  const response = await fetch(`${API_URL}/recruitments/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapRecruitments(
    await parseJsonResponse<RecruitmentResponse[] | RecruitmentListEnvelope>(response)
  );
}

export async function getMyRecruitmentsFeed(
  cursor?: string | null,
  authenticatedToken?: string
): Promise<RecruitmentFeed> {
  const searchParams = new URLSearchParams({
    limit: "10",
    summary: "false",
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(`${API_URL}/recruitments/me/feed?${searchParams.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<RecruitmentFeedEnvelope>(response);

  return {
    items: payload.items ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getMyRecruitmentsSummary(
  authenticatedToken?: string
): Promise<RecruitmentSummary> {
  const response = await fetch(`${API_URL}/recruitments/me/summary`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<RecruitmentSummaryEnvelope>(response);
  const summary = "summary" in payload ? payload.summary : payload;

  return {
    ...EMPTY_RECRUITMENT_SUMMARY,
    ...summary,
  };
}

export async function updateRecruitmentStatus(
  recruitmentId: string,
  status: "ACCEPTED" | "REJECTED",
  authenticatedToken?: string
): Promise<RecruitmentResponse> {
  const response = await fetch(`${API_URL}/recruitments/${recruitmentId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return {
      talent_user_id: "",
      project_id: "",
      opportunity_id: null,
      role: "",
      message: "",
      id: recruitmentId,
      status,
    };
  }

  return unwrapRecruitment(
    await parseJsonResponse<RecruitmentResponse | RecruitmentEnvelope>(response)
  );
}
