import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { useCurrentProfile } from "../useCurrentProfile";
import { getMyProjects } from "../../service/projectApi";
import { getMyOpportunities } from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import { formatDisplayDate } from "./utils";
import "../../styles/home.css";
import "../../styles/producer.css";

function ProducerHomeContent() {
  const { user, profile } = useCurrentProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
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
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el dashboard del productor."
        );
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

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || "Productor";
  const activeOpportunities = opportunities.filter((item) => item.status === "OPEN").length;
  const closedOpportunities = opportunities.filter((item) => item.status === "CLOSED").length;
  const latestProjects = [...projects]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 3);

  return (
    <div className="home producer-page">
      <section className="home__hero producer-hero">
        <div>
          <p className="producer-page__eyebrow">Inicio</p>
          <h1 className="home__title">Tu operacion creativa, organizada</h1>
          <p className="home__subtitle">
            Centraliza tus proyectos y publica convocatorias reales desde un panel conectado
            a tu backend actual.
          </p>
          <p className="home__subtitle home__subtitle--meta">
            {displayName} | {profile?.email ?? user?.email ?? "Sin correo"} | PRODUCER
          </p>
        </div>

        <div className="producer-hero__panel">
          <span className="producer-badge">Cuenta productora activa</span>
          <strong>{projects.length} proyectos registrados</strong>
          <p>{opportunities.length} convocatorias creadas en total.</p>
        </div>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">Resumen general</h2>
          <p className="section-heading__text">
            Una vista rapida del estado de tus proyectos y convocatorias.
          </p>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-card__value">{isLoading ? "..." : projects.length}</span>
            <p className="summary-card__label">Proyectos creados</p>
          </article>
          <article className="summary-card">
            <span className="summary-card__value">{isLoading ? "..." : activeOpportunities}</span>
            <p className="summary-card__label">Convocatorias activas</p>
          </article>
          <article className="summary-card">
            <span className="summary-card__value">{isLoading ? "..." : closedOpportunities}</span>
            <p className="summary-card__label">Convocatorias cerradas</p>
          </article>
        </div>
      </section>

      <section className="home__grid">
        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">Proyectos recientes</h2>
            <p className="section-heading__text">
              Ultimos proyectos registrados para seguir operando sin salir del panel.
            </p>
          </div>

          {isLoading ? (
            <p className="producer-muted">Cargando proyectos...</p>
          ) : latestProjects.length > 0 ? (
            <div className="producer-list">
              {latestProjects.map((project) => (
                <article key={project.id} className="producer-list-card">
                  <div>
                    <p className="producer-list-card__meta">{project.production_type}</p>
                    <h3 className="producer-list-card__title">{project.title}</h3>
                  </div>
                  <p className="producer-list-card__text">
                    {project.location} | {formatDisplayDate(project.start_date)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="producer-muted">Todavia no tienes proyectos creados.</p>
          )}
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">Acciones rapidas</h2>
            <p className="section-heading__text">
              Accesos directos para crear y administrar tu pipeline.
            </p>
          </div>

          <div className="actions">
            <Link className="actions__button producer-link-button" to="/producer/projects/new">
              Crear proyecto
            </Link>
            <Link className="actions__button producer-link-button" to="/producer/projects">
              Ver mis proyectos
            </Link>
            <Link
              className="actions__button producer-link-button"
              to="/producer/opportunities/new"
            >
              Crear convocatoria
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function ProducerHome() {
  return (
    <ProducerGuard>
      <ProducerHomeContent />
    </ProducerGuard>
  );
}

export default ProducerHome;
