import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { logoutUser } from "../service/auth";
import { useCurrentProfile } from "../host/useCurrentProfile";
import "../styles/layout.css";

type NavigationItem = {
  labelKey: string;
  path: string;
};

const producerNav: NavigationItem[] = [
  { labelKey: "layout.producerNav.home", path: "/producer" },
  { labelKey: "layout.producerNav.projects", path: "/producer/projects" },
  { labelKey: "layout.producerNav.opportunities", path: "/producer/opportunities" },
];

const talentNav: NavigationItem[] = [
  { labelKey: "layout.talentNav.home", path: "/talent" },
  { labelKey: "layout.talentNav.profile", path: "/talent/profile" },
  { labelKey: "layout.talentNav.availability", path: "/talent/availability" },
  { labelKey: "layout.talentNav.opportunities", path: "/talent/opportunities" },
  { labelKey: "layout.talentNav.applications", path: "/talent/applications" },
];

const talentPageMeta: Record<string, { eyebrowKey: string; titleKey: string }> = {
  "/talent": { eyebrowKey: "layout.talentMeta.homeEyebrow", titleKey: "layout.talentNav.home" },
  "/talent/profile": { eyebrowKey: "layout.talentMeta.profileEyebrow", titleKey: "layout.talentNav.profile" },
  "/talent/availability": {
    eyebrowKey: "layout.talentMeta.availabilityEyebrow",
    titleKey: "layout.talentNav.availability",
  },
  "/talent/opportunities": {
    eyebrowKey: "layout.talentMeta.opportunitiesEyebrow",
    titleKey: "layout.talentNav.opportunities",
  },
  "/talent/applications": {
    eyebrowKey: "layout.talentMeta.applicationsEyebrow",
    titleKey: "layout.talentNav.applications",
  },
};

const producerPageMeta: Record<string, { eyebrowKey: string; titleKey: string }> = {
  "/producer": { eyebrowKey: "layout.producerMeta.homeEyebrow", titleKey: "layout.producerNav.home" },
  "/producer/projects": {
    eyebrowKey: "layout.producerMeta.productionEyebrow",
    titleKey: "layout.producerNav.projects",
  },
  "/producer/projects/new": {
    eyebrowKey: "layout.producerMeta.productionEyebrow",
    titleKey: "layout.producerMeta.newProject",
  },
  "/producer/opportunities": {
    eyebrowKey: "layout.producerMeta.opportunitiesEyebrow",
    titleKey: "layout.producerNav.opportunities",
  },
  "/producer/opportunities/new": {
    eyebrowKey: "layout.producerMeta.opportunitiesEyebrow",
    titleKey: "layout.producerMeta.newOpportunity",
  },
};

function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isProfileLoading } = useCurrentProfile();

  const isProducer = profile?.role === "PRODUCER";
  const isTalent = profile?.role === "TALENT";
  const navItems = isProducer ? producerNav : talentNav;
  const userName = profile?.name?.trim() || user?.displayName?.trim() || t("common.user");
  const roleLabel = profile?.role
    ? t(`roles.${profile.role}`, { defaultValue: profile.role })
    : t("common.noRole");

  const topbarMeta = isTalent
    ? talentPageMeta[location.pathname] ?? talentPageMeta["/talent"]
    : producerPageMeta[location.pathname] ??
      (location.pathname.includes("/producer/projects/")
        ? { eyebrowKey: "layout.producerMeta.productionEyebrow", titleKey: "layout.producerMeta.editProject" }
        : location.pathname.includes("/producer/opportunities/")
        ? {
            eyebrowKey: "layout.producerMeta.opportunitiesEyebrow",
            titleKey: "layout.producerMeta.editOpportunity",
          }
        : { eyebrowKey: "layout.producerMeta.mainEyebrow", titleKey: "layout.producerNav.home" });

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handlePrimaryAction = () => {
    if (isProducer) {
      navigate("/producer/projects/new");
      return;
    }

    navigate("/talent/profile");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <span className="sidebar__brand-mark">T</span>
            <div>
              <p className="sidebar__eyebrow">
                {isProfileLoading
                  ? t("common.loading")
                  : isProducer
                  ? t("layout.producerPanel")
                  : isTalent
                  ? t("layout.talentPanel")
                  : t("layout.access")}
              </p>
              <h1 className="sidebar__title">{t("app.name")}</h1>
            </div>
          </div>

          {!user ? (
            <button className="sidebar__action" type="button" onClick={() => navigate("/login")}>
              {t("layout.login")}
            </button>
          ) : (
            <>
              <button
                className="sidebar__action"
                type="button"
                disabled={isProfileLoading}
                onClick={handlePrimaryAction}
              >
                {isProducer ? t("layout.producerMeta.newProject") : t("layout.editProfile")}
              </button>

              <nav className="sidebar__nav" aria-label={t("layout.primaryNavigation")}>
                {isProfileLoading ? (
                  <span className="sidebar__link">{t("common.loading")}</span>
                ) : (
                  navItems.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== "/producer" &&
                        item.path !== "/talent" &&
                        location.pathname.startsWith(`${item.path}/`));

                    return (
                      <button
                        key={item.path}
                        className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
                        type="button"
                        onClick={() => navigate(item.path)}
                      >
                        {t(item.labelKey)}
                      </button>
                    );
                  })
                )}
              </nav>
            </>
          )}
        </div>

        <div className="sidebar__status">
          <span className="sidebar__status-dot" aria-hidden="true"></span>
          <span>
            {isProfileLoading
              ? t("layout.loadingProfile")
              : user
              ? t("layout.activeSession", { role: roleLabel })
              : t("layout.inactiveSession")}
          </span>
        </div>
      </aside>

      <div className="layout__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">{t(topbarMeta.eyebrowKey)}</p>
            <h2 className="topbar__title">{t(topbarMeta.titleKey)}</h2>
            {user ? (
              <p className="topbar__meta">
                {isProfileLoading
                  ? t("layout.loadingProfile")
                  : `${userName} | ${roleLabel}`}
              </p>
            ) : null}
          </div>

          <div className="topbar__actions">
            <LanguageSelector />

            <button className="topbar__icon" type="button" aria-label={t("layout.notifications")}>
              N
            </button>

            {user ? (
              <button className="topbar__session" type="button" onClick={handleLogout}>
                {t("layout.logout")}
              </button>
            ) : (
              <button
                className="topbar__session"
                type="button"
                onClick={() => navigate("/login")}
              >
                {t("layout.login")}
              </button>
            )}
          </div>
        </header>

        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
