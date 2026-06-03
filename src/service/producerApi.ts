import API_URL from "../config/api";
import {
  getAuthenticatedHeaders,
  parseJsonResponse,
} from "./authApi";
import type {
  ProducerProfile,
  ProducerProfilePhotoResponse,
  ProducerProfileUpdatePayload,
} from "../types/producer";

type ProducerProfileEnvelope = {
  data?: ProducerProfile;
  profile?: ProducerProfile;
};

function unwrapProducerProfile(
  payload: ProducerProfile | ProducerProfileEnvelope
): ProducerProfile {
  if ("data" in payload || "profile" in payload) {
    return payload.data ?? payload.profile ?? (payload as ProducerProfile);
  }

  return payload as ProducerProfile;
}

export async function getMyProducerProfile(token?: string): Promise<ProducerProfile> {
  const response = await fetch(`${API_URL}/producer/profile/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapProducerProfile(
    await parseJsonResponse<ProducerProfile | ProducerProfileEnvelope>(response)
  );
}

export async function updateMyProducerProfile(
  payload: ProducerProfileUpdatePayload,
  token?: string
): Promise<ProducerProfile> {
  const response = await fetch(`${API_URL}/producer/profile/me`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, token),
    body: JSON.stringify(payload),
  });

  return unwrapProducerProfile(
    await parseJsonResponse<ProducerProfile | ProducerProfileEnvelope>(response)
  );
}

export async function uploadProducerProfilePhoto(
  file: File,
  token?: string
): Promise<ProducerProfilePhotoResponse> {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(`${API_URL}/producer/profile/photo`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, token),
    body: formData,
  });

  return await parseJsonResponse<ProducerProfilePhotoResponse>(response);
}
