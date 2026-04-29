import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import {
  getOpportunityApplications,
  updateApplicationStatus,
} from "../../service/applicationApi";
import { getMyProjects } from "../../service/projectApi";
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

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const [nextProjects, nextOpportunities] = await Promise.all([
          getMyProjects(),
          getMyOpportunities(),
        ]);

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
  }, [location.state]);

  const activeCount = opportunities.filter((item) => isActiveStatus(item.status)).length;

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      setClosingId(opportunityId);
      setError("");
      const updated = await updateOpportunityStatus(opportunityId, { status: "CANCELLED" });
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
      const applicants = await getOpportunityApplications(opportunityId);
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
      const updatedApplication = await updateApplicationStatus(applicationId, status);
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
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : opportunities.length}</span>
          <p className="producer-metric__label">Total convocatorias</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : activeCount}</span>
          <p className="producer-metric__label">Activas</p>
        </article>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="producer-grid producer-grid--single">
        {isLoading ? (
          <article className="producer-card producer-empty">
            <p>Cargando convocatorias...</p>
          </article>
        ) : opportunities.length > 0 ? (
          opportunities.map((opportunity) => (
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
                              Fecha: {formatApplicationDate(application.applied_at || application.created_at)}
                            </p>
                            <p className="producer-list-card__text">
                              Mensaje: {application.message?.trim() || "Sin mensaje."}
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
            <h2 className="producer-card__title">No hay convocatorias todavia</h2>
            <p className="producer-card__text">
              Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.
            </p>
          </article>
        )}
      </section>
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
