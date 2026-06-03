import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import type { Project } from "../../types/producer";
import { formatDisplayDate, formatStatusLabel } from "./utils";
import "../../styles/producer.css";

type ProjectFilters = {
  search: string;
  productionType: string;
  status: string;
};

const initialFilters: ProjectFilters = {
  search: "",
  productionType: "",
  status: "",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  DRAFT: "Borrador",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  OPEN: "Activa",
  PAUSED: "Pausada",
};

const PRODUCTION_TYPE_OPTIONS = [
  { value: "pelicula", label: "Película" },
  { value: "serie", label: "Serie" },
  { value: "documental", label: "Documental" },
  { value: "cortometraje", label: "Cortometraje" },
  { value: "videoclip", label: "Videoclip" },
  { value: "comercial", label: "Comercial" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];

function normalizeFilterText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeProductionType(value?: string | null): string {
  return normalizeFilterText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatProductionType(value?: string | null): string {
  const normalizedValue = normalizeProductionType(value);

  return (
    PRODUCTION_TYPE_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    "No informado"
  );
}

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function formatProjectStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);

  return PROJECT_STATUS_LABELS[normalizedValue] ?? formatStatusLabel(value);
}

function getProjectOpportunityCount(project: Project): number {
  return Math.max(0, Number(project.opportunities_count) || 0);
}

function ProducerProjectsContent() {
  const navigate = useNavigate();
  const { token } = useCurrentProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setError("");
        const nextProjects = await reusePendingRequest(
          `producer-projects:${token}`,
          () => getMyProjects(token ?? undefined)
        );

        if (isMounted) {
          setProjects(nextProjects);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar tus proyectos."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [token]);


  const statusOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => normalizeStatus(project.status)).filter(Boolean))).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const search = normalizeFilterText(filters.search);

    return projects.filter((project) => {
      const matchesSearch =
        !search ||
        normalizeFilterText(project.title).includes(search) ||
        normalizeFilterText(project.description).includes(search);
      const matchesProductionType =
          !filters.productionType ||
          normalizeProductionType(project.production_type) === filters.productionType;
        const matchesStatus =
          !filters.status || normalizeStatus(project.status) === filters.status;

        return matchesSearch && matchesProductionType && matchesStatus;
    });
  }, [filters, projects]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFilters((current) => ({ ...current, [name]: value }));
  };

  const navigateToEdit = (projectId: string) => {
    navigate(`/producer/projects/${projectId}/edit`);
  };

  const navigateToNewOpportunity = (projectId: string) => {
    navigate("/producer/opportunities/new", {
      state: { projectId },
    });
  };

  const navigateToApplications = (projectId: string) => {
    navigate("/producer/opportunities", {
      state: { projectId },
    });
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner producer-banner--compact">
        <div>
          <p className="producer-page__eyebrow">Mis proyectos</p>
          <h1 className="producer-page__title">Gestiona tus producciones</h1>
          <p className="producer-page__subtitle">
            Consulta el estado de cada proyecto y crea convocatorias asociadas cuando lo
            necesites.
          </p>
        </div>
        <Link className="producer-button producer-button--primary" to="/producer/projects/new">
          Nuevo proyecto
        </Link>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="producer-card producer-help-card">
        <button
          className="producer-help-card__trigger"
          type="button"
          aria-expanded={isHelpOpen}
          onClick={() => setIsHelpOpen((current) => !current)}
        >
          <span>Como funciona?</span>
          <strong>{isHelpOpen ? "Ocultar" : "Ver pasos"}</strong>
        </button>
        {isHelpOpen ? (
          <ol className="producer-flow-card__steps producer-help-card__steps">
            <li>Primero crea un proyecto.</li>
            <li>Luego crea una convocatoria asociada al proyecto.</li>
            <li>Los talentos postulan a esa convocatoria.</li>
            <li>Revisa postulantes y acepta o rechaza.</li>
            <li>Al aceptar un talento, pasa al crew del proyecto.</li>
          </ol>
        ) : null}
      </section>

      <section className="producer-card producer-project-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>Proyectos</h2>
            <span>
              {isLoading
                ? "Cargando registros..."
                : `${filteredProjects.length} de ${projects.length} proyectos`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters">
          <label className="producer-field">
            <span>Buscar por nombre</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar proyecto"
            />
          </label>
          <label className="producer-field">
            <span>Tipo de produccion</span>
            <select name="productionType" value={filters.productionType} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {PRODUCTION_TYPE_OPTIONS.map((productionType) => (
                <option key={productionType.value} value={productionType.value}>
                  {productionType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="producer-field">
            <span>Estado</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{formatProjectStatusLabel(status)}</option>
              ))}
            </select>
          </label>

        </div>

        {isLoading ? (
          <ProjectTableSkeleton />
        ) : projects.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">Aun no hay proyectos</h2>
            <p className="producer-card__text">
              Crea tu primer proyecto para empezar a publicar convocatorias reales.
            </p>
          </article>
        ) : filteredProjects.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">Sin resultados</h2>
            <p className="producer-card__text">
              Ajusta los filtros para ver otros proyectos.
            </p>
          </article>
        ) : (
          <div className="producer-project-table-wrap">
            <table className="producer-project-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Tipo</th>
                  <th>Ubicacion</th>
                  <th>Fecha inicio</th>
                  <th>Fecha fin</th>
                  <th>Estado</th>
                  <th>Convocatorias</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const opportunitiesCount = getProjectOpportunityCount(project);

                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="producer-project-table__title">
                          <strong>{project.title}</strong>
                          <span>{project.description || "Sin descripcion"}</span>
                        </div>
                      </td>
                      <td>{formatProductionType(project.production_type)}</td>
                      <td>{project.location || "No informada"}</td>
                      <td>{formatDisplayDate(project.start_date)}</td>
                      <td>{formatDisplayDate(project.end_date)}</td>
                      <td>
                        <span className={`producer-status producer-status--${normalizeStatus(project.status).toLowerCase() || "default"}`}>
                          {formatProjectStatusLabel(project.status)}
                        </span>
                      </td>
                      <td>
                        <span className="producer-count-badge">{opportunitiesCount} conv.</span>
                      </td>
                      <td>
                        <div className="producer-table-actions">
                          <button className="producer-button" type="button" onClick={() => setDetailProject(project)}>
                            Ver detalle
                          </button>
                          <button className="producer-button" type="button" onClick={() => navigateToEdit(project.id)}>
                            Editar
                          </button>
                          <button className="producer-button" type="button" onClick={() => navigateToNewOpportunity(project.id)}>
                            Crear convocatoria
                          </button>
                          <button className="producer-button" type="button" onClick={() => navigateToApplications(project.id)}>
                            Ver postulaciones
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailProject ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">Detalle de proyecto</p>
                <h2>{detailProject.title}</h2>
              </div>
              <span className={`producer-status producer-status--${normalizeStatus(detailProject.status).toLowerCase() || "default"}`}>
                {formatProjectStatusLabel(detailProject.status)}
              </span>
            </div>

            <p className="producer-record__text">
              {detailProject.description || "Este proyecto no incluye descripcion adicional."}
            </p>

            <div className="producer-project-detail-grid">
              <div>
                <span>Tipo de produccion</span>
                <strong>{formatProductionType(detailProject.production_type)}</strong>
              </div>
              <div>
                <span>Ubicacion</span>
                <strong>{detailProject.location || "No informada"}</strong>
              </div>
              <div>
                <span>Fecha inicio</span>
                <strong>{formatDisplayDate(detailProject.start_date)}</strong>
              </div>
              <div>
                <span>Fecha fin</span>
                <strong>{formatDisplayDate(detailProject.end_date)}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{formatProjectStatusLabel(detailProject.status)}</strong>
              </div>
              <div>
                <span>Convocatorias</span>
                <strong>{getProjectOpportunityCount(detailProject)} conv.</strong>
              </div>
            </div>

            <div className="producer-actions">
              <button className="producer-button" type="button" onClick={() => navigateToEdit(detailProject.id)}>
                Editar
              </button>
              <button className="producer-button" type="button" onClick={() => navigateToNewOpportunity(detailProject.id)}>
                Crear convocatoria
              </button>
              <button className="producer-button" type="button" onClick={() => navigateToApplications(detailProject.id)}>
                Ver postulaciones
              </button>
              <button className="producer-button producer-button--primary" type="button" onClick={() => setDetailProject(null)}>
                Cerrar
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function ProjectTableSkeleton() {
  return (
    <div className="producer-project-table-wrap">
      <div className="producer-project-table-skeleton producer-dashboard-skeleton">
        {[0, 1, 2, 3].map((item) => (
          <article key={item}>
            <span></span>
            <strong></strong>
            <small></small>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProducerProjects() {
  return (
    <ProducerGuard>
      <ProducerProjectsContent />
    </ProducerGuard>
  );
}

export default ProducerProjects;
