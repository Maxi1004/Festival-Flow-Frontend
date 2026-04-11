import type { ReactNode } from "react";
import "../styles/layout.css";
import { useNavigate } from "react-router-dom";
import { logoutUser, observeAuthState } from "../service/auth";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getProfile } from "../service/authApi";
import type { AuthProfile, UserRole } from "../types/auth";

type LayoutProps = {
  children: ReactNode;
};

type RoleLayoutContent = {
  eyebrow: string;
  title: string;
  actionLabel: string;
  navigationItems: string[];
  topbarEyebrow: string;
  topbarTitle: string;
};

const roleLayoutContent: Record<UserRole, RoleLayoutContent> = {
  PRODUCER: {
    eyebrow: "Panel de produccion",
    title: "Tinseltown",
    actionLabel: "Nuevo proyecto",
    navigationItems: ["Inicio", "Mis proyectos", "Equipo", "Festivales", "Reportes"],
    topbarEyebrow: "Vista general",
    topbarTitle: "Inicio",
  },
  TALENT: {
    eyebrow: "Panel de talento",
    title: "Tinseltown",
    actionLabel: "Completar perfil",
    navigationItems: ["Inicio", "Mi perfil", "Disponibilidad", "Convocatorias", "Postulaciones"],
    topbarEyebrow: "Espacio profesional",
    topbarTitle: "Mi panel",
  },
};

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

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
      console.error("Error cerrando sesión:", error);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const currentRole = profile?.role ?? "PRODUCER";
  const currentContent = roleLayoutContent[currentRole];
  const userName = profile?.name?.trim() || user?.displayName?.trim() || "Usuario";
  const statusText = isProfileLoading
    ? "Cargando perfil..."
    : user
    ? `Sesión activa · ${profile?.role ?? "Sin rol"}`
    : "Agente IA · Online";

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

          <button className="sidebar__action" type="button" disabled={!user || isProfileLoading}>
            {currentContent.actionLabel}
          </button>

          <nav className="sidebar__nav" aria-label="Navegacion principal">
            {currentContent.navigationItems.map((item, index) => (
              <button
                key={item}
                className={`sidebar__link ${
                  index === 0 ? "sidebar__link--active" : ""
                }`}
                type="button"
              >
                {item}
              </button>
            ))}
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
            <p className="topbar__eyebrow">{currentContent.topbarEyebrow}</p>
            <h2 className="topbar__title">{currentContent.topbarTitle}</h2>
            {user ? (
              <p className="topbar__meta">
                {isProfileLoading ? "Cargando perfil..." : `${userName} · ${currentRole}`}
              </p>
            ) : null}
          </div>

          <div className="topbar__actions">
            <button className="topbar__language" type="button">
              ES / EN
            </button>

            <button
              className="topbar__icon"
              type="button"
              aria-label="Notificaciones"
            >
              🔔
            </button>

            {user ? (
              <button className="topbar__session" type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            ) : (
              <button className="topbar__session" type="button" onClick={handleLogin}>
                Iniciar sesión
              </button>
            )}
          </div>
        </header>

        <main className="layout__main">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
