import { talentOpportunitiesMock } from "./mock";
import "../../styles/talent.css";

function TalentOpportunities() {
  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Convocatorias</p>
          <h1 className="talent-page__title">Convocatorias abiertas para talento</h1>
          <p className="talent-page__subtitle">
            Explora oportunidades activas segun tu especialidad, ubicacion y modalidad de trabajo.
          </p>
        </div>
      </section>

      <section className="talent-card">
        <div className="section-heading">
          <h2 className="section-heading__title">Filtros</h2>
          <p className="section-heading__text">
            Vista base lista para conectarse a busqueda real y filtros desde backend.
          </p>
        </div>

        <div className="talent-filters">
          <label className="talent-filter">
            <span>Busqueda</span>
            <input type="text" placeholder="Buscar por proyecto o rol" />
          </label>
          <label className="talent-filter">
            <span>Especialidad</span>
            <select defaultValue="Todas">
              <option>Todas</option>
              <option>Actor</option>
              <option>Camarografo</option>
              <option>Editor</option>
              <option>Sonidista</option>
              <option>Director de fotografia</option>
            </select>
          </label>
          <label className="talent-filter">
            <span>Ubicacion</span>
            <select defaultValue="Cualquiera">
              <option>Cualquiera</option>
              <option>Santiago</option>
              <option>Valparaiso</option>
              <option>Concepcion</option>
              <option>Remoto</option>
            </select>
          </label>
          <label className="talent-filter">
            <span>Modalidad</span>
            <select defaultValue="Todas">
              <option>Todas</option>
              <option>Tiempo completo</option>
              <option>Freelance</option>
              <option>Por proyecto</option>
            </select>
          </label>
        </div>
      </section>

      <section className="talent-opportunities">
        {talentOpportunitiesMock.map((opportunity) => (
          <article key={opportunity.id} className="talent-card talent-opportunity-card">
            <div className="talent-opportunity-card__top">
              <div>
                <p className="talent-list__meta">{opportunity.productionType}</p>
                <h2 className="talent-list__title">{opportunity.projectName}</h2>
              </div>
              <span className="talent-badge">{opportunity.urgency}</span>
            </div>

            <div className="talent-meta-list">
              <span>{opportunity.role}</span>
              <span>{opportunity.location}</span>
              <span>{opportunity.modality}</span>
            </div>

            <p className="talent-list__text">{opportunity.description}</p>

            <div className="talent-actions talent-actions--inline">
              <button className="talent-button talent-button--primary" type="button">
                Postular
              </button>
              <button className="talent-button" type="button">
                Ver detalle
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default TalentOpportunities;
