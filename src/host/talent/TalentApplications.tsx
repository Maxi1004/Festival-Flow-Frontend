import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
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

const talentApplicationsBaseTexts = [
  "Aceptada",
  "Rechazada",
  "Proceso finalizado",
  "No se pudo calcular el resumen.",
  "En revisión",
  "Aceptadas",
  "Rechazadas",
  "Canceladas",
  "Finalizadas",
  "Gestiona el avance de tus postulaciones y revisa tu historial profesional.",
  "Resumen de postulaciones",
  "Total postulaciones",
  "Cerradas / Finalizadas",
  "Tasa de aceptación",
  "Distribución",
  "Postulaciones por estado",
  "Calculando resumen...",
  "Historial profesional",
  "Seguimiento de postulaciones",
  "cargadas",
  "Convocatoria",
  "Proyecto",
  "Estado",
  "Fecha postulación",
  "Última actualización",
  "Resultado",
  "Acciones",
  "Ver detalle",
  "Cargando...",
  "Cargar más",
  "Mensaje enviado",
  "Rol solicitado",
  "Especialidad",
  "Ubicación",
  "Modalidad",
];

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
  const language = useFestivalFlowLanguage();
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
  const missingValue = t("common.notProvided");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        talentApplicationsBaseTexts,
        applications.flatMap((application) => [
          getOpportunityTitle(application, missingValue),
          getProjectTitle(application, missingValue),
          getApplicationResult(application, missingValue),
          translateStatus(t, application.status, "talent.applications.noStatus"),
          application.message,
          application.opportunity?.role_needed,
          application.opportunity?.specialty,
          application.opportunity?.location,
          application.opportunity?.modality,
          application.opportunity?.description,
        ])
      ),
    [applications, missingValue, t]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

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
          setSummaryError(tAuto("No se pudo calcular el resumen."));
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
    { label: tAuto("En revisión"), value: summary.reviewing, tone: "reviewing" },
    { label: tAuto("Aceptadas"), value: summary.accepted, tone: "accepted" },
    { label: tAuto("Rechazadas"), value: summary.rejected, tone: "rejected" },
    { label: tAuto("Canceladas"), value: summary.cancelled, tone: "cancelled" },
    { label: tAuto("Finalizadas"), value: closedCount, tone: "completed" },
  ];
  const chartMax = Math.max(...chartItems.map((item) => item.value), 1);

  return (
    <div className="talent-page talent-applications-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.applications.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.applications.title")}</h1>
          <p className="talent-page__subtitle">
            {tAuto("Gestiona el avance de tus postulaciones y revisa tu historial profesional.")}
          </p>
        </div>
      </section>

      <section className="talent-application-kpis" aria-label={tAuto("Resumen de postulaciones")}>
        {[
          [tAuto("Total postulaciones"), summary.total],
          [tAuto("En revisión"), summary.reviewing],
          [tAuto("Aceptadas"), summary.accepted],
          [tAuto("Rechazadas"), summary.rejected],
          [tAuto("Cerradas / Finalizadas"), closedCount],
          [tAuto("Tasa de aceptación"), `${summary.acceptance_rate}%`],
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
          <p className="talent-page__eyebrow">{tAuto("Distribución")}</p>
          <h2>{tAuto("Postulaciones por estado")}</h2>
        </div>
        {isSummaryLoading ? (
          <p className="talent-application-chart__loading">{tAuto("Calculando resumen...")}</p>
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
            <p className="talent-page__eyebrow">{tAuto("Historial profesional")}</p>
            <h2>{tAuto("Seguimiento de postulaciones")}</h2>
          </div>
          <span>
            {summaryError
              ? `${applications.length} ${tAuto("cargadas")}`
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
                    <th>{tAuto("Convocatoria")}</th>
                    <th>{tAuto("Proyecto")}</th>
                    <th>{tAuto("Estado")}</th>
                    <th>{tAuto("Fecha postulación")}</th>
                    <th>{tAuto("Última actualización")}</th>
                    <th>{tAuto("Resultado")}</th>
                    <th>{tAuto("Acciones")}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td>{tAuto(getOpportunityTitle(application, missingValue))}</td>
                      <td>{tAuto(getProjectTitle(application, missingValue))}</td>
                      <td>
                        <span className={`talent-application-status talent-application-status--${normalizeStatus(application.status).toLowerCase()}`}>
                          {tAuto(translateStatus(t, application.status, "talent.applications.noStatus"))}
                        </span>
                      </td>
                      <td>{formatDate(application.applied_at || application.created_at, i18n.language, missingValue)}</td>
                      <td>{formatDate(application.updated_at, i18n.language, missingValue)}</td>
                      <td>{tAuto(getApplicationResult(application, missingValue))}</td>
                      <td>
                        <button
                          className="talent-button talent-application-table__action"
                          type="button"
                          onClick={() => setSelectedApplication(application)}
                        >
                          {tAuto("Ver detalle")}
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
                  {isLoadingMore ? tAuto("Cargando...") : tAuto("Cargar más")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {selectedApplication ? (
        <SummaryDetailModal
          title={tAuto(getOpportunityTitle(selectedApplication, t("talent.applications.fallbackTitle")))}
          description={tAuto(getProjectTitle(selectedApplication, missingValue))}
          onClose={() => setSelectedApplication(null)}
        >
          <dl className="talent-application-detail">
            <div><dt>{tAuto("Convocatoria")}</dt><dd>{tAuto(getOpportunityTitle(selectedApplication, missingValue))}</dd></div>
            <div><dt>{tAuto("Proyecto")}</dt><dd>{tAuto(getProjectTitle(selectedApplication, missingValue))}</dd></div>
            <div><dt>{tAuto("Estado")}</dt><dd>{tAuto(translateStatus(t, selectedApplication.status, "talent.applications.noStatus"))}</dd></div>
            <div><dt>{tAuto("Mensaje enviado")}</dt><dd>{selectedApplication.message?.trim() ? tAuto(selectedApplication.message.trim()) : missingValue}</dd></div>
            <div><dt>{tAuto("Fecha postulación")}</dt><dd>{formatDate(selectedApplication.applied_at || selectedApplication.created_at, i18n.language, missingValue)}</dd></div>
            <div><dt>{tAuto("Última actualización")}</dt><dd>{formatDate(selectedApplication.updated_at, i18n.language, missingValue)}</dd></div>
            <div><dt>{tAuto("Resultado")}</dt><dd>{tAuto(getApplicationResult(selectedApplication, missingValue))}</dd></div>
            {selectedApplication.opportunity?.role_needed ? <div><dt>{tAuto("Rol solicitado")}</dt><dd>{tAuto(selectedApplication.opportunity.role_needed)}</dd></div> : null}
            {selectedApplication.opportunity?.specialty ? <div><dt>{tAuto("Especialidad")}</dt><dd>{tAuto(selectedApplication.opportunity.specialty)}</dd></div> : null}
            {selectedApplication.opportunity?.location ? <div><dt>{tAuto("Ubicación")}</dt><dd>{tAuto(selectedApplication.opportunity.location)}</dd></div> : null}
            {selectedApplication.opportunity?.modality ? <div><dt>{tAuto("Modalidad")}</dt><dd>{tAuto(selectedApplication.opportunity.modality)}</dd></div> : null}
          </dl>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

export default TalentApplications;
