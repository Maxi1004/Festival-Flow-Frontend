import API_URL from "../config/api";
import type {
  ProducerDashboard,
  ProducerDashboardDetails,
  ProducerDashboardQuick,
  TalentDashboard,
  TalentDashboardDetails,
  TalentDashboardQuick,
} from "../types/dashboard";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";

export async function getProducerDashboard(token?: string): Promise<ProducerDashboard> {
  const response = await fetch(`${API_URL}/dashboard/producer`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<ProducerDashboard>(response);
}

export async function getProducerDashboardQuick(token?: string): Promise<ProducerDashboardQuick> {
  const response = await fetch(`${API_URL}/dashboard/producer/quick`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<ProducerDashboardQuick>(response);
}

export async function getProducerDashboardDetails(token?: string): Promise<ProducerDashboardDetails> {
  const response = await fetch(`${API_URL}/dashboard/producer/details`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<ProducerDashboardDetails>(response);
}

export async function getTalentDashboard(token?: string): Promise<TalentDashboard> {
  const response = await fetch(`${API_URL}/dashboard/talent`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<TalentDashboard>(response);
}

export async function getTalentDashboardQuick(token?: string): Promise<TalentDashboardQuick> {
  const response = await fetch(`${API_URL}/dashboard/talent/quick`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<TalentDashboardQuick>(response);
}

export async function getTalentDashboardDetails(token?: string): Promise<TalentDashboardDetails> {
  const response = await fetch(`${API_URL}/dashboard/talent/details`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return await parseJsonResponse<TalentDashboardDetails>(response);
}
