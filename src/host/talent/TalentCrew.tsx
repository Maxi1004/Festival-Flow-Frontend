import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
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
import { useCurrentProfile } from "../useCurrentProfile";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/talent.css";

const EMPTY_SUMMARY: CrewSummary = {
  total_projects: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
};
const MAX_MESSAGE_LENGTH = 1000;

const talentCrewBaseTexts = [
  "Cerrar",
  "No se pudo calcular el resumen.",
  "No se encontro el proyecto asociado.",
  "No se pudo cargar el equipo.",
  "No se pudo cargar el chat.",
  "No se pudo enviar el mensaje.",
  "No se pudo cargar la conversacion.",
  "Escribe un mensaje de hasta 1000 caracteres.",
  "Total proyectos",
  "Activos",
  "Finalizados",
  "Cancelados",
  "Resumen de equipo",
  "Calculando resumen...",
  "Historial profesional",
  "Proyectos y asignaciones",
  "cargados",
  "registros",
  "proyectos",
  "Proyecto",
  "Convocatoria",
  "Rol",
  "Tarea",
  "Productor",
  "Estado",
  "Fecha ingreso",
  "Acciones",
  "Ver detalle",
  "Ver equipo",
  "Chat del equipo",
  "Cargando...",
  "Cargar más",
  "Rol asignado",
  "Nota del productor",
  "Equipo",
  "Integrantes confirmados para este proyecto.",
  "Cargando integrantes...",
  "Este proyecto todavia no tiene integrantes.",
  "Ingreso",
  "Mensaje",
  "Abrir chat del equipo",
  "Todavia no hay mensajes en el chat del equipo.",
  "Todavia no hay mensajes privados en este proyecto.",
  "Cargando mensajes...",
  "Nuevo mensaje",
  "Escribe al equipo",
  "Mensaje con",
  "Escribe a",
  "Enviando...",
  "Enviar",
  "Activo",
  "Abierta",
  "Aceptada",
  "Pendiente",
  "Completada",
  "Finalizada",
  "Cancelada",
  "Rechazada",
  "En revisión",
  "Sin estado",
];

function formatCrewStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    OPEN: "Abierta",
    ACCEPTED: "Aceptada",
    PENDING: "Pendiente",
    COMPLETED: "Completada",
    CLOSED: "Finalizada",
    CANCELLED: "Cancelada",
    REJECTED: "Rechazada",
    IN_REVIEW: "En revisión",
  };

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

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
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(["Cerrar"], language);

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
            {tAuto("Cerrar")}
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
  const language = useFestivalFlowLanguage();
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
  const missingValue = t("common.notProvided");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        talentCrewBaseTexts,
        crew.flatMap((member) => [
          getProjectTitle(member, missingValue),
          getOpportunityTitle(member, missingValue),
          getRole(member, missingValue),
          getTask(member, missingValue),
          formatCrewStatusLabel(member.status),
        ]),
        projectMembers.flatMap((member) => [member.role, member.task_description, formatCrewStatusLabel(member.status)]),
        teamMessages.flatMap((message) => [message.message, message.sender_role]),
        directMessages.map((message) => message.message)
      ),
    [crew, directMessages, missingValue, projectMembers, teamMessages]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

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
          setSummaryError(tAuto("No se pudo calcular el resumen."));
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
      setError(tAuto("No se encontro el proyecto asociado."));
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
      setTeamError(loadError instanceof Error ? loadError.message : tAuto("No se pudo cargar el equipo."));
    } finally {
      setIsTeamLoading(false);
    }
  };

  const handleOpenTeamChat = async (member: CrewMember) => {
    if (!member.project_id || !token) {
      setError(tAuto("No se encontro el proyecto asociado."));
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
      setTeamChatError(loadError instanceof Error ? loadError.message : tAuto("No se pudo cargar el chat."));
    } finally {
      setIsTeamChatLoading(false);
    }
  };

  const handleSendTeamMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = teamDraft.trim();

    if (!chatProject?.project_id || !token || !message || message.length > MAX_MESSAGE_LENGTH) {
      setTeamChatError(tAuto("Escribe un mensaje de hasta 1000 caracteres."));
      return;
    }

    try {
      setIsSendingTeamMessage(true);
      setTeamChatError("");
      const sentMessage = await sendCrewProjectTeamMessage(chatProject.project_id, message, token);
      setTeamMessages((current) => sortMessages([...current, sentMessage]));
      setTeamDraft("");
    } catch (sendError) {
      setTeamChatError(sendError instanceof Error ? sendError.message : tAuto("No se pudo enviar el mensaje."));
    } finally {
      setIsSendingTeamMessage(false);
    }
  };

  const handleOpenDirectChat = async (member: CrewProjectMember) => {
    if (!teamProject?.project_id || !token) {
      setTeamError(tAuto("No se encontro el proyecto asociado."));
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
      setDirectChatError(loadError instanceof Error ? loadError.message : tAuto("No se pudo cargar la conversacion."));
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
      setDirectChatError(tAuto("Escribe un mensaje de hasta 1000 caracteres."));
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
      setDirectChatError(sendError instanceof Error ? sendError.message : tAuto("No se pudo enviar el mensaje."));
    } finally {
      setIsSendingDirectMessage(false);
    }
  };

  const kpis: Array<[string, number]> = [
    [tAuto("Total proyectos"), summary.total_projects],
    [tAuto("Activos"), summary.active],
    [tAuto("Finalizados"), summary.completed],
    [tAuto("Cancelados"), summary.cancelled],
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

      <section className="talent-crew-kpis" aria-label={tAuto("Resumen de equipo")}>
        {kpis.map(([label, value]) => (
          <article className="talent-card talent-application-kpi" key={label}>
            <span className={isSummaryLoading ? "talent-application-kpi__skeleton" : ""}>
              {isSummaryLoading ? null : summaryError ? "--" : value}
            </span>
            <p>{label}</p>
          </article>
        ))}
      </section>

      {isSummaryLoading ? <p className="talent-feedback">{tAuto("Calculando resumen...")}</p> : null}
      {summaryError ? <p className="talent-feedback talent-feedback--error">{summaryError}</p> : null}
      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      <section className="talent-card talent-application-crm">
        <div className="talent-application-crm__heading">
          <div>
            <p className="talent-page__eyebrow">{tAuto("Historial profesional")}</p>
            <h2>{tAuto("Proyectos y asignaciones")}</h2>
          </div>
          <span>
            {summaryError
              ? `${crew.length} ${tAuto("cargados")}`
              : `${crew.length} ${tAuto("registros")} | ${isSummaryLoading ? "..." : summary.total_projects} ${tAuto("proyectos")}`}
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
                    <th>{tAuto("Proyecto")}</th>
                    <th>{tAuto("Convocatoria")}</th>
                    <th>{tAuto("Rol")}</th>
                    <th>{tAuto("Tarea")}</th>
                    <th>{tAuto("Productor")}</th>
                    <th>{tAuto("Estado")}</th>
                    <th>{tAuto("Fecha ingreso")}</th>
                    <th>{tAuto("Acciones")}</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.map((member, index) => (
                    <tr key={getCrewMemberKey(member, index)}>
                      <td>{tAuto(getProjectTitle(member, t("crew.projectMissing")))}</td>
                      <td>{tAuto(getOpportunityTitle(member, t("crew.opportunityMissing")))}</td>
                      <td>{tAuto(getRole(member, t("crew.roleMissing")))}</td>
                      <td>{tAuto(getTask(member, t("crew.taskMissing")))}</td>
                      <td>{getProducer(member, t("crew.producerMissing"))}</td>
                      <td>
                        <span className={`talent-application-status talent-application-status--${normalizeStatus(member.status).toLowerCase()}`}>
                          {tAuto(formatCrewStatusLabel(member.status))}
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
                            {tAuto("Ver detalle")}
                          </button>
                          <button
                            className="talent-button talent-application-table__action"
                            type="button"
                            disabled={!member.project_id}
                            onClick={() => void handleViewTeam(member)}
                          >
                            {tAuto("Ver equipo")}
                          </button>
                          <button
                            className="talent-button talent-application-table__action"
                            type="button"
                            disabled={!member.project_id}
                            onClick={() => void handleOpenTeamChat(member)}
                          >
                            {tAuto("Chat del equipo")}
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
                  {isLoadingMore ? tAuto("Cargando...") : tAuto("Cargar más")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {selectedMember ? (
        <SummaryDetailModal
          title={tAuto(getProjectTitle(selectedMember, t("crew.projectMissing")))}
          description={tAuto(getOpportunityTitle(selectedMember, t("crew.opportunityMissing")))}
          onClose={() => setSelectedMember(null)}
        >
          <dl className="talent-application-detail">
            <div><dt>{tAuto("Proyecto")}</dt><dd>{tAuto(getProjectTitle(selectedMember, missingValue))}</dd></div>
            <div><dt>{tAuto("Convocatoria")}</dt><dd>{tAuto(getOpportunityTitle(selectedMember, missingValue))}</dd></div>
            <div><dt>{tAuto("Rol asignado")}</dt><dd>{tAuto(getRole(selectedMember, missingValue))}</dd></div>
            <div><dt>{tAuto("Tarea")}</dt><dd>{tAuto(getTask(selectedMember, t("crew.taskMissing")))}</dd></div>
            <div><dt>{tAuto("Nota del productor")}</dt><dd>{getProducerNote(selectedMember, t("crew.noteMissing"))}</dd></div>
            <div><dt>{tAuto("Estado")}</dt><dd>{tAuto(formatCrewStatusLabel(selectedMember.status))}</dd></div>
            <div><dt>{tAuto("Fecha ingreso")}</dt><dd>{formatDate(getJoinedAt(selectedMember), i18n.language, missingValue)}</dd></div>
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
          title={`${tAuto("Equipo")} - ${tAuto(getProjectTitle(teamProject, t("crew.projectMissing")))}`}
          description={tAuto("Integrantes confirmados para este proyecto.")}
          onClose={() => setTeamProject(null)}
        >
          {teamError ? <p className="talent-feedback talent-feedback--error">{teamError}</p> : null}
          {isTeamLoading ? (
            <p className="talent-feedback">{tAuto("Cargando integrantes...")}</p>
          ) : projectMembers.length === 0 ? (
            <p className="talent-feedback">{tAuto("Este proyecto todavia no tiene integrantes.")}</p>
          ) : (
            <div className="talent-collaboration-members">
              {projectMembers.map((member) => (
                <article className="talent-collaboration-member" key={member.id}>
                  <ProjectAvatar name={member.name} photoUrl={member.photo_url} />
                  <div className="talent-collaboration-member__content">
                    <h3>{member.name}</h3>
                    {member.email ? <p>{member.email}</p> : null}
                    <dl>
                      <div><dt>{tAuto("Rol")}</dt><dd>{member.role ? tAuto(member.role) : missingValue}</dd></div>
                      <div><dt>{tAuto("Tarea")}</dt><dd>{member.task_description ? tAuto(member.task_description) : missingValue}</dd></div>
                      <div><dt>{tAuto("Estado")}</dt><dd>{tAuto(formatCrewStatusLabel(member.status))}</dd></div>
                      <div><dt>{tAuto("Ingreso")}</dt><dd>{formatDate(member.joined_at, i18n.language, missingValue)}</dd></div>
                    </dl>
                  </div>
                  {member.user_uid !== profile?.uid ? (
                    <button
                      className="talent-button talent-application-table__action"
                      type="button"
                      onClick={() => void handleOpenDirectChat(member)}
                    >
                      {tAuto("Mensaje")}
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
              {tAuto("Abrir chat del equipo")}
            </button>
          </div>
        </CollaborationModal>
      ) : null}

      {chatProject ? (
        <CollaborationModal
          title={`${tAuto("Chat del equipo")} - ${tAuto(getProjectTitle(chatProject, t("crew.projectMissing")))}`}
          onClose={() => setChatProject(null)}
        >
          {teamChatError ? <p className="talent-feedback talent-feedback--error">{teamChatError}</p> : null}
          <div className="talent-collaboration-messages" aria-live="polite">
            {isTeamChatLoading ? (
              <p className="talent-collaboration-empty">{tAuto("Cargando mensajes...")}</p>
            ) : teamMessages.length === 0 ? (
              <p className="talent-collaboration-empty">{tAuto("Todavia no hay mensajes en el chat del equipo.")}</p>
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
                    <small>{tAuto(message.sender_role)} | {formatDate(message.created_at, i18n.language, missingValue)}</small>
                    <p>{tAuto(message.message)}</p>
                  </div>
                </article>
              ))
            )}
          </div>
          <form className="talent-collaboration-compose" onSubmit={handleSendTeamMessage}>
            <label>
              <span>{tAuto("Nuevo mensaje")}</span>
              <textarea
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={tAuto("Escribe al equipo")}
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
              {isSendingTeamMessage ? tAuto("Enviando...") : tAuto("Enviar")}
            </button>
          </form>
        </CollaborationModal>
      ) : null}

      {directProject && directTarget ? (
        <CollaborationModal
          title={`${tAuto("Mensaje con")} ${directTarget.name}`}
          description={tAuto(getProjectTitle(directProject, t("crew.projectMissing")))}
          onClose={() => {
            setDirectProject(null);
            setDirectTarget(null);
          }}
        >
          {directChatError ? <p className="talent-feedback talent-feedback--error">{directChatError}</p> : null}
          <div className="talent-collaboration-messages" aria-live="polite">
            {isDirectChatLoading ? (
              <p className="talent-collaboration-empty">{tAuto("Cargando mensajes...")}</p>
            ) : directMessages.length === 0 ? (
              <p className="talent-collaboration-empty">{tAuto("Todavia no hay mensajes privados en este proyecto.")}</p>
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
                      <p>{tAuto(message.message)}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <form className="talent-collaboration-compose" onSubmit={handleSendDirectMessage}>
            <label>
              <span>{tAuto("Nuevo mensaje")}</span>
              <textarea
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={`${tAuto("Escribe a")} ${directTarget.name}`}
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
              {isSendingDirectMessage ? tAuto("Enviando...") : tAuto("Enviar")}
            </button>
          </form>
        </CollaborationModal>
      ) : null}
    </div>
  );
}

export default TalentCrew;
