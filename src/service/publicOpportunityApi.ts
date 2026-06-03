import API_URL from "../config/api";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";
import type { PublicOpportunity } from "../types/talent";

type OpportunityEnvelope = {
  opportunity?: PublicOpportunity;
  data?: PublicOpportunity;
};

export type OpportunitiesPage = {
  items: PublicOpportunity[];
  next_cursor: string | null;
};

function unwrapOpportunity(
  payload: PublicOpportunity | OpportunityEnvelope
): PublicOpportunity {
  if ("id" in payload) return payload;
  return payload.opportunity ?? payload.data ?? (payload as PublicOpportunity);
}

export async function getPublicOpportunitiesPage(
  cursor?: string | null,
  authenticatedToken?: string
): Promise<OpportunitiesPage> {
  const params = new URLSearchParams();
  params.set("limit", "10");

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`${API_URL}/opportunities?${params.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  const payload = await parseJsonResponse<OpportunitiesPage>(response);

  return {
    items: payload.items ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getPublicOpportunities(): Promise<PublicOpportunity[]> {
  const page = await getPublicOpportunitiesPage(null);
  return page.items;
}

export async function getOpportunityById(
  opportunityId: string,
  authenticatedToken?: string
): Promise<PublicOpportunity> {
  const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapOpportunity(
    await parseJsonResponse<PublicOpportunity | OpportunityEnvelope>(response)
  );
}
