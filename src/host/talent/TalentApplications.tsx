import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyApplications } from "../../service/applicationApi";
import type { TalentApplication } from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/talent.css";

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase();
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

function getApplicationTitle(application: TalentApplication, fallback: string): string {
  return (
    application.opportunity?.title?.trim() ||
    application.opportunity_title?.trim() ||
    application.project_title?.trim() ||
    application.opportunity?.project?.title?.trim() ||
    fallback
  );
}

function getApplicationSubtitle(application: TalentApplication, fallback: string): string {
  return (
    application.opportunity?.role_needed?.trim() ||
    application.opportunity?.specialty?.trim() ||
    application.project_title?.trim() ||
    fallback
  );
}

function TalentApplications() {
  const { t, i18n } = useTranslation();
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
              : t("talent.errors.loadApplications")
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
  }, [t]);

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
          <p className="talent-page__eyebrow">{t("talent.applications.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.applications.title")}</h1>
          <p className="talent-page__subtitle">
            {t("talent.applications.subtitle")}
          </p>
        </div>
      </section>

      <section className="talent-metrics">
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{activeCount}</span>
          <p className="talent-metric__label">{t("talent.applications.active")}</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{reviewCount}</span>
          <p className="talent-metric__label">{t("talent.applications.review")}</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{closedCount}</span>
          <p className="talent-metric__label">{t("talent.applications.closed")}</p>
        </article>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.applications.loading")}</p>
        </section>
      ) : applications.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.applications.empty")}</p>
        </section>
      ) : (
        <section className="talent-list">
          {applications.map((application) => (
            <article key={application.id} className="talent-card talent-application-card">
              <div className="talent-application-card__top">
                <div>
                  <h2 className="talent-list__title">
                    {getApplicationTitle(application, t("talent.applications.fallbackTitle"))}
                  </h2>
                  <p className="talent-list__meta">
                    {getApplicationSubtitle(
                      application,
                      t("talent.applications.fallbackSubtitle")
                    )}
                  </p>
                </div>
                <span className="talent-badge">
                  {translateStatus(t, application.status, "talent.applications.noStatus")}
                </span>
              </div>

              <p className="talent-list__text">
                {t("talent.applications.appliedAt", {
                  date: formatDate(
                    application.applied_at || application.created_at,
                    i18n.language,
                    t("common.noDate")
                  ),
                })}
              </p>
              <p className="talent-list__text">
                {application.message?.trim() || t("talent.applications.noMessage")}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default TalentApplications;
