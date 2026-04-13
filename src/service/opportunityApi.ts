import {
  API_URL,
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  Opportunity,
  OpportunityCreatePayload,
  OpportunityStatusPayload,
  OpportunityUpdatePayload,
} from "../types/producer";

type OpportunityEnvelope = {
  opportunity?: Opportunity;
  data?: Opportunity;
};

type OpportunityListEnvelope = {
  opportunities?: Opportunity[];
  data?: Opportunity[];
};

function unwrapOpportunityResponse(payload: Opportunity | OpportunityEnvelope): Opportunity {
  if ("id" in payload) {
    return payload;
  }

  return payload.opportunity ?? payload.data ?? (payload as unknown as Opportunity);
}

function unwrapOpportunityListResponse(
  payload: Opportunity[] | OpportunityListEnvelope
): Opportunity[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.opportunities ?? payload.data ?? [];
}

export async function createOpportunity(
  payload: OpportunityCreatePayload
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function getMyOpportunities(): Promise<Opportunity[]> {
  const response = await fetch(`${API_URL}/opportunities/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapOpportunityListResponse(
    await parseJsonResponse<Opportunity[] | OpportunityListEnvelope>(response)
  );
}

export async function getOpportunityById(opportunityId: string): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function updateOpportunity(
  opportunityId: string,
  payload: OpportunityUpdatePayload
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getOpportunityById(opportunityId);
  }

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function updateOpportunityStatus(
  opportunityId: string,
  payload: OpportunityStatusPayload
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getOpportunityById(opportunityId);
  }

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}
