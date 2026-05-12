import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrentProfile } from "../useCurrentProfile";
import { getMyApplications } from "../../service/applicationApi";
import { getPublicOpportunities } from "../../service/publicOpportunityApi";
import { getMyTalentProfile } from "../../service/talentApi";
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
  const navigate = useNavigate();
  const { user, profile } = useCurrentProfile();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || t("common.talent");
  const email = profile?.email ?? user?.email ?? t("common.noEmail");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setError("");
        const [talentProfile, myApplications, opportunities] = await Promise.all([
          getMyTalentProfile(),
          getMyApplications(),
          getPublicOpportunities(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfileCompletion(talentProfile?.profile_completion ?? 0);
        setMainSpecialty(talentProfile?.main_specialty ?? "");
        setLocation(talentProfile?.location ?? "");
        setApplicationsCount(myApplications.length);
        setOpportunitiesCount(opportunities.length);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("talent.errors.loadDashboard")
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
  }, [t]);

  const summaryCards = useMemo(
    () => [
      { value: `${profileCompletion}%`, label: t("talent.home.profileCompleted") },
      { value: String(opportunitiesCount), label: t("talent.home.availableOpportunities") },
      { value: String(applicationsCount), label: t("talent.home.registeredApplications") },
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
            <article key={card.label} className="summary-card">
              <span className="summary-card__value">{isLoading ? "..." : card.value}</span>
              <p className="summary-card__label">{card.label}</p>
            </article>
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
    </div>
  );
}

export default TalentHome;
