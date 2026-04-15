import {
  API_URL,
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  TalentAvailability,
  TalentAvailabilityUpdatePayload,
  TalentProfile,
  TalentProfileUpdatePayload,
} from "../types/talent";

type SingleResourceEnvelope<T> = {
  data?: T;
  profile?: T;
  availability?: T;
};

function unwrapSingleResource<T extends object>(payload: T | SingleResourceEnvelope<T>): T {
  if ("data" in payload || "profile" in payload || "availability" in payload) {
    const envelope = payload as SingleResourceEnvelope<T>;

    return envelope.data ?? envelope.profile ?? envelope.availability ?? (payload as T);
  }

  return payload as T;
}

export async function getMyTalentProfile(): Promise<TalentProfile | null> {
  const response = await fetch(`${API_URL}/talent/profile/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  return unwrapSingleResource(
    await parseJsonResponse<TalentProfile | SingleResourceEnvelope<TalentProfile>>(response)
  );
}

export async function updateMyTalentProfile(
  payload: TalentProfileUpdatePayload
): Promise<TalentProfile> {
  const response = await fetch(`${API_URL}/talent/profile/me`, {
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
    const profile = await getMyTalentProfile();

    if (!profile) {
      throw new Error("El perfil fue guardado, pero no se pudo refrescar la informacion.");
    }

    return profile;
  }

  return unwrapSingleResource(
    await parseJsonResponse<TalentProfile | SingleResourceEnvelope<TalentProfile>>(response)
  );
}

export async function getMyTalentAvailability(): Promise<TalentAvailability | null> {
  const response = await fetch(`${API_URL}/talent/availability/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  return unwrapSingleResource(
    await parseJsonResponse<
      TalentAvailability | SingleResourceEnvelope<TalentAvailability>
    >(response)
  );
}

export async function updateMyTalentAvailability(
  payload: TalentAvailabilityUpdatePayload
): Promise<TalentAvailability> {
  const response = await fetch(`${API_URL}/talent/availability/me`, {
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
    const availability = await getMyTalentAvailability();

    if (!availability) {
      throw new Error(
        "La disponibilidad fue guardada, pero no se pudo refrescar la informacion."
      );
    }

    return availability;
  }

  return unwrapSingleResource(
    await parseJsonResponse<
      TalentAvailability | SingleResourceEnvelope<TalentAvailability>
    >(response)
  );
}
