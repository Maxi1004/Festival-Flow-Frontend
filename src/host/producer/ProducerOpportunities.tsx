import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
import {
  getOpportunityApplications,
  updateApplicationStatus,
} from "../../service/applicationApi";
import { getMyProjects } from "../../service/projectApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import {
  getMyOpportunitiesCrm,
  updateOpportunity,
  updateOpportunityStatus,
} from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import type { TalentApplication } from "../../types/talent";
import {
  formatDisplayDate,
  formatStatusLabel,
  isActiveStatus,
  isCancelledStatus,
  normalizeOpportunityFormData,
  requirementsToTextarea,
  toDateInputValue,
  toVisibleStatusAction,
} from "./utils";
import {
  OPPORTUNITY_MODALITY_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
} from "../../types/producer";
import "../../styles/producer.css";
import { useCurrentProfile } from "../useCurrentProfile";

type OpportunityFormState = {
  project_id: string;
  title: string;
  role_needed: string;
  specialty: string;
  description: string;
  location: string;
  modality: string;
  requirements: string;
  status: string;
  deadline: string;
};

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  OPEN: "Activa",
  DRAFT: "Borrador",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  PAUSED: "Pausada",
};

const OPPORTUNITY_MODALITY_LABELS: Record<string, string> = {
  REMOTE: "Remota",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
  FLEXIBLE: "Flexible",
};

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeUpper(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function formatOpportunityStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeUpper(value);
  return OPPORTUNITY_STATUS_LABELS[normalizedValue] ?? formatStatusLabel(value);
}

function formatOpportunityModality(value?: string | null): string {
  const normalizedValue = normalizeUpper(value);
  return OPPORTUNITY_MODALITY_LABELS[normalizedValue] ?? value?.trim() ?? "No informada";
}

function formatApplicationStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptada",
    CANCELLED: "Cancelada",
    IN_REVIEW: "En revisión",
    PENDING: "Pendiente",
    PRESELECTED: "Preseleccionada",
    REJECTED: "Rechazada",
    SUBMITTED: "Enviada",
  };
  const normalizedValue = value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function isTerminalApplicationStatus(value?: string | null): boolean {
  return ["ACCEPTED", "REJECTED", "CANCELLED"].includes(normalizeUpper(value));
}

function formatApplicationDate(value?: string | null): string {
  if (!value) return "Sin fecha";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getApplicantName(application: TalentApplication): string {
  return (
    application.talent_name?.trim() ||
    application.talent?.name?.trim() ||
    application.talent?.display_name?.trim() ||
    application.talent?.profile?.display_name?.trim() ||
    application.user?.name?.trim() ||
    application.user?.display_name?.trim() ||
    application.talent_profile?.display_name?.trim() ||
    application.profile?.display_name?.trim() ||
    "Talento sin nombre"
  );
}

function getApplicantEmail(application: TalentApplication): string {
  return (
    application.talent_email?.trim() ||
    application.talent?.email?.trim() ||
    application.user?.email?.trim() ||
    "Sin correo"
  );
}

function getApplicantSpecialties(application: TalentApplication): string[] {
  return (
    application.specialties ??
    application.talent_profile?.specialties ??
    application.profile?.specialties ??
    (application.main_specialty ? [application.main_specialty] : [])
  );
}

function getOpportunityApplicantsCount(opportunity: Opportunity): number {
  return Number(
    opportunity.applications_count ??
    opportunity.applicants_count ??
    opportunity.applicantsCount ??
    0
  );
}

function getOpportunityProjectLabel(opportunity: Opportunity, fallback = "Proyecto sin informar"): string {
  return (
    opportunity.project_title?.trim() ||
    opportunity.project?.title?.trim() ||
    fallback
  );
}

function buildFormState(opportunity: Opportunity): OpportunityFormState {
  return {
    project_id: opportunity.project_id ?? "",
    title: opportunity.title ?? "",
    role_needed: opportunity.role_needed ?? "",
    specialty: opportunity.specialty ?? "",
    description: opportunity.description ?? "",
    location: opportunity.location ?? "",
    modality: opportunity.modality ?? "REMOTE",
    requirements: requirementsToTextarea(opportunity.requirements),
    status: toVisibleStatusAction(opportunity.status),
    deadline: toDateInputValue(opportunity.deadline),
  };
}

function ProducerOpportunitiesContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useCurrentProfile();

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState("");
  const [loadingApplicantsId, setLoadingApplicantsId] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [detailOpportunity, setDetailOpportunity] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [editFormData, setEditFormData] = useState<OpportunityFormState | null>(null);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [applicantsModalOpportunity, setApplicantsModalOpportunity] =
    useState<Opportunity | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    projectId: "",
    status: "",
    modality: "",
  });
  const [applicantsByOpportunity, setApplicantsByOpportunity] = useState<
    Record<string, TalentApplication[]>
  >({});
  const [applicantsErrorByOpportunity, setApplicantsErrorByOpportunity] = useState<
    Record<string, string>
  >({});
  const [applicantsSuccessByOpportunity, setApplicantsSuccessByOpportunity] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");
  const [summaryModal, setSummaryModal] = useState<"all" | "active" | null>(null);

  const focusedProjectId =
    (location.state as { projectId?: string } | null)?.projectId ?? "";

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const nextOpportunities = await reusePendingRequest(
          `producer-opportunities-crm:${token}`,
          () => getMyOpportunitiesCrm(token ?? undefined)
        );

        if (!isMounted) return;

        const createdOpportunity =
          (location.state as { createdOpportunity?: Opportunity } | null)
            ?.createdOpportunity ?? null;

        const mergedOpportunities =
          createdOpportunity &&
          !nextOpportunities.some((opportunity) => opportunity.id === createdOpportunity.id)
            ? [createdOpportunity, ...nextOpportunities]
            : nextOpportunities;

        setOpportunities(mergedOpportunities);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar tus convocatorias."
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [location.state, token]);

  const activeCount = opportunities.filter((item) => isActiveStatus(item.status)).length;
  const focusedProjectTitle =
    opportunities.find((opportunity) => opportunity.project_id === focusedProjectId)?.project_title ??
    opportunities.find((opportunity) => opportunity.project_id === focusedProjectId)?.project?.title ??
    "";

  const displayedOpportunities = focusedProjectId
    ? opportunities.filter((opportunity) => opportunity.project_id === focusedProjectId)
    : opportunities;

  const summaryOpportunities =
    summaryModal === "active"
      ? opportunities.filter((item) => isActiveStatus(item.status))
      : opportunities;

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(displayedOpportunities.map((item) => normalizeUpper(item.status)).filter(Boolean))
      ).sort(),
    [displayedOpportunities]
  );

  const modalityOptions = useMemo(
    () =>
      Array.from(
        new Set(displayedOpportunities.map((item) => normalizeUpper(item.modality)).filter(Boolean))
      ).sort(),
    [displayedOpportunities]
  );

  const projectOptions = useMemo(() => {
    const options = new Map<string, string>();

    opportunities.forEach((opportunity) => {
      if (opportunity.project_id) {
        options.set(opportunity.project_id, getOpportunityProjectLabel(opportunity));
      }
    });

    return Array.from(options.entries()).map(([id, title]) => ({ id, title }));
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const search = normalizeText(filters.search);

    return displayedOpportunities.filter((opportunity) => {
      const projectTitle = getOpportunityProjectLabel(opportunity);

      const matchesSearch =
        !search ||
        normalizeText(opportunity.title).includes(search) ||
        normalizeText(projectTitle).includes(search) ||
        normalizeText(opportunity.role_needed).includes(search) ||
        normalizeText(opportunity.specialty).includes(search);

      const matchesProject = !filters.projectId || opportunity.project_id === filters.projectId;
      const matchesStatus = !filters.status || normalizeUpper(opportunity.status) === filters.status;
      const matchesModality =
        !filters.modality || normalizeUpper(opportunity.modality) === filters.modality;

      return matchesSearch && matchesProject && matchesStatus && matchesModality;
    });
  }, [displayedOpportunities, filters]);

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const ensureProjectsLoaded = async () => {
    if (projects.length > 0) {
      return;
    }

    const nextProjects = await reusePendingRequest(
      `producer-opportunities-projects:${token}`,
      () => getMyProjects(token ?? undefined)
    );

    setProjects(nextProjects);
  };

  const handleOpenEditModal = async (opportunity: Opportunity) => {
    try {
      setEditError("");
      await ensureProjectsLoaded();
    } catch (loadError) {
      setEditError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los proyectos para editar."
      );
    }

    setEditingOpportunity(opportunity);
    setEditFormData(buildFormState(opportunity));
  };

  const handleEditChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setEditFormData((current) => (current ? { ...current, [name]: value } : current));
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingOpportunity || !editFormData) return;

    try {
      setIsEditingSubmitting(true);
      setEditError("");

      const updated = await updateOpportunity(
        editingOpportunity.id,
        normalizeOpportunityFormData(editFormData),
        token ?? undefined
      );

      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setDetailOpportunity((current) => (current?.id === updated.id ? updated : current));
      setApplicantsModalOpportunity((current) =>
        current?.id === updated.id ? updated : current
      );

      setEditingOpportunity(null);
      setEditFormData(null);
    } catch (submitError) {
      setEditError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo actualizar la convocatoria."
      );
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      setClosingId(opportunityId);
      setError("");

      const updated = await updateOpportunityStatus(
        opportunityId,
        { status: "CANCELLED" },
        token ?? undefined
      );

      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setDetailOpportunity((current) => (current?.id === updated.id ? updated : current));
      setEditingOpportunity((current) => (current?.id === updated.id ? updated : current));
      setApplicantsModalOpportunity((current) =>
        current?.id === updated.id ? updated : current
      );
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "No se pudo cerrar la convocatoria."
      );
    } finally {
      setClosingId("");
    }
  };

  const handleOpenApplicantsModal = async (opportunity: Opportunity) => {
    setApplicantsModalOpportunity(opportunity);
    setApplicantsSuccessByOpportunity((current) => {
      const nextValue = { ...current };
      delete nextValue[opportunity.id];
      return nextValue;
    });

    if (applicantsByOpportunity[opportunity.id] || applicantsErrorByOpportunity[opportunity.id]) {
      return;
    }

    try {
      setLoadingApplicantsId(opportunity.id);
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunity.id];
        return nextValue;
      });

      const applicants = await getOpportunityApplications(opportunity.id, token ?? undefined);

      setApplicantsByOpportunity((current) => ({
        ...current,
        [opportunity.id]: applicants,
      }));
    } catch (loadError) {
      setApplicantsErrorByOpportunity((current) => ({
        ...current,
        [opportunity.id]:
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los postulantes.",
      }));
    } finally {
      setLoadingApplicantsId("");
    }
  };

  const handleUpdateApplicantStatus = async (
    opportunityId: string,
    applicationId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    try {
      setUpdatingApplicationId(applicationId);
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunityId];
        return nextValue;
      });

      const updatedApplication = await updateApplicationStatus(
        applicationId,
        status,
        token ?? undefined
      );

      setApplicantsByOpportunity((current) => ({
        ...current,
        [opportunityId]: (current[opportunityId] ?? []).map((application) =>
          application.id === applicationId
            ? {
                ...application,
                ...(updatedApplication.opportunity_id ? updatedApplication : {}),
                id: application.id,
                opportunity_id: application.opportunity_id,
                status: updatedApplication.status || status,
              }
            : application
        ),
      }));

      setApplicantsSuccessByOpportunity((current) => ({
        ...current,
        [opportunityId]:
          status === "ACCEPTED"
            ? "Postulante aceptado correctamente."
            : "Postulante rechazado correctamente.",
      }));
    } catch (updateError) {
      setApplicantsErrorByOpportunity((current) => ({
        ...current,
        [opportunityId]:
          updateError instanceof Error
            ? updateError.message
            : "No se pudo actualizar el estado del postulante.",
      }));
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const handleCloseApplicantsModal = () => {
    const opportunityId = applicantsModalOpportunity?.id;

    if (opportunityId) {
      setApplicantsSuccessByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunityId];
        return nextValue;
      });
    }

    setApplicantsModalOpportunity(null);
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner producer-banner--compact">
        <div>
          <p className="producer-page__eyebrow">Convocatorias</p>
          <h1 className="producer-page__title">Administra tus oportunidades</h1>
          <p className="producer-page__subtitle">
            Publica, actualiza o cierra convocatorias conectadas a tus proyectos reales.
          </p>
        </div>
        <Link className="producer-button producer-button--primary" to="/producer/opportunities/new">
          Nueva convocatoria
        </Link>
      </section>

      <section className="producer-metrics">
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setSummaryModal("all")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : opportunities.length}</span>
          <p className="producer-metric__label">Total convocatorias</p>
        </ClickableSummaryCard>

        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setSummaryModal("active")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : activeCount}</span>
          <p className="producer-metric__label">Activas</p>
        </ClickableSummaryCard>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      {focusedProjectId ? (
        <section className="producer-card producer-flow-focus">
          <div>
            <p className="producer-page__eyebrow">Postulantes por proyecto</p>
            <h2 className="producer-record__title">
              {focusedProjectTitle || "Proyecto seleccionado"}
            </h2>
            <p className="producer-record__text">
              Revisa las convocatorias asociadas y abre sus postulantes para aceptar o rechazar.
            </p>
          </div>
          <button
            className="producer-button"
            type="button"
            onClick={() => navigate("/producer/opportunities", { replace: true })}
          >
            Ver todas las convocatorias
          </button>
        </section>
      ) : null}

      <section className="producer-card producer-project-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>Convocatorias</h2>
            <span>
              {isLoading
                ? "Cargando registros..."
                : `${filteredOpportunities.length} de ${displayedOpportunities.length} convocatorias`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters">
          <label className="producer-field">
            <span>Buscar</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar convocatoria, proyecto o rol"
            />
          </label>

          <label className="producer-field">
            <span>Proyecto</span>
            <select name="projectId" value={filters.projectId} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label className="producer-field">
            <span>Estado</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatOpportunityStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="producer-field">
            <span>Modalidad</span>
            <select name="modality" value={filters.modality} onChange={handleFilterChange}>
              <option value="">Todas</option>
              {modalityOptions.map((modality) => (
                <option key={modality} value={modality}>
                  {formatOpportunityModality(modality)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <article className="producer-empty">
            <p>Cargando convocatorias...</p>
          </article>
        ) : displayedOpportunities.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">
              {focusedProjectId
                ? "Este proyecto todavía no tiene convocatorias"
                : "No hay convocatorias todavía"}
            </h2>
            <p className="producer-card__text">
              Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.
            </p>
          </article>
        ) : filteredOpportunities.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">Sin resultados</h2>
            <p className="producer-card__text">
              Ajusta los filtros para ver otras convocatorias.
            </p>
          </article>
        ) : (
          <div className="producer-project-table-wrap">
            <table className="producer-project-table">
              <thead>
                <tr>
                  <th>Convocatoria</th>
                  <th>Proyecto</th>
                  <th>Rol</th>
                  <th>Especialidad</th>
                  <th>Modalidad</th>
                  <th>Fecha límite</th>
                  <th>Estado</th>
                  <th>Postulantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>
                      <div className="producer-project-table__title">
                        <strong>{opportunity.title}</strong>
                        <span>{opportunity.description || "Sin descripción"}</span>
                      </div>
                    </td>
                    <td>{getOpportunityProjectLabel(opportunity)}</td>
                    <td>{opportunity.role_needed || "No informado"}</td>
                    <td>{opportunity.specialty || "No informada"}</td>
                    <td>{formatOpportunityModality(opportunity.modality)}</td>
                    <td>{formatDisplayDate(opportunity.deadline)}</td>
                    <td>
                      <span
                        className={`producer-status producer-status--${
                          normalizeUpper(opportunity.status).toLowerCase() || "default"
                        }`}
                      >
                        {formatOpportunityStatusLabel(opportunity.status)}
                      </span>
                    </td>
                    <td>
                      <span className="producer-count-badge">
                        {applicantsByOpportunity[opportunity.id]?.length ??
                          getOpportunityApplicantsCount(opportunity)} postul.
                      </span>
                    </td>
                    <td>
                      <div className="producer-table-actions">
                        <button
                          className="producer-button"
                          type="button"
                          onClick={() => setDetailOpportunity(opportunity)}
                        >
                          Ver detalle
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          onClick={() => void handleOpenEditModal(opportunity)}
                        >
                          Editar
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          disabled={loadingApplicantsId === opportunity.id}
                          onClick={() => void handleOpenApplicantsModal(opportunity)}
                        >
                          {loadingApplicantsId === opportunity.id ? "Cargando..." : "Ver postulantes"}
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          disabled={
                            isCancelledStatus(opportunity.status) ||
                            closingId === opportunity.id
                          }
                          onClick={() => void handleCloseOpportunity(opportunity.id)}
                        >
                          {closingId === opportunity.id
                            ? "Cancelando..."
                            : isCancelledStatus(opportunity.status)
                            ? "Cancelada"
                            : "Cancelar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailOpportunity ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">Detalle de convocatoria</p>
                <h2>{detailOpportunity.title}</h2>
              </div>
              <span
                className={`producer-status producer-status--${
                  normalizeUpper(detailOpportunity.status).toLowerCase() || "default"
                }`}
              >
                {formatOpportunityStatusLabel(detailOpportunity.status)}
              </span>
            </div>

            <p className="producer-record__text">
              {detailOpportunity.description ||
                "Esta convocatoria no incluye descripción adicional."}
            </p>

            <div className="producer-project-detail-grid">
              <div>
                <span>Proyecto</span>
                <strong>{getOpportunityProjectLabel(detailOpportunity)}</strong>
              </div>
              <div>
                <span>Rol requerido</span>
                <strong>{detailOpportunity.role_needed || "No informado"}</strong>
              </div>
              <div>
                <span>Especialidad</span>
                <strong>{detailOpportunity.specialty || "No informada"}</strong>
              </div>
              <div>
                <span>Ubicación</span>
                <strong>{detailOpportunity.location || "No informada"}</strong>
              </div>
              <div>
                <span>Modalidad</span>
                <strong>{formatOpportunityModality(detailOpportunity.modality)}</strong>
              </div>
              <div>
                <span>Fecha límite</span>
                <strong>{formatDisplayDate(detailOpportunity.deadline)}</strong>
              </div>
            </div>

            {detailOpportunity.requirements?.length ? (
              <div className="producer-chip-list">
                {detailOpportunity.requirements.map((item) => (
                  <span key={item} className="producer-chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="producer-actions">
              <button
                className="producer-button"
                type="button"
                onClick={() => void handleOpenEditModal(detailOpportunity)}
              >
                Editar
              </button>

              <button
                className="producer-button"
                type="button"
                onClick={() => void handleOpenApplicantsModal(detailOpportunity)}
              >
                Ver postulantes
              </button>

              <button
                className="producer-button"
                type="button"
                disabled={
                  isCancelledStatus(detailOpportunity.status) ||
                  closingId === detailOpportunity.id
                }
                onClick={() => void handleCloseOpportunity(detailOpportunity.id)}
              >
                Cancelar convocatoria
              </button>

              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => setDetailOpportunity(null)}
              >
                Cerrar
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {editingOpportunity && editFormData ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">Editar convocatoria</p>
                <h2>{editingOpportunity.title}</h2>
              </div>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => {
                  setEditingOpportunity(null);
                  setEditFormData(null);
                  setEditError("");
                }}
              >
                Cerrar
              </button>
            </div>

            <form className="producer-form" onSubmit={handleEditSubmit}>
              <label className="producer-field">
                <span>Proyecto</span>
                <select
                  name="project_id"
                  value={editFormData.project_id}
                  onChange={handleEditChange}
                  required
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>Título</span>
                <input name="title" value={editFormData.title} onChange={handleEditChange} required />
              </label>

              <label className="producer-field">
                <span>Rol requerido</span>
                <input
                  name="role_needed"
                  value={editFormData.role_needed}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>Especialidad</span>
                <input
                  name="specialty"
                  value={editFormData.specialty}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>Ubicación</span>
                <input
                  name="location"
                  value={editFormData.location}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>Modalidad</span>
                <select name="modality" value={editFormData.modality} onChange={handleEditChange}>
                  {OPPORTUNITY_MODALITY_OPTIONS.map((modality) => (
                    <option key={modality} value={modality}>
                      {formatOpportunityModality(modality)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>Estado</span>
                <select name="status" value={editFormData.status} onChange={handleEditChange}>
                  {OPPORTUNITY_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>Fecha límite</span>
                <input
                  type="date"
                  name="deadline"
                  value={editFormData.deadline}
                  onChange={handleEditChange}
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Descripción</span>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  rows={4}
                  required
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Requisitos</span>
                <textarea
                  name="requirements"
                  value={editFormData.requirements}
                  onChange={handleEditChange}
                  rows={4}
                />
              </label>

              {editError ? (
                <p className="producer-feedback producer-feedback--error">{editError}</p>
              ) : null}

              <div className="producer-actions">
                <button
                  className="producer-button"
                  type="button"
                  onClick={() => {
                    setEditingOpportunity(null);
                    setEditFormData(null);
                    setEditError("");
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isEditingSubmitting}
                >
                  {isEditingSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {applicantsModalOpportunity ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">Postulantes</p>
                <h2>{applicantsModalOpportunity.title}</h2>
              </div>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={handleCloseApplicantsModal}
              >
                Cerrar
              </button>
            </div>

            {applicantsSuccessByOpportunity[applicantsModalOpportunity.id] ? (
              <p className="producer-feedback producer-feedback--success">
                {applicantsSuccessByOpportunity[applicantsModalOpportunity.id]}
              </p>
            ) : null}

            {loadingApplicantsId === applicantsModalOpportunity.id ? (
              <p className="producer-muted">Cargando postulantes...</p>
            ) : applicantsErrorByOpportunity[applicantsModalOpportunity.id] ? (
              <p className="producer-feedback producer-feedback--error">
                {applicantsErrorByOpportunity[applicantsModalOpportunity.id]}
              </p>
            ) : applicantsByOpportunity[applicantsModalOpportunity.id]?.length ? (
              <div className="producer-list">
                {applicantsByOpportunity[applicantsModalOpportunity.id].map(
                  (application) => {
                    const applicationStatus = normalizeUpper(application.status);
                    const isTerminalStatus = isTerminalApplicationStatus(application.status);

                    return (
                    <article key={application.id} className="producer-list-card">
                      <div className="producer-record__header">
                        <div>
                          <p className="producer-list-card__meta">
                            {getApplicantEmail(application)}
                          </p>
                          <h4 className="producer-list-card__title">
                            {getApplicantName(application)}
                          </h4>
                        </div>
                        <span className={`producer-status producer-status--${applicationStatus.toLowerCase() || "default"}`}>
                          {formatApplicationStatus(application.status)}
                        </span>
                      </div>

                      <p className="producer-list-card__text">
                        Fecha de postulación:{" "}
                        {formatApplicationDate(
                          application.applied_at || application.created_at
                        )}
                      </p>
                      <p className="producer-list-card__text">
                        Mensaje:{" "}
                        {application.message?.trim() || "No disponible todavía."}
                      </p>

                      {getApplicantSpecialties(application).length ? (
                        <div className="producer-chip-list">
                          {getApplicantSpecialties(application).map((specialty) => (
                            <span key={specialty} className="producer-chip">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isTerminalStatus ? null : (
                        <div className="producer-actions producer-actions--inline">
                          <button
                            className="producer-button producer-button--primary"
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() =>
                              void handleUpdateApplicantStatus(
                                applicantsModalOpportunity.id,
                                application.id,
                                "ACCEPTED"
                              )
                            }
                          >
                            {updatingApplicationId === application.id
                              ? "Actualizando..."
                              : "Aceptar"}
                          </button>
                          <button
                            className="producer-button"
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() =>
                              void handleUpdateApplicantStatus(
                                applicantsModalOpportunity.id,
                                application.id,
                                "REJECTED"
                              )
                            }
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </article>
                  );
                }
                )}
              </div>
            ) : (
              <p className="producer-muted">
                No hay postulantes para esta convocatoria.
              </p>
            )}
          </article>
        </div>
      ) : null}

      {summaryModal ? (
        <SummaryDetailModal
          title={summaryModal === "active" ? "Convocatorias activas" : "Total convocatorias"}
          onClose={() => setSummaryModal(null)}
        >
          <div className="summary-detail-list">
            {summaryOpportunities.length ? (
              summaryOpportunities.map((opportunity) => (
                <article key={opportunity.id} className="summary-detail-list__item">
                  <h3>{opportunity.title}</h3>
                  <p>
                    {getOpportunityProjectLabel(opportunity)} |{" "}
                    {formatOpportunityStatusLabel(opportunity.status)}
                  </p>
                </article>
              ))
            ) : (
              <p className="summary-detail-empty">
                No hay convocatorias para mostrar.
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

function ProducerOpportunities() {
  return (
    <ProducerGuard>
      <ProducerOpportunitiesContent />
    </ProducerGuard>
  );
}

export default ProducerOpportunities;
