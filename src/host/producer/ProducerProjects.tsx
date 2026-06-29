import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import TalentProfileModal from "../../components/TalentProfileModal";
import TalentAvatar from "../../components/TalentAvatar";
import { getMyProjects, updateProjectStatus } from "../../service/projectApi";
import { getMyOpportunities } from "../../service/opportunityApi";
import { getOpportunityApplications } from "../../service/applicationApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import type { Opportunity, Project } from "../../types/producer";
import type { TalentApplication } from "../../types/talent";
import { formatDisplayDate, formatStatusLabel } from "./utils";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import {
  getTalentIdentityEmail,
  getTalentIdentityName,
  getTalentIdentityPhoto,
  resolveTalentUserId,
  talentFallbackFromApplication,
} from "../../utils/talentProfile";
import "../../styles/producer.css";

type ProjectFilters = {
  search: string;
  productionType: string;
  status: string;
};

type ProjectApplicationGroup = {
  opportunity: Opportunity;
  applications: TalentApplication[];
};

const initialFilters: ProjectFilters = {
  search: "",
  productionType: "",
  status: "",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  DRAFT: "Borrador",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  OPEN: "Activa",
  PAUSED: "Pausada",
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Aceptada",
  CANCELLED: "Cancelada",
  IN_REVIEW: "En revisión",
  PENDING: "Pendiente",
  PRESELECTED: "Preseleccionada",
  REJECTED: "Rechazada",
  SUBMITTED: "Enviada",
};

const PRODUCTION_TYPE_OPTIONS = [
  { value: "pelicula", label: "Película" },
  { value: "serie", label: "Serie" },
  { value: "documental", label: "Documental" },
  { value: "cortometraje", label: "Cortometraje" },
  { value: "videoclip", label: "Videoclip" },
  { value: "comercial", label: "Comercial" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];

const producerProjectsBaseTexts = [
  "Activa",
  "Borrador",
  "Cerrada",
  "Cancelada",
  "Completada",
  "Pausada",
  "Película",
  "Serie",
  "Documental",
  "Cortometraje",
  "Videoclip",
  "Comercial",
  "Evento",
  "Otro",
  "No informado",
  "No se pudieron cargar tus proyectos.",
  "No se pudieron cargar las postulaciones del proyecto.",
  "Mis proyectos",
  "Gestiona tus producciones",
  "Consulta el estado de cada proyecto y crea convocatorias asociadas cuando lo necesites.",
  "Nuevo proyecto",
  "Proyectos",
  "proyectos",
  "Cargando registros...",
  "Buscar por nombre",
  "Buscar proyecto",
  "Tipo de produccion",
  "Todos",
  "Estado",
  "Aun no hay proyectos",
  "Crea tu primer proyecto para empezar a publicar convocatorias reales.",
  "Sin resultados",
  "Ajusta los filtros para ver otros proyectos.",
  "Proyecto",
  "Tipo",
  "Ubicacion",
  "Fecha inicio",
  "Fecha fin",
  "Convocatorias",
  "Acciones",
  "Sin descripcion",
  "No informada",
  "Ver detalle",
  "Editar",
  "Crear convocatoria",
  "Ver postulaciones",
  "Detalle de proyecto",
  "Este proyecto no incluye descripcion adicional.",
  "Cerrar",
  "Postulaciones del proyecto",
  "Cargando postulaciones...",
  "No hay convocatorias para este proyecto.",
  "No hay postulantes para este proyecto.",
  "Convocatoria",
  "Postulante",
  "Correo",
  "Mensaje",
  "Fecha de postulación",
  "Sin correo",
  "Talento sin nombre",
  "No disponible todavía.",
  "Aceptada",
  "Rechazada",
  "Pendiente",
  "En revisión",
  "Enviada",
];

const FINISHED_STATUSES = new Set(["finalizado", "completado", "publicado", "completed", "published"]);

function normalizeFilterText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeProductionType(value?: string | null): string {
  return normalizeFilterText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatProductionType(value?: string | null): string {
  const normalizedValue = normalizeProductionType(value);

  return (
    PRODUCTION_TYPE_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    "No informado"
  );
}

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function formatProjectStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);

  return PROJECT_STATUS_LABELS[normalizedValue] ?? formatStatusLabel(value);
}

function formatApplicationStatus(value?: string | null): string {
  const normalizedValue = value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";
  return APPLICATION_STATUS_LABELS[normalizedValue] ?? value?.trim() ?? "Pendiente";
}

function formatApplicationDate(value?: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getProjectOpportunityCount(project: Project): number {
  return Math.max(0, Number(project.opportunities_count) || 0);
}

function getApplicantName(application: TalentApplication): string {
  return getTalentIdentityName(application);
}

function getApplicantEmail(application: TalentApplication): string {
  return getTalentIdentityEmail(application);
}

function getApplicantPhoto(application: TalentApplication): string {
  return getTalentIdentityPhoto(application);
}

function getApplicantSpecialties(application: TalentApplication): string[] {
  return (
    application.specialties ??
    application.talent_profile?.specialties ??
    application.profile?.specialties ??
    (application.main_specialty ? [application.main_specialty] : [])
  );
}

function ProducerProjectsContent() {
  const navigate = useNavigate();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [applicationsProject, setApplicationsProject] = useState<Project | null>(null);
  const [profileApplication, setProfileApplication] =
    useState<TalentApplication | null>(null);
  const [applicationsByProject, setApplicationsByProject] = useState<
    Record<string, ProjectApplicationGroup[]>
  >({});
  const [loadingApplicationsProjectId, setLoadingApplicationsProjectId] = useState("");
  const [applicationsError, setApplicationsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingFinishedId, setMarkingFinishedId] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        producerProjectsBaseTexts,
        projects.flatMap((project) => [
          project.title,
          project.description,
          project.location,
          project.production_type,
          formatProjectStatusLabel(project.status),
        ])
      ),
    [projects]
  );

  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setError("");
        const nextProjects = await reusePendingRequest(
          `producer-projects:${token}`,
          () => getMyProjects(token ?? undefined)
        );

        if (isMounted) {
          setProjects(nextProjects);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar tus proyectos."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => normalizeStatus(project.status)).filter(Boolean))
      ).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const search = normalizeFilterText(filters.search);

    return projects.filter((project) => {
      const matchesSearch =
        !search ||
        normalizeFilterText(project.title).includes(search) ||
        normalizeFilterText(project.description).includes(search);

      const matchesProductionType =
        !filters.productionType ||
        normalizeProductionType(project.production_type) === filters.productionType;

      const matchesStatus =
        !filters.status || normalizeStatus(project.status) === filters.status;

      return matchesSearch && matchesProductionType && matchesStatus;
    });
  }, [filters, projects]);

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFilters((current) => ({ ...current, [name]: value }));
  };

  const navigateToEdit = (projectId: string) => {
    navigate(`/producer/projects/${projectId}/edit`);
  };

  const navigateToNewOpportunity = (projectId: string) => {
    navigate("/producer/opportunities/new", {
      state: { projectId },
    });
  };

  const handleOpenProjectApplications = async (project: Project) => {
    setApplicationsProject(project);
    setApplicationsError("");

    if (applicationsByProject[project.id]) {
      return;
    }

    try {
      setLoadingApplicationsProjectId(project.id);

      const opportunities = await reusePendingRequest(
        `producer-project-applications-opportunities:${project.id}:${token}`,
        () => getMyOpportunities(token ?? undefined)
      );

      const projectOpportunities = opportunities.filter(
        (opportunity) => opportunity.project_id === project.id
      );

      const groups = await Promise.all(
        projectOpportunities.map(async (opportunity) => {
          try {
            const applications = await getOpportunityApplications(
              opportunity.id,
              token ?? undefined
            );

            return {
              opportunity,
              applications,
            };
          } catch {
            return {
              opportunity,
              applications: [],
            };
          }
        })
      );

      setApplicationsByProject((current) => ({
        ...current,
        [project.id]: groups,
      }));
    } catch (loadError) {
      setApplicationsError(
        loadError instanceof Error
          ? loadError.message
          : tAuto("No se pudieron cargar las postulaciones del proyecto.")
      );
    } finally {
      setLoadingApplicationsProjectId("");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleMarkFinished = async (project: Project) => {
    if (!window.confirm(`¿Marcar "${project.title}" como finalizado?`)) return;
    setMarkingFinishedId(project.id);
    try {
      const updated = await updateProjectStatus(project.id, "completed", token ?? undefined);
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, ...updated } : p))
      );
      setToast({ message: "Proyecto marcado como finalizado", type: "success" });
    } catch {
      setToast({ message: "No se pudo actualizar el estado del proyecto", type: "error" });
    } finally {
      setMarkingFinishedId("");
    }
  };

  const currentProjectApplicationGroups = applicationsProject
    ? applicationsByProject[applicationsProject.id] ?? []
    : [];

  const currentProjectApplicationsTotal = currentProjectApplicationGroups.reduce(
    (total, group) => total + group.applications.length,
    0
  );

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner producer-banner--compact">
        <div>
          <p className="producer-page__eyebrow">{tAuto("Mis proyectos")}</p>
          <h1 className="producer-page__title">{tAuto("Gestiona tus producciones")}</h1>
          <p className="producer-page__subtitle">
            {tAuto(
              "Consulta el estado de cada proyecto y crea convocatorias asociadas cuando lo necesites."
            )}
          </p>
        </div>
        <Link className="producer-button producer-button--primary" to="/producer/projects/new">
          {tAuto("Nuevo proyecto")}
        </Link>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="producer-card producer-project-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>{tAuto("Proyectos")}</h2>
            <span>
              {isLoading
                ? tAuto("Cargando registros...")
                : `${filteredProjects.length} de ${projects.length} ${tAuto("proyectos")}`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters">
          <label className="producer-field">
            <span>{tAuto("Buscar por nombre")}</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder={tAuto("Buscar proyecto")}
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Tipo de produccion")}</span>
            <select
              name="productionType"
              value={filters.productionType}
              onChange={handleFilterChange}
            >
              <option value="">{tAuto("Todos")}</option>
              {PRODUCTION_TYPE_OPTIONS.map((productionType) => (
                <option key={productionType.value} value={productionType.value}>
                  {tAuto(productionType.label)}
                </option>
              ))}
            </select>
          </label>

          <label className="producer-field">
            <span>{tAuto("Estado")}</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">{tAuto("Todos")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {tAuto(formatProjectStatusLabel(status))}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <ProjectTableSkeleton />
        ) : projects.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">{tAuto("Aun no hay proyectos")}</h2>
            <p className="producer-card__text">
              {tAuto("Crea tu primer proyecto para empezar a publicar convocatorias reales.")}
            </p>
          </article>
        ) : filteredProjects.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">{tAuto("Sin resultados")}</h2>
            <p className="producer-card__text">
              {tAuto("Ajusta los filtros para ver otros proyectos.")}
            </p>
          </article>
        ) : (
          <div className="producer-project-table-wrap">
            <table className="producer-project-table">
              <thead>
                <tr>
                  <th>{tAuto("Proyecto")}</th>
                  <th>{tAuto("Tipo")}</th>
                  <th>{tAuto("Ubicacion")}</th>
                  <th>{tAuto("Fecha inicio")}</th>
                  <th>{tAuto("Fecha fin")}</th>
                  <th>{tAuto("Estado")}</th>
                  <th>{tAuto("Convocatorias")}</th>
                  <th>{tAuto("Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const opportunitiesCount = getProjectOpportunityCount(project);

                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="producer-project-table__title">
                          <strong>{tAuto(project.title)}</strong>
                          <span>
                            {project.description
                              ? tAuto(project.description)
                              : tAuto("Sin descripcion")}
                          </span>
                        </div>
                      </td>
                      <td>{tAuto(formatProductionType(project.production_type))}</td>
                      <td>
                        {project.location ? tAuto(project.location) : tAuto("No informada")}
                      </td>
                      <td>{formatDisplayDate(project.start_date)}</td>
                      <td>{formatDisplayDate(project.end_date)}</td>
                      <td>
                        <span
                          className={`producer-status producer-status--${
                            normalizeStatus(project.status).toLowerCase() || "default"
                          }`}
                        >
                          {tAuto(formatProjectStatusLabel(project.status))}
                        </span>
                      </td>
                      <td>
                        <span className="producer-count-badge">{opportunitiesCount} conv.</span>
                      </td>
                      <td>
                        <div className="producer-table-actions">
                          <button
                            className="producer-button"
                            type="button"
                            onClick={() => setDetailProject(project)}
                          >
                            {tAuto("Ver detalle")}
                          </button>
                          <button
                            className="producer-button"
                            type="button"
                            onClick={() => navigateToEdit(project.id)}
                          >
                            {tAuto("Editar")}
                          </button>
                          <button
                            className="producer-button"
                            type="button"
                            onClick={() => navigateToNewOpportunity(project.id)}
                          >
                            {tAuto("Crear convocatoria")}
                          </button>
                          <button
                            className="producer-button"
                            type="button"
                            onClick={() => void handleOpenProjectApplications(project)}
                          >
                            {tAuto("Ver postulaciones")}
                          </button>
                          {!FINISHED_STATUSES.has(String(project.status).toLowerCase()) ? (
                            <button
                              className="producer-button"
                              type="button"
                              disabled={markingFinishedId === project.id}
                              onClick={() => void handleMarkFinished(project)}
                            >
                              {markingFinishedId === project.id ? "Marcando..." : "Marcar finalizado"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailProject ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">{tAuto("Detalle de proyecto")}</p>
                <h2>{tAuto(detailProject.title)}</h2>
              </div>
              <span
                className={`producer-status producer-status--${
                  normalizeStatus(detailProject.status).toLowerCase() || "default"
                }`}
              >
                {tAuto(formatProjectStatusLabel(detailProject.status))}
              </span>
            </div>

            <p className="producer-record__text">
              {detailProject.description
                ? tAuto(detailProject.description)
                : tAuto("Este proyecto no incluye descripcion adicional.")}
            </p>

            <div className="producer-project-detail-grid">
              <div>
                <span>{tAuto("Tipo de produccion")}</span>
                <strong>{tAuto(formatProductionType(detailProject.production_type))}</strong>
              </div>
              <div>
                <span>{tAuto("Ubicacion")}</span>
                <strong>
                  {detailProject.location
                    ? tAuto(detailProject.location)
                    : tAuto("No informada")}
                </strong>
              </div>
              <div>
                <span>{tAuto("Fecha inicio")}</span>
                <strong>{formatDisplayDate(detailProject.start_date)}</strong>
              </div>
              <div>
                <span>{tAuto("Fecha fin")}</span>
                <strong>{formatDisplayDate(detailProject.end_date)}</strong>
              </div>
              <div>
                <span>{tAuto("Estado")}</span>
                <strong>{tAuto(formatProjectStatusLabel(detailProject.status))}</strong>
              </div>
              <div>
                <span>{tAuto("Convocatorias")}</span>
                <strong>{getProjectOpportunityCount(detailProject)} conv.</strong>
              </div>
            </div>

            <div className="producer-actions">
              <button
                className="producer-button"
                type="button"
                onClick={() => navigateToEdit(detailProject.id)}
              >
                {tAuto("Editar")}
              </button>
              <button
                className="producer-button"
                type="button"
                onClick={() => navigateToNewOpportunity(detailProject.id)}
              >
                {tAuto("Crear convocatoria")}
              </button>
              <button
                className="producer-button"
                type="button"
                onClick={() => void handleOpenProjectApplications(detailProject)}
              >
                {tAuto("Ver postulaciones")}
              </button>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => setDetailProject(null)}
              >
                {tAuto("Cerrar")}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {applicationsProject ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">
                  {tAuto("Postulaciones del proyecto")}
                </p>
                <h2>{tAuto(applicationsProject.title)}</h2>
              </div>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => {
                  setApplicationsProject(null);
                  setApplicationsError("");
                }}
              >
                {tAuto("Cerrar")}
              </button>
            </div>

            {loadingApplicationsProjectId === applicationsProject.id ? (
              <p className="producer-muted">{tAuto("Cargando postulaciones...")}</p>
            ) : applicationsError ? (
              <p className="producer-feedback producer-feedback--error">{applicationsError}</p>
            ) : currentProjectApplicationGroups.length === 0 ? (
              <p className="producer-muted">
                {tAuto("No hay convocatorias para este proyecto.")}
              </p>
            ) : currentProjectApplicationsTotal === 0 ? (
              <p className="producer-muted">
                {tAuto("No hay postulantes para este proyecto.")}
              </p>
            ) : (
              <div className="producer-list">
                {currentProjectApplicationGroups.map((group) =>
                  group.applications.map((application) => {
                    const photoUrl = getApplicantPhoto(application);
                    const specialties = getApplicantSpecialties(application);

                    return (
                      <article key={application.id} className="producer-list-card">
                        <div className="producer-record__header">
                          <button
                            className="producer-profile-trigger producer-applicant-inline"
                            type="button"
                            disabled={!resolveTalentUserId(application)}
                            title={
                              resolveTalentUserId(application)
                                ? "Ver ficha"
                                : "No se pudo identificar el user_id del talento."
                            }
                            onClick={() => setProfileApplication(application)}
                          >
                            <TalentAvatar
                              src={photoUrl}
                              name={getApplicantName(application)}
                              size="sm"
                            />
                            <div>
                              <p className="producer-list-card__meta">
                                {tAuto("Convocatoria")}: {tAuto(group.opportunity.title)}
                              </p>
                              <h4 className="producer-list-card__title">
                                {getApplicantName(application)}
                              </h4>
                              <p className="producer-list-card__meta">
                                {getApplicantEmail(application)}
                              </p>
                            </div>
                          </button>

                          <span
                            className={`producer-status producer-status--${normalizeStatus(
                              application.status
                            ).toLowerCase()}`}
                          >
                            {tAuto(formatApplicationStatus(application.status))}
                          </span>
                        </div>

                        <p className="producer-list-card__text">
                          {tAuto("Fecha de postulación")}:{" "}
                          {formatApplicationDate(
                            application.applied_at || application.created_at
                          )}
                        </p>

                        <p className="producer-list-card__text">
                          {tAuto("Mensaje")}:{" "}
                          {application.message?.trim()
                            ? tAuto(application.message)
                            : tAuto("No disponible todavía.")}
                        </p>

                        {specialties.length ? (
                          <div className="producer-chip-list">
                            {specialties.map((specialty) => (
                              <span key={specialty} className="producer-chip">
                                {tAuto(specialty)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="producer-actions producer-actions--inline">
                          <button
                            className="producer-button"
                            type="button"
                            disabled={!resolveTalentUserId(application)}
                            title={
                              resolveTalentUserId(application)
                                ? undefined
                                : "No se pudo identificar el user_id del talento."
                            }
                            onClick={() => setProfileApplication(application)}
                          >
                            {resolveTalentUserId(application)
                              ? "Ver ficha"
                              : "Ficha no disponible: falta user_id"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </article>
        </div>
      ) : null}

      {profileApplication ? (
        <TalentProfileModal
          userId={resolveTalentUserId(profileApplication)}
          fallback={talentFallbackFromApplication(profileApplication)}
          token={token ?? undefined}
          onClose={() => setProfileApplication(null)}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function ProjectTableSkeleton() {
  return (
    <div className="producer-project-table-wrap">
      <div className="producer-project-table-skeleton producer-dashboard-skeleton">
        {[0, 1, 2, 3].map((item) => (
          <article key={item}>
            <span></span>
            <strong></strong>
            <small></small>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProducerProjects() {
  return (
    <ProducerGuard>
      <ProducerProjectsContent />
    </ProducerGuard>
  );
}

export default ProducerProjects;
