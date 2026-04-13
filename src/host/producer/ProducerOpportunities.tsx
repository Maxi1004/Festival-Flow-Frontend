import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import {
  getMyOpportunities,
  updateOpportunityStatus,
} from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import { formatDisplayDate, getOpportunityProjectTitle } from "./utils";
import "../../styles/producer.css";

function ProducerOpportunitiesContent() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const [nextProjects, nextOpportunities] = await Promise.all([
          getMyProjects(),
          getMyOpportunities(),
        ]);

        if (!isMounted) {
          return;
        }

        setProjects(nextProjects);
        setOpportunities(nextOpportunities);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar tus convocatorias."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCount = opportunities.filter((item) => item.status === "OPEN").length;

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      setClosingId(opportunityId);
      setError("");
      const updated = await updateOpportunityStatus(opportunityId, { status: "CLOSED" });
      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "No se pudo cerrar la convocatoria."
      );
    } finally {
      setClosingId("");
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">Convocatorias</p>
          <h1 className="producer-page__title">Administra tus oportunidades</h1>
          <p className="producer-page__subtitle">
            Publica, actualiza o cierra convocatorias conectadas a tus proyectos reales.
          </p>
        </div>
        <Link
          className="producer-button producer-button--primary"
          to="/producer/opportunities/new"
        >
          Nueva convocatoria
        </Link>
      </section>

      <section className="producer-metrics">
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : opportunities.length}</span>
          <p className="producer-metric__label">Total convocatorias</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : activeCount}</span>
          <p className="producer-metric__label">Activas</p>
        </article>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="producer-grid producer-grid--single">
        {isLoading ? (
          <article className="producer-card producer-empty">
            <p>Cargando convocatorias...</p>
          </article>
        ) : opportunities.length > 0 ? (
          opportunities.map((opportunity) => (
            <article key={opportunity.id} className="producer-card producer-record">
              <div className="producer-record__header">
                <div>
                  <p className="producer-record__eyebrow">
                    {getOpportunityProjectTitle(opportunity, projects)}
                  </p>
                  <h2 className="producer-record__title">{opportunity.title}</h2>
                </div>
                <span className="producer-status">{opportunity.status}</span>
              </div>

              <div className="producer-meta-list">
                <span>{opportunity.role_needed}</span>
                <span>{opportunity.specialty}</span>
                <span>{opportunity.location}</span>
                <span>{opportunity.modality}</span>
                <span>{formatDisplayDate(opportunity.deadline)}</span>
              </div>

              <p className="producer-record__text">{opportunity.description}</p>

              {opportunity.requirements?.length ? (
                <div className="producer-chip-list">
                  {opportunity.requirements.map((item) => (
                    <span key={item} className="producer-chip">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="producer-actions producer-actions--inline">
                <button
                  className="producer-button producer-button--primary"
                  type="button"
                  onClick={() => navigate(`/producer/opportunities/${opportunity.id}/edit`)}
                >
                  Editar
                </button>
                <button
                  className="producer-button"
                  type="button"
                  disabled={opportunity.status === "CLOSED" || closingId === opportunity.id}
                  onClick={() => void handleCloseOpportunity(opportunity.id)}
                >
                  {closingId === opportunity.id
                    ? "Cerrando..."
                    : opportunity.status === "CLOSED"
                    ? "Cerrada"
                    : "Cerrar convocatoria"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="producer-card producer-empty">
            <h2 className="producer-card__title">No hay convocatorias todavia</h2>
            <p className="producer-card__text">
              Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.
            </p>
          </article>
        )}
      </section>
    </div>
  );
}

function ProducerOpportunities() {
  return (
    <ProducerGuard>
      <ProducerOpportunitiesContent />
    </ProducerGuard>
  );
}

export default ProducerOpportunities;
