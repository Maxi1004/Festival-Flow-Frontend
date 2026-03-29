import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/layout.css";

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
                className={`sidebar__link ${index === 0 ? "sidebar__link--active" : ""}`}
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

            <button type="button" onClick={() => navigate("/login")}>
              Iniciar sesión
            </button>
          </div>
        </header>

        <main className="layout__main">{children}</main>
      </div>
    </div>
  );
}

export default Layout;