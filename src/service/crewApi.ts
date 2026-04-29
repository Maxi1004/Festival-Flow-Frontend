import {
  API_URL,
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  CrewMember,
  CrewMemberUpdatePayload,
  CrewMessage,
  CrewMessagePayload,
} from "../types/talent";

type CrewListEnvelope = {
  crew?: CrewMember[];
  data?: CrewMember[];
  items?: CrewMember[];
  members?: CrewMember[];
  records?: CrewMember[];
  results?: CrewMember[];
};

type CrewMemberEnvelope = {
  crew_member?: CrewMember;
  data?: CrewMember;
  member?: CrewMember;
};

type CrewMessageEnvelope = {
  data?: CrewMessage[] | CrewMessage;
  message?: unknown;
  messages?: CrewMessage[];
  items?: CrewMessage[];
  records?: CrewMessage[];
  results?: CrewMessage[];
};

function unwrapCrewList(payload: CrewMember[] | CrewListEnvelope): CrewMember[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.crew ??
    payload.members ??
    payload.data ??
    payload.items ??
    payload.records ??
    payload.results ??
    []
  );
}

function unwrapCrewMember(payload: CrewMember | CrewMemberEnvelope): CrewMember {
  if ("id" in payload || "project_id" in payload || "talent_user_id" in payload) {
    return payload as CrewMember;
  }

  const envelope = payload as CrewMemberEnvelope;

  return envelope.crew_member ?? envelope.member ?? envelope.data ?? (payload as CrewMember);
}

function unwrapCrewMessages(payload: CrewMessage[] | CrewMessageEnvelope): CrewMessage[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload.messages ?? payload.items ?? payload.records ?? payload.results ?? [];
}

async function getCrew(path: string): Promise<CrewMember[]> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  if (response.status === 404 || response.status === 405) {
    throw new Error("No hay datos de equipo disponibles todavía.");
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapCrewList(await parseJsonResponse<CrewMember[] | CrewListEnvelope>(response));
}

export async function getProducerCrew(): Promise<CrewMember[]> {
  return await getCrew("/producer/crew");
}

export async function getTalentCrew(): Promise<CrewMember[]> {
  return await getCrew("/talent/crew");
}

export async function getCrewMessages(crewMemberId: string): Promise<CrewMessage[]> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}/messages`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapCrewMessages(await parseJsonResponse<CrewMessage[] | CrewMessageEnvelope>(response));
}

export async function updateCrewMember(
  crewMemberId: string,
  payload: CrewMemberUpdatePayload
): Promise<CrewMember> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el integrante.");
  }

  if (response.status === 204) {
    return {
      id: crewMemberId,
      ...payload,
    };
  }

  return unwrapCrewMember(await parseJsonResponse<CrewMember | CrewMemberEnvelope>(response));
}

export async function sendCrewMessage(
  crewMemberId: string,
  payload: CrewMessagePayload
): Promise<unknown> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}/messages`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo enviar la respuesta.");
  }

  if (response.status === 204) {
    return null;
  }

  return await parseJsonResponse<CrewMessageEnvelope>(response);
}
