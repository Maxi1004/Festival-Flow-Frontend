import { talentProfileMock } from "./mock";
import "../../styles/talent.css";

function TalentAvailability() {
  const availability = talentProfileMock.availability;

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Disponibilidad</p>
          <h1 className="talent-page__title">Estado profesional y disponibilidad</h1>
          <p className="talent-page__subtitle">
            Muestra de forma clara cuando puedes sumarte a nuevos rodajes y bajo que modalidad.
          </p>
        </div>

        <button className="talent-button talent-button--primary" type="button">
          Actualizar disponibilidad
        </button>
      </section>

      <section className="talent-grid talent-grid--sidebar">
        <article className="talent-card">
          <div className="section-heading">
            <h2 className="section-heading__title">Resumen actual</h2>
            <p className="section-heading__text">
              Datos clave para productores y equipos que revisan tu perfil.
            </p>
          </div>

          <div className="talent-detail-grid">
            <div className="talent-field">
              <span className="talent-field__label">Estado</span>
              <p className="talent-field__text">{talentProfileMock.availabilityStatus}</p>
            </div>
            <div className="talent-field">
              <span className="talent-field__label">Disponibilidad para viajar</span>
              <p className="talent-field__text">{availability.travel}</p>
            </div>
            <div className="talent-field">
              <span className="talent-field__label">Modalidad</span>
              <p className="talent-field__text">{availability.modality}</p>
            </div>
            <div className="talent-field">
              <span className="talent-field__label">Ubicacion de trabajo</span>
              <p className="talent-field__text">{availability.workLocation}</p>
            </div>
            <div className="talent-field">
              <span className="talent-field__label">Disponible desde</span>
              <p className="talent-field__text">{availability.availableFrom}</p>
            </div>
            <div className="talent-field">
              <span className="talent-field__label">Observaciones</span>
              <p className="talent-field__text">{availability.notes}</p>
            </div>
          </div>
        </article>

        <aside className="talent-card talent-status-card">
          <span className="talent-status talent-status--available">
            {talentProfileMock.availabilityStatus}
          </span>
          <h2 className="section-heading__title">Perfil listo para postular</h2>
          <p className="section-heading__text">
            Modalidad principal: {availability.modality}. Inicio estimado: {availability.availableFrom}.
          </p>
        </aside>
      </section>
    </div>
  );
}

export default TalentAvailability;
