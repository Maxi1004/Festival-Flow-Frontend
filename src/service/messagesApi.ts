import API_URL from "../config/api";
import type {
  Conversation,
  ConversationFeed,
  ConversationInfo,
  ConversationMessage,
  ConversationTeamPhotoResponse,
  ConversationTeamSettingsPayload,
} from "../types/messages";
import {
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";

type ConversationFeedEnvelope = {
  conversations?: Conversation[];
  data?: Conversation[];
  items?: Conversation[];
  next_cursor?: string | null;
};

type ConversationMessagesEnvelope = {
  data?: ConversationMessage[];
  items?: ConversationMessage[];
  messages?: ConversationMessage[];
};

type ConversationMessageEnvelope = {
  data?: ConversationMessage;
  item?: ConversationMessage;
  message?: ConversationMessage;
};

type RawConversationInfo = Partial<ConversationInfo> & {
  conversation_id?: string;
  contact?: ConversationInfo["participants"][number];
  members?: ConversationInfo["participants"];
  members_count?: number | null;
  name?: string;
  photo_url?: string | null;
};

type ConversationInfoEnvelope = {
  conversation?: RawConversationInfo;
  data?: RawConversationInfo;
  info?: RawConversationInfo;
};

type ConversationTeamSettingsEnvelope = {
  conversation?: RawConversationInfo;
  data?: RawConversationInfo;
  settings?: RawConversationInfo;
};

export class ConversationPermissionError extends Error {}

async function throwConversationError(response: Response): Promise<never> {
  if (response.status === 403) {
    throw new ConversationPermissionError("No tienes permisos para realizar esta accion.");
  }

  throw new Error(await getErrorMessage(response));
}

function unwrapConversations(payload: Conversation[] | ConversationFeedEnvelope): ConversationFeed {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      next_cursor: null,
    };
  }

  return {
    items: payload.items ?? payload.conversations ?? payload.data ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

function unwrapMessages(
  payload: ConversationMessage[] | ConversationMessagesEnvelope
): ConversationMessage[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? payload.messages ?? payload.data ?? [];
}

function unwrapMessage(
  payload: ConversationMessage | ConversationMessageEnvelope
): ConversationMessage {
  if ("id" in payload && "conversation_id" in payload) {
    return payload;
  }

  const message = payload.item ?? payload.message ?? payload.data;

  if (!message) {
    throw new Error("El servidor no devolvio el mensaje enviado.");
  }

  return message;
}

function unwrapConversationInfo(
  payload: RawConversationInfo | ConversationInfoEnvelope
): ConversationInfo {
  const envelope = payload as ConversationInfoEnvelope;
  const rawInfo = "type" in payload
    ? payload as RawConversationInfo
    : envelope.info ?? envelope.conversation ?? envelope.data;

  if (!rawInfo?.type || !(rawInfo.id || rawInfo.conversation_id)) {
    throw new Error("No se pudo cargar la informacion.");
  }

  return {
    id: rawInfo.id ?? rawInfo.conversation_id!,
    type: rawInfo.type,
    project_id: rawInfo.project_id ?? null,
    project_title: rawInfo.project_title ?? null,
    title: rawInfo.title ?? rawInfo.name ?? "",
    subtitle: rawInfo.subtitle ?? null,
    avatar_url: rawInfo.avatar_url ?? rawInfo.photo_url ?? null,
    participants: rawInfo.participants ?? rawInfo.members ?? (rawInfo.contact ? [rawInfo.contact] : []),
    participants_count:
      rawInfo.participants_count ?? rawInfo.members_count ?? rawInfo.participants?.length ?? rawInfo.members?.length ?? 0,
    can_edit_team_settings: rawInfo.can_edit_team_settings,
  };
}

export async function getMyConversations(
  cursor?: string | null,
  authenticatedToken?: string
): Promise<ConversationFeed> {
  const searchParams = new URLSearchParams({ limit: "20" });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(`${API_URL}/messages/me/conversations?${searchParams.toString()}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapConversations(
    await parseJsonResponse<Conversation[] | ConversationFeedEnvelope>(response)
  );
}

export async function getConversationMessages(
  conversationId: string,
  authenticatedToken?: string
): Promise<ConversationMessage[]> {
  const response = await fetch(
    `${API_URL}/messages/me/conversations/${encodeURIComponent(conversationId)}/messages?limit=50`,
    {
      method: "GET",
      headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
    }
  );

  return unwrapMessages(
    await parseJsonResponse<ConversationMessage[] | ConversationMessagesEnvelope>(response)
  );
}

export async function sendConversationMessage(
  conversationId: string,
  message: string,
  authenticatedToken?: string
): Promise<ConversationMessage> {
  const response = await fetch(
    `${API_URL}/messages/me/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: await getAuthenticatedHeaders(
        { "Content-Type": "application/json" },
        authenticatedToken
      ),
      body: JSON.stringify({ message }),
    }
  );

  return unwrapMessage(
    await parseJsonResponse<ConversationMessage | ConversationMessageEnvelope>(response)
  );
}

export async function getConversationInfo(
  conversationId: string,
  authenticatedToken?: string
): Promise<ConversationInfo> {
  const response = await fetch(
    `${API_URL}/messages/me/conversations/${encodeURIComponent(conversationId)}/info`,
    {
      method: "GET",
      headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
    }
  );

  return unwrapConversationInfo(
    await parseJsonResponse<ConversationInfo | ConversationInfoEnvelope>(response)
  );
}

export async function updateConversationTeamSettings(
  conversationId: string,
  payload: ConversationTeamSettingsPayload,
  authenticatedToken?: string
): Promise<Partial<ConversationInfo>> {
  const response = await fetch(
    `${API_URL}/messages/me/conversations/${encodeURIComponent(conversationId)}/team-settings`,
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
    return await throwConversationError(response);
  }

  if (response.status === 204) {
    return {
      title: payload.name,
    };
  }

  const responsePayload = await parseJsonResponse<RawConversationInfo | ConversationTeamSettingsEnvelope>(response);
  const envelope = responsePayload as ConversationTeamSettingsEnvelope;
  const settings = "id" in responsePayload || "conversation_id" in responsePayload || "title" in responsePayload || "name" in responsePayload
    ? responsePayload as RawConversationInfo
    : envelope.settings ?? envelope.conversation ?? envelope.data ?? {};

  return {
    id: settings.id ?? settings.conversation_id,
    type: settings.type,
    project_id: settings.project_id,
    project_title: settings.project_title,
    title: settings.title ?? settings.name,
    subtitle: settings.subtitle,
    avatar_url: settings.avatar_url ?? settings.photo_url,
    participants: settings.participants ?? settings.members,
    participants_count: settings.participants_count ?? settings.members_count,
    can_edit_team_settings: settings.can_edit_team_settings,
  };
}

export async function uploadConversationTeamPhoto(
  conversationId: string,
  photo: File,
  authenticatedToken?: string
): Promise<ConversationTeamPhotoResponse> {
  const formData = new FormData();
  formData.append("file", photo);

  const response = await fetch(
    `${API_URL}/messages/me/conversations/${encodeURIComponent(conversationId)}/team-photo`,
    {
      method: "POST",
      headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
      body: formData,
    }
  );

  if (!response.ok) {
    return await throwConversationError(response);
  }

  return await parseJsonResponse<ConversationTeamPhotoResponse>(response);
}
