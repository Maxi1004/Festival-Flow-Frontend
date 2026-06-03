import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
import { useCurrentProfile } from "../useCurrentProfile";
import { getTalentDashboard } from "../../service/dashboardApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  DashboardApplicationSummary,
  DashboardOpportunitySummary,
} from "../../types/dashboard";
import "../../styles/home.css";
import "../../styles/talent.css";

const talentQuickActions = [
  { labelKey: "talent.home.quickActions.editProfile", path: "/talent/profile" },
  { labelKey: "talent.home.quickActions.availability", path: "/talent/availability" },
  { labelKey: "talent.home.quickActions.opportunities", path: "/talent/opportunities" },
  { labelKey: "talent.home.quickActions.applications", path: "/talent/applications" },
];

function TalentHome() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const navigate = useNavigate();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [availableOpportunities, setAvailableOpportunities] = useState<DashboardOpportunitySummary[]>([]);
  const [applications, setApplications] = useState<DashboardApplicationSummary[]>([]);
  const [detailModal, setDetailModal] = useState<"opportunities" | "applications" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || t("common.talent");
  const email = profile?.email ?? user?.email ?? t("common.noEmail");

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !profile || !token) {
      setError("");
      setIsLoading(false);
      return;
    }

    const dashboardToken = token;
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");
        const dashboard = await reusePendingRequest(
          `talent-dashboard:${dashboardToken}`,
          () => getTalentDashboard(dashboardToken)
        );

        if (!isMounted) {
          return;
        }

        setProfileCompletion(dashboard.profile_completion);
        setMainSpecialty(dashboard.main_specialty);
        setLocation(dashboard.location);
        setApplicationsCount(dashboard.applications_count);
        setOpportunitiesCount(dashboard.opportunities_count);
        setAvailableOpportunities(dashboard.available_opportunities);
        setApplications(dashboard.applications);
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
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

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
            {displayName} | {email} | {mainSpecialty || t("talent.home.specialtyPending")}
          </p>
        </div>

        <div className="talent-hero__badge">
          <span className="talent-status talent-status--available">
            {isLoading
              ? t("common.loading")
              : `${profileCompletion}% ${t("common.completed")}`}
          </span>
          <strong>{location || t("talent.home.locationPending")}</strong>
          <p>{t("talent.home.badgeText")}</p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

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
              <span className="summary-card__value">{isLoading ? "..." : card.value}</span>
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
            {(isLoading ? [t("talent.home.loadingActivity")] : recentActivity).map((item) => (
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
          description="Mostrando hasta 5 convocatorias disponibles."
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {availableOpportunities.length ? availableOpportunities.map((opportunity) => (
              <article key={opportunity.id} className="summary-detail-list__item">
                <h3>{opportunity.title}</h3>
                <p>{opportunity.role_needed || opportunity.specialty} | {opportunity.location}</p>
              </article>
            )) : <p className="summary-detail-empty">No hay convocatorias disponibles.</p>}
          </div>
        </SummaryDetailModal>
      ) : null}

      {detailModal === "applications" ? (
        <SummaryDetailModal
          title={t("talent.home.registeredApplications")}
          description="Mostrando hasta 5 postulaciones."
          onClose={() => setDetailModal(null)}
        >
          <div className="summary-detail-list">
            {applications.length ? applications.map((application) => (
              <article key={application.id} className="summary-detail-list__item">
                <h3>{application.opportunity_title || "Convocatoria sin titulo"}</h3>
                <p>{application.status} | {application.message || "Sin mensaje."}</p>
              </article>
            )) : <p className="summary-detail-empty">No tienes postulaciones registradas.</p>}
          </div>
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

export default TalentHome;
