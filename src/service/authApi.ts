import type { GetProfileResponse, UserRole } from "../types/auth";
import API_URL from "../config/api";
import { getFirebaseToken } from "./auth";
import { normalizeRole } from "../utils/authRole";
import type { AuthProfile } from "../types/auth";

type ApiErrorDetailObject = {
  message?: string;
};

type ApiErrorDetailArrayItem = {
  msg?: string;
};

type ApiErrorResponse = {
  detail?: string | ApiErrorDetailObject | ApiErrorDetailArrayItem[];
  message?: string;
};

type RegisterUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type SyncGoogleUserPayload = {
  uid: string;
  name: string;
  email: string;
  picture: string;
  provider: "google";
  role: UserRole;
};

type RawAuthProfile = {
  uid?: unknown;
  email?: unknown;
  name?: unknown;
  photo_url?: unknown;
  picture?: unknown;
  role?: unknown;
  provider?: unknown;
  created_at?: unknown;
};

type RawGetProfileResponse = {
  message?: unknown;
  user?: RawAuthProfile;
  data?: RawAuthProfile | { user?: RawAuthProfile };
  profile?: RawAuthProfile;
  role?: unknown;
  uid?: unknown;
  email?: unknown;
  name?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRawProfile(payload: RawGetProfileResponse): RawAuthProfile {
  if (payload.user) {
    return payload.user;
  }

  if (payload.profile) {
    return payload.profile;
  }

  if (payload.data && "user" in payload.data && payload.data.user) {
    return payload.data.user;
  }

  if (payload.data && !("user" in payload.data)) {
    return payload.data as RawAuthProfile;
  }

  return payload;
}

function normalizeAuthProfile(payload: RawGetProfileResponse): GetProfileResponse {
  const rawProfile = getRawProfile(payload);
  const role = normalizeRole(
    typeof rawProfile.role === "string" ? rawProfile.role : null
  );

  if (!role) {
    throw new Error("El usuario autenticado no tiene un rol válido.");
  }

  const uid = optionalString(rawProfile.uid);

  if (!uid) {
    throw new Error("La respuesta de /auth/me no incluye el uid del usuario.");
  }

  const user: AuthProfile = {
    uid,
    email: optionalString(rawProfile.email) ?? "",
    name: optionalString(rawProfile.name) ?? "",
    photo_url: optionalString(rawProfile.photo_url),
    picture: optionalString(rawProfile.picture),
    role,
    provider: optionalString(rawProfile.provider),
    created_at: optionalString(rawProfile.created_at),
  };

  return {
    message: optionalString(payload.message) ?? "Perfil autenticado",
    user,
  };
}

export async function getErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = (await response.json()) as ApiErrorResponse;

    if (typeof errorData.detail === "string" && errorData.detail.trim()) {
      return errorData.detail;
    }

    if (Array.isArray(errorData.detail)) {
      const firstError = errorData.detail[0];
      if (firstError?.msg && typeof firstError.msg === "string") {
        return firstError.msg;
      }
    }

    if (
      typeof errorData.detail === "object" &&
      errorData.detail !== null &&
      !Array.isArray(errorData.detail) &&
      "message" in errorData.detail &&
      typeof errorData.detail.message === "string" &&
      errorData.detail.message.trim()
    ) {
      return errorData.detail.message;
    }

    if (typeof errorData.message === "string" && errorData.message.trim()) {
      return errorData.message;
    }
  } catch {
    return "No se pudo completar la solicitud. Intenta nuevamente.";
  }

  return "No se pudo completar la solicitud. Intenta nuevamente.";
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function getAuthenticatedHeaders(
  init?: HeadersInit,
  authenticatedToken?: string
): Promise<Record<string, string>> {
  const token = authenticatedToken ?? await getFirebaseToken();

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  return {
    ...(init ? Object.fromEntries(new Headers(init).entries()) : {}),
    Authorization: `Bearer ${token}`,
  };
}

export async function registerUser(payload: RegisterUserPayload): Promise<void> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

export async function syncGoogleUser(payload: SyncGoogleUserPayload) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await parseJsonResponse(response);
}

export async function getProfile(token?: string): Promise<GetProfileResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : await getAuthenticatedHeaders(),
  });

  const payload = await parseJsonResponse<RawGetProfileResponse>(response);
  return normalizeAuthProfile(payload);
}
