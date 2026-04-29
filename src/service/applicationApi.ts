import {
  API_URL,
  getErrorMessage,
  getAuthenticatedHeaders,
  parseJsonResponse,
} from "./authApi";
import { getOpportunityById } from "./publicOpportunityApi";
import type { CreateApplicationPayload, TalentApplication } from "../types/talent";

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
  payload: CreateApplicationPayload
): Promise<TalentApplication> {
  const response = await fetch(`${API_URL}/applications`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  return unwrapApplication(
    await parseJsonResponse<TalentApplication | ApplicationEnvelope>(response)
  );
}

export async function getMyApplications(): Promise<TalentApplication[]> {
  const response = await fetch(`${API_URL}/applications/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
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
          opportunity: await getOpportunityById(application.opportunity_id),
        };
      } catch {
        return application;
      }
    })
  );
}

export async function getOpportunityApplications(
  opportunityId: string
): Promise<TalentApplication[]> {
  const candidatePaths = [
    `/opportunities/${opportunityId}/applications`,
    `/applications/opportunity/${opportunityId}`,
    `/producer/opportunities/${opportunityId}/applications`,
  ];
  const headers = await getAuthenticatedHeaders();
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
  status: "ACCEPTED" | "REJECTED"
): Promise<TalentApplication> {
  const response = await fetch(`${API_URL}/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ status }),
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
