import API_URL from "../config/api";
import {
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  CrewMember,
  CrewMemberUpdatePayload,
  CrewDirectMessage,
  CrewMessage,
  CrewMessagePayload,
  CrewProjectMember,
  CrewProjectMessage,
} from "../types/talent";

type CrewListEnvelope = {
  crew?: CrewMember[];
  data?: CrewMember[];
  items?: CrewMember[];
  members?: CrewMember[];
  records?: CrewMember[];
  results?: CrewMember[];
};

export type CrewCrmProject = {
  project_id: string;
  project_title?: string | null;
  title?: string | null;
  status?: string | null;
  members_count?: number;
  member_count?: number;
  membersCount?: number;
  latest_activity?: string | null;
  last_activity?: string | null;
  latest_joined_at?: string | null;
  joined_at?: string | null;
  members?: CrewMember[];
};

type CrewCrmEnvelope = {
  data?: CrewCrmProject[] | CrewMember[];
  items?: CrewCrmProject[] | CrewMember[];
  projects?: CrewCrmProject[];
  teams?: CrewCrmProject[];
  crew?: CrewMember[];
  members?: CrewMember[];
  records?: CrewCrmProject[] | CrewMember[];
  results?: CrewCrmProject[] | CrewMember[];
};

type CrewMemberEnvelope = {
  crew_member?: CrewMember;
  data?: CrewMember;
  member?: CrewMember;
};

type CrewFeedEnvelope = {
  items?: CrewMember[];
  next_cursor?: string | null;
};

export type CrewFeed = {
  items: CrewMember[];
  next_cursor: string | null;
};

export type CrewSummary = {
  total_projects: number;
  active: number;
  completed: number;
  cancelled: number;
};

type CrewSummaryEnvelope =
  | Partial<CrewSummary>
  | { summary?: Partial<CrewSummary> };

const EMPTY_CREW_SUMMARY: CrewSummary = {
  total_projects: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
};

type CrewMessageEnvelope = {
  data?: CrewMessage[] | CrewMessage;
  message?: unknown;
  messages?: CrewMessage[];
  items?: CrewMessage[];
  records?: CrewMessage[];
  results?: CrewMessage[];
};

type ProjectListEnvelope<T> = {
  data?: T[];
  items?: T[];
  members?: T[];
  messages?: T[];
  records?: T[];
  results?: T[];
};

type ProjectItemEnvelope<T> = {
  data?: T;
  item?: T;
  message?: T | string;
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

function unwrapCrewCrm(payload: CrewCrmProject[] | CrewMember[] | CrewCrmEnvelope): CrewCrmProject[] | CrewMember[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.projects ??
    payload.teams ??
    payload.members ??
    payload.crew ??
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

function unwrapProjectList<T>(payload: T[] | ProjectListEnvelope<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.members ??
    payload.messages ??
    payload.data ??
    payload.items ??
    payload.records ??
    payload.results ??
    []
  );
}

function unwrapProjectItem<T>(payload: T | ProjectItemEnvelope<T>): T {
  if (typeof payload !== "object" || payload === null) {
    return payload as T;
  }

  const envelope = payload as ProjectItemEnvelope<T>;

  return envelope.data ?? envelope.item ?? (
    typeof envelope.message === "object" && envelope.message !== null
      ? envelope.message
      : payload as T
  );
}

function getProjectConversationError(response: Response): string | null {
  return response.status === 403
    ? "No tienes acceso a este proyecto o conversación."
    : null;
}

async function getProjectList<T>(path: string, authenticatedToken?: string): Promise<T[]> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const accessError = getProjectConversationError(response);

  if (accessError) {
    throw new Error(accessError);
  }

  return unwrapProjectList(await parseJsonResponse<T[] | ProjectListEnvelope<T>>(response));
}

async function sendProjectMessage<T>(
  path: string,
  message: string,
  authenticatedToken?: string
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify({ message }),
  });
  const accessError = getProjectConversationError(response);

  if (accessError) {
    throw new Error(accessError);
  }

  return unwrapProjectItem(await parseJsonResponse<T | ProjectItemEnvelope<T>>(response));
}

async function getCrew(path: string, authenticatedToken?: string): Promise<CrewMember[]> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (response.status === 404 || response.status === 405) {
    throw new Error("No hay datos de equipo disponibles todavía.");
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapCrewList(await parseJsonResponse<CrewMember[] | CrewListEnvelope>(response));
}

export async function getProducerCrew(authenticatedToken?: string): Promise<CrewMember[]> {
  return await getCrew("/producer/crew", authenticatedToken);
}

export async function getMyCrewCrm(
  options: { summary?: boolean } = { summary: true },
  authenticatedToken?: string
): Promise<CrewCrmProject[] | CrewMember[]> {
  const searchParams = new URLSearchParams({
    summary: options.summary === false ? "false" : "true",
  });
  const response = await fetch(`${API_URL}/crew/me/crm?${searchParams.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapCrewCrm(
    await parseJsonResponse<CrewCrmProject[] | CrewMember[] | CrewCrmEnvelope>(response)
  );
}

export async function getTalentCrew(authenticatedToken?: string): Promise<CrewMember[]> {
  return await getCrew("/talent/crew", authenticatedToken);
}

export async function getMyCrewFeed(
  cursor?: string | null,
  authenticatedToken?: string
): Promise<CrewFeed> {
  const searchParams = new URLSearchParams({
    limit: "10",
    summary: "false",
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(`${API_URL}/crew/me/feed?${searchParams.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<CrewFeedEnvelope>(response);

  return {
    items: payload.items ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getMyCrewSummary(authenticatedToken?: string): Promise<CrewSummary> {
  const response = await fetch(`${API_URL}/crew/me/summary`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });
  const payload = await parseJsonResponse<CrewSummaryEnvelope>(response);
  const summary = "summary" in payload ? payload.summary : payload;

  return {
    ...EMPTY_CREW_SUMMARY,
    ...summary,
  };
}

export async function getCrewMessages(crewMemberId: string, authenticatedToken?: string): Promise<CrewMessage[]> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}/messages`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapCrewMessages(await parseJsonResponse<CrewMessage[] | CrewMessageEnvelope>(response));
}

export async function updateCrewMember(
  crewMemberId: string,
  payload: CrewMemberUpdatePayload,
  authenticatedToken?: string
): Promise<CrewMember> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
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

export async function updateCrewProjectMember(
  projectId: string,
  memberId: string,
  payload: CrewMemberUpdatePayload,
  authenticatedToken?: string
): Promise<CrewMember> {
  const response = await fetch(
    `${API_URL}/crew/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: await getAuthenticatedHeaders(
        { "Content-Type": "application/json" },
        authenticatedToken
      ),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return {
      id: memberId,
      project_id: projectId,
      ...payload,
    };
  }

  return unwrapCrewMember(await parseJsonResponse<CrewMember | CrewMemberEnvelope>(response));
}

export async function removeCrewProjectMember(
  projectId: string,
  memberId: string,
  authenticatedToken?: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/crew/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
      headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

export async function sendCrewMessage(
  crewMemberId: string,
  payload: CrewMessagePayload,
  authenticatedToken?: string
): Promise<unknown> {
  const response = await fetch(`${API_URL}/crew/${crewMemberId}/messages`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
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

export async function getCrewProjectMembers(
  projectId: string,
  authenticatedToken?: string
): Promise<CrewProjectMember[]> {
  return await getProjectList(
    `/crew/projects/${encodeURIComponent(projectId)}/members`,
    authenticatedToken
  );
}

export async function getCrewProjectTeamMessages(
  projectId: string,
  authenticatedToken?: string
): Promise<CrewProjectMessage[]> {
  return await getProjectList(
    `/crew/projects/${encodeURIComponent(projectId)}/team-chat/messages`,
    authenticatedToken
  );
}

export async function sendCrewProjectTeamMessage(
  projectId: string,
  message: string,
  authenticatedToken?: string
): Promise<CrewProjectMessage> {
  return await sendProjectMessage(
    `/crew/projects/${encodeURIComponent(projectId)}/team-chat/messages`,
    message,
    authenticatedToken
  );
}

export async function getCrewDirectMessages(
  projectId: string,
  otherUserUid: string,
  authenticatedToken?: string
): Promise<CrewDirectMessage[]> {
  return await getProjectList(
    `/crew/projects/${encodeURIComponent(projectId)}/direct-messages/${encodeURIComponent(otherUserUid)}`,
    authenticatedToken
  );
}

export async function sendCrewDirectMessage(
  projectId: string,
  otherUserUid: string,
  message: string,
  authenticatedToken?: string
): Promise<CrewDirectMessage> {
  return await sendProjectMessage(
    `/crew/projects/${encodeURIComponent(projectId)}/direct-messages/${encodeURIComponent(otherUserUid)}`,
    message,
    authenticatedToken
  );
}
