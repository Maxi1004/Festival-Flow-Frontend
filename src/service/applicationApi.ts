import {
  API_URL,
  getAuthenticatedHeaders,
  parseJsonResponse,
} from "./authApi";
import type { CreateApplicationPayload, TalentApplication } from "../types/talent";

type ApplicationEnvelope = {
  application?: TalentApplication;
  data?: TalentApplication;
};

type ApplicationListEnvelope = {
  applications?: TalentApplication[];
  data?: TalentApplication[];
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

  return payload.applications ?? payload.data ?? [];
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

  return unwrapApplications(
    await parseJsonResponse<TalentApplication[] | ApplicationListEnvelope>(response)
  );
}
