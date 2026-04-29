import {
  API_URL,
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  TalentAvailability,
  TalentAvailabilityUpdatePayload,
  AvailableTalent,
  TalentProfile,
  TalentProfileUpdatePayload,
} from "../types/talent";

type SingleResourceEnvelope<T> = {
  data?: T;
  profile?: T;
  availability?: T;
};

type AvailableTalentListEnvelope = {
  data?: AvailableTalent[];
  talents?: AvailableTalent[];
  items?: AvailableTalent[];
  records?: AvailableTalent[];
  results?: AvailableTalent[];
};

export const AVAILABLE_TALENTS_ENDPOINT = "/talent/availability";

function unwrapSingleResource<T extends object>(payload: T | SingleResourceEnvelope<T>): T {
  if ("data" in payload || "profile" in payload || "availability" in payload) {
    const envelope = payload as SingleResourceEnvelope<T>;

    return envelope.data ?? envelope.profile ?? envelope.availability ?? (payload as T);
  }

  return payload as T;
}

function unwrapAvailableTalents(
  payload: AvailableTalent[] | AvailableTalentListEnvelope
): AvailableTalent[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.talents ?? payload.data ?? payload.items ?? payload.records ?? payload.results ?? [];
}

export async function getAvailableTalents(): Promise<AvailableTalent[]> {
  const response = await fetch(`${API_URL}${AVAILABLE_TALENTS_ENDPOINT}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  if (response.status === 403) {
    throw new Error("No tienes permisos para ver talentos disponibles.");
  }

  return unwrapAvailableTalents(
    await parseJsonResponse<AvailableTalent[] | AvailableTalentListEnvelope>(response)
  );
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
  const requestBody: TalentAvailabilityUpdatePayload = {
    status: payload.status,
    travel_availability: payload.travel_availability,
    work_modality: payload.work_modality,
    location: payload.location,
    available_from: payload.available_from || null,
    notes: payload.notes,
  };

  const response = await fetch(`${API_URL}/talent/availability/me`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(requestBody),
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
