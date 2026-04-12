import { talentApplicationsMock } from "./mock";
import "../../styles/talent.css";

function TalentApplications() {
  const activeCount = talentApplicationsMock.filter((item) =>
    ["Enviada", "En revision", "Preseleccionado"].includes(item.status)
  ).length;
  const reviewCount = talentApplicationsMock.filter((item) =>
    ["En revision", "Preseleccionado"].includes(item.status)
  ).length;
  const closedCount = talentApplicationsMock.filter((item) =>
    ["Aceptado", "Rechazado"].includes(item.status)
  ).length;

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Postulaciones</p>
          <h1 className="talent-page__title">Seguimiento de postulaciones</h1>
          <p className="talent-page__subtitle">
            Revisa en que etapa esta cada postulacion y mantente al tanto de las respuestas.
          </p>
        </div>
      </section>

      <section className="talent-metrics">
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{activeCount}</span>
          <p className="talent-metric__label">Activas</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{reviewCount}</span>
          <p className="talent-metric__label">En revision</p>
        </article>
        <article className="talent-card talent-metric">
          <span className="talent-metric__value">{closedCount}</span>
          <p className="talent-metric__label">Cerradas</p>
        </article>
      </section>

      <section className="talent-list">
        {talentApplicationsMock.map((application) => (
          <article key={application.id} className="talent-card talent-application-card">
            <div className="talent-application-card__top">
              <div>
                <h2 className="talent-list__title">{application.projectName}</h2>
                <p className="talent-list__meta">{application.role}</p>
              </div>
              <span className="talent-badge">{application.status}</span>
            </div>

            <p className="talent-list__text">Fecha de postulacion: {application.appliedAt}</p>
            <p className="talent-list__text">{application.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export default TalentApplications;
