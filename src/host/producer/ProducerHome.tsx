import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFilm,
  FiFolder,
  FiMapPin,
  FiMessageSquare,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import TalentAvatar from "../../components/TalentAvatar";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  getProducerDashboardDetails,
  getProducerDashboardQuick,
} from "../../service/dashboardApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  DashboardActivityItem,
  DashboardAvailableTalentSummary,
  DashboardOpportunitySummary,
  DashboardProjectSummary,
  DashboardProductionEvent,
  ProducerDashboardDetails,
} from "../../types/dashboard";
import { formatDisplayDate } from "./utils";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/home.css";
import "../../styles/producer.css";

const producerHomeBaseTexts = [
  "Talento sin nombre",
  "Freelance",
  "Hibrido",
  "Presencial",
  "Remoto",
  "Modalidad no informada",
  "Disponible",
  "No disponible",
  "Sin estado",
  "Especialidad pendiente",
  "Ubicacion no informada",
  "No se pudieron cargar los detalles del dashboard.",
  "No se pudo cargar el dashboard del productor.",
  "Productor",
  "Proyectos",
  "Convocatorias",
  "Activas",
  "Cerradas",
  "Talentos",
  "Crew",
  "Mensajes",
  "Postulaciones",
  "Inicio",
  "Tu operacion creativa, organizada",
  "Centraliza tus proyectos y publica convocatorias reales desde un panel conectado a tu backend actual.",
  "Sin correo",
  "Cuenta productora activa",
  "proyectos registrados",
  "convocatorias creadas en total.",
  "Resumen general",
  "Una vista rapida del estado de tus proyectos, convocatorias y operacion.",
  "Operacion activa",
  "Proyectos recientes",
  "Ultimos proyectos registrados para seguir operando sin salir del panel.",
  "Todavia no tienes proyectos creados.",
  "Proximas actividades",
  "Produccion, casting y grabaciones por venir.",
  "Actividad",
  "No hay actividades programadas.",
  "Actividad reciente",
  "Feed de novedades reales de tus producciones.",
  "Acciones rapidas",
  "Accesos directos para crear y administrar tus proyectos.",
  "Crear proyecto",
  "Ver mis proyectos",
  "Crear convocatoria",
  "Talentos disponibles",
  "Consulta perfiles disponibles cuando el backend exponga el listado para productores.",
  "Disponible desde",
  "Ver perfil",
  "No hay talentos disponibles por ahora.",
  "Proyectos creados",
  "Mostrando hasta 3 proyectos recientes.",
  "Convocatorias activas",
  "Convocatorias cerradas",
  "Mostrando hasta 5 convocatorias.",
  "No hay convocatorias para mostrar.",
];

function formatTalentName(talent: DashboardAvailableTalentSummary): string {
  return (
    talent.display_name?.trim() ||
    talent.profile?.display_name?.trim() ||
    talent.name?.trim() ||
    "Talento sin nombre"
  );
}

function formatTalentModality(value?: string | null): string {
  const labels: Record<string, string> = {
    FREELANCE: "Freelance",
    HYBRID: "Hibrido",
    ONSITE: "Presencial",
    REMOTE: "Remoto",
  };

  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Modalidad no informada";
}

function formatTalentStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    UNAVAILABLE: "No disponible",
  };
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function getTalentSpecialties(talent: DashboardAvailableTalentSummary): string[] {
  return talent.specialties?.length
    ? talent.specialties
    : talent.profile?.specialties ?? (talent.main_specialty ? [talent.main_specialty] : []);
}

function getTalentPhoto(talent: DashboardAvailableTalentSummary): string {
  return talent.photo_url?.trim() || talent.picture?.trim() || talent.avatar_url?.trim() || "";
}

function getTalentMainSpecialty(talent: DashboardAvailableTalentSummary): string {
  return talent.main_specialty?.trim() || talent.profile?.main_specialty?.trim() || "Especialidad pendiente";
}

function getTalentLocation(talent: DashboardAvailableTalentSummary): string {
  return talent.location?.trim() || talent.work_location?.trim() || talent.profile?.location?.trim() || "Ubicacion no informada";
}

function ProducerHomeContent() {
  const { user, token, profile } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const [projectsCount, setProjectsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [activeOpportunities, setActiveOpportunities] = useState(0);
  const [closedOpportunities, setClosedOpportunities] = useState(0);
  const [talentsCount, setTalentsCount] = useState<number | null>(null);
  const [activeCrewMembers, setActiveCrewMembers] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [applicationsReceived, setApplicationsReceived] = useState<number | null>(null);
  const [latestProjects, setLatestProjects] = useState<DashboardProjectSummary[]>([]);
  const [activeOpportunityDetails, setActiveOpportunityDetails] = useState<DashboardOpportunitySummary[]>([]);
  const [closedOpportunityDetails, setClosedOpportunityDetails] = useState<DashboardOpportunitySummary[]>([]);
  const [availableTalents, setAvailableTalents] = useState<DashboardAvailableTalentSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<DashboardProductionEvent[]>([]);
  const [detailModal, setDetailModal] = useState<"projects" | "active" | "closed" | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        producerHomeBaseTexts,
        latestProjects.flatMap((project) => [
          project.title,
          project.production_type,
          project.location,
          project.status,
        ]),
        [...activeOpportunityDetails, ...closedOpportunityDetails].flatMap((opportunity) => [
          opportunity.title,
          opportunity.role_needed,
          opportunity.specialty,
          opportunity.location,
          opportunity.status,
        ]),
        upcomingActivities.flatMap((event) => [event.title, event.type]),
        recentActivity.flatMap((activity) => [
          activity.title,
          activity.description,
          activity.time_label,
        ]),
        availableTalents.flatMap((talent) => [
          getTalentMainSpecialty(talent),
          ...getTalentSpecialties(talent),
          getTalentLocation(talent),
          formatTalentModality(talent.work_modality),
          formatTalentStatus(talent.status),
        ])
      ),
    [
      activeOpportunityDetails,
      availableTalents,
      closedOpportunityDetails,
      latestProjects,
      recentActivity,
      upcomingActivities,
    ]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    if (!token) {
      setIsQuickLoading(true);
      return;
    }

    const dashboardToken = token;
    let isMounted = true;

    async function loadDetails() {
      try {
        setIsDetailsLoading(true);
        setDetailsError("");

        const details = await reusePendingRequest<ProducerDashboardDetails>(
          `producer-dashboard-details:${dashboardToken}`,
          () => getProducerDashboardDetails(dashboardToken)
        );

        if (!isMounted) {
          return;
        }

        setLatestProjects(details.latest_projects);
        setActiveOpportunityDetails(details.active_opportunities);
        setClosedOpportunityDetails(details.closed_opportunities);
        setAvailableTalents(details.available_talents);
        setTalentsCount((currentCount) => currentCount ?? details.available_talents.length);
        setRecentActivity(details.recent_activity ?? []);
        setUpcomingActivities(details.upcoming_activities ?? []);
      } catch {
        if (isMounted) {
          setDetailsError(tAuto("No se pudieron cargar los detalles del dashboard."));
        }
      } finally {
        if (isMounted) {
          setIsDetailsLoading(false);
        }
      }
    }

    async function loadQuickDashboard() {
      try {
        setIsQuickLoading(true);
        setError("");
        setDetailsError("");

        const dashboard = await reusePendingRequest(
          `producer-dashboard-quick:${dashboardToken}`,
          () => getProducerDashboardQuick(dashboardToken)
        );

        if (!isMounted) {
          return;
        }

        setProjectsCount(dashboard.projects_count);
        setOpportunitiesCount(dashboard.opportunities_count);
        setActiveOpportunities(dashboard.active_opportunities_count);
        setClosedOpportunities(dashboard.closed_opportunities_count);
        setTalentsCount(dashboard.talents_count ?? null);
        setActiveCrewMembers(dashboard.active_crew_members_count ?? null);
        setUnreadMessages(dashboard.unread_messages_count ?? null);
        setApplicationsReceived(dashboard.applications_received_count ?? null);
        void loadDetails();
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : tAuto("No se pudo cargar el dashboard del productor.")
        );
      } finally {
        if (isMounted) {
          setIsQuickLoading(false);
        }
      }
    }

    void loadQuickDashboard();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || tAuto("Productor");
  const metricCards: Array<{
    label: string;
    value: number | null;
    icon: typeof FiFolder;
    tone: string;
    onClick?: () => void;
  }> = [
    {
      label: tAuto("Proyectos"),
      value: projectsCount,
      icon: FiFolder,
      tone: "slate",
      onClick: () => setDetailModal("projects"),
    },
    {
      label: tAuto("Convocatorias"),
      value: opportunitiesCount,
      icon: FiBriefcase,
      tone: "blue",
    },
    {
      label: tAuto("Activas"),
      value: activeOpportunities,
      icon: FiActivity,
      tone: "green",
      onClick: () => setDetailModal("active"),
    },
    {
      label: tAuto("Cerradas"),
      value: closedOpportunities,
      icon: FiCheckCircle,
      tone: "amber",
      onClick: () => setDetailModal("closed"),
    },
    {
      label: tAuto("Talentos"),
      value: talentsCount,
      icon: FiUsers,
      tone: "violet",
    },
    {
      label: tAuto("Crew"),
      value: activeCrewMembers,
      icon: FiUserCheck,
      tone: "cyan",
    },
    {
      label: tAuto("Mensajes"),
      value: unreadMessages,
      icon: FiMessageSquare,
      tone: "rose",
    },
    {
      label: tAuto("Postulaciones"),
      value: applicationsReceived,
      icon: FiTrendingUp,
      tone: "indigo",
    },
  ].filter((metric) => metric.value !== null);
  const hasRecentActivity = recentActivity.length > 0;

  return (
    <div className="home producer-page">
      <section className="home__hero producer-hero">
        <div>
          <p className="producer-page__eyebrow">{tAuto("Inicio")}</p>
          <h1 className="home__title">{tAuto("Tu operacion creativa, organizada")}</h1>
          <p className="home__subtitle">
            {tAuto(
              "Centraliza tus proyectos y publica convocatorias reales desde un panel conectado a tu backend actual."
            )}
          </p>
          <p className="home__subtitle home__subtitle--meta">
            {displayName} | {profile?.email ?? user?.email ?? tAuto("Sin correo")} | PRODUCER
          </p>
        </div>

        <div className="producer-hero__panel">
          <span className="producer-badge">{tAuto("Cuenta productora activa")}</span>
          <strong>
            {isQuickLoading ? "..." : projectsCount} {tAuto("proyectos registrados")}
          </strong>
          <p>
            {isQuickLoading ? "..." : opportunitiesCount}{" "}
            {tAuto("convocatorias creadas en total.")}
          </p>
        </div>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}
      {!error && detailsError ? (
        <section className="producer-card producer-feedback producer-feedback--warning">
          <p>{detailsError}</p>
        </section>
      ) : null}

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">{tAuto("Resumen general")}</h2>
          <p className="section-heading__text">
            {tAuto("Una vista rapida del estado de tus proyectos, convocatorias y operacion.")}
          </p>
        </div>

        <div className="producer-kpi-grid">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const cardContent = (
              <>
                <span className={`producer-kpi__icon producer-kpi__icon--${metric.tone}`}>
                  <Icon aria-hidden="true" />
                </span>
                <span className="producer-kpi__value">{isQuickLoading ? "..." : metric.value}</span>
                <span className="producer-kpi__label">{metric.label}</span>
                <span className="producer-kpi__signal">{tAuto("Operacion activa")}</span>
              </>
            );

            return metric.onClick ? (
              <ClickableSummaryCard
                key={metric.label}
                className="producer-kpi"
                onClick={metric.onClick}
              >
                {cardContent}
              </ClickableSummaryCard>
            ) : (
              <article key={metric.label} className="producer-kpi">
                {cardContent}
              </article>
            );
          })}
        </div>
      </section>

      <section className="producer-operations-grid">
        <article className="panel producer-project-panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{tAuto("Proyectos recientes")}</h2>
            <p className="section-heading__text">
              {tAuto("Ultimos proyectos registrados para seguir operando sin salir del panel.")}
            </p>
          </div>

          {isDetailsLoading ? (
            <ProducerDetailSkeleton />
          ) : latestProjects.length > 0 ? (
            <div className="producer-list">
              {latestProjects.map((project) => (
                <article key={project.id} className="producer-project-card">
                  <span className="producer-project-card__icon">
                    <FiFilm aria-hidden="true" />
                  </span>
                  <div className="producer-project-card__body">
                    <p className="producer-list-card__meta">{tAuto(project.production_type)}</p>
                    <h3 className="producer-list-card__title">{tAuto(project.title)}</h3>
                    <p className="producer-list-card__text">
                      <FiMapPin aria-hidden="true" /> {tAuto(project.location)} | {formatDisplayDate(project.start_date)}
                    </p>
                  </div>
                  {project.status ? (
                    <span className="producer-project-card__count">
                      {tAuto(project.status)}
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="producer-muted">{tAuto("Todavia no tienes proyectos creados.")}</p>
          )}
        </article>

        <article className="panel producer-calendar-card">
          <div className="section-heading">
            <h2 className="section-heading__title">{tAuto("Proximas actividades")}</h2>
            <p className="section-heading__text">
              {tAuto("Produccion, casting y grabaciones por venir.")}
            </p>
          </div>

          <div className="producer-calendar-list">
            {isDetailsLoading ? (
              <ProducerCompactSkeleton />
            ) : upcomingActivities.length ? upcomingActivities.map((event) => (
              <article key={event.id ?? `${event.title}-${event.date}`} className="producer-calendar-item">
                <span><FiCalendar aria-hidden="true" /></span>
                <div>
                  <strong>{tAuto(event.title)}</strong>
                  <small>{event.type ? tAuto(event.type) : tAuto("Actividad")} | {formatDisplayDate(event.date)}</small>
                </div>
              </article>
            )) : (
              <p className="producer-muted">{tAuto("No hay actividades programadas.")}</p>
            )}
          </div>
        </article>
      </section>

      <section className={hasRecentActivity ? "producer-secondary-grid" : "producer-secondary-grid producer-secondary-grid--actions"}>
        {hasRecentActivity ? (
          <article className="panel producer-activity-card">
            <div className="section-heading">
              <h2 className="section-heading__title">{tAuto("Actividad reciente")}</h2>
              <p className="section-heading__text">
                {tAuto("Feed de novedades reales de tus producciones.")}
              </p>
            </div>

            <div className="producer-activity-feed">
              {recentActivity.map((activity, index) => (
                <article key={activity.id ?? `${activity.title}-${index}`} className="producer-activity-item">
                  <span><FiClock aria-hidden="true" /></span>
                  <div>
                    <small>{activity.time_label ? tAuto(activity.time_label) : formatDisplayDate(activity.created_at ?? null)}</small>
                    <strong>{tAuto(activity.title)}</strong>
                    {activity.description ? <p>{tAuto(activity.description)}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{tAuto("Acciones rapidas")}</h2>
            <p className="section-heading__text">
              {tAuto("Accesos directos para crear y administrar tus proyectos.")}
            </p>
          </div>

          <div className="actions">
            <Link className="actions__button producer-link-button" to="/producer/projects/new">
              {tAuto("Crear proyecto")}
            </Link>
            <Link className="actions__button producer-link-button" to="/producer/projects">
              {tAuto("Ver mis proyectos")}
            </Link>
            <Link
              className="actions__button producer-link-button"
              to="/producer/opportunities/new"
            >
              {tAuto("Crear convocatoria")}
            </Link>
          </div>
        </article>
      </section>

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">{tAuto("Talentos disponibles")}</h2>
          <p className="section-heading__text">
            {tAuto(
              "Consulta perfiles disponibles cuando el backend exponga el listado para productores."
            )}
          </p>
        </div>

        {isDetailsLoading ? (
          <div className="producer-grid">
            <ProducerTalentSkeleton />
            <ProducerTalentSkeleton />
          </div>
        ) : availableTalents.length > 0 ? (
          <div className="producer-talent-showcase">
            {availableTalents.map((talent) => {
              const avatar = getTalentPhoto(talent);
              const mainSpecialty = getTalentMainSpecialty(talent);
              const statusLabel = formatTalentStatus(talent.status);
              const modalityLabel = formatTalentModality(talent.work_modality);
              const locationLabel = getTalentLocation(talent);

              return (
                <article
                  key={talent.id ?? talent.user_uid ?? talent.user_id ?? formatTalentName(talent)}
                  className="producer-card producer-talent-showcase-card"
                >
                  <div className="producer-talent-showcase-card__header">
                    <TalentAvatar
                      src={avatar}
                      name={formatTalentName(talent)}
                      size="md"
                    />
                    <div className="producer-talent-showcase-card__identity">
                      <p>{talent.email ?? tAuto("Sin correo")}</p>
                      <h3>{formatTalentName(talent)}</h3>
                      <small>
                        {mainSpecialty === "Especialidad pendiente"
                          ? tAuto(mainSpecialty)
                          : tAuto(mainSpecialty)}
                      </small>
                    </div>
                    <span className="producer-status">
                      {["Disponible", "No disponible", "Sin estado"].includes(statusLabel)
                        ? tAuto(statusLabel)
                        : tAuto(statusLabel)}
                    </span>
                  </div>

                  <div className="producer-talent-chips">
                    {getTalentSpecialties(talent).slice(0, 2).map((specialty) => (
                      <span key={specialty}>{tAuto(specialty)}</span>
                    ))}
                    <span>
                      {["Freelance", "Hibrido", "Presencial", "Remoto", "Modalidad no informada"].includes(
                        modalityLabel
                      )
                        ? tAuto(modalityLabel)
                        : tAuto(modalityLabel)}
                    </span>
                    <span>
                      {locationLabel === "Ubicacion no informada"
                        ? tAuto(locationLabel)
                        : tAuto(locationLabel)}
                    </span>
                  </div>

                  <div className="producer-talent-showcase-card__footer">
                    <div>
                      <small>{tAuto("Disponible desde")}</small>
                      <strong>{formatDisplayDate(talent.available_from)}</strong>
                    </div>
                    <Link className="producer-profile-link" to="/producer/talents">
                      <FiEye aria-hidden="true" /> {tAuto("Ver perfil")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="panel">
            <p className="producer-muted">{tAuto("No hay talentos disponibles por ahora.")}</p>
          </article>
        )}
      </section>

      {detailModal === "projects" ? (
        <SummaryDetailModal
          title={tAuto("Proyectos creados")}
          description={tAuto("Mostrando hasta 3 proyectos recientes.")}
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {isDetailsLoading ? (
              <ProducerModalSkeleton />
            ) : latestProjects.length ? latestProjects.map((project) => (
              <article key={project.id} className="summary-detail-list__item">
                <h3>{tAuto(project.title)}</h3>
                <p>{tAuto(project.production_type)} | {tAuto(project.location)} | {formatDisplayDate(project.start_date)}</p>
              </article>
            )) : <p className="summary-detail-empty">{tAuto("Todavia no tienes proyectos creados.")}</p>}
          </div>
        </SummaryDetailModal>
      ) : null}

      {detailModal === "active" || detailModal === "closed" ? (
        <SummaryDetailModal
          title={
            detailModal === "active"
              ? tAuto("Convocatorias activas")
              : tAuto("Convocatorias cerradas")
          }
          description={tAuto("Mostrando hasta 5 convocatorias.")}
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {isDetailsLoading
              ? <ProducerModalSkeleton />
              : (detailModal === "active" ? activeOpportunityDetails : closedOpportunityDetails).length
              ? (detailModal === "active" ? activeOpportunityDetails : closedOpportunityDetails).map((opportunity) => (
                <article key={opportunity.id} className="summary-detail-list__item">
                  <h3>{tAuto(opportunity.title)}</h3>
                  <p>
                    {tAuto(opportunity.role_needed || opportunity.specialty)} | {tAuto(opportunity.location)} | {tAuto(opportunity.status)}
                  </p>
                </article>
              ))
              : <p className="summary-detail-empty">{tAuto("No hay convocatorias para mostrar.")}</p>}
          </div>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

function ProducerDetailSkeleton() {
  return (
    <div className="producer-list">
      {[0, 1, 2].map((item) => (
        <article key={item} className="producer-list-card producer-dashboard-skeleton">
          <span></span>
          <strong></strong>
          <small></small>
        </article>
      ))}
    </div>
  );
}

function ProducerTalentSkeleton() {
  return (
    <article className="producer-card producer-record producer-dashboard-skeleton">
      <span></span>
      <strong></strong>
      <small></small>
      <em></em>
    </article>
  );
}

function ProducerCompactSkeleton() {
  return (
    <div className="producer-compact-skeleton">
      {[0, 1, 2].map((item) => (
        <article key={item} className="producer-dashboard-skeleton">
          <span></span>
          <strong></strong>
        </article>
      ))}
    </div>
  );
}

function ProducerModalSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <article key={item} className="summary-detail-list__item producer-dashboard-skeleton">
          <span></span>
          <small></small>
        </article>
      ))}
    </>
  );
}

function ProducerHome() {
  return (
    <ProducerGuard>
      <ProducerHomeContent />
    </ProducerGuard>
  );
}

export default ProducerHome;
