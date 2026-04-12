import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logoutUser, observeAuthState } from "../service/auth";
import { getProfile } from "../service/authApi";
import type { AuthProfile, UserRole } from "../types/auth";
import "../styles/layout.css";

type NavigationItem = {
  label: string;
  path?: string;
};

type RoleLayoutContent = {
  eyebrow: string;
  title: string;
  actionLabel: string;
  actionPath?: string;
  navigationItems: NavigationItem[];
};

const roleLayoutContent: Record<UserRole, RoleLayoutContent> = {
  PRODUCER: {
    eyebrow: "Panel de produccion",
    title: "Tinseltown",
    actionLabel: "Nuevo proyecto",
    navigationItems: [
      { label: "Inicio", path: "/" },
      { label: "Mis proyectos" },
      { label: "Equipo" },
      { label: "Festivales" },
      { label: "Reportes" },
    ],
  },
  TALENT: {
    eyebrow: "Panel de talento",
    title: "Tinseltown",
    actionLabel: "Completar perfil",
    actionPath: "/talent/profile",
    navigationItems: [
      { label: "Inicio", path: "/talent" },
      { label: "Mi perfil", path: "/talent/profile" },
      { label: "Disponibilidad", path: "/talent/availability" },
      { label: "Convocatorias", path: "/talent/opportunities" },
      { label: "Postulaciones", path: "/talent/applications" },
    ],
  },
};

const talentPageMeta: Record<string, { eyebrow: string; title: string }> = {
  "/talent": { eyebrow: "Espacio profesional", title: "Inicio" },
  "/talent/profile": { eyebrow: "Perfil audiovisual", title: "Mi perfil" },
  "/talent/availability": { eyebrow: "Agenda profesional", title: "Disponibilidad" },
  "/talent/opportunities": { eyebrow: "Oportunidades", title: "Convocatorias" },
  "/talent/applications": { eyebrow: "Seguimiento", title: "Postulaciones" },
};

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      try {
        const nextProfile = await getProfile();
        setProfile(nextProfile.user);
      } catch (error) {
        console.error("Error obteniendo perfil para layout:", error);
        setProfile(null);
      } finally {
        setIsProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Error cerrando sesion:", error);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handlePrimaryAction = () => {
    const actionPath = roleLayoutContent[profile?.role ?? "PRODUCER"].actionPath;

    if (actionPath) {
      navigate(actionPath);
    }
  };

  const currentRole = profile?.role ?? "PRODUCER";
  const currentContent = roleLayoutContent[currentRole];
  const userName = profile?.name?.trim() || user?.displayName?.trim() || "Usuario";
  const statusText = isProfileLoading
    ? "Cargando perfil..."
    : user
    ? `Sesion activa | ${profile?.role ?? "Sin rol"}`
    : "Agente IA | Online";
  const topbarMeta =
    currentRole === "TALENT"
      ? talentPageMeta[location.pathname] ?? talentPageMeta["/talent"]
      : { eyebrow: "Vista general", title: "Inicio" };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <span className="sidebar__brand-mark">T</span>
            <div>
              <p className="sidebar__eyebrow">{currentContent.eyebrow}</p>
              <h1 className="sidebar__title">{currentContent.title}</h1>
            </div>
          </div>

          <button
            className="sidebar__action"
            type="button"
            disabled={!user || isProfileLoading || !currentContent.actionPath}
            onClick={handlePrimaryAction}
          >
            {currentContent.actionLabel}
          </button>

          <nav className="sidebar__nav" aria-label="Navegacion principal">
            {currentContent.navigationItems.map((item) =>
              item.path ? (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === "/" || item.path === "/talent"}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <button key={item.label} className="sidebar__link" type="button">
                  {item.label}
                </button>
              )
            )}
          </nav>
        </div>

        <div className="sidebar__status">
          <span className="sidebar__status-dot" aria-hidden="true"></span>
          <span>{statusText}</span>
        </div>
      </aside>

      <div className="layout__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">{topbarMeta.eyebrow}</p>
            <h2 className="topbar__title">{topbarMeta.title}</h2>
            {user ? (
              <p className="topbar__meta">
                {isProfileLoading ? "Cargando perfil..." : `${userName} | ${currentRole}`}
              </p>
            ) : null}
          </div>

          <div className="topbar__actions">
            <button className="topbar__language" type="button">
              ES / EN
            </button>

            <button className="topbar__icon" type="button" aria-label="Notificaciones">
              N
            </button>

            {user ? (
              <button className="topbar__session" type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            ) : (
              <button className="topbar__session" type="button" onClick={handleLogin}>
                Iniciar sesion
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
