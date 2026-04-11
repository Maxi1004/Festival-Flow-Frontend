import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getProfile } from "../service/authApi";
import { observeAuthState } from "../service/auth";
import type { AuthProfile, UserRole } from "../types/auth";
import "../styles/home.css";

type DashboardContent = {
  heroTitle: string;
  heroDescription: string;
  summaryTitle: string;
  summaryText: string;
  summaryCards: Array<{ value: string; label: string }>;
  activityTitle: string;
  activityText: string;
  recentActivity: string[];
  quickActionsTitle: string;
  quickActionsText: string;
  quickActions: string[];
};

const dashboardContentByRole: Record<UserRole, DashboardContent> = {
  PRODUCER: {
    heroTitle: "Bienvenido de nuevo",
    heroDescription:
      "Revisa el estado general de tus proyectos, coordina equipos y organiza los siguientes pasos desde un solo lugar.",
    summaryTitle: "Resumen",
    summaryText: "Un vistazo rapido a la operacion de hoy.",
    summaryCards: [
      { value: "12", label: "Proyectos activos" },
      { value: "24", label: "Miembros del equipo" },
      { value: "08", label: "Postulaciones" },
    ],
    activityTitle: "Actividad reciente",
    activityText: "Ultimos movimientos dentro de la plataforma.",
    recentActivity: [
      'Se actualizo el proyecto "Luz de Medianoche".',
      "Ana Torres se unio al equipo de produccion.",
      "Se envio una nueva postulacion al Festival Solaris.",
    ],
    quickActionsTitle: "Acciones rapidas",
    quickActionsText: "Atajos para mantener el flujo de trabajo en movimiento.",
    quickActions: ["Crear proyecto", "Buscar equipo", "Ver reportes"],
  },
  TALENT: {
    heroTitle: "Tu perfil profesional, al dia",
    heroDescription:
      "Mantén visible tu experiencia, revisa convocatorias abiertas y da seguimiento a tus postulaciones desde tu panel.",
    summaryTitle: "Resumen profesional",
    summaryText: "Un vistazo rapido a tu presencia y oportunidades activas.",
    summaryCards: [
      { value: "85%", label: "Perfil completado" },
      { value: "14", label: "Convocatorias disponibles" },
      { value: "05", label: "Postulaciones activas" },
    ],
    activityTitle: "Actividad reciente",
    activityText: "Novedades sobre tu perfil, convocatorias y avances.",
    recentActivity: [
      "Tu reel fue actualizado correctamente esta semana.",
      "Se publicaron nuevas convocatorias para fotografia y direccion de arte.",
      "Una postulacion cambio a estado de revision.",
    ],
    quickActionsTitle: "Acciones rapidas",
    quickActionsText: "Gestiona tu presencia profesional y responde a nuevas oportunidades.",
    quickActions: [
      "Editar perfil",
      "Actualizar disponibilidad",
      "Ver convocatorias",
      "Revisar postulaciones",
    ],
  },
};

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      try {
        const nextProfile = await getProfile();
        setProfile(nextProfile.user);
      } catch (error) {
        console.error("Error al obtener /auth/me:", error);
        setProfile(null);
      } finally {
        setIsProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isProfileLoading) {
    return (
      <div className="home">
        <section className="home__hero">
          <div>
            <h1 className="home__title">Cargando perfil...</h1>
            <p className="home__subtitle">
              Estamos preparando tu panel principal.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home">
        <section className="home__hero">
          <div>
            <h1 className="home__title">Inicia sesion para continuar</h1>
            <p className="home__subtitle">
              Tu panel se personalizara segun el rol asociado a tu cuenta.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const currentRole = profile?.role ?? "PRODUCER";
  const dashboard = dashboardContentByRole[currentRole];
  const displayName = profile?.name?.trim() || user.displayName?.trim() || "Usuario";

  return (
    <div className="home">
      <section className="home__hero">
        <div>
          <h1 className="home__title">{dashboard.heroTitle}</h1>
          <p className="home__subtitle">
            {dashboard.heroDescription}
          </p>
          <p className="home__subtitle home__subtitle--meta">
            {displayName} · {profile?.email ?? user.email ?? "Sin correo"} · {currentRole}
          </p>
        </div>
      </section>

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">{dashboard.summaryTitle}</h2>
          <p className="section-heading__text">{dashboard.summaryText}</p>
        </div>

        <div className="summary-grid">
          {dashboard.summaryCards.map((card) => (
            <article key={card.label} className="summary-card">
              <span className="summary-card__value">{card.value}</span>
              <p className="summary-card__label">{card.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home__grid">
        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{dashboard.activityTitle}</h2>
            <p className="section-heading__text">{dashboard.activityText}</p>
          </div>

          <ul className="activity-list">
            {dashboard.recentActivity.map((item) => (
              <li key={item} className="activity-list__item">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">{dashboard.quickActionsTitle}</h2>
            <p className="section-heading__text">{dashboard.quickActionsText}</p>
          </div>

          <div className="actions">
            {dashboard.quickActions.map((action) => (
              <button key={action} className="actions__button" type="button">
                {action}
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default Home;
