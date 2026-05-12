import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCrewMessages, getProducerCrew, getTalentCrew, sendCrewMessage } from "../../service/crewApi";
import type { CrewMember, CrewMessage } from "../../types/talent";
import "../../styles/messages.css";

type CrewMessagesProps = {
  mode: "PRODUCER" | "TALENT";
};

type Conversation = {
  member: CrewMember;
  messages: CrewMessage[];
};

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getProjectTitle(member: CrewMember, fallback: string): string {
  return member.project?.title?.trim() || member.project?.name?.trim() || fallback;
}

function getTalentName(member: CrewMember, fallback: string): string {
  return (
    member.talent_name?.trim() ||
    member.talent?.name?.trim() ||
    member.talent?.display_name?.trim() ||
    member.talent?.profile?.display_name?.trim() ||
    member.user?.name?.trim() ||
    member.user?.display_name?.trim() ||
    fallback
  );
}

function getProducerName(member: CrewMember, fallback: string): string {
  return (
    member.producer_name?.trim() ||
    member.producer?.name?.trim() ||
    member.producer?.display_name?.trim() ||
    member.producer_email?.trim() ||
    fallback
  );
}

function getRole(member: CrewMember, fallback: string): string {
  return member.role?.trim() || member.role_needed?.trim() || member.specialty?.trim() || fallback;
}

function getMemberId(member: CrewMember, index: number): string {
  return member.id ?? member.application_id ?? member.recruitment_id ?? `crew-${index}`;
}

function getLastMessage(messages: CrewMessage[]): CrewMessage | null {
  return messages.at(-1) ?? null;
}

function getConversationName(member: CrewMember, mode: CrewMessagesProps["mode"], fallback: string): string {
  return mode === "PRODUCER" ? getTalentName(member, fallback) : getProducerName(member, fallback);
}

function getInitialMessagesMap(crew: CrewMember[]): Record<string, CrewMessage[]> {
  return crew.reduce<Record<string, CrewMessage[]>>((accumulator, member, index) => {
    const memberId = getMemberId(member, index);
    accumulator[memberId] = member.messages ?? [];
    return accumulator;
  }, {});
}

function CrewMessages({ mode }: CrewMessagesProps) {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCrewIdRef = useRef(searchParams.get("crewId") ?? "");
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [messagesByMember, setMessagesByMember] = useState<Record<string, CrewMessage[]>>({});
  const [selectedCrewId, setSelectedCrewId] = useState(initialCrewIdRef.current);
  const [draftMessage, setDraftMessage] = useState("");
  const [isLoadingCrew, setIsLoadingCrew] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        setError("");
        setIsLoadingCrew(true);

        const nextCrew = mode === "PRODUCER" ? await getProducerCrew() : await getTalentCrew();

        if (!isMounted) {
          return;
        }

        setCrew(nextCrew);
        setMessagesByMember(getInitialMessagesMap(nextCrew));

        const requestedCrewId = initialCrewIdRef.current;
        const firstCrewId = nextCrew[0] ? getMemberId(nextCrew[0], 0) : "";
        const hasRequestedCrew = nextCrew.some((member, index) => getMemberId(member, index) === requestedCrewId);
        const nextSelectedCrewId = hasRequestedCrew ? requestedCrewId ?? "" : firstCrewId;

        setSelectedCrewId(nextSelectedCrewId);
        if (nextSelectedCrewId && nextSelectedCrewId !== requestedCrewId) {
          setSearchParams({ crewId: nextSelectedCrewId }, { replace: true });
        }

        const messageEntries = await Promise.all(
          nextCrew.map(async (member, index) => {
            const memberId = getMemberId(member, index);

            if (!member.id) {
              return [memberId, member.messages ?? []] as const;
            }

            try {
              return [memberId, await getCrewMessages(member.id)] as const;
            } catch {
              return [memberId, member.messages ?? []] as const;
            }
          })
        );

        if (isMounted) {
          setMessagesByMember(Object.fromEntries(messageEntries));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("messages.errors.loadConversations")
          );
          setCrew([]);
          setMessagesByMember({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingCrew(false);
        }
      }
    }

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [mode, setSearchParams, t]);

  const conversations = useMemo<Conversation[]>(
    () =>
      crew.map((member, index) => {
        const memberId = getMemberId(member, index);
        return {
          member,
          messages: messagesByMember[memberId] ?? member.messages ?? [],
        };
      }),
    [crew, messagesByMember]
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation, index) => getMemberId(conversation.member, index) === selectedCrewId
      ) ?? conversations[0] ?? null,
    [conversations, selectedCrewId]
  );

  useEffect(() => {
    const selectedMemberId = selectedConversation?.member.id;

    if (!selectedMemberId) {
      setIsLoadingMessages(false);
      return;
    }

    const crewMemberId = selectedMemberId;
    let isMounted = true;

    async function loadSelectedMessages() {
      try {
        setMessageError("");
        setIsLoadingMessages(true);
        const nextMessages = await getCrewMessages(crewMemberId);

        if (isMounted) {
          setMessagesByMember((current) => ({ ...current, [selectedCrewId]: nextMessages }));
        }
      } catch {
        if (isMounted) {
          setMessageError(t("messages.errors.loadMessages"));
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadSelectedMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConversation?.member.id, selectedCrewId, t]);

  const handleSelectConversation = (member: CrewMember, index: number) => {
    const memberId = getMemberId(member, index);
    setSelectedCrewId(memberId);
    setDraftMessage("");
    setMessageError("");
    setSuccessMessage("");
    setSearchParams({ crewId: memberId });
  };

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftMessage(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedConversation?.member.id || !draftMessage.trim()) {
      setMessageError(t("messages.errors.send"));
      return;
    }

    try {
      setIsSending(true);
      setMessageError("");
      setSuccessMessage("");
      await sendCrewMessage(selectedConversation.member.id, { message: draftMessage.trim() });
      const nextMessages = await getCrewMessages(selectedConversation.member.id);

      setMessagesByMember((current) => ({ ...current, [selectedCrewId]: nextMessages }));
      setDraftMessage("");
      setSuccessMessage(t("messages.sent"));
    } catch {
      setMessageError(t("messages.errors.send"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="messages-page">
      <section className="messages-card messages-banner">
        <div>
          <p className="messages-page__eyebrow">{t("messages.eyebrow")}</p>
          <h1 className="messages-page__title">{t("messages.title")}</h1>
          <p className="messages-page__subtitle">
            {t("messages.subtitle")}
          </p>
        </div>
      </section>

      {error ? <p className="messages-feedback messages-feedback--error">{error}</p> : null}
      {successMessage ? (
        <p className="messages-feedback messages-feedback--success">{successMessage}</p>
      ) : null}

      {isLoadingCrew ? (
        <section className="messages-card messages-empty">
          <p>{t("messages.loadingConversations")}</p>
        </section>
      ) : conversations.length === 0 ? (
        <section className="messages-card messages-empty">
          <p>{t("messages.noConversations")}</p>
        </section>
      ) : (
        <section className="messages-layout">
          <div className="messages-inbox" aria-label={t("messages.conversations")}>
            {conversations.map((conversation, index) => {
              const memberId = getMemberId(conversation.member, index);
              const lastMessage = getLastMessage(conversation.messages);
              const isActive = memberId === selectedCrewId;

              return (
                <button
                  key={memberId}
                  className={`messages-thread ${isActive ? "messages-thread--active" : ""}`}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.member, index)}
                >
                  <span className="messages-thread__project">
                    {getProjectTitle(conversation.member, t("crew.projectMissing"))}
                  </span>
                  <strong>
                    {getConversationName(
                      conversation.member,
                      mode,
                      mode === "PRODUCER" ? t("producer.talents.unnamed") : t("crew.producerMissing")
                    )}
                  </strong>
                  <span>{getRole(conversation.member, t("crew.roleMissing"))}</span>
                  <span className="messages-thread__preview">
                    {lastMessage?.message?.trim() || t("messages.noMessagesYet")}
                  </span>
                  <span className="messages-thread__date">
                    {formatDate(
                      lastMessage?.created_at || conversation.member.updated_at || conversation.member.created_at,
                      i18n.language,
                      t("common.noDate")
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="messages-card messages-chat">
            {selectedConversation ? (
              <>
                <div className="messages-chat__header">
                  <div>
                    <p className="messages-page__eyebrow">
                      {getProjectTitle(selectedConversation.member, t("crew.projectMissing"))}
                    </p>
                    <h2>
                      {getConversationName(
                        selectedConversation.member,
                        mode,
                        mode === "PRODUCER" ? t("producer.talents.unnamed") : t("crew.producerMissing")
                      )}
                    </h2>
                    <span>{getRole(selectedConversation.member, t("crew.roleMissing"))}</span>
                  </div>
                </div>

                {messageError ? (
                  <p className="messages-feedback messages-feedback--error">{messageError}</p>
                ) : null}

                <div className="messages-history" aria-live="polite">
                  {isLoadingMessages ? (
                    <p className="messages-history__empty">{t("messages.loadingMessages")}</p>
                  ) : selectedConversation.messages.length ? (
                    selectedConversation.messages.map((item, index) => (
                      <article
                        key={`${item.created_at ?? "message"}-${index}`}
                        className={`messages-bubble ${
                          item.sender_role === mode ? "messages-bubble--own" : ""
                        }`}
                      >
                        <strong>{item.sender_role || t("messages.message")}</strong>
                        <p>{item.message?.trim() || t("messages.emptyContent")}</p>
                        <span>{formatDate(item.created_at, i18n.language, t("common.noDate"))}</span>
                      </article>
                    ))
                  ) : (
                    <p className="messages-history__empty">{t("messages.noMessagesYet")}</p>
                  )}
                </div>

                <form className="messages-compose" onSubmit={handleSubmit}>
                  <label>
                    <span>{t("messages.newMessage")}</span>
                    <textarea
                      value={draftMessage}
                      onChange={handleDraftChange}
                      rows={4}
                      placeholder={t("messages.placeholder")}
                      required
                    />
                  </label>
                  <button
                    className="messages-button messages-button--primary"
                    type="submit"
                    disabled={isSending || !draftMessage.trim() || !selectedConversation.member.id}
                  >
                    {isSending ? t("common.sending") : t("messages.sendMessage")}
                  </button>
                </form>
              </>
            ) : (
              <p className="messages-history__empty">{t("messages.selectConversation")}</p>
            )}
          </section>
        </section>
      )}
    </div>
  );
}

export default CrewMessages;
