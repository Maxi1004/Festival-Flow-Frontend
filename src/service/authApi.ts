import type { GetProfileResponse, UserRole } from "../types/auth";
import { getFirebaseToken } from "./auth";

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

const API_URL = import.meta.env.VITE_API_URL;

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
  init?: HeadersInit
): Promise<Record<string, string>> {
  const token = await getFirebaseToken();

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  return {
    ...(init ? Object.fromEntries(new Headers(init).entries()) : {}),
    Authorization: `Bearer ${token}`,
  };
}

export { API_URL };

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

export async function getProfile(): Promise<GetProfileResponse> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return await parseJsonResponse(response);
}
