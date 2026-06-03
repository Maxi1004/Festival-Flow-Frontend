import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  getTalentDashboardDetails,
  getTalentDashboardQuick,
} from "../../service/dashboardApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  DashboardApplicationSummary,
  DashboardOpportunitySummary,
  TalentDashboardDetails,
} from "../../types/dashboard";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/home.css";
import "../../styles/talent.css";

const talentQuickActions = [
  { labelKey: "talent.home.quickActions.editProfile", path: "/talent/profile" },
  { labelKey: "talent.home.quickActions.availability", path: "/talent/availability" },
  { labelKey: "talent.home.quickActions.opportunities", path: "/talent/opportunities" },
  { labelKey: "talent.home.quickActions.applications", path: "/talent/applications" },
];

const talentHomeBaseTexts = [
  "No se pudieron cargar los detalles del dashboard.",
  "Mostrando hasta 5 convocatorias disponibles.",
  "No hay convocatorias disponibles.",
  "Mostrando hasta 5 postulaciones.",
  "Convocatoria sin titulo",
  "Sin mensaje.",
  "No tienes postulaciones registradas.",
];

function TalentHome() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const navigate = useNavigate();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [availableOpportunities, setAvailableOpportunities] = useState<DashboardOpportunitySummary[]>([]);
  const [applications, setApplications] = useState<DashboardApplicationSummary[]>([]);
  const [detailModal, setDetailModal] = useState<"opportunities" | "applications" | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        talentHomeBaseTexts,
        [
          mainSpecialty,
          location,
          ...availableOpportunities.flatMap((opportunity) => [
            opportunity.title,
            opportunity.role_needed,
            opportunity.specialty,
            opportunity.location,
          ]),
          ...applications.flatMap((application) => [
            application.status,
            application.message,
          ]),
        ]
      ),
    [applications, availableOpportunities, location, mainSpecialty]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || t("common.talent");
  const email = profile?.email ?? user?.email ?? t("common.noEmail");

  useEffect(() => {
    if (isProfileLoading) {
      setIsQuickLoading(true);
      return;
    }

    if (!user || !profile || !token) {
      setError("");
      setDetailsError("");
      setIsQuickLoading(false);
      setIsDetailsLoading(false);
      return;
    }

    const dashboardToken = token;
    let isMounted = true;

    async function loadDetails() {
      try {
        setIsDetailsLoading(true);
        setDetailsError("");
        const details = await reusePendingRequest<TalentDashboardDetails>(
          `talent-dashboard-details:${dashboardToken}`,
          () => getTalentDashboardDetails(dashboardToken)
        );

        if (!isMounted) {
          return;
        }

        setAvailableOpportunities(details.available_opportunities);
        setApplications(details.applications);
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
          `talent-dashboard-quick:${dashboardToken}`,
          () => getTalentDashboardQuick(dashboardToken)
        );

        if (!isMounted) {
          return;
        }

        setProfileCompletion(dashboard.profile_completion);
        setMainSpecialty(dashboard.main_specialty);
        setLocation(dashboard.location);
        setApplicationsCount(dashboard.applications_count);
        setOpportunitiesCount(dashboard.opportunities_count);
        void loadDetails();
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.errors.loadDashboard")
          );
        }
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
  }, [isProfileLoading, profile, token, user]);

  const summaryCards = useMemo(
    () => [
      { value: `${profileCompletion}%`, label: t("talent.home.profileCompleted"), action: "profile" as const },
      { value: String(opportunitiesCount), label: t("talent.home.availableOpportunities"), action: "opportunities" as const },
      { value: String(applicationsCount), label: t("talent.home.registeredApplications"), action: "applications" as const },
    ],
    [applicationsCount, opportunitiesCount, profileCompletion, t]
  );

  const recentActivity = useMemo(
    () => [
      t("talent.home.activityProfile", { count: profileCompletion }),
      t("talent.home.activityApplications", { count: applicationsCount }),
      t("talent.home.activityOpportunities", { count: opportunitiesCount }),
    ],
    [applicationsCount, opportunitiesCount, profileCompletion, t]
  );

  return (
    <div className="home talent-page">
      <section className="home__hero talent-hero">
        <div>
          <p className="talent-page__eyebrow">{t("talent.home.eyebrow")}</p>
          <h1 className="home__title">{t("talent.home.title")}</h1>
          <p className="home__subtitle">
            {t("talent.home.subtitle")}
          </p>
          <p className="home__subtitle home__subtitle--meta">
            {displayName} | {email} | {mainSpecialty ? tAuto(mainSpecialty) : t("talent.home.specialtyPending")}
          </p>
        </div>

        <div className="talent-hero__badge">
          <span className="talent-status talent-status--available">
            {isQuickLoading
              ? t("common.loading")
              : `${profileCompletion}% ${t("common.completed")}`}
          </span>
          <strong>{location ? tAuto(location) : t("talent.home.locationPending")}</strong>
          <p>{t("talent.home.badgeText")}</p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {!error && detailsError ? (
        <p className="talent-feedback talent-feedback--warning">{detailsError}</p>
      ) : null}

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">{t("talent.home.summaryTitle")}</h2>
          <p className="section-heading__text">
            {t("talent.home.summaryText")}
          </p>
        </div>

        <div className="summary-grid">
          {summaryCards.map((card) => (
            <ClickableSummaryCard
              key={card.label}
              className="summary-card"
              onClick={() => {
                if (card.action === "profile") {
                  navigate("/talent/profile");
                  return;
                }

                setDetailModal(card.action);
              }}
            >
              <span className="summary-card__value">{isQuickLoading ? "..." : card.value}</span>
              <p className="summary-card__label">{card.label}</p>
            </ClickableSummaryCard>
          ))}
        </div>
      </section>

      <section className="home__grid">
        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{t("talent.home.recentActivity")}</h2>
            <p className="section-heading__text">
              {t("talent.home.recentActivityText")}
            </p>
          </div>

          <ul className="activity-list">
            {(isQuickLoading ? [t("talent.home.loadingActivity")] : recentActivity).map((item) => (
              <li key={item} className="activity-list__item">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{t("talent.home.quickActionsTitle")}</h2>
            <p className="section-heading__text">
              {t("talent.home.quickActionsText")}
            </p>
          </div>

          <div className="actions">
            {talentQuickActions.map((action) => (
              <button
                key={action.labelKey}
                className="actions__button"
                type="button"
                onClick={() => navigate(action.path)}
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        </article>
      </section>

      {detailModal === "opportunities" ? (
        <SummaryDetailModal
          title={t("talent.home.availableOpportunities")}
          description={tAuto("Mostrando hasta 5 convocatorias disponibles.")}
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {isDetailsLoading ? (
              <DashboardDetailSkeleton />
            ) : availableOpportunities.length ? availableOpportunities.map((opportunity) => (
              <article key={opportunity.id} className="summary-detail-list__item">
                <h3>{tAuto(opportunity.title)}</h3>
                <p>{tAuto(opportunity.role_needed || opportunity.specialty)} | {tAuto(opportunity.location)}</p>
              </article>
            )) : <p className="summary-detail-empty">{tAuto("No hay convocatorias disponibles.")}</p>}
          </div>
        </SummaryDetailModal>
      ) : null}

      {detailModal === "applications" ? (
        <SummaryDetailModal
          title={t("talent.home.registeredApplications")}
          description={tAuto("Mostrando hasta 5 postulaciones.")}
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {isDetailsLoading ? (
              <DashboardDetailSkeleton />
            ) : applications.length ? applications.map((application) => (
              <article key={application.id} className="summary-detail-list__item">
                <h3>{application.opportunity_title || tAuto("Convocatoria sin titulo")}</h3>
                <p>{tAuto(application.status)} | {application.message ? tAuto(application.message) : tAuto("Sin mensaje.")}</p>
              </article>
            )) : <p className="summary-detail-empty">{tAuto("No tienes postulaciones registradas.")}</p>}
          </div>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

function DashboardDetailSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <article key={item} className="summary-detail-list__item talent-dashboard-detail-skeleton">
          <span></span>
          <small></small>
        </article>
      ))}
    </>
  );
}

export default TalentHome;
