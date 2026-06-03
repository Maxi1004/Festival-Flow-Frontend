import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SummaryDetailModal } from "../../components/SummaryDetailModal";
import {
  getCrewDirectMessages,
  getCrewProjectMembers,
  getCrewProjectTeamMessages,
  getMyCrewFeed,
  getMyCrewSummary,
  sendCrewDirectMessage,
  sendCrewProjectTeamMessage,
  type CrewSummary,
} from "../../service/crewApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  CrewDirectMessage,
  CrewMember,
  CrewProjectMember,
  CrewProjectMessage,
} from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import { useCurrentProfile } from "../useCurrentProfile";
import "../../styles/talent.css";

const EMPTY_SUMMARY: CrewSummary = {
  total_projects: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
};
const MAX_MESSAGE_LENGTH = 1000;

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";
}

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
  return member.project_title?.trim() || member.project?.title?.trim() || member.project?.name?.trim() || fallback;
}

function getOpportunityTitle(member: CrewMember, fallback: string): string {
  return member.opportunity_title?.trim() || member.opportunity?.title?.trim() || fallback;
}

function getRole(member: CrewMember, fallback: string): string {
  return member.role?.trim() || member.role_needed?.trim() || member.specialty?.trim() || fallback;
}

function getProducer(member: CrewMember, fallback: string): string {
  return (
    member.producer_name?.trim() ||
    member.producer?.name?.trim() ||
    member.producer?.display_name?.trim() ||
    member.producer_email?.trim() ||
    fallback
  );
}

function getTask(member: CrewMember, fallback: string): string {
  return member.task_description?.trim() || fallback;
}

function getProducerNote(member: CrewMember, fallback: string): string {
  return member.producer_note?.trim() || member.notes?.trim() || fallback;
}

function getJoinedAt(member: CrewMember): string {
  return member.joined_at || member.accepted_at || member.created_at || member.updated_at || "";
}

function getCrewMemberKey(member: CrewMember, index: number): string {
  return member.id ?? member.application_id ?? member.recruitment_id ?? `${member.project_id ?? "project"}-${index}`;
}

function appendUniqueCrew(current: CrewMember[], next: CrewMember[]): CrewMember[] {
  const crewById = new Map(current.map((member, index) => [getCrewMemberKey(member, index), member]));

  next.forEach((member, index) => {
    crewById.set(getCrewMemberKey(member, index), member);
  });

  return Array.from(crewById.values());
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function sortMessages<T extends { created_at: string }>(messages: T[]): T[] {
  return [...messages].sort((left, right) => (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  ));
}

function ProjectAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  return (
    <span className="talent-collaboration-avatar" aria-hidden="true">
      {photoUrl ? <img alt="" src={photoUrl} /> : getInitial(name)}
    </span>
  );
}

function CollaborationModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="talent-collaboration-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        className="talent-collaboration-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="talent-collaboration-modal__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="talent-button" type="button" onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function TalentCrew() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const tRef = useRef(t);
  tRef.current = t;
  const navigate = useNavigate();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [summary, setSummary] = useState<CrewSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [teamProject, setTeamProject] = useState<CrewMember | null>(null);
  const [projectMembers, setProjectMembers] = useState<CrewProjectMember[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [chatProject, setChatProject] = useState<CrewMember | null>(null);
  const [teamMessages, setTeamMessages] = useState<CrewProjectMessage[]>([]);
  const [teamDraft, setTeamDraft] = useState("");
  const [isTeamChatLoading, setIsTeamChatLoading] = useState(false);
  const [isSendingTeamMessage, setIsSendingTeamMessage] = useState(false);
  const [teamChatError, setTeamChatError] = useState("");
  const [directProject, setDirectProject] = useState<CrewMember | null>(null);
  const [directTarget, setDirectTarget] = useState<CrewProjectMember | null>(null);
  const [directMessages, setDirectMessages] = useState<CrewDirectMessage[]>([]);
  const [directDraft, setDirectDraft] = useState("");
  const [isDirectChatLoading, setIsDirectChatLoading] = useState(false);
  const [isSendingDirectMessage, setIsSendingDirectMessage] = useState(false);
  const [directChatError, setDirectChatError] = useState("");

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !token || !profile) {
      setCrew([]);
      setSummary(EMPTY_SUMMARY);
      setNextCursor(null);
      setError("");
      setSummaryError("");
      setIsLoading(false);
      setIsSummaryLoading(false);
      return;
    }

    let isMounted = true;
    const authenticatedToken = token;

    async function loadCrew() {
      try {
        setIsLoading(true);
        setIsSummaryLoading(true);
        setError("");
        setSummaryError("");
        const feed = await reusePendingRequest(
          `talent-crew-feed:${authenticatedToken}:initial`,
          () => getMyCrewFeed(null, authenticatedToken)
        );

        if (isMounted) {
          setCrew(feed.items);
          setNextCursor(feed.next_cursor);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : tRef.current("crew.empty"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      if (!isMounted) {
        return;
      }

      try {
        const nextSummary = await reusePendingRequest(
          `talent-crew-summary:${authenticatedToken}`,
          () => getMyCrewSummary(authenticatedToken)
        );

        if (isMounted) {
          setSummary(nextSummary);
        }
      } catch {
        if (isMounted) {
          setSummaryError("No se pudo calcular el resumen.");
        }
      } finally {
        if (isMounted) {
          setIsSummaryLoading(false);
        }
      }
    }

    void loadCrew();

    return () => {
      isMounted = false;
    };
  }, [isProfileLoading, profile, token, user]);

  const handleLoadMore = async () => {
    if (!nextCursor || !token || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError("");
      const cursor = nextCursor;
      const feed = await reusePendingRequest(
        `talent-crew-feed:${token}:${cursor}`,
        () => getMyCrewFeed(cursor, token)
      );

      setCrew((current) => appendUniqueCrew(current, feed.items));
      setNextCursor(feed.next_cursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("crew.empty"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleViewMessages = (member: CrewMember) => {
    if (member.id) {
      navigate(`/talent/messages?crewId=${encodeURIComponent(member.id)}`);
    }
  };

  const handleViewTeam = async (member: CrewMember) => {
    if (!member.project_id || !token) {
      setError("No se encontro el proyecto asociado.");
      return;
    }

    const projectId = member.project_id;
    setTeamProject(member);
    setProjectMembers([]);
    setTeamError("");
    setIsTeamLoading(true);

    try {
      const members = await reusePendingRequest(
        `crew-project-members:${projectId}:${token}`,
        () => getCrewProjectMembers(projectId, token)
      );
      setProjectMembers(members);
    } catch (loadError) {
      setTeamError(loadError instanceof Error ? loadError.message : "No se pudo cargar el equipo.");
    } finally {
      setIsTeamLoading(false);
    }
  };

  const handleOpenTeamChat = async (member: CrewMember) => {
    if (!member.project_id || !token) {
      setError("No se encontro el proyecto asociado.");
      return;
    }

    const projectId = member.project_id;
    setTeamProject(null);
    setChatProject(member);
    setTeamMessages([]);
    setTeamDraft("");
    setTeamChatError("");
    setIsTeamChatLoading(true);

    try {
      const messages = await reusePendingRequest(
        `crew-project-team-messages:${projectId}:${token}`,
        () => getCrewProjectTeamMessages(projectId, token)
      );
      setTeamMessages(sortMessages(messages));
    } catch (loadError) {
      setTeamChatError(loadError instanceof Error ? loadError.message : "No se pudo cargar el chat.");
    } finally {
      setIsTeamChatLoading(false);
    }
  };

  const handleSendTeamMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = teamDraft.trim();

    if (!chatProject?.project_id || !token || !message || message.length > MAX_MESSAGE_LENGTH) {
      setTeamChatError("Escribe un mensaje de hasta 1000 caracteres.");
      return;
    }

    try {
      setIsSendingTeamMessage(true);
      setTeamChatError("");
      const sentMessage = await sendCrewProjectTeamMessage(chatProject.project_id, message, token);
      setTeamMessages((current) => sortMessages([...current, sentMessage]));
      setTeamDraft("");
    } catch (sendError) {
      setTeamChatError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSendingTeamMessage(false);
    }
  };

  const handleOpenDirectChat = async (member: CrewProjectMember) => {
    if (!teamProject?.project_id || !token) {
      setTeamError("No se encontro el proyecto asociado.");
      return;
    }

    const project = teamProject;
    const projectId = teamProject.project_id;
    setTeamProject(null);
    setDirectProject(project);
    setDirectTarget(member);
    setDirectMessages([]);
    setDirectDraft("");
    setDirectChatError("");
    setIsDirectChatLoading(true);

    try {
      const messages = await reusePendingRequest(
        `crew-direct-messages:${projectId}:${member.user_uid}:${token}`,
        () => getCrewDirectMessages(projectId, member.user_uid, token)
      );
      setDirectMessages(sortMessages(messages));
    } catch (loadError) {
      setDirectChatError(loadError instanceof Error ? loadError.message : "No se pudo cargar la conversacion.");
    } finally {
      setIsDirectChatLoading(false);
    }
  };

  const handleSendDirectMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = directDraft.trim();

    if (
      !directProject?.project_id ||
      !directTarget ||
      !token ||
      !message ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      setDirectChatError("Escribe un mensaje de hasta 1000 caracteres.");
      return;
    }

    try {
      setIsSendingDirectMessage(true);
      setDirectChatError("");
      const sentMessage = await sendCrewDirectMessage(
        directProject.project_id,
        directTarget.user_uid,
        message,
        token
      );
      setDirectMessages((current) => sortMessages([...current, sentMessage]));
      setDirectDraft("");
    } catch (sendError) {
      setDirectChatError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSendingDirectMessage(false);
    }
  };

  const missingValue = t("common.notProvided");
  const kpis: Array<[string, number]> = [
    ["Total proyectos", summary.total_projects],
    ["Activos", summary.active],
    ["Finalizados", summary.completed],
    ["Cancelados", summary.cancelled],
  ];

  return (
    <div className="talent-page talent-applications-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("crew.myTeam")}</p>
          <h1 className="talent-page__title">{t("crew.talentTitle")}</h1>
          <p className="talent-page__subtitle">{t("crew.talentSubtitle")}</p>
        </div>
      </section>

      <section className="talent-crew-kpis" aria-label="Resumen de equipo">
        {kpis.map(([label, value]) => (
          <article className="talent-card talent-application-kpi" key={label}>
            <span className={isSummaryLoading ? "talent-application-kpi__skeleton" : ""}>
              {isSummaryLoading ? null : summaryError ? "--" : value}
            </span>
            <p>{label}</p>
          </article>
        ))}
      </section>

      {isSummaryLoading ? <p className="talent-feedback">Calculando resumen...</p> : null}
      {summaryError ? <p className="talent-feedback talent-feedback--error">{summaryError}</p> : null}
      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      <section className="talent-card talent-application-crm">
        <div className="talent-application-crm__heading">
          <div>
            <p className="talent-page__eyebrow">Historial profesional</p>
            <h2>Proyectos y asignaciones</h2>
          </div>
          <span>
            {summaryError
              ? `${crew.length} cargados`
              : `${crew.length} registros | ${isSummaryLoading ? "..." : summary.total_projects} proyectos`}
          </span>
        </div>

        {isLoading ? (
          <p className="talent-feedback">{t("crew.loading")}</p>
        ) : crew.length === 0 ? (
          <p className="talent-feedback">{t("crew.empty")}</p>
        ) : (
          <>
            <div className="talent-application-table-wrap">
              <table className="talent-application-table talent-crew-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Convocatoria</th>
                    <th>Rol</th>
                    <th>Tarea</th>
                    <th>Productor</th>
                    <th>Estado</th>
                    <th>Fecha ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.map((member, index) => (
                    <tr key={getCrewMemberKey(member, index)}>
                      <td>{getProjectTitle(member, t("crew.projectMissing"))}</td>
                      <td>{getOpportunityTitle(member, t("crew.opportunityMissing"))}</td>
                      <td>{getRole(member, t("crew.roleMissing"))}</td>
                      <td>{getTask(member, t("crew.taskMissing"))}</td>
                      <td>{getProducer(member, t("crew.producerMissing"))}</td>
                      <td>
                        <span className={`talent-application-status talent-application-status--${normalizeStatus(member.status).toLowerCase()}`}>
                          {translateStatus(t, member.status)}
                        </span>
                      </td>
                      <td>{formatDate(getJoinedAt(member), i18n.language, missingValue)}</td>
                      <td>
                        <div className="talent-invitation-actions">
                          <button
                            className="talent-button talent-application-table__action"
                            type="button"
                            onClick={() => setSelectedMember(member)}
                          >
                            Ver detalle
                          </button>
                          <button
                            className="talent-button talent-application-table__action"
                            type="button"
                            disabled={!member.project_id}
                            onClick={() => void handleViewTeam(member)}
                          >
                            Ver equipo
                          </button>
                          <button
                            className="talent-button talent-application-table__action"
                            type="button"
                            disabled={!member.project_id}
                            onClick={() => void handleOpenTeamChat(member)}
                          >
                            Chat del equipo
                          </button>
                          <button
                            className="talent-button talent-button--primary talent-application-table__action"
                            type="button"
                            disabled={!member.id}
                            onClick={() => handleViewMessages(member)}
                          >
                            {t("messages.viewMessages")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nextCursor ? (
              <div className="talent-application-crm__footer">
                <button
                  className="talent-button talent-button--primary"
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() => void handleLoadMore()}
                >
                  {isLoadingMore ? "Cargando..." : "Cargar más"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {selectedMember ? (
        <SummaryDetailModal
          title={getProjectTitle(selectedMember, t("crew.projectMissing"))}
          description={getOpportunityTitle(selectedMember, t("crew.opportunityMissing"))}
          onClose={() => setSelectedMember(null)}
        >
          <dl className="talent-application-detail">
            <div><dt>Proyecto</dt><dd>{getProjectTitle(selectedMember, missingValue)}</dd></div>
            <div><dt>Convocatoria</dt><dd>{getOpportunityTitle(selectedMember, missingValue)}</dd></div>
            <div><dt>Rol asignado</dt><dd>{getRole(selectedMember, missingValue)}</dd></div>
            <div><dt>Tarea</dt><dd>{getTask(selectedMember, t("crew.taskMissing"))}</dd></div>
            <div><dt>Nota del productor</dt><dd>{getProducerNote(selectedMember, t("crew.noteMissing"))}</dd></div>
            <div><dt>Estado</dt><dd>{translateStatus(t, selectedMember.status)}</dd></div>
            <div><dt>Fecha ingreso</dt><dd>{formatDate(getJoinedAt(selectedMember), i18n.language, missingValue)}</dd></div>
          </dl>
          <div className="talent-invitation-modal__actions">
            <button
              className="talent-button talent-button--primary"
              type="button"
              disabled={!selectedMember.id}
              onClick={() => handleViewMessages(selectedMember)}
            >
              {t("messages.viewMessages")}
            </button>
          </div>
        </SummaryDetailModal>
      ) : null}

      {teamProject ? (
        <CollaborationModal
          title={`Equipo - ${getProjectTitle(teamProject, t("crew.projectMissing"))}`}
          description="Integrantes confirmados para este proyecto."
          onClose={() => setTeamProject(null)}
        >
          {teamError ? <p className="talent-feedback talent-feedback--error">{teamError}</p> : null}
          {isTeamLoading ? (
            <p className="talent-feedback">Cargando integrantes...</p>
          ) : projectMembers.length === 0 ? (
            <p className="talent-feedback">Este proyecto todavia no tiene integrantes.</p>
          ) : (
            <div className="talent-collaboration-members">
              {projectMembers.map((member) => (
                <article className="talent-collaboration-member" key={member.id}>
                  <ProjectAvatar name={member.name} photoUrl={member.photo_url} />
                  <div className="talent-collaboration-member__content">
                    <h3>{member.name}</h3>
                    {member.email ? <p>{member.email}</p> : null}
                    <dl>
                      <div><dt>Rol</dt><dd>{member.role || missingValue}</dd></div>
                      <div><dt>Tarea</dt><dd>{member.task_description || missingValue}</dd></div>
                      <div><dt>Estado</dt><dd>{translateStatus(t, member.status)}</dd></div>
                      <div><dt>Ingreso</dt><dd>{formatDate(member.joined_at, i18n.language, missingValue)}</dd></div>
                    </dl>
                  </div>
                  {member.user_uid !== profile?.uid ? (
                    <button
                      className="talent-button talent-application-table__action"
                      type="button"
                      onClick={() => void handleOpenDirectChat(member)}
                    >
                      Mensaje
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
          <div className="talent-invitation-modal__actions">
            <button
              className="talent-button talent-button--primary"
              type="button"
              onClick={() => void handleOpenTeamChat(teamProject)}
            >
              Abrir chat del equipo
            </button>
          </div>
        </CollaborationModal>
      ) : null}

      {chatProject ? (
        <CollaborationModal
          title={`Chat del equipo - ${getProjectTitle(chatProject, t("crew.projectMissing"))}`}
          onClose={() => setChatProject(null)}
        >
          {teamChatError ? <p className="talent-feedback talent-feedback--error">{teamChatError}</p> : null}
          <div className="talent-collaboration-messages" aria-live="polite">
            {isTeamChatLoading ? (
              <p className="talent-collaboration-empty">Cargando mensajes...</p>
            ) : teamMessages.length === 0 ? (
              <p className="talent-collaboration-empty">Todavia no hay mensajes en el chat del equipo.</p>
            ) : (
              teamMessages.map((message) => (
                <article
                  className={`talent-collaboration-message ${
                    message.sender_uid === profile?.uid ? "talent-collaboration-message--own" : ""
                  }`}
                  key={message.id}
                >
                  <ProjectAvatar name={message.sender_name} photoUrl={message.sender_photo_url} />
                  <div>
                    <strong>{message.sender_name}</strong>
                    <small>{message.sender_role} | {formatDate(message.created_at, i18n.language, missingValue)}</small>
                    <p>{message.message}</p>
                  </div>
                </article>
              ))
            )}
          </div>
          <form className="talent-collaboration-compose" onSubmit={handleSendTeamMessage}>
            <label>
              <span>Nuevo mensaje</span>
              <textarea
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Escribe al equipo"
                rows={3}
                value={teamDraft}
                onChange={(event) => setTeamDraft(event.target.value)}
              />
              <small>{teamDraft.length}/{MAX_MESSAGE_LENGTH}</small>
            </label>
            <button
              className="talent-button talent-button--primary"
              type="submit"
              disabled={isSendingTeamMessage || !teamDraft.trim()}
            >
              {isSendingTeamMessage ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </CollaborationModal>
      ) : null}

      {directProject && directTarget ? (
        <CollaborationModal
          title={`Mensaje con ${directTarget.name}`}
          description={getProjectTitle(directProject, t("crew.projectMissing"))}
          onClose={() => {
            setDirectProject(null);
            setDirectTarget(null);
          }}
        >
          {directChatError ? <p className="talent-feedback talent-feedback--error">{directChatError}</p> : null}
          <div className="talent-collaboration-messages" aria-live="polite">
            {isDirectChatLoading ? (
              <p className="talent-collaboration-empty">Cargando mensajes...</p>
            ) : directMessages.length === 0 ? (
              <p className="talent-collaboration-empty">Todavia no hay mensajes privados en este proyecto.</p>
            ) : (
              directMessages.map((message) => {
                const isOwnMessage = message.sender_uid === profile?.uid;

                return (
                  <article
                    className={`talent-collaboration-message ${
                      isOwnMessage ? "talent-collaboration-message--own" : ""
                    }`}
                    key={message.id}
                  >
                    <ProjectAvatar
                      name={message.sender_name}
                      photoUrl={message.sender_photo_url}
                    />
                    <div>
                      <strong>{message.sender_name}</strong>
                      <small>{formatDate(message.created_at, i18n.language, missingValue)}</small>
                      <p>{message.message}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <form className="talent-collaboration-compose" onSubmit={handleSendDirectMessage}>
            <label>
              <span>Nuevo mensaje</span>
              <textarea
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={`Escribe a ${directTarget.name}`}
                rows={3}
                value={directDraft}
                onChange={(event) => setDirectDraft(event.target.value)}
              />
              <small>{directDraft.length}/{MAX_MESSAGE_LENGTH}</small>
            </label>
            <button
              className="talent-button talent-button--primary"
              type="submit"
              disabled={isSendingDirectMessage || !directDraft.trim()}
            >
              {isSendingDirectMessage ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </CollaborationModal>
      ) : null}
    </div>
  );
}

export default TalentCrew;
