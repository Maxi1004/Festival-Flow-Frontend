import API_URL from "../config/api";
import {
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  TalentAvailability,
  TalentAvailabilityUpdatePayload,
  TalentCommitment,
  AvailableTalent,
  TalentProfile,
  TalentProfilePhotoResponse,
  TalentProfilePortfolioPdfResponse,
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

type TalentCommitmentListEnvelope = {
  data?: TalentCommitment[];
  commitments?: TalentCommitment[];
};

export const AVAILABLE_TALENTS_ENDPOINT = "/talent/availability";

export type AvailableTalentFilters = {
  search?: string;
  category?: string;
  location?: string;
  language?: string;
  availability?: string;
};

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

export async function getAvailableTalents(
  filters: AvailableTalentFilters = {},
  authenticatedToken?: string
): Promise<AvailableTalent[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });

  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}${AVAILABLE_TALENTS_ENDPOINT}${query}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (response.status === 403) {
    throw new Error("No tienes permisos para ver talentos disponibles.");
  }

  return unwrapAvailableTalents(
    await parseJsonResponse<AvailableTalent[] | AvailableTalentListEnvelope>(response)
  );
}

export async function getAvailableTalentsCrm(
  filters: AvailableTalentFilters = {},
  authenticatedToken?: string
): Promise<AvailableTalent[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });

  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}/talent/availability/crm${query}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (response.status === 403) {
    throw new Error("No tienes permisos para ver talentos disponibles.");
  }

  return unwrapAvailableTalents(
    await parseJsonResponse<AvailableTalent[] | AvailableTalentListEnvelope>(response)
  );
}

export async function getMyTalentProfile(
  authenticatedToken?: string,
  component = "unknown"
): Promise<TalentProfile | null> {
  console.log("[PROFILE LOAD]", component, window.location.pathname);
  const response = await fetch(`${API_URL}/talent/profile/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (response.status === 404) {
    return null;
  }

  return unwrapSingleResource(
    await parseJsonResponse<TalentProfile | SingleResourceEnvelope<TalentProfile>>(response)
  );
}

export async function updateMyTalentProfile(
  payload: TalentProfileUpdatePayload,
  authenticatedToken?: string
): Promise<TalentProfile> {
  const response = await fetch(`${API_URL}/talent/profile/me`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    const profile = await getMyTalentProfile(
      authenticatedToken,
      "talentApi.updateMyTalentProfile:204-refresh"
    );

    if (!profile) {
      throw new Error("El perfil fue guardado, pero no se pudo refrescar la informacion.");
    }

    return profile;
  }

  return unwrapSingleResource(
    await parseJsonResponse<TalentProfile | SingleResourceEnvelope<TalentProfile>>(response)
  );
}

export async function uploadMyTalentProfilePhoto(
  photo: File,
  authenticatedToken?: string
): Promise<TalentProfilePhotoResponse> {
  const formData = new FormData();
  formData.append("photo", photo);

  const response = await fetch(`${API_URL}/talent/profile/photo`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
    body: formData,
  });

  return await parseJsonResponse<TalentProfilePhotoResponse>(response);
}

export async function uploadMyTalentPortfolioPdf(
  portfolioPdf: File,
  authenticatedToken?: string
): Promise<TalentProfilePortfolioPdfResponse> {
  const formData = new FormData();
  formData.append("portfolio_pdf", portfolioPdf);

  const response = await fetch(`${API_URL}/talent/profile/portfolio-pdf`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
    body: formData,
  });

  return await parseJsonResponse<TalentProfilePortfolioPdfResponse>(response);
}

export async function getMyTalentAvailability(authenticatedToken?: string): Promise<TalentAvailability | null> {
  const response = await fetch(`${API_URL}/talent/availability/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
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

export async function getMyTalentCommitments(authenticatedToken?: string): Promise<TalentCommitment[]> {
  const response = await fetch(`${API_URL}/talent/availability/commitments`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<TalentCommitment[] | TalentCommitmentListEnvelope>(
    response
  );

  return Array.isArray(payload) ? payload : payload.commitments ?? payload.data ?? [];
}

export async function updateMyTalentAvailability(
  payload: TalentAvailabilityUpdatePayload,
  authenticatedToken?: string
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
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    const availability = await getMyTalentAvailability(authenticatedToken);

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
