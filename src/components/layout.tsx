import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../service/auth";
import { useCurrentProfile } from "../host/useCurrentProfile";
import "../styles/layout.css";

type NavigationItem = {
  label: string;
  path: string;
};

const producerNav: NavigationItem[] = [
  { label: "Inicio", path: "/producer" },
  { label: "Mis proyectos", path: "/producer/projects" },
  { label: "Convocatorias", path: "/producer/opportunities" },
];

const talentNav: NavigationItem[] = [
  { label: "Inicio", path: "/talent" },
  { label: "Mi perfil", path: "/talent/profile" },
  { label: "Disponibilidad", path: "/talent/availability" },
  { label: "Convocatorias", path: "/talent/opportunities" },
  { label: "Postulaciones", path: "/talent/applications" },
];

const talentPageMeta: Record<string, { eyebrow: string; title: string }> = {
  "/talent": { eyebrow: "Espacio profesional", title: "Inicio" },
  "/talent/profile": { eyebrow: "Perfil audiovisual", title: "Mi perfil" },
  "/talent/availability": { eyebrow: "Agenda profesional", title: "Disponibilidad" },
  "/talent/opportunities": { eyebrow: "Oportunidades", title: "Convocatorias" },
  "/talent/applications": { eyebrow: "Seguimiento", title: "Postulaciones" },
};

const producerPageMeta: Record<string, { eyebrow: string; title: string }> = {
  "/producer": { eyebrow: "Vista general", title: "Inicio" },
  "/producer/projects": { eyebrow: "Produccion", title: "Mis proyectos" },
  "/producer/projects/new": { eyebrow: "Produccion", title: "Nuevo proyecto" },
  "/producer/opportunities": { eyebrow: "Convocatorias", title: "Mis convocatorias" },
  "/producer/opportunities/new": { eyebrow: "Convocatorias", title: "Nueva convocatoria" },
};

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isProfileLoading } = useCurrentProfile();

  const isProducer = profile?.role === "PRODUCER";
  const isTalent = profile?.role === "TALENT";
  const navItems = isProducer ? producerNav : talentNav;
  const userName = profile?.name?.trim() || user?.displayName?.trim() || "Usuario";

  const topbarMeta = isTalent
    ? talentPageMeta[location.pathname] ?? talentPageMeta["/talent"]
    : producerPageMeta[location.pathname] ??
      (location.pathname.includes("/producer/projects/")
        ? { eyebrow: "Produccion", title: "Editar proyecto" }
        : location.pathname.includes("/producer/opportunities/")
        ? { eyebrow: "Convocatorias", title: "Editar convocatoria" }
        : { eyebrow: "Panel principal", title: "Inicio" });

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Error cerrando sesion:", error);
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
                  ? "Cargando..."
                  : isProducer
                  ? "Panel de produccion"
                  : isTalent
                  ? "Panel de talento"
                  : "Acceso"}
              </p>
              <h1 className="sidebar__title">Tinseltown</h1>
            </div>
          </div>

          {!user ? (
            <button className="sidebar__action" type="button" onClick={() => navigate("/login")}>
              Iniciar sesion
            </button>
          ) : (
            <>
              <button
                className="sidebar__action"
                type="button"
                disabled={isProfileLoading}
                onClick={handlePrimaryAction}
              >
                {isProducer ? "Nuevo proyecto" : "Editar perfil"}
              </button>

              <nav className="sidebar__nav" aria-label="Navegacion principal">
                {isProfileLoading ? (
                  <span className="sidebar__link">Cargando...</span>
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
                        {item.label}
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
              ? "Cargando perfil..."
              : user
              ? `Sesion activa | ${profile?.role ?? "Sin rol"}`
              : "Sesion no iniciada"}
          </span>
        </div>
      </aside>

      <div className="layout__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">{topbarMeta.eyebrow}</p>
            <h2 className="topbar__title">{topbarMeta.title}</h2>
            {user ? (
              <p className="topbar__meta">
                {isProfileLoading
                  ? "Cargando perfil..."
                  : `${userName} | ${profile?.role ?? "Sin rol"}`}
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
              <button
                className="topbar__session"
                type="button"
                onClick={() => navigate("/login")}
              >
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
