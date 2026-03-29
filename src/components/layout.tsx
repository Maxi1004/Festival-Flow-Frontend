import type { ReactNode } from "react";
import "../styles/layout.css";
import { useNavigate } from "react-router-dom";
import { logoutUser, observeAuthState } from "../service/auth";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

type LayoutProps = {
  children: ReactNode;
};

const navigationItems = [
  "Inicio",
  "Mis proyectos",
  "Equipo",
  "Festivales",
  "Reportes",
];

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = observeAuthState((currentUser) => {
      setUser(currentUser);
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

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <span className="sidebar__brand-mark">T</span>
            <div>
              <p className="sidebar__eyebrow">Panel creativo</p>
              <h1 className="sidebar__title">Tinseltown</h1>
            </div>
          </div>

          <button className="sidebar__action" type="button">
            Nuevo proyecto
          </button>

          <nav className="sidebar__nav" aria-label="Navegacion principal">
            {navigationItems.map((item, index) => (
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
          <span>Agente IA · Online</span>
        </div>
      </aside>

      <div className="layout__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Vista general</p>
            <h2 className="topbar__title">Inicio</h2>
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
              <button type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            ) : (
              <button type="button" onClick={handleLogin}>
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