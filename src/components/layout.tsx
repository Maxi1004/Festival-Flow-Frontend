import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "../context/useAuth";
import { useCurrentProfile } from "../host/useCurrentProfile";
import {
  getCachedSidebarPhoto,
  getLastCachedSidebarPhoto,
} from "../service/sidebarPhotoCache";
import {
  FESTIVAL_FLOW_THEME_KEY,
  applyFestivalFlowTheme,
  getStoredTheme,
  persistFestivalFlowTheme,
  type FestivalFlowTheme,
} from "../theme";
import "../styles/layout.css";

type NavigationItem = {
  labelKey: string;
  path: string;
};

const producerNav: NavigationItem[] = [
  { labelKey: "layout.producerNav.home", path: "/producer" },
  { labelKey: "layout.producerNav.projects", path: "/producer/projects" },
  { labelKey: "layout.producerNav.opportunities", path: "/producer/opportunities" },
  { labelKey: "layout.producerNav.talents", path: "/producer/talents" },
  { labelKey: "layout.producerNav.crew", path: "/producer/crew" },
  { labelKey: "layout.producerNav.messages", path: "/producer/messages" },
];

const talentNav: NavigationItem[] = [
  { labelKey: "layout.talentNav.home", path: "/talent" },
  { labelKey: "layout.talentNav.profile", path: "/talent/profile" },
  { labelKey: "layout.talentNav.availability", path: "/talent/availability" },
  { labelKey: "layout.talentNav.opportunities", path: "/talent/opportunities" },
  { labelKey: "layout.talentNav.applications", path: "/talent/applications" },
  { labelKey: "layout.talentNav.invitations", path: "/talent/invitations" },
  { labelKey: "layout.talentNav.crew", path: "/talent/crew" },
  { labelKey: "layout.talentNav.messages", path: "/talent/messages" },
];

const talentPageMeta: Record<string, { eyebrowKey: string; titleKey: string }> = {
  "/talent": { eyebrowKey: "layout.talentMeta.homeEyebrow", titleKey: "layout.talentNav.home" },
  "/talent/profile": { eyebrowKey: "layout.talentMeta.profileEyebrow", titleKey: "layout.talentNav.profile" },
  "/talent/availability": { eyebrowKey: "layout.talentMeta.availabilityEyebrow", titleKey: "layout.talentNav.availability" },
  "/talent/opportunities": { eyebrowKey: "layout.talentMeta.opportunitiesEyebrow", titleKey: "layout.talentNav.opportunities" },
  "/talent/applications": { eyebrowKey: "layout.talentMeta.applicationsEyebrow", titleKey: "layout.talentNav.applications" },
  "/talent/invitations": { eyebrowKey: "layout.talentMeta.invitationsEyebrow", titleKey: "layout.talentNav.invitations" },
  "/talent/crew": { eyebrowKey: "layout.talentMeta.crewEyebrow", titleKey: "layout.talentNav.crew" },
  "/talent/messages": { eyebrowKey: "layout.talentMeta.messagesEyebrow", titleKey: "layout.talentNav.messages" },
};

const producerPageMeta: Record<string, { eyebrowKey: string; titleKey: string }> = {
  "/producer": { eyebrowKey: "layout.producerMeta.homeEyebrow", titleKey: "layout.producerNav.home" },
  "/producer/projects": { eyebrowKey: "layout.producerMeta.productionEyebrow", titleKey: "layout.producerNav.projects" },
  "/producer/projects/new": { eyebrowKey: "layout.producerMeta.productionEyebrow", titleKey: "layout.producerMeta.newProject" },
  "/producer/opportunities": { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", titleKey: "layout.producerNav.opportunities" },
  "/producer/opportunities/new": { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", titleKey: "layout.producerMeta.newOpportunity" },
  "/producer/talents": { eyebrowKey: "layout.producerMeta.talentsEyebrow", titleKey: "layout.producerNav.talents" },
  "/producer/crew": { eyebrowKey: "layout.producerMeta.crewEyebrow", titleKey: "layout.producerNav.crew" },
  "/producer/messages": { eyebrowKey: "layout.producerMeta.messagesEyebrow", titleKey: "layout.producerNav.messages" },
};

function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { user, profile, isProfileLoading } = useCurrentProfile();
  const [theme, setTheme] = useState<FestivalFlowTheme>(() => getStoredTheme());

  const isProducer = profile?.role === "PRODUCER";
  const isTalent = profile?.role === "TALENT";
  const navItems = isProducer ? producerNav : talentNav;
  const userId = profile?.uid ?? user?.uid ?? "";
  const userName = profile?.name?.trim() || user?.displayName?.trim() || t("common.user");
  const userInitial = userName.charAt(0).toUpperCase() || "T";
  const authPhotoUrl = profile?.photo_url?.trim() || profile?.picture?.trim() || "";
  const sidebarPhotoUrl =
    authPhotoUrl ||
    user?.photoURL?.trim() ||
    getCachedSidebarPhoto(userId) ||
    (!userId && isProfileLoading ? getLastCachedSidebarPhoto() : "") ||
    "";
  const roleLabel = profile?.role
    ? t(`roles.${profile.role}`, { defaultValue: profile.role })
    : t("common.noRole");

  const topbarMeta = isTalent
    ? talentPageMeta[location.pathname] ?? talentPageMeta["/talent"]
    : producerPageMeta[location.pathname] ??
      (location.pathname.includes("/producer/projects/")
        ? { eyebrowKey: "layout.producerMeta.productionEyebrow", titleKey: "layout.producerMeta.editProject" }
        : location.pathname.includes("/producer/opportunities/")
        ? { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", titleKey: "layout.producerMeta.editOpportunity" }
        : { eyebrowKey: "layout.producerMeta.mainEyebrow", titleKey: "layout.producerNav.home" });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    applyFestivalFlowTheme(theme);
    persistFestivalFlowTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeStorage = (event: StorageEvent) => {
      if (event.key === FESTIVAL_FLOW_THEME_KEY && event.newValue === "light") {
        setTheme("light");
      }

      if (event.key === FESTIVAL_FLOW_THEME_KEY && event.newValue === "dark") {
        setTheme("dark");
      }
    };

    window.addEventListener("storage", handleThemeStorage);
    return () => window.removeEventListener("storage", handleThemeStorage);
  }, []);

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
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
            <span className="sidebar__brand-mark">
              {sidebarPhotoUrl ? (
                <img src={sidebarPhotoUrl} alt={`Foto de perfil de ${userName}`} />
              ) : (
                <span aria-hidden="true">{userInitial}</span>
              )}
            </span>
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

            <button
              className="topbar__icon"
              type="button"
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              onClick={handleThemeToggle}
            >
              {theme === "dark" ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
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
