import { useEffect, useState } from "react";
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
  getMyOpportunities,
  updateOpportunityStatus,
} from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import type { TalentApplication } from "../../types/talent";
import {
  formatDisplayDate,
  formatStatusLabel,
  getOpportunityProjectTitle,
  isActiveStatus,
  isCancelledStatus,
} from "./utils";
import "../../styles/producer.css";
import { useCurrentProfile } from "../useCurrentProfile";

function formatApplicationStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptada",
    CANCELLED: "Cancelada",
    IN_REVIEW: "En revision",
    PENDING: "Pendiente",
    PRESELECTED: "Preseleccionada",
    REJECTED: "Rechazada",
    SUBMITTED: "Enviada",
  };
  const normalizedValue = value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
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

function ProducerOpportunitiesContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useCurrentProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState("");
  const [expandedApplicantsId, setExpandedApplicantsId] = useState("");
  const [loadingApplicantsId, setLoadingApplicantsId] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
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

        const [nextProjects, nextOpportunities] = await reusePendingRequest(
          `producer-opportunities:${token}`,
          () => Promise.all([
            getMyProjects(token ?? undefined),
            getMyOpportunities(token ?? undefined),
          ])
        );

        if (!isMounted) {
          return;
        }

        const createdOpportunity =
          (location.state as { createdOpportunity?: Opportunity } | null)?.createdOpportunity ??
          null;
        const mergedOpportunities =
          createdOpportunity &&
          !nextOpportunities.some((opportunity) => opportunity.id === createdOpportunity.id)
            ? [createdOpportunity, ...nextOpportunities]
            : nextOpportunities;

        setProjects(nextProjects);
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [location.state, token]);

  const activeCount = opportunities.filter((item) => isActiveStatus(item.status)).length;
  const focusedProject = projects.find((project) => project.id === focusedProjectId) ?? null;
  const displayedOpportunities = focusedProjectId
    ? opportunities.filter((opportunity) => opportunity.project_id === focusedProjectId)
    : opportunities;
  const summaryOpportunities =
    summaryModal === "active"
      ? opportunities.filter((item) => isActiveStatus(item.status))
      : opportunities;

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      setClosingId(opportunityId);
      setError("");
      const updated = await updateOpportunityStatus(opportunityId, { status: "CANCELLED" }, token ?? undefined);
      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
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

  const handleToggleApplicants = async (opportunityId: string) => {
    if (expandedApplicantsId === opportunityId) {
      setExpandedApplicantsId("");
      return;
    }

    setExpandedApplicantsId(opportunityId);

    if (applicantsByOpportunity[opportunityId] || applicantsErrorByOpportunity[opportunityId]) {
      return;
    }

    try {
      setLoadingApplicantsId(opportunityId);
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunityId];
        return nextValue;
      });
      const applicants = await getOpportunityApplications(opportunityId, token ?? undefined);
      setApplicantsByOpportunity((current) => ({
        ...current,
        [opportunityId]: applicants,
      }));
    } catch (loadError) {
      setApplicantsErrorByOpportunity((current) => ({
        ...current,
        [opportunityId]:
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
      const updatedApplication = await updateApplicationStatus(applicationId, status, token ?? undefined);
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

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">Convocatorias</p>
          <h1 className="producer-page__title">Administra tus oportunidades</h1>
          <p className="producer-page__subtitle">
            Publica, actualiza o cierra convocatorias conectadas a tus proyectos reales.
          </p>
        </div>
        <Link
          className="producer-button producer-button--primary"
          to="/producer/opportunities/new"
        >
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
              {focusedProject?.title ?? "Proyecto seleccionado"}
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

      <section className="producer-grid producer-grid--single">
        {isLoading ? (
          <article className="producer-card producer-empty">
            <p>Cargando convocatorias...</p>
          </article>
        ) : displayedOpportunities.length > 0 ? (
          displayedOpportunities.map((opportunity) => (
            <article key={opportunity.id} className="producer-card producer-record">
              <div className="producer-record__header">
                <div>
                  <p className="producer-record__eyebrow">
                    {getOpportunityProjectTitle(opportunity, projects)}
                  </p>
                  <h2 className="producer-record__title">{opportunity.title}</h2>
                </div>
                <span className="producer-status">{formatStatusLabel(opportunity.status)}</span>
              </div>

              <div className="producer-meta-list">
                <span>{opportunity.role_needed}</span>
                <span>{opportunity.specialty}</span>
                <span>{opportunity.location}</span>
                <span>{opportunity.modality}</span>
                <span>{formatDisplayDate(opportunity.deadline)}</span>
              </div>

              <p className="producer-record__text">{opportunity.description}</p>

              {opportunity.requirements?.length ? (
                <div className="producer-chip-list">
                  {opportunity.requirements.map((item) => (
                    <span key={item} className="producer-chip">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="producer-actions producer-actions--inline">
                <button
                  className="producer-button producer-button--primary"
                  type="button"
                  onClick={() => navigate(`/producer/opportunities/${opportunity.id}/edit`)}
                >
                  Editar
                </button>
                <button
                  className="producer-button"
                  type="button"
                  disabled={loadingApplicantsId === opportunity.id}
                  onClick={() => void handleToggleApplicants(opportunity.id)}
                >
                  {loadingApplicantsId === opportunity.id
                    ? "Cargando..."
                    : expandedApplicantsId === opportunity.id
                      ? "Ocultar postulantes"
                      : "Ver postulantes"}
                </button>
                <button
                  className="producer-button"
                  type="button"
                  disabled={isCancelledStatus(opportunity.status) || closingId === opportunity.id}
                  onClick={() => void handleCloseOpportunity(opportunity.id)}
                >
                  {closingId === opportunity.id
                    ? "Cancelando..."
                    : isCancelledStatus(opportunity.status)
                      ? "Cancelada"
                      : "Cancelar convocatoria"}
                </button>
              </div>

              {expandedApplicantsId === opportunity.id ? (
                <section className="producer-applicants">
                  <h3 className="producer-applicants__title">Postulantes</h3>

                  {loadingApplicantsId === opportunity.id ? (
                    <p className="producer-muted">Cargando postulantes...</p>
                  ) : applicantsErrorByOpportunity[opportunity.id] ? (
                    <p className="producer-muted">
                      {applicantsErrorByOpportunity[opportunity.id]}
                    </p>
                  ) : applicantsByOpportunity[opportunity.id]?.length ? (
                    <>
                      {applicantsSuccessByOpportunity[opportunity.id] ? (
                        <p className="producer-feedback producer-feedback--success">
                          {applicantsSuccessByOpportunity[opportunity.id]}
                        </p>
                      ) : null}
                      <div className="producer-list">
                        {applicantsByOpportunity[opportunity.id].map((application) => (
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
                              <span className="producer-status">
                                {formatApplicationStatus(application.status)}
                              </span>
                            </div>

                            <p className="producer-list-card__text">
                              Proyecto asociado: {getOpportunityProjectTitle(opportunity, projects)}
                            </p>
                            <p className="producer-list-card__text">
                              Convocatoria asociada: {opportunity.title}
                            </p>
                            <p className="producer-list-card__text">
                              Estado de postulación: {formatApplicationStatus(application.status)}
                            </p>
                            <p className="producer-list-card__text">
                              Fecha de postulación: {formatApplicationDate(application.applied_at || application.created_at)}
                            </p>
                            <p className="producer-list-card__text">
                              Mensaje: {application.message?.trim() || "No disponible todavía."}
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

                            <div className="producer-actions producer-actions--inline">
                              <button
                                className="producer-button producer-button--primary"
                                type="button"
                                disabled={updatingApplicationId === application.id}
                                onClick={() =>
                                  void handleUpdateApplicantStatus(
                                    opportunity.id,
                                    application.id,
                                    "ACCEPTED"
                                  )
                                }
                              >
                                {updatingApplicationId === application.id ? "Actualizando..." : "Aceptar"}
                              </button>
                              <button
                                className="producer-button"
                                type="button"
                                disabled={updatingApplicationId === application.id}
                                onClick={() =>
                                  void handleUpdateApplicantStatus(
                                    opportunity.id,
                                    application.id,
                                    "REJECTED"
                                  )
                                }
                              >
                                Rechazar
                              </button>
                            </div>
                            <div className="producer-placeholder-actions" aria-label="Acciones futuras de postulación">
                              <button className="producer-button" type="button" disabled>
                                Ver detalle postulación | Próximamente
                              </button>
                              <button className="producer-button" type="button" disabled>
                                Evaluar postulante | Próximamente
                              </button>
                              <button className="producer-button" type="button" disabled>
                                Historial del postulante | Próximamente
                              </button>
                              <button className="producer-button" type="button" disabled>
                                Documentos adjuntos | No disponible todavía
                              </button>
                              <button className="producer-button" type="button" disabled>
                                Mensajes asociados | Próximamente
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="producer-muted">No hay postulantes para esta convocatoria.</p>
                  )}
                </section>
              ) : null}
            </article>
          ))
        ) : (
          <article className="producer-card producer-empty">
            <h2 className="producer-card__title">
              {focusedProjectId
                ? "Este proyecto todavia no tiene convocatorias"
                : "No hay convocatorias todavia"}
            </h2>
            <p className="producer-card__text">
              Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.
            </p>
          </article>
        )}
      </section>

      {summaryModal ? (
        <SummaryDetailModal
          title={summaryModal === "active" ? "Convocatorias activas" : "Total convocatorias"}
          onClose={() => setSummaryModal(null)}
        >
          <div className="summary-detail-list">
            {summaryOpportunities.length ? summaryOpportunities.map((opportunity) => (
              <article key={opportunity.id} className="summary-detail-list__item">
                <h3>{opportunity.title}</h3>
                <p>{getOpportunityProjectTitle(opportunity, projects)} | {formatStatusLabel(opportunity.status)}</p>
              </article>
            )) : <p className="summary-detail-empty">No hay convocatorias para mostrar.</p>}
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
