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
  TalentPublicProfile,
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

type TalentPublicProfileEnvelope = {
  data?: TalentPublicProfile | TalentPublicProfileEnvelope;
  profile?: TalentPublicProfile | null;
  availability?: TalentPublicProfile["availability"];
  email?: string | null;
  name?: string | null;
  user?: {
    email?: string | null;
    name?: string | null;
    display_name?: string | null;
    photo_url?: string | null;
    photoURL?: string | null;
  } | null;
};

export const AVAILABLE_TALENTS_ENDPOINT = "/talent/availability";
export const TALENT_PUBLIC_PROFILE_ENDPOINT = (userId: string) =>
  `/talent/${encodeURIComponent(userId)}/profile-public`;

const publicProfileCache = new Map<string, Promise<TalentPublicProfile>>();

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

function unwrapTalentPublicProfile(
  payload: TalentPublicProfile | TalentPublicProfileEnvelope
): TalentPublicProfile {
  const envelope = payload as TalentPublicProfileEnvelope;

  if (envelope.data) {
    return unwrapTalentPublicProfile(envelope.data);
  }

  if (envelope.profile || envelope.availability || envelope.user) {
    return {
      ...(envelope.profile ?? {}),
      availability: envelope.availability,
      email: envelope.email ?? envelope.user?.email,
      name:
        envelope.name ??
        envelope.user?.display_name ??
        envelope.user?.name,
      photo_url:
        envelope.profile?.photo_url ??
        envelope.user?.photo_url ??
        envelope.user?.photoURL,
    };
  }

  return payload as TalentPublicProfile;
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

export function getTalentPublicProfile(
  userId: string,
  authenticatedToken?: string
): Promise<TalentPublicProfile> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return Promise.reject(new Error("No se pudo identificar el talento."));
  }

  const cachedRequest = publicProfileCache.get(normalizedUserId);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = (async () => {
    const response = await fetch(
      `${API_URL}${TALENT_PUBLIC_PROFILE_ENDPOINT(normalizedUserId)}`,
      {
        method: "GET",
        headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
      }
    );

    return unwrapTalentPublicProfile(
      await parseJsonResponse<TalentPublicProfile | TalentPublicProfileEnvelope>(
        response
      )
    );
  })();

  publicProfileCache.set(normalizedUserId, request);
  request.catch(() => publicProfileCache.delete(normalizedUserId));

  return request;
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
