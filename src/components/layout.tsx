import { useEffect, useState } from "react";
import { FiFilm, FiGrid, FiMoon, FiSun } from "react-icons/fi";
import type { IconType } from "react-icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "../context/useAuth";
import { useAutoTranslate, useFestivalFlowLanguage } from "../hooks/useAutoTranslate";
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
  label: string;
  path: string;
  icon?: IconType;
};

const producerNav: NavigationItem[] = [
  { labelKey: "layout.producerNav.home", label: "Inicio", path: "/producer" },
  { labelKey: "layout.producerNav.profile", label: "Mi perfil", path: "/producer/profile" },
  { labelKey: "layout.producerNav.projects", label: "Mis proyectos", path: "/producer/projects" },
  { labelKey: "layout.producerNav.festivals", label: "Postular a Festivales", path: "/producer/festivals" },
  { labelKey: "layout.producerNav.opportunities", label: "Convocatorias", path: "/producer/opportunities" },
  { labelKey: "layout.producerNav.talents", label: "Talentos", path: "/producer/talents" },
  { labelKey: "layout.producerNav.crew", label: "Crew", path: "/producer/crew" },
  { labelKey: "layout.producerNav.messages", label: "Mensajes", path: "/producer/messages" },
];

const talentNav: NavigationItem[] = [
  { labelKey: "layout.talentNav.home", label: "Inicio", path: "/talent" },
  { labelKey: "layout.talentNav.profile", label: "Mi perfil", path: "/talent/profile" },
  { labelKey: "layout.talentNav.availability", label: "Disponibilidad", path: "/talent/availability" },
  { labelKey: "layout.talentNav.opportunities", label: "Convocatorias", path: "/talent/opportunities" },
  { labelKey: "layout.talentNav.applications", label: "Postulaciones", path: "/talent/applications" },
  { labelKey: "layout.talentNav.invitations", label: "Invitaciones", path: "/talent/invitations" },
  { labelKey: "layout.talentNav.crew", label: "Crew", path: "/talent/crew" },
  { labelKey: "layout.talentNav.messages", label: "Mensajes", path: "/talent/messages" },
];

const adminNav: NavigationItem[] = [
  {
    labelKey: "layout.adminNav.dashboard",
    label: "Dashboard",
    path: "/admin",
    icon: FiGrid,
  },
  {
    labelKey: "layout.adminNav.festivals",
    label: "Festivales",
    path: "/admin/festivals",
    icon: FiFilm,
  },
];

const talentPageMeta: Record<string, { eyebrowKey: string; eyebrow: string; titleKey: string; title: string }> = {
  "/talent": { eyebrowKey: "layout.talentMeta.homeEyebrow", eyebrow: "Panel de talento", titleKey: "layout.talentNav.home", title: "Inicio" },
  "/talent/profile": { eyebrowKey: "layout.talentMeta.profileEyebrow", eyebrow: "Perfil", titleKey: "layout.talentNav.profile", title: "Mi perfil" },
  "/talent/availability": { eyebrowKey: "layout.talentMeta.availabilityEyebrow", eyebrow: "Disponibilidad", titleKey: "layout.talentNav.availability", title: "Disponibilidad" },
  "/talent/opportunities": { eyebrowKey: "layout.talentMeta.opportunitiesEyebrow", eyebrow: "Convocatorias", titleKey: "layout.talentNav.opportunities", title: "Convocatorias" },
  "/talent/applications": { eyebrowKey: "layout.talentMeta.applicationsEyebrow", eyebrow: "Postulaciones", titleKey: "layout.talentNav.applications", title: "Postulaciones" },
  "/talent/invitations": { eyebrowKey: "layout.talentMeta.invitationsEyebrow", eyebrow: "Invitaciones", titleKey: "layout.talentNav.invitations", title: "Invitaciones" },
  "/talent/crew": { eyebrowKey: "layout.talentMeta.crewEyebrow", eyebrow: "Crew", titleKey: "layout.talentNav.crew", title: "Crew" },
  "/talent/messages": { eyebrowKey: "layout.talentMeta.messagesEyebrow", eyebrow: "Mensajes", titleKey: "layout.talentNav.messages", title: "Mensajes" },
};

const producerPageMeta: Record<string, { eyebrowKey: string; eyebrow: string; titleKey: string; title: string }> = {
  "/producer": { eyebrowKey: "layout.producerMeta.homeEyebrow", eyebrow: "Panel de producción", titleKey: "layout.producerNav.home", title: "Inicio" },
  "/producer/profile": { eyebrowKey: "layout.producerMeta.profileEyebrow", eyebrow: "Perfil", titleKey: "layout.producerNav.profile", title: "Mi perfil" },
  "/producer/projects": { eyebrowKey: "layout.producerMeta.productionEyebrow", eyebrow: "Producción", titleKey: "layout.producerNav.projects", title: "Mis proyectos" },
  "/producer/projects/new": { eyebrowKey: "layout.producerMeta.productionEyebrow", eyebrow: "Producción", titleKey: "layout.producerMeta.newProject", title: "Nuevo proyecto" },
  "/producer/festivals": { eyebrowKey: "layout.producerMeta.festivalsEyebrow", eyebrow: "Circuito de festivales", titleKey: "layout.producerNav.festivals", title: "Postular a Festivales" },
  "/producer/opportunities": { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", eyebrow: "Convocatorias", titleKey: "layout.producerNav.opportunities", title: "Convocatorias" },
  "/producer/opportunities/new": { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", eyebrow: "Convocatorias", titleKey: "layout.producerMeta.newOpportunity", title: "Nueva convocatoria" },
  "/producer/talents": { eyebrowKey: "layout.producerMeta.talentsEyebrow", eyebrow: "Talentos", titleKey: "layout.producerNav.talents", title: "Talentos" },
  "/producer/crew": { eyebrowKey: "layout.producerMeta.crewEyebrow", eyebrow: "Crew", titleKey: "layout.producerNav.crew", title: "Crew" },
  "/producer/messages": { eyebrowKey: "layout.producerMeta.messagesEyebrow", eyebrow: "Mensajes", titleKey: "layout.producerNav.messages", title: "Mensajes" },
};

const adminPageMeta: Record<string, { eyebrowKey: string; eyebrow: string; titleKey: string; title: string }> = {
  "/admin": {
    eyebrowKey: "layout.adminMeta.eyebrow",
    eyebrow: "ADMIN",
    titleKey: "layout.adminNav.dashboard",
    title: "Dashboard",
  },
  "/admin/festivals": {
    eyebrowKey: "layout.adminMeta.eyebrow",
    eyebrow: "ADMIN",
    titleKey: "layout.adminNav.festivals",
    title: "Festivales",
  },
};

const layoutBaseTexts = [
  "Inicio",
  "Mi perfil",
  "Mis proyectos",
  "Convocatorias",
  "Talentos",
  "Crew",
  "Mensajes",
  "Nuevo proyecto",
  "Cerrar sesión",
  "Editar perfil",
  "Panel de producción",
  "Panel de talento",
  "Sesión activa",
  "Sesión inactiva",
  "Cargando perfil",
  "Acceso",
  "Iniciar sesión",
  "Navegación principal",
  "Producción",
  "Perfil",
  "Disponibilidad",
  "Postulaciones",
  "Invitaciones",
  "Nueva convocatoria",
  "Editar proyecto",
  "Editar convocatoria",
  "ADMIN",
  "Dashboard",
  "Festivales",
];

function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { user, token, profile, role, isProfileLoading } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(layoutBaseTexts, language, token);
  const [theme, setTheme] = useState<FestivalFlowTheme>(() => getStoredTheme());

  const isProducer = role === "PRODUCER";
  const isTalent = role === "TALENT";
  const isAdmin = role === "ADMIN";
  const navItems = isAdmin
    ? adminNav
    : isProducer
    ? producerNav
    : isTalent
    ? talentNav
    : [];
  const userId = profile?.uid ?? user?.uid ?? "";
  const userName = isAdmin
    ? "Festival Admin"
    : profile?.name?.trim() || user?.displayName?.trim() || t("common.user");
  const userInitial = userName.charAt(0).toUpperCase() || "T";
  const authPhotoUrl = profile?.photo_url?.trim() || profile?.picture?.trim() || "";
  const sidebarPhotoUrl =
    authPhotoUrl ||
    user?.photoURL?.trim() ||
    getCachedSidebarPhoto(userId) ||
    (!userId && isProfileLoading ? getLastCachedSidebarPhoto() : "") ||
    "";
  const roleLabel = role
    ? t(`roles.${role}`, { defaultValue: role })
    : t("common.noRole");

  const topbarMeta = isAdmin
    ? adminPageMeta[location.pathname] ?? adminPageMeta["/admin/festivals"]
    : isTalent
    ? talentPageMeta[location.pathname] ?? talentPageMeta["/talent"]
    : producerPageMeta[location.pathname] ??
      (location.pathname.includes("/producer/projects/")
        ? { eyebrowKey: "layout.producerMeta.productionEyebrow", eyebrow: "Producción", titleKey: "layout.producerMeta.editProject", title: "Editar proyecto" }
        : location.pathname.includes("/producer/opportunities/")
        ? { eyebrowKey: "layout.producerMeta.opportunitiesEyebrow", eyebrow: "Convocatorias", titleKey: "layout.producerMeta.editOpportunity", title: "Editar convocatoria" }
        : { eyebrowKey: "layout.producerMeta.mainEyebrow", eyebrow: "Panel de producción", titleKey: "layout.producerNav.home", title: "Inicio" });

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
                  ? tAuto("Panel de producción")
                  : isTalent
                  ? tAuto("Panel de talento")
                  : isAdmin
                  ? tAuto("ADMIN")
                  : tAuto("Acceso")}
              </p>
              <h1 className="sidebar__title">{t("app.name")}</h1>
            </div>
          </div>

          {!user ? (
            <button className="sidebar__action" type="button" onClick={() => navigate("/login")}>
              {tAuto("Iniciar sesión")}
            </button>
          ) : (
            <>
              {!isAdmin ? (
                <button
                  className="sidebar__action"
                  type="button"
                  disabled={isProfileLoading}
                  onClick={handlePrimaryAction}
                >
                  {isProducer ? tAuto("Nuevo proyecto") : tAuto("Editar perfil")}
                </button>
              ) : null}

              <nav className="sidebar__nav" aria-label={tAuto("Navegación principal")}>
                {isProfileLoading ? (
                  <span className="sidebar__link">{t("common.loading")}</span>
                ) : (
                  navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== "/admin" &&
                        item.path !== "/producer" &&
                        item.path !== "/talent" &&
                        location.pathname.startsWith(`${item.path}/`));

                    return (
                      <button
                        key={item.path}
                        className={`sidebar__link flex items-center gap-3 ${isActive ? "sidebar__link--active" : ""}`}
                        type="button"
                        onClick={() => navigate(item.path)}
                      >
                        {Icon ? <Icon aria-hidden="true" /> : null}
                        {tAuto(item.label)}
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
              ? tAuto("Cargando perfil")
              : user
              ? `${tAuto("Sesión activa")} | ${roleLabel}`
              : tAuto("Sesión inactiva")}
          </span>
        </div>
      </aside>

      <div className="layout__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">{tAuto(topbarMeta.eyebrow)}</p>
            <h2 className="topbar__title">{tAuto(topbarMeta.title)}</h2>
            {user ? (
              <p className="topbar__meta">
                {isProfileLoading
                  ? tAuto("Cargando perfil")
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
                {tAuto("Cerrar sesión")}
              </button>
            ) : (
              <button
                className="topbar__session"
                type="button"
                onClick={() => navigate("/login")}
              >
                {tAuto("Iniciar sesión")}
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
