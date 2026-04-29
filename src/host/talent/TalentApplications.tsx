import { useEffect, useMemo, useState } from "react";
import { getMyApplications } from "../../service/applicationApi";
import type { TalentApplication } from "../../types/talent";
import "../../styles/talent.css";

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase();
}

function formatStatus(value: string | null | undefined): string {
  const normalizedValue = normalizeStatus(value ?? "");

  const labels: Record<string, string> = {
    accepted: "Aceptada",
    aprobado: "Aceptada",
    aprobada: "Aceptada",
    cancelled: "Cancelada",
    cancelada: "Cancelada",
    cerrada: "Cerrada",
    in_review: "En revisión",
    "in review": "En revisión",
    pending: "Pendiente",
    pendiente: "Pendiente",
    preselected: "Preseleccionada",
    rejected: "Rechazada",
    rechazada: "Rechazada",
    review: "En revisión",
    reviewing: "En revisión",
    submitted: "Enviada",
  };

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function formatDate(value: string | null | undefined): string {
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

function getApplicationTitle(application: TalentApplication): string {
  return (
    application.opportunity?.title?.trim() ||
    application.opportunity_title?.trim() ||
    application.project_title?.trim() ||
    application.opportunity?.project?.title?.trim() ||
    "Postulacion"
  );
}

function getApplicationSubtitle(application: TalentApplication): string {
  return (
    application.opportunity?.project?.title?.trim() ||
    application.project_title?.trim() ||
    application.opportunity?.role_needed?.trim() ||
    application.opportunity?.specialty?.trim() ||
    "Proyecto no informado"
  );
}

function getApplicationDescription(application: TalentApplication): string {
  return (
    application.opportunity?.description?.trim() ||
    application.opportunity?.role_needed?.trim() ||
    application.opportunity?.specialty?.trim() ||
    "Esta postulacion no incluye detalle de convocatoria."
  );
}

function TalentApplications() {
  const [applications, setApplications] = useState<TalentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      try {
        setError("");
        const nextApplications = await getMyApplications();

        if (!isMounted) {
          return;
        }

        setApplications(nextApplications);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar tus postulaciones."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCount = useMemo(
    () =>
      applications.filter((item) => {
        const status = normalizeStatus(item.status);
        return !["accepted", "rejected", "cancelled", "cerrada"].includes(status);
      }).length,
    [applications]
  );
  const reviewCount = useMemo(
    () =>
      applications.filter((item) => {
        const status = normalizeStatus(item.status);
        return ["review", "in review", "pending", "preselected", "en revision"].includes(status);
      }).length,
    [applications]
  );
  const closedCount = useMemo(
    () =>
      applications.filter((item) => {
        const status = normalizeStatus(item.status);
        return ["accepted", "rejected", "cancelled", "aceptado", "rechazado"].includes(status);
      }).length,
    [applications]
  );

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Postulaciones</p>
          <h1 className="talent-page__title">Seguimiento de postulaciones</h1>
          <p className="talent-page__subtitle">
            Revisa el estado real de tus postulaciones registradas en backend.
          </p>
        </div>
      </section>

      <section className="talent-metrics">
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{activeCount}</span>
          <p className="talent-metric__label">Activas</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{reviewCount}</span>
          <p className="talent-metric__label">En revisión</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{closedCount}</span>
          <p className="talent-metric__label">Cerradas</p>
        </article>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando postulaciones...</p>
        </section>
      ) : applications.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">Aun no tienes postulaciones registradas.</p>
        </section>
      ) : (
        <section className="talent-list">
          {applications.map((application) => (
            <article key={application.id} className="talent-card talent-application-card">
              <div className="talent-application-card__top">
                <div>
                  <h2 className="talent-list__title">{getApplicationTitle(application)}</h2>
                  <p className="talent-list__meta">{getApplicationSubtitle(application)}</p>
                </div>
                <span className="talent-badge">{formatStatus(application.status)}</span>
              </div>

              <p className="talent-list__text">{getApplicationDescription(application)}</p>
              <p className="talent-list__text">
                Fecha de postulacion: {formatDate(application.applied_at || application.created_at)}
              </p>
              <p className="talent-list__text">
                Mensaje enviado: {application.message?.trim() || "Sin mensaje adjunto."}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default TalentApplications;
