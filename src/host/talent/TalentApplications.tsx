import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SummaryDetailModal } from "../../components/SummaryDetailModal";
import {
  getMyApplicationsFeed,
  getMyApplicationsSummary,
} from "../../service/applicationApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  TalentApplication,
  TalentApplicationFeedSummary,
} from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import { useCurrentProfile } from "../useCurrentProfile";
import "../../styles/talent.css";

const PAGE_SIZE = 10;

const EMPTY_SUMMARY: TalentApplicationFeedSummary = {
  total: 0,
  active: 0,
  reviewing: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
  completed: 0,
  closed: 0,
  acceptance_rate: 0,
};

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

function getOpportunityTitle(application: TalentApplication, fallback: string): string {
  return application.opportunity_title?.trim() || application.opportunity?.title?.trim() || fallback;
}

function getProjectTitle(application: TalentApplication, fallback: string): string {
  return application.project_title?.trim() || application.opportunity?.project?.title?.trim() || fallback;
}

function getApplicationResult(application: TalentApplication, fallback: string): string {
  if (application.result?.trim()) {
    return application.result.trim();
  }

  const status = normalizeStatus(application.status);

  if (status === "ACCEPTED") {
    return "Aceptada";
  }

  if (status === "REJECTED") {
    return "Rechazada";
  }

  if (["CANCELLED", "CLOSED", "COMPLETED"].includes(status)) {
    return "Proceso finalizado";
  }

  return fallback;
}

function appendUniqueApplications(
  current: TalentApplication[],
  next: TalentApplication[]
): TalentApplication[] {
  const applicationsById = new Map(current.map((application) => [application.id, application]));

  next.forEach((application) => {
    applicationsById.set(application.id, application);
  });

  return Array.from(applicationsById.values());
}

function TalentApplications() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const tRef = useRef(t);
  tRef.current = t;
  const [applications, setApplications] = useState<TalentApplication[]>([]);
  const [summary, setSummary] = useState<TalentApplicationFeedSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<TalentApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !token || !profile) {
      setApplications([]);
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

    async function loadApplications() {
      try {
        setIsLoading(true);
        setIsSummaryLoading(true);
        setError("");
        setSummaryError("");
        const feed = await reusePendingRequest(
          `talent-applications-feed:${authenticatedToken}:initial`,
          () => getMyApplicationsFeed(PAGE_SIZE, null, authenticatedToken)
        );

        if (isMounted) {
          setApplications(feed.items);
          setNextCursor(feed.next_cursor);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.errors.loadApplications")
          );
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
          `talent-applications-summary:${authenticatedToken}`,
          () => getMyApplicationsSummary(authenticatedToken)
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

    void loadApplications();

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
        `talent-applications-feed:${token}:${cursor}`,
        () => getMyApplicationsFeed(PAGE_SIZE, cursor, token)
      );

      setApplications((current) => appendUniqueApplications(current, feed.items));
      setNextCursor(feed.next_cursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("talent.errors.loadApplications")
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const closedCount = summary.closed + summary.completed;
  const chartItems = [
    { label: "En revisión", value: summary.reviewing, tone: "reviewing" },
    { label: "Aceptadas", value: summary.accepted, tone: "accepted" },
    { label: "Rechazadas", value: summary.rejected, tone: "rejected" },
    { label: "Canceladas", value: summary.cancelled, tone: "cancelled" },
    { label: "Finalizadas", value: closedCount, tone: "completed" },
  ];
  const chartMax = Math.max(...chartItems.map((item) => item.value), 1);
  const missingValue = t("common.notProvided");

  return (
    <div className="talent-page talent-applications-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.applications.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.applications.title")}</h1>
          <p className="talent-page__subtitle">
            Gestiona el avance de tus postulaciones y revisa tu historial profesional.
          </p>
        </div>
      </section>

      <section className="talent-application-kpis" aria-label="Resumen de postulaciones">
        {[
          ["Total postulaciones", summary.total],
          ["En revisión", summary.reviewing],
          ["Aceptadas", summary.accepted],
          ["Rechazadas", summary.rejected],
          ["Cerradas / Finalizadas", closedCount],
          ["Tasa de aceptación", `${summary.acceptance_rate}%`],
        ].map(([label, value]) => (
          <article className="talent-card talent-application-kpi" key={label}>
            <span className={isSummaryLoading ? "talent-application-kpi__skeleton" : ""}>
              {isSummaryLoading ? null : summaryError ? "--" : value}
            </span>
            <p>{label}</p>
          </article>
        ))}
      </section>

      <section className="talent-card talent-application-chart">
        <div>
          <p className="talent-page__eyebrow">Distribución</p>
          <h2>Postulaciones por estado</h2>
        </div>
        {isSummaryLoading ? (
          <p className="talent-application-chart__loading">Calculando resumen...</p>
        ) : summaryError ? (
          <p className="talent-feedback talent-feedback--error">{summaryError}</p>
        ) : (
        <div className="talent-application-chart__bars">
          {chartItems.map((item) => (
            <div className="talent-application-chart__row" key={item.label}>
              <span>{item.label}</span>
              <div className="talent-application-chart__track">
                <i
                  className={`talent-application-chart__bar talent-application-chart__bar--${item.tone}`}
                  style={{ width: `${(item.value / chartMax) * 100}%` }}
                />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        )}
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      <section className="talent-card talent-application-crm">
        <div className="talent-application-crm__heading">
          <div>
            <p className="talent-page__eyebrow">Historial profesional</p>
            <h2>Seguimiento de postulaciones</h2>
          </div>
          <span>
            {summaryError
              ? `${applications.length} cargadas`
              : `${applications.length} de ${isSummaryLoading ? "..." : summary.total}`}
          </span>
        </div>

        {isLoading ? (
          <p className="talent-feedback">{t("talent.applications.loading")}</p>
        ) : applications.length === 0 ? (
          <p className="talent-feedback">{t("talent.applications.empty")}</p>
        ) : (
          <>
            <div className="talent-application-table-wrap">
              <table className="talent-application-table">
                <thead>
                  <tr>
                    <th>Convocatoria</th>
                    <th>Proyecto</th>
                    <th>Estado</th>
                    <th>Fecha postulación</th>
                    <th>Última actualización</th>
                    <th>Resultado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td>{getOpportunityTitle(application, missingValue)}</td>
                      <td>{getProjectTitle(application, missingValue)}</td>
                      <td>
                        <span className={`talent-application-status talent-application-status--${normalizeStatus(application.status).toLowerCase()}`}>
                          {translateStatus(t, application.status, "talent.applications.noStatus")}
                        </span>
                      </td>
                      <td>{formatDate(application.applied_at || application.created_at, i18n.language, missingValue)}</td>
                      <td>{formatDate(application.updated_at, i18n.language, missingValue)}</td>
                      <td>{getApplicationResult(application, missingValue)}</td>
                      <td>
                        <button
                          className="talent-button talent-application-table__action"
                          type="button"
                          onClick={() => setSelectedApplication(application)}
                        >
                          Ver detalle
                        </button>
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

      {selectedApplication ? (
        <SummaryDetailModal
          title={getOpportunityTitle(selectedApplication, t("talent.applications.fallbackTitle"))}
          description={getProjectTitle(selectedApplication, missingValue)}
          onClose={() => setSelectedApplication(null)}
        >
          <dl className="talent-application-detail">
            <div><dt>Convocatoria</dt><dd>{getOpportunityTitle(selectedApplication, missingValue)}</dd></div>
            <div><dt>Proyecto</dt><dd>{getProjectTitle(selectedApplication, missingValue)}</dd></div>
            <div><dt>Estado</dt><dd>{translateStatus(t, selectedApplication.status, "talent.applications.noStatus")}</dd></div>
            <div><dt>Mensaje enviado</dt><dd>{selectedApplication.message?.trim() || missingValue}</dd></div>
            <div><dt>Fecha postulación</dt><dd>{formatDate(selectedApplication.applied_at || selectedApplication.created_at, i18n.language, missingValue)}</dd></div>
            <div><dt>Última actualización</dt><dd>{formatDate(selectedApplication.updated_at, i18n.language, missingValue)}</dd></div>
            <div><dt>Resultado</dt><dd>{getApplicationResult(selectedApplication, missingValue)}</dd></div>
            {selectedApplication.opportunity?.role_needed ? <div><dt>Rol solicitado</dt><dd>{selectedApplication.opportunity.role_needed}</dd></div> : null}
            {selectedApplication.opportunity?.specialty ? <div><dt>Especialidad</dt><dd>{selectedApplication.opportunity.specialty}</dd></div> : null}
            {selectedApplication.opportunity?.location ? <div><dt>Ubicación</dt><dd>{selectedApplication.opportunity.location}</dd></div> : null}
            {selectedApplication.opportunity?.modality ? <div><dt>Modalidad</dt><dd>{selectedApplication.opportunity.modality}</dd></div> : null}
          </dl>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

export default TalentApplications;
