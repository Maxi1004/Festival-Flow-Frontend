import { useNavigate } from "react-router-dom";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  talentProfileMock,
  talentQuickActions,
  talentRecentActivity,
  talentSummaryCards,
} from "./mock";
import "../../styles/home.css";
import "../../styles/talent.css";

function TalentHome() {
  const navigate = useNavigate();
  const { user, profile } = useCurrentProfile();

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || talentProfileMock.name;
  const email = profile?.email ?? user?.email ?? "Sin correo";

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
            {displayName} | {email} | {talentProfileMock.mainSpecialty}
          </p>
        </div>

        <div className="talent-hero__badge">
          <span className="talent-status talent-status--available">
            {talentProfileMock.availabilityStatus}
          </span>
          <strong>{talentProfileMock.location}</strong>
          <p>Perfil listo para nuevas oportunidades audiovisuales.</p>
        </div>
      </section>

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">Resumen profesional</h2>
          <p className="section-heading__text">
            Un vistazo rapido a tu presencia actual y oportunidades abiertas.
          </p>
        </div>

        <div className="summary-grid">
          {talentSummaryCards.map((card) => (
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
            <h2 className="section-heading__title">Actividad reciente</h2>
            <p className="section-heading__text">
              Novedades sobre tu perfil, visibilidad y avance en convocatorias.
            </p>
          </div>

          <ul className="activity-list">
            {talentRecentActivity.map((item) => (
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
