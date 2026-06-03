import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ConversationPermissionError,
  getConversationInfo,
  getConversationMessages,
  getMyConversations,
  sendConversationMessage,
  uploadConversationTeamPhoto,
  updateConversationTeamSettings,
} from "../../service/messagesApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  Conversation,
  ConversationInfo,
  ConversationMessage,
  ConversationParticipant,
} from "../../types/messages";
import { useCurrentProfile } from "../useCurrentProfile";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/messages.css";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_TEAM_PHOTO_SIZE = 5 * 1024 * 1024;
const TEAM_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const crewMessagesBaseTexts = [
  "Chat del equipo",
  "Proyecto",
  "No se pudo cargar la información.",
  "La foto debe ser JPG, PNG o WebP.",
  "La foto no puede superar 5 MB.",
  "No se pudo subir la foto del grupo.",
  "No tienes permisos para cambiar la foto del grupo.",
  "Ingresa un nombre para el grupo.",
  "No se pudo actualizar el grupo.",
  "No tienes permisos para cambiar el nombre del grupo.",
  "Escribe un mensaje de hasta 1000 caracteres.",
  "Usuario",
  "Mensajes",
  "Conversaciones directas y chats de equipo en un solo lugar.",
  "Conversaciones",
  "Buscar conversaciones",
  "No hay resultados para tu busqueda.",
  "No tienes conversaciones todavia.",
  "Equipo",
  "Directo",
  "integrante",
  "integrantes",
  "Proyecto sin informar",
  "Todavia no hay mensajes.",
  "Cargando...",
  "Cargar mas conversaciones",
  "Volver",
  "Ver información",
  "sin informar",
  "Todavia no hay mensajes en esta conversacion.",
  "Nuevo mensaje",
  "Escribe un mensaje",
  "Enviando...",
  "Enviar",
  "Selecciona una conversacion",
  "Elige un chat directo o de equipo para revisar sus mensajes.",
  "Información del grupo",
  "Información del contacto",
  "Cerrar",
  "Cambiar foto",
  "Subiendo...",
  "Subiendo foto...",
  "Nombre del grupo",
  "Cancelar",
  "Guardando...",
  "Guardar",
  "Editar nombre",
  "Integrantes",
  "Rol no informado",
  "Sin tarea asignada",
  "Activo",
  "Abierta",
  "Aceptada",
  "Pendiente",
  "Completada",
  "Finalizada",
  "Cancelada",
  "Rechazada",
  "Sin estado",
  "En revisión",
];

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function getInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function sortMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function appendUniqueConversations(
  current: Conversation[],
  next: Conversation[]
): Conversation[] {
  const byId = new Map(current.map((conversation) => [conversation.id, conversation]));

  next.forEach((conversation) => byId.set(conversation.id, conversation));
  return Array.from(byId.values());
}

function getOtherParticipant(
  participants: ConversationParticipant[],
  currentUserUid?: string
): ConversationParticipant | null {
  return participants.find(({ user_uid }) => user_uid !== currentUserUid) ?? participants[0] ?? null;
}

function getParticipantsCount(
  conversation: Pick<Conversation, "participants" | "participants_count">
): number {
  return conversation.participants_count ?? conversation.participants.length;
}

function getDirectSummary(conversation: Conversation, currentUserUid?: string): string {
  const role = getOtherParticipant(conversation.participants, currentUserUid)?.role?.trim();
  const project = conversation.project_title?.trim();

  return [role, project].filter(Boolean).join(" • ") || conversation.subtitle || "Conversacion directa";
}

function formatParticipantStatusLabel(value?: string | null): string {
  const normalized = (value ?? "").trim().toUpperCase();

  switch (normalized) {
    case "ACTIVE":
    case "ACTIVO":
      return "Activo";
    case "OPEN":
    case "ABIERTA":
      return "Abierta";
    case "ACCEPTED":
    case "ACEPTADA":
      return "Aceptada";
    case "PENDING":
    case "PENDIENTE":
      return "Pendiente";
    case "COMPLETED":
    case "FINALIZADA":
      return "Finalizada";
    case "CANCELLED":
    case "CANCELED":
    case "CANCELADA":
      return "Cancelada";
    case "REJECTED":
    case "RECHAZADA":
      return "Rechazada";
    default:
      return value?.trim() || "Sin estado";
  }
}

function ConversationAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  return (
    <span className="messages-avatar" aria-hidden="true">
      {photoUrl ? <img alt="" src={photoUrl} /> : getInitial(name)}
    </span>
  );
}

function CrewMessages() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const teamPhotoInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConversationIdRef = useRef(searchParams.get("conversationId") ?? "");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ConversationMessage[]>
  >({});
  const [loadedConversationIds, setLoadedConversationIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [infoByConversation, setInfoByConversation] = useState<Record<string, ConversationInfo>>({});
  const [infoConversationId, setInfoConversationId] = useState("");
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isUploadingTeamPhoto, setIsUploadingTeamPhoto] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamPhoto, setTeamPhoto] = useState<File | null>(null);
  const [teamPhotoPreviewUrl, setTeamPhotoPreviewUrl] = useState("");
  const [isTeamNameForbidden, setIsTeamNameForbidden] = useState(false);
  const [teamNameError, setTeamNameError] = useState("");
  const [teamPhotoError, setTeamPhotoError] = useState("");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        crewMessagesBaseTexts,
        conversations.flatMap((conversation) => [
          conversation.title,
          conversation.subtitle,
          conversation.project_title,
          conversation.last_message,
          getDirectSummary(conversation, profile?.uid),
        ]),
        Object.values(messagesByConversation).flatMap((messages) =>
          messages.flatMap((message) => [message.message, message.sender_role])
        ),
        Object.values(infoByConversation).flatMap((info) => [
          info.title,
          info.subtitle,
          info.project_title,
          ...info.participants.flatMap((participant) => [
            participant.role,
            participant.task_description,
            formatParticipantStatusLabel(participant.status),
          ]),
        ])
      ),
    [conversations, infoByConversation, messagesByConversation, profile?.uid]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    return () => {
      if (teamPhotoPreviewUrl) {
        URL.revokeObjectURL(teamPhotoPreviewUrl);
      }
    };
  }, [teamPhotoPreviewUrl]);

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoadingConversations(true);
      return;
    }

    if (!user || !token || !profile) {
      setConversations([]);
      setNextCursor(null);
      setError("");
      setIsLoadingConversations(false);
      return;
    }

    let isMounted = true;
    const authenticatedToken = token;

    async function loadConversations() {
      try {
        setError("");
        setIsLoadingConversations(true);
        const feed = await reusePendingRequest(
          `my-conversations:${authenticatedToken}:initial`,
          () => getMyConversations(null, authenticatedToken)
        );

        if (!isMounted) {
          return;
        }

        setConversations(feed.items);
        setNextCursor(feed.next_cursor);

        const requestedConversationId = initialConversationIdRef.current;

        if (requestedConversationId && feed.items.some(({ id }) => id === requestedConversationId)) {
          setSelectedConversationId(requestedConversationId);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("messages.errors.loadConversations")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [isProfileLoading, profile, token, user]);

  const selectedConversation = useMemo(
    () => conversations.find(({ id }) => id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      [
        conversation.title,
        conversation.subtitle,
        conversation.project_title,
        conversation.last_message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [conversations, search]);

  useEffect(() => {
    if (!selectedConversationId || !token || loadedConversationIds.has(selectedConversationId)) {
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    const conversationId = selectedConversationId;
    const authenticatedToken = token;

    async function loadMessages() {
      try {
        setMessageError("");
        setIsLoadingMessages(true);
        const messages = await reusePendingRequest(
          `conversation-messages:${conversationId}:${authenticatedToken}`,
          () => getConversationMessages(conversationId, authenticatedToken)
        );

        if (isMounted) {
          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: sortMessages(messages),
          }));
          setLoadedConversationIds((current) => new Set(current).add(conversationId));
        }
      } catch (loadError) {
        if (isMounted) {
          setMessageError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("messages.errors.loadMessages")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [loadedConversationIds, selectedConversationId, token]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setDraftMessage("");
    setMessageError("");
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    );
    setSearchParams({ conversationId });
  };

  const handleLoadMore = async () => {
    if (!nextCursor || !token || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError("");
      const cursor = nextCursor;
      const feed = await reusePendingRequest(
        `my-conversations:${token}:${cursor}`,
        () => getMyConversations(cursor, token)
      );

      setConversations((current) => appendUniqueConversations(current, feed.items));
      setNextCursor(feed.next_cursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("messages.errors.loadConversations")
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const resetTeamPhotoSelection = () => {
    setTeamPhoto(null);
    setTeamPhotoPreviewUrl("");

    if (teamPhotoInputRef.current) {
      teamPhotoInputRef.current.value = "";
    }
  };

  const handleCloseInfo = () => {
    setInfoConversationId("");
    setIsEditingTeam(false);
    setIsTeamNameForbidden(false);
    setTeamNameError("");
    setTeamPhotoError("");
    resetTeamPhotoSelection();
  };

  const updateTeamLocally = (
    conversationId: string,
    updates: Partial<ConversationInfo>
  ) => {
    setInfoByConversation((current) => {
      const info = current[conversationId];

      return info
        ? { ...current, [conversationId]: { ...info, ...updates } }
        : current;
    });
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: updates.title ?? conversation.title,
              avatar_url: updates.avatar_url ?? conversation.avatar_url,
            }
          : conversation
      )
    );
  };

  const handleOpenInfo = async (conversation: Conversation) => {
    setInfoConversationId(conversation.id);
    setInfoError("");
    setIsEditingTeam(false);
    setIsTeamNameForbidden(false);
    setTeamNameError("");
    setTeamPhotoError("");
    resetTeamPhotoSelection();

    const cachedInfo = infoByConversation[conversation.id];

    if (cachedInfo) {
      setTeamName(cachedInfo.title);
      return;
    }

    if (!token) {
      return;
    }

    try {
      setIsInfoLoading(true);
      const info = await reusePendingRequest(
        `conversation-info:${conversation.id}:${token}`,
        () => getConversationInfo(conversation.id, token)
      );

      setInfoByConversation((current) => ({ ...current, [conversation.id]: info }));
      setTeamName(info.title);
    } catch {
      setInfoError(tAuto("No se pudo cargar la información."));
    } finally {
      setIsInfoLoading(false);
    }
  };

  const handleTeamPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextPhoto = event.target.files?.[0];

    if (!nextPhoto) {
      return;
    }

    if (!TEAM_PHOTO_TYPES.has(nextPhoto.type)) {
      setTeamPhotoError(tAuto("La foto debe ser JPG, PNG o WebP."));
      resetTeamPhotoSelection();
      return;
    }

    if (nextPhoto.size > MAX_TEAM_PHOTO_SIZE) {
      setTeamPhotoError(tAuto("La foto no puede superar 5 MB."));
      resetTeamPhotoSelection();
      return;
    }

    if (!infoConversationId || !token) {
      setTeamPhotoError(tAuto("No se pudo subir la foto del grupo."));
      resetTeamPhotoSelection();
      return;
    }

    setTeamPhotoError("");
    setTeamPhoto(nextPhoto);
    setTeamPhotoPreviewUrl(URL.createObjectURL(nextPhoto));

    try {
      setIsUploadingTeamPhoto(true);
      const uploadedPhoto = await uploadConversationTeamPhoto(
        infoConversationId,
        nextPhoto,
        token
      );

      updateTeamLocally(infoConversationId, { avatar_url: uploadedPhoto.photo_url });
      resetTeamPhotoSelection();
    } catch (uploadError) {
      if (uploadError instanceof ConversationPermissionError) {
        setTeamPhotoError(tAuto("No tienes permisos para cambiar la foto del grupo."));
      } else {
        setTeamPhotoError(
          uploadError instanceof Error ? uploadError.message : tAuto("No se pudo subir la foto del grupo.")
        );
      }
      resetTeamPhotoSelection();
    } finally {
      setIsUploadingTeamPhoto(false);
    }
  };

  const handleSaveTeamSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = teamName.trim();
    const currentInfo = infoByConversation[infoConversationId];

    if (!infoConversationId || !token || !name || !currentInfo) {
      setInfoError(tAuto("Ingresa un nombre para el grupo."));
      return;
    }

    try {
      setIsSavingTeam(true);
      setTeamNameError("");

      const updatedInfo = await updateConversationTeamSettings(
        infoConversationId,
        { name },
        token
      );
      const nextInfo: ConversationInfo = {
        ...currentInfo,
        ...updatedInfo,
        id: updatedInfo.id ?? currentInfo.id,
        type: updatedInfo.type ?? currentInfo.type,
        project_id: updatedInfo.project_id ?? currentInfo.project_id,
        project_title: updatedInfo.project_title ?? currentInfo.project_title,
        title: updatedInfo.title || name,
        subtitle: updatedInfo.subtitle ?? currentInfo.subtitle,
        avatar_url: updatedInfo.avatar_url ?? currentInfo.avatar_url,
        participants: updatedInfo.participants ?? currentInfo.participants,
        participants_count: updatedInfo.participants_count ?? currentInfo.participants_count,
        can_edit_team_settings:
          updatedInfo.can_edit_team_settings ?? currentInfo.can_edit_team_settings,
      };

      setInfoByConversation((current) => ({ ...current, [infoConversationId]: nextInfo }));
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === infoConversationId
            ? {
                ...conversation,
                title: nextInfo.title,
                avatar_url: nextInfo.avatar_url,
              }
            : conversation
        )
      );
      setTeamName(nextInfo.title);
      setIsEditingTeam(false);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : tAuto("No se pudo actualizar el grupo.");

      if (saveError instanceof ConversationPermissionError) {
        setIsTeamNameForbidden(true);
        setIsEditingTeam(false);
        setTeamNameError(tAuto("No tienes permisos para cambiar el nombre del grupo."));
      } else {
        setTeamNameError(message);
      }
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draftMessage.trim();

    if (!selectedConversationId || !token || !message || message.length > MAX_MESSAGE_LENGTH) {
      setMessageError(tAuto("Escribe un mensaje de hasta 1000 caracteres."));
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const previousConversation = conversations.find(({ id }) => id === selectedConversationId);
    const optimisticMessage: ConversationMessage = {
      id: optimisticId,
      conversation_id: selectedConversationId,
      project_id: selectedConversation?.project_id ?? null,
      sender_uid: profile?.uid ?? "",
      sender_name: profile?.name ?? tAuto("Usuario"),
      sender_role: profile?.role ?? "",
      sender_photo_url: profile?.photo_url ?? profile?.picture ?? null,
      message,
      created_at: new Date().toISOString(),
    };

    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversationId]: sortMessages([
        ...(current[selectedConversationId] ?? []),
        optimisticMessage,
      ]),
    }));
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversationId
          ? {
              ...conversation,
              last_message: optimisticMessage.message,
              last_message_at: optimisticMessage.created_at,
            }
          : conversation
      )
    );
    setDraftMessage("");

    try {
      setIsSending(true);
      setMessageError("");
      const sentMessage = await sendConversationMessage(selectedConversationId, message, token);

      setMessagesByConversation((current) => ({
        ...current,
        [selectedConversationId]: sortMessages(
          (current[selectedConversationId] ?? []).map((item) =>
            item.id === optimisticId ? sentMessage : item
          )
        ),
      }));
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                last_message: sentMessage.message,
                last_message_at: sentMessage.created_at,
              }
            : conversation
        )
      );
    } catch (sendError) {
      setMessagesByConversation((current) => ({
        ...current,
        [selectedConversationId]: (current[selectedConversationId] ?? []).filter(
          ({ id }) => id !== optimisticId
        ),
      }));
      if (previousConversation) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId ? previousConversation : conversation
          )
        );
      }
      setDraftMessage((current) => current || message);
      setMessageError(
        sendError instanceof Error ? sendError.message : t("messages.errors.send")
      );
    } finally {
      setIsSending(false);
    }
  };

  const selectedMessages = selectedConversationId
    ? messagesByConversation[selectedConversationId] ?? []
    : [];
  const infoConversation = conversations.find(({ id }) => id === infoConversationId) ?? null;
  const conversationInfo = infoConversationId ? infoByConversation[infoConversationId] ?? null : null;
  const infoContact = conversationInfo?.type === "DIRECT"
    ? getOtherParticipant(conversationInfo.participants, profile?.uid)
    : null;
  const canEditTeamName =
    profile?.role === "PRODUCER" &&
    conversationInfo?.type === "TEAM" &&
    conversationInfo.can_edit_team_settings !== false &&
    !isTeamNameForbidden;
  const getVisibleConversationTitle = (conversation: Conversation | ConversationInfo): string => {
    if (conversation.type === "TEAM" && !conversation.title?.trim()) {
      return `${tAuto("Chat del equipo")} - ${
        conversation.project_title ? tAuto(conversation.project_title) : tAuto("Proyecto")
      }`;
    }

    return conversation.type === "TEAM"
      ? tAuto(conversation.title?.trim() || `${tAuto("Chat del equipo")} - ${conversation.project_title ? tAuto(conversation.project_title) : tAuto("Proyecto")}`)
      : tAuto(conversation.title);
  };

  return (
    <div className="messages-page">
      <section className="messages-card messages-banner">
        <div>
          <p className="messages-page__eyebrow">{tAuto("Mensajes")}</p>
          <h1 className="messages-page__title">{tAuto("Mensajes")}</h1>
          <p className="messages-page__subtitle">
            {tAuto("Conversaciones directas y chats de equipo en un solo lugar.")}
          </p>
        </div>
      </section>

      {error ? <p className="messages-feedback messages-feedback--error">{error}</p> : null}

      <section
        className={`messages-workspace ${selectedConversation ? "messages-workspace--chat-open" : ""}`}
      >
        <aside className="messages-sidebar">
          <header className="messages-sidebar__header">
            <h2>{tAuto("Conversaciones")}</h2>
            <label className="messages-search">
              <span className="sr-only">{tAuto("Buscar conversaciones")}</span>
              <input
                type="search"
                placeholder={tAuto("Buscar conversaciones")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </header>

          <div className="messages-thread-list" aria-label={tAuto("Conversaciones")}>
            {isLoadingConversations ? (
              Array.from({ length: 5 }, (_, index) => (
                <div className="messages-thread-skeleton" key={index}>
                  <span />
                  <div><strong /><small /><small /></div>
                </div>
              ))
            ) : filteredConversations.length === 0 ? (
              <p className="messages-empty">
                {conversations.length
                  ? tAuto("No hay resultados para tu busqueda.")
                  : tAuto("No tienes conversaciones todavia.")}
              </p>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  className={`messages-thread ${
                    conversation.id === selectedConversationId ? "messages-thread--active" : ""
                  }`}
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <ConversationAvatar
                    name={getVisibleConversationTitle(conversation)}
                    photoUrl={conversation.avatar_url}
                  />
                  <span className="messages-thread__body">
                    <span className="messages-thread__heading">
                      <strong>{getVisibleConversationTitle(conversation)}</strong>
                      <small>{formatDate(conversation.last_message_at, i18n.language, "")}</small>
                    </span>
                    {conversation.type === "TEAM" ? (
                      <>
                        <span className="messages-thread__meta">
                          <b>{tAuto("Equipo")}</b>
                          <span>
                            🟢 {getParticipantsCount(conversation)}{" "}
                            {getParticipantsCount(conversation) === 1
                              ? tAuto("integrante")
                              : tAuto("integrantes")}
                          </span>
                        </span>
                        <span className="messages-thread__context">
                          🎬 {conversation.project_title ? tAuto(conversation.project_title) : tAuto("Proyecto sin informar")}
                        </span>
                      </>
                    ) : (
                      <span className="messages-thread__context">
                        {tAuto(getDirectSummary(conversation, profile?.uid))}
                      </span>
                    )}
                    <span className="messages-thread__footer">
                      <span>{conversation.last_message ? tAuto(conversation.last_message) : tAuto("Todavia no hay mensajes.")}</span>
                      {conversation.unread_count > 0 ? <b>{conversation.unread_count}</b> : null}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          {nextCursor ? (
            <button
              className="messages-button messages-sidebar__more"
              type="button"
              disabled={isLoadingMore}
              onClick={() => void handleLoadMore()}
            >
              {isLoadingMore ? tAuto("Cargando...") : tAuto("Cargar mas conversaciones")}
            </button>
          ) : null}
        </aside>

        <section className="messages-chat">
          {selectedConversation ? (
            <>
              <header className="messages-chat__header">
                <button
                  className="messages-chat__back"
                  type="button"
                  onClick={() => {
                    setSelectedConversationId("");
                    setSearchParams({});
                  }}
                >
                  {tAuto("Volver")}
                </button>
                <button
                  className="messages-chat__info-trigger"
                  type="button"
                  title={tAuto("Ver información")}
                  onClick={() => void handleOpenInfo(selectedConversation)}
                >
                  <ConversationAvatar
                    name={getVisibleConversationTitle(selectedConversation)}
                    photoUrl={selectedConversation.avatar_url}
                  />
                  <span>
                    <h2>{getVisibleConversationTitle(selectedConversation)}</h2>
                    <small>
                      {selectedConversation.type === "TEAM"
                        ? `${tAuto("Proyecto")} ${selectedConversation.project_title ? tAuto(selectedConversation.project_title) : tAuto("sin informar")}`
                        : tAuto(getDirectSummary(selectedConversation, profile?.uid))}
                    </small>
                  </span>
                </button>
                <b className={`messages-type messages-type--${selectedConversation.type.toLowerCase()}`}>
                  {selectedConversation.type === "TEAM" ? tAuto("Equipo") : tAuto("Directo")}
                </b>
              </header>

              {messageError ? (
                <p className="messages-feedback messages-feedback--error">{messageError}</p>
              ) : null}

              <div className="messages-history" aria-live="polite">
                {isLoadingMessages ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <div className="messages-bubble-skeleton" key={index}>
                      <strong />
                      <span />
                      <small />
                    </div>
                  ))
                ) : selectedMessages.length === 0 ? (
                  <p className="messages-history__empty">
                    {tAuto("Todavia no hay mensajes en esta conversacion.")}
                  </p>
                ) : (
                  selectedMessages.map((item) => (
                    <article
                      className={`messages-bubble ${
                        item.sender_uid === profile?.uid ? "messages-bubble--own" : ""
                      }`}
                      key={item.id}
                    >
                      <div className="messages-bubble__heading">
                        <ConversationAvatar name={item.sender_name} photoUrl={item.sender_photo_url} />
                        <span>
                          <strong>{item.sender_name}</strong>
                          <small>{tAuto(item.sender_role)}</small>
                        </span>
                      </div>
                      <p>{tAuto(item.message)}</p>
                      <time>{formatDate(item.created_at, i18n.language, t("common.noDate"))}</time>
                    </article>
                  ))
                )}
              </div>

              <form className="messages-compose" onSubmit={handleSubmit}>
                <label>
                  <span className="sr-only">{tAuto("Nuevo mensaje")}</span>
                  <textarea
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder={tAuto("Escribe un mensaje")}
                    rows={2}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                  />
                  <small>{draftMessage.length}/{MAX_MESSAGE_LENGTH}</small>
                </label>
                <button
                  className="messages-button messages-button--primary"
                  type="submit"
                  disabled={isSending || !draftMessage.trim()}
                >
                  {isSending ? tAuto("Enviando...") : tAuto("Enviar")}
                </button>
              </form>
            </>
          ) : (
            <div className="messages-chat__welcome">
              <h2>{tAuto("Selecciona una conversacion")}</h2>
              <p>{tAuto("Elige un chat directo o de equipo para revisar sus mensajes.")}</p>
            </div>
          )}
        </section>
      </section>

      {infoConversation ? (
        <div
          className="messages-info-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              handleCloseInfo();
            }
          }}
        >
          <section
            className="messages-info-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              infoConversation.type === "TEAM"
                ? tAuto("Información del grupo")
                : tAuto("Información del contacto")
            }
          >
            <header className="messages-info-modal__header">
              <div>
                <p>
                  {infoConversation.type === "TEAM"
                    ? tAuto("Información del grupo")
                    : tAuto("Información del contacto")}
                </p>
                <h2>{getVisibleConversationTitle(infoConversation)}</h2>
              </div>
              <button className="messages-button" type="button" onClick={handleCloseInfo}>
                {tAuto("Cerrar")}
              </button>
            </header>

            {isInfoLoading ? (
              <div className="messages-info-skeleton">
                <span />
                <strong />
                <small />
                <small />
              </div>
            ) : infoError && !conversationInfo ? (
              <p className="messages-feedback messages-feedback--error">{infoError}</p>
            ) : conversationInfo?.type === "TEAM" ? (
              <>
                <div className="messages-info-profile">
                  <button
                    className="messages-info-photo-trigger"
                    type="button"
                    disabled={isUploadingTeamPhoto}
                    title={tAuto("Cambiar foto")}
                    onClick={() => teamPhotoInputRef.current?.click()}
                  >
                    <ConversationAvatar
                      name={getVisibleConversationTitle(conversationInfo)}
                      photoUrl={teamPhotoPreviewUrl || conversationInfo.avatar_url}
                    />
                    <span>{isUploadingTeamPhoto ? tAuto("Subiendo...") : tAuto("Cambiar foto")}</span>
                  </button>
                  <div>
                    <h3>{getVisibleConversationTitle(conversationInfo)}</h3>
                    <p>{tAuto("Proyecto")} {conversationInfo.project_title ? tAuto(conversationInfo.project_title) : tAuto("sin informar")}</p>
                    <span>
                      {getParticipantsCount(conversationInfo)}{" "}
                      {getParticipantsCount(conversationInfo) === 1
                        ? tAuto("integrante")
                        : tAuto("integrantes")}
                    </span>
                  </div>
                </div>

                {infoError ? <p className="messages-feedback messages-feedback--error">{infoError}</p> : null}
                {teamPhotoError ? <p className="messages-feedback messages-feedback--error">{teamPhotoError}</p> : null}
                {teamNameError ? <p className="messages-feedback messages-feedback--error">{teamNameError}</p> : null}

                <input
                  ref={teamPhotoInputRef}
                  className="messages-info-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void handleTeamPhotoChange(event)}
                />

                <div className="messages-info-photo-actions">
                  <button
                    className="messages-button"
                    type="button"
                    disabled={isUploadingTeamPhoto}
                    onClick={() => teamPhotoInputRef.current?.click()}
                  >
                    {isUploadingTeamPhoto ? tAuto("Subiendo foto...") : tAuto("Cambiar foto")}
                  </button>
                  {teamPhoto ? <span>{teamPhoto.name}</span> : null}
                </div>

                {isEditingTeam && canEditTeamName ? (
                  <form className="messages-info-form" onSubmit={handleSaveTeamSettings}>
                    <label>
                      <span>{tAuto("Nombre del grupo")}</span>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(event) => setTeamName(event.target.value)}
                      />
                    </label>
                    <div className="messages-info-actions">
                      <button
                        className="messages-button"
                        type="button"
                        onClick={() => setIsEditingTeam(false)}
                      >
                        {tAuto("Cancelar")}
                      </button>
                      <button className="messages-button messages-button--primary" type="submit" disabled={isSavingTeam}>
                        {isSavingTeam ? tAuto("Guardando...") : tAuto("Guardar")}
                      </button>
                    </div>
                  </form>
                ) : canEditTeamName ? (
                  <div className="messages-info-actions">
                    <button className="messages-button messages-button--primary" type="button" onClick={() => setIsEditingTeam(true)}>
                      {tAuto("Editar nombre")}
                    </button>
                  </div>
                ) : null}

                <div className="messages-info-section">
                  <h3>{tAuto("Integrantes")}</h3>
                  <div className="messages-info-members">
                    {conversationInfo.participants.map((participant) => (
                      <article className="messages-info-member" key={participant.user_uid}>
                        <ConversationAvatar name={participant.name} photoUrl={participant.photo_url} />
                        <div>
                          <h4>{participant.name}</h4>
                          <p>{participant.role ? tAuto(participant.role) : tAuto("Rol no informado")}</p>
                          <span>{participant.task_description ? tAuto(participant.task_description) : tAuto("Sin tarea asignada")}</span>
                          {participant.status ? (
                            <small className="messages-info-status">
                              {tAuto(formatParticipantStatusLabel(participant.status))}
                            </small>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : conversationInfo?.type === "DIRECT" && infoContact ? (
              <div className="messages-info-profile messages-info-profile--contact">
                <ConversationAvatar name={infoContact.name} photoUrl={infoContact.photo_url} />
                <div>
                  <h3>{infoContact.name}</h3>
                  <p>{tAuto("Proyecto")} {conversationInfo.project_title ? tAuto(conversationInfo.project_title) : tAuto("sin informar")}</p>
                  <span>{infoContact.role || tAuto("Rol no informado")}</span>
                  {infoContact.email ? <a href={`mailto:${infoContact.email}`}>{infoContact.email}</a> : null}
                </div>
              </div>
            ) : (
              <p className="messages-feedback messages-feedback--error">
                {tAuto("No se pudo cargar la información.")}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default CrewMessages;
