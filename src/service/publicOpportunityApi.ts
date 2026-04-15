import {
  API_URL,
  getAuthenticatedHeaders,
  parseJsonResponse,
} from "./authApi";
import type { PublicOpportunity } from "../types/talent";

type OpportunityEnvelope = {
  opportunity?: PublicOpportunity;
  data?: PublicOpportunity;
};

type OpportunityListEnvelope = {
  opportunities?: PublicOpportunity[];
  data?: PublicOpportunity[];
};

function unwrapOpportunity(
  payload: PublicOpportunity | OpportunityEnvelope
): PublicOpportunity {
  if ("id" in payload) {
    return payload;
  }

  return payload.opportunity ?? payload.data ?? (payload as unknown as PublicOpportunity);
}

function unwrapOpportunities(
  payload: PublicOpportunity[] | OpportunityListEnvelope
): PublicOpportunity[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.opportunities ?? payload.data ?? [];
}

export async function getPublicOpportunities(): Promise<PublicOpportunity[]> {
  const response = await fetch(`${API_URL}/opportunities`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapOpportunities(
    await parseJsonResponse<PublicOpportunity[] | OpportunityListEnvelope>(response)
  );
}

export async function getOpportunityById(opportunityId: string): Promise<PublicOpportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapOpportunity(
    await parseJsonResponse<PublicOpportunity | OpportunityEnvelope>(response)
  );
}
