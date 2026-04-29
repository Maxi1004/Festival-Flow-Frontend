import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { useCurrentProfile } from "../useCurrentProfile";
import { getMyProjects } from "../../service/projectApi";
import { getMyOpportunities } from "../../service/opportunityApi";
import { getAvailableTalents } from "../../service/talentApi";
import type { Opportunity, Project } from "../../types/producer";
import type { AvailableTalent } from "../../types/talent";
import {
  formatDisplayDate,
  isActiveStatus,
  isCancelledStatus,
} from "./utils";
import "../../styles/home.css";
import "../../styles/producer.css";

function formatTalentName(talent: AvailableTalent): string {
  return (
    talent.display_name?.trim() ||
    talent.profile?.display_name?.trim() ||
    talent.name?.trim() ||
    "Talento sin nombre"
  );
}

function formatTalentModality(value?: string | null): string {
  const labels: Record<string, string> = {
    FREELANCE: "Freelance",
    HYBRID: "Hibrido",
    ONSITE: "Presencial",
    REMOTE: "Remoto",
  };

  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Modalidad no informada";
}

function formatTalentStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    UNAVAILABLE: "No disponible",
  };
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function getTalentSpecialties(talent: AvailableTalent): string[] {
  return talent.specialties?.length
    ? talent.specialties
    : talent.profile?.specialties ?? (talent.main_specialty ? [talent.main_specialty] : []);
}

function ProducerHomeContent() {
  const { user, profile } = useCurrentProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [availableTalents, setAvailableTalents] = useState<AvailableTalent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTalents, setIsLoadingTalents] = useState(true);
  const [error, setError] = useState("");
  const [talentsError, setTalentsError] = useState("");

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

  useEffect(() => {
    let isMounted = true;

    async function loadAvailableTalents() {
      try {
        setIsLoadingTalents(true);
        setTalentsError("");
        const nextTalents = await getAvailableTalents();

        if (isMounted) {
          setAvailableTalents(nextTalents);
        }
      } catch (loadError) {
        if (isMounted) {
          setTalentsError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los talentos disponibles."
          );
          setAvailableTalents([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTalents(false);
        }
      }
    }

    void loadAvailableTalents();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = profile?.name?.trim() || user?.displayName?.trim() || "Productor";
  const activeOpportunities = opportunities.filter((item) => isActiveStatus(item.status)).length;
  const closedOpportunities = opportunities.filter((item) => isCancelledStatus(item.status)).length;
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

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">Talentos disponibles</h2>
          <p className="section-heading__text">
            Consulta perfiles disponibles cuando el backend exponga el listado para productores.
          </p>
        </div>

        {talentsError ? (
          <article className="panel">
            <p className="producer-muted">{talentsError}</p>
          </article>
        ) : isLoadingTalents ? (
          <article className="panel">
            <p className="producer-muted">Cargando talentos disponibles...</p>
          </article>
        ) : availableTalents.length > 0 ? (
          <div className="producer-grid">
            {availableTalents.map((talent) => (
              <article
                key={talent.id ?? talent.user_uid ?? talent.user_id ?? formatTalentName(talent)}
                className="producer-card producer-record"
              >
                <div className="producer-record__header">
                  <div>
                    <p className="producer-record__eyebrow">{talent.email ?? "Sin correo"}</p>
                    <h3 className="producer-record__title">{formatTalentName(talent)}</h3>
                  </div>
                  <span className="producer-status">
                    {formatTalentStatus(talent.status)}
                  </span>
                </div>

                <div className="producer-meta-list">
                  <span>{formatTalentModality(talent.work_modality)}</span>
                  <span>{talent.location ?? talent.work_location ?? "Ubicacion no informada"}</span>
                  <span>{formatDisplayDate(talent.available_from)}</span>
                  <span>{talent.travel_availability ? "Viaja: Si" : "Viaja: No"}</span>
                </div>

                {talent.notes ? (
                  <p className="producer-record__text">{talent.notes}</p>
                ) : null}

                {getTalentSpecialties(talent).length ? (
                  <div className="producer-chip-list">
                    {getTalentSpecialties(talent).map((specialty) => (
                      <span key={specialty} className="producer-chip">
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <article className="panel">
            <p className="producer-muted">No hay talentos disponibles por ahora.</p>
          </article>
        )}
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
