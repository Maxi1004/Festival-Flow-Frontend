import API_URL from "../config/api";
import {
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
  items?: Opportunity[];
  records?: Opportunity[];
  results?: Opportunity[];
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

  return payload.opportunities ?? payload.data ?? payload.items ?? payload.records ?? payload.results ?? [];
}

export async function createOpportunity(
  payload: OpportunityCreatePayload,
  authenticatedToken?: string
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, authenticatedToken),
    body: JSON.stringify(payload),
  });

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function getMyOpportunities(authenticatedToken?: string): Promise<Opportunity[]> {
  const response = await fetch(`${API_URL}/opportunities/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapOpportunityListResponse(
    await parseJsonResponse<Opportunity[] | OpportunityListEnvelope>(response)
  );
}

export async function getMyOpportunitiesCrm(authenticatedToken?: string): Promise<Opportunity[]> {
  const response = await fetch(`${API_URL}/opportunities/me/crm`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapOpportunityListResponse(
    await parseJsonResponse<Opportunity[] | OpportunityListEnvelope>(response)
  );
}

export async function getOpportunityById(opportunityId: string, authenticatedToken?: string): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function updateOpportunity(
  opportunityId: string,
  payload: OpportunityUpdatePayload,
  authenticatedToken?: string
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, authenticatedToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getOpportunityById(opportunityId, authenticatedToken);
  }

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}

export async function updateOpportunityStatus(
  opportunityId: string,
  payload: OpportunityStatusPayload,
  authenticatedToken?: string
): Promise<Opportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, authenticatedToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getOpportunityById(opportunityId, authenticatedToken);
  }

  return unwrapOpportunityResponse(
    await parseJsonResponse<Opportunity | OpportunityEnvelope>(response)
  );
}
