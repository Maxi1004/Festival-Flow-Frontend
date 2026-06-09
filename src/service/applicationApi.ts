import API_URL from "../config/api";
import {
  getErrorMessage,
  getAuthenticatedHeaders,
  parseJsonResponse,
} from "./authApi";
import { getOpportunityById } from "./publicOpportunityApi";
import type {
  CreateApplicationPayload,
  TalentApplication,
  TalentApplicationFeed,
  TalentApplicationFeedSummary,
} from "../types/talent";
import type { CrewCategory } from "../utils/crewCategory";

type ApplicationEnvelope = {
  application?: TalentApplication;
  data?: TalentApplication;
};

type ApplicationListEnvelope = {
  applications?: TalentApplication[];
  data?: TalentApplication[];
  applicants?: TalentApplication[];
  items?: TalentApplication[];
  records?: TalentApplication[];
  results?: TalentApplication[];
};

type ApplicationFeedEnvelope = {
  items?: TalentApplication[];
  next_cursor?: string | null;
};

type ApplicationSummaryEnvelope =
  | Partial<TalentApplicationFeedSummary>
  | { summary?: Partial<TalentApplicationFeedSummary> };

const EMPTY_APPLICATION_SUMMARY: TalentApplicationFeedSummary = {
  total: 0,
  active: 0,
  reviewing: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
  completed: 0,
  closed: 0,
  acceptance_rate: 0,
};

function unwrapApplication(payload: TalentApplication | ApplicationEnvelope): TalentApplication {
  if ("id" in payload) {
    return payload;
  }

  return payload.application ?? payload.data ?? (payload as unknown as TalentApplication);
}

function unwrapApplications(
  payload: TalentApplication[] | ApplicationListEnvelope
): TalentApplication[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.applications ??
    payload.applicants ??
    payload.data ??
    payload.items ??
    payload.records ??
    payload.results ??
    []
  );
}

export async function createApplication(
  payload: CreateApplicationPayload,
  authenticatedToken?: string
): Promise<TalentApplication> {
  const response = await fetch(`${API_URL}/applications`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      {
        "Content-Type": "application/json",
      },
      authenticatedToken
    ),
    body: JSON.stringify(payload),
  });

  return unwrapApplication(
    await parseJsonResponse<TalentApplication | ApplicationEnvelope>(response)
  );
}

export async function getMyApplications(authenticatedToken?: string): Promise<TalentApplication[]> {
  const response = await fetch(`${API_URL}/applications/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  const applications = unwrapApplications(
    await parseJsonResponse<TalentApplication[] | ApplicationListEnvelope>(response)
  );

  return await Promise.all(
    applications.map(async (application) => {
      if (application.opportunity || !application.opportunity_id) {
        return application;
      }

      try {
        return {
          ...application,
          opportunity: await getOpportunityById(application.opportunity_id, authenticatedToken),
        };
      } catch {
        return application;
      }
    })
  );
}

export async function getMyApplicationsFeed(
  limit = 10,
  cursor?: string | null,
  authenticatedToken?: string
): Promise<TalentApplicationFeed> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    summary: "false",
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(`${API_URL}/applications/me/feed?${searchParams.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<ApplicationFeedEnvelope>(response);

  return {
    items: payload.items ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getMyApplicationsSummary(
  authenticatedToken?: string
): Promise<TalentApplicationFeedSummary> {
  const response = await fetch(`${API_URL}/applications/me/summary`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<ApplicationSummaryEnvelope>(response);
  const summary = "summary" in payload ? payload.summary : payload;

  return {
    ...EMPTY_APPLICATION_SUMMARY,
    ...summary,
  };
}

export async function getOpportunityApplications(
  opportunityId: string,
  authenticatedToken?: string
): Promise<TalentApplication[]> {
  const candidatePaths = [
    `/opportunities/${opportunityId}/applications`,
    `/applications/opportunity/${opportunityId}`,
    `/producer/opportunities/${opportunityId}/applications`,
  ];
  const headers = await getAuthenticatedHeaders(undefined, authenticatedToken);
  const endpointMissStatuses = new Set([404, 405]);
  let lastErrorMessage = "No existe endpoint para listar postulantes de esta convocatoria.";

  for (const path of candidatePaths) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      return unwrapApplications(
        await parseJsonResponse<TalentApplication[] | ApplicationListEnvelope>(response)
      );
    }

    if (endpointMissStatuses.has(response.status)) {
      continue;
    }

    if (response.status === 403) {
      throw new Error("No tienes permisos para ver postulantes de esta convocatoria.");
    }

    lastErrorMessage = await getErrorMessage(response);
    break;
  }

  throw new Error(lastErrorMessage);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "ACCEPTED" | "REJECTED",
  authenticatedToken?: string,
  category?: CrewCategory
): Promise<TalentApplication> {
  const response = await fetch(`${API_URL}/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify({
      status,
      ...(status === "ACCEPTED" && category ? { category } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return {
      id: applicationId,
      opportunity_id: "",
      status,
      message: "",
      applied_at: "",
    };
  }

  return unwrapApplication(
    await parseJsonResponse<TalentApplication | ApplicationEnvelope>(response)
  );
}
