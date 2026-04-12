import { useCurrentProfile } from "../useCurrentProfile";
import { talentProfileMock } from "./mock";
import "../../styles/talent.css";

function TalentProfile() {
  const { user, profile } = useCurrentProfile();
  const displayName = profile?.name?.trim() || user?.displayName?.trim() || talentProfileMock.name;
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="talent-page">
      <section className="talent-card talent-profile-header">
        <div className="talent-avatar" aria-hidden="true">
          {avatarLetter}
        </div>

        <div className="talent-profile-header__content">
          <div>
            <p className="talent-page__eyebrow">Mi perfil</p>
            <h1 className="talent-page__title">{displayName}</h1>
            <p className="talent-page__subtitle">{talentProfileMock.mainSpecialty}</p>
          </div>

          <div className="talent-meta-list">
            <span>{talentProfileMock.location}</span>
            <span>{talentProfileMock.availabilityStatus}</span>
            <span>{talentProfileMock.profileCompletion}% completado</span>
          </div>
        </div>

        <div className="talent-actions">
          <button className="talent-button talent-button--primary" type="button">
            Editar perfil
          </button>
          <button className="talent-button" type="button">
            Actualizar portafolio
          </button>
        </div>
      </section>

      <section className="talent-grid talent-grid--sidebar">
        <article className="talent-card">
          <div className="section-heading">
            <h2 className="section-heading__title">Informacion profesional</h2>
            <p className="section-heading__text">
              Presentacion base del talento para casting, proyectos y colaboraciones.
            </p>
          </div>

          <div className="talent-stack">
            <div>
              <h3 className="talent-field__label">Biografia</h3>
              <p className="talent-field__text">{talentProfileMock.bio}</p>
            </div>

            <div className="talent-detail-grid">
              <div className="talent-field">
                <span className="talent-field__label">Experiencia</span>
                <p className="talent-field__text">{talentProfileMock.experienceYears} anos</p>
              </div>
              <div className="talent-field">
                <span className="talent-field__label">Especialidades</span>
                <p className="talent-field__text">{talentProfileMock.specialties.join(", ")}</p>
              </div>
              <div className="talent-field">
                <span className="talent-field__label">Idiomas</span>
                <p className="talent-field__text">{talentProfileMock.languages.join(", ")}</p>
              </div>
              <div className="talent-field">
                <span className="talent-field__label">Herramientas y habilidades</span>
                <p className="talent-field__text">{talentProfileMock.skills.join(", ")}</p>
              </div>
            </div>
          </div>
        </article>

        <aside className="talent-card">
          <div className="section-heading">
            <h2 className="section-heading__title">Estado del perfil</h2>
            <p className="section-heading__text">
              Listo para compartir con productores y equipos de casting.
            </p>
          </div>

          <div className="talent-progress">
            <div className="talent-progress__track" aria-hidden="true">
              <span
                className="talent-progress__bar"
                style={{ width: `${talentProfileMock.profileCompletion}%` }}
              />
            </div>
            <strong>{talentProfileMock.profileCompletion}% completado</strong>
          </div>

          <ul className="talent-chip-list">
            {talentProfileMock.specialties.map((specialty) => (
              <li key={specialty} className="talent-chip-list__item">
                {specialty}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="talent-grid">
        <article className="talent-card">
          <div className="section-heading">
            <h2 className="section-heading__title">Portafolio</h2>
            <p className="section-heading__text">
              Materiales clave para mostrar rango, experiencia y propuesta visual.
            </p>
          </div>

          <div className="talent-list">
            {talentProfileMock.portfolio.map((item) => (
              <div key={item.label} className="talent-list__item">
                <div>
                  <h3 className="talent-list__title">{item.label}</h3>
                  <p className="talent-list__text">{item.description}</p>
                </div>
                <a className="talent-inline-link" href={item.href}>
                  Ver recurso
                </a>
              </div>
            ))}
          </div>
        </article>

        <article className="talent-card">
          <div className="section-heading">
            <h2 className="section-heading__title">Experiencia destacada</h2>
            <p className="section-heading__text">
              Colaboraciones recientes para reforzar credibilidad profesional.
            </p>
          </div>

          <div className="talent-timeline">
            {talentProfileMock.featuredExperience.map((item) => (
              <div key={`${item.project}-${item.year}`} className="talent-timeline__item">
                <div className="talent-timeline__year">{item.year}</div>
                <div>
                  <h3 className="talent-list__title">{item.project}</h3>
                  <p className="talent-list__meta">{item.role}</p>
                  <p className="talent-list__text">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default TalentProfile;
