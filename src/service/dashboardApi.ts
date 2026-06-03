import API_URL from "../config/api";
import type { ProducerDashboard, TalentDashboard } from "../types/dashboard";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";

export async function getProducerDashboard(token?: string): Promise<ProducerDashboard> {
  const response = await fetch(`${API_URL}/dashboard/producer`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<ProducerDashboard>(response);
}

export async function getTalentDashboard(token?: string): Promise<TalentDashboard> {
  const response = await fetch(`${API_URL}/dashboard/talent`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<TalentDashboard>(response);
}
