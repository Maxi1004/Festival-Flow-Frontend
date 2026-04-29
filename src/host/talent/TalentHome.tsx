import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentProfile } from "../useCurrentProfile";
import { getMyApplications } from "../../service/applicationApi";
import { getPublicOpportunities } from "../../service/publicOpportunityApi";
import { getMyTalentProfile } from "../../service/talentApi";
import "../../styles/home.css";
import "../../styles/talent.css";

const talentQuickActions = [
  { label: "Editar perfil", path: "/talent/profile" },
  { label: "Actualizar disponibilidad", path: "/talent/availability" },
  { label: "Ver convocatorias", path: "/talent/opportunities" },
  { label: "Revisar postulaciones", path: "/talent/applications" },
  { label: "Ver invitaciones", path: "/talent/invitations" },
  { label: "Ver mi equipo", path: "/talent/crew" },
];

function TalentHome() {
  const navigate = useNavigate();
  const { user, profile } = useCurrentProfile();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [mainSpecialty, setMainSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || "Talento";
  const email = profile?.email ?? user?.email ?? "Sin correo";

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
              : "No se pudo cargar el resumen del panel."
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
  }, []);

  const summaryCards = useMemo(
    () => [
      { value: `${profileCompletion}%`, label: "Perfil completado" },
      { value: String(opportunitiesCount), label: "Convocatorias disponibles" },
      { value: String(applicationsCount), label: "Postulaciones registradas" },
    ],
    [applicationsCount, opportunitiesCount, profileCompletion]
  );

  const recentActivity = useMemo(
    () => [
      `Tu perfil muestra ${profileCompletion}% de completitud.`,
      `Tienes ${applicationsCount} postulaciones registradas en tu cuenta.`,
      `Hay ${opportunitiesCount} convocatorias disponibles para revisar.`,
    ],
    [applicationsCount, opportunitiesCount, profileCompletion]
  );

  return (
    <div className="home talent-page">
      <section className="home__hero talent-hero">
        <div>
          <p className="talent-page__eyebrow">Inicio</p>
          <h1 className="home__title">Tu perfil profesional, al dia</h1>
          <p className="home__subtitle">
            Manten visible tu experiencia, revisa convocatorias abiertas y da seguimiento
            a tus postulaciones desde un solo panel.
          </p>
          <p className="home__subtitle home__subtitle--meta">
            {displayName} | {email} | {mainSpecialty || "Especialidad pendiente"}
          </p>
        </div>

        <div className="talent-hero__badge">
          <span className="talent-status talent-status--available">
            {isLoading ? "Cargando..." : `${profileCompletion}% completado`}
          </span>
          <strong>{location || "Ubicacion pendiente"}</strong>
          <p>Dashboard conectado a datos reales de perfil, postulaciones y convocatorias.</p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">Resumen profesional</h2>
          <p className="section-heading__text">
            Un vistazo rapido a tu presencia actual y oportunidades abiertas.
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
            <h2 className="section-heading__title">Actividad reciente</h2>
            <p className="section-heading__text">
              Indicadores simples, honestos y basados en informacion real disponible.
            </p>
          </div>

          <ul className="activity-list">
            {(isLoading ? ["Cargando actividad..."] : recentActivity).map((item) => (
              <li key={item} className="activity-list__item">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">Acciones rapidas</h2>
            <p className="section-heading__text">
              Atajos para mantener tu perfil y tus postulaciones al dia.
            </p>
          </div>

          <div className="actions">
            {talentQuickActions.map((action) => (
              <button
                key={action.label}
                className="actions__button"
                type="button"
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default TalentHome;
