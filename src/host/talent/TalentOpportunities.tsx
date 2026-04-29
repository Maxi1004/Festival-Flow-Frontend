import { useEffect, useMemo, useState } from "react";
import { createApplication, getMyApplications } from "../../service/applicationApi";
import {
  getOpportunityById,
  getPublicOpportunities,
} from "../../service/publicOpportunityApi";
import type { PublicOpportunity } from "../../types/talent";
import "../../styles/talent.css";

type FilterState = {
  search: string;
  specialty: string;
  location: string;
  modality: string;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function formatModality(value: string | null | undefined): string {
  const normalizedValue = normalizeText(value).replaceAll("_", " ");

  if (!normalizedValue) {
    return "Modalidad no informada";
  }

  return normalizedValue
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatOpportunityStatus(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    ACTIVE: "Activa",
    CANCELLED: "Cancelada",
    CLOSED: "Cancelada",
    COMPLETED: "Completada",
    DRAFT: "Borrador",
    OPEN: "Activa",
    PAUSED: "Pausada",
  };
  const normalizedValue = normalizeText(value).toUpperCase();

  return labels[normalizedValue] ?? value?.trim() ?? "Activa";
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Sin fecha limite";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(parsedDate);
}

function getOpportunityTitle(opportunity: PublicOpportunity): string {
  return opportunity.title?.trim() || opportunity.role_needed?.trim() || "Convocatoria";
}

function getProjectLabel(opportunity: PublicOpportunity): string {
  return opportunity.project?.title?.trim() || opportunity.specialty?.trim() || "Proyecto";
}

function matchesFilter(opportunity: PublicOpportunity, filters: FilterState): boolean {
  const searchTarget = [
    getOpportunityTitle(opportunity),
    getProjectLabel(opportunity),
    opportunity.role_needed,
    opportunity.specialty,
    opportunity.description,
    opportunity.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const searchMatch =
    !filters.search.trim() || searchTarget.includes(filters.search.trim().toLowerCase());
  const specialtyMatch =
    filters.specialty === "Todas" || opportunity.specialty === filters.specialty;
  const locationMatch =
    filters.location === "Cualquiera" || opportunity.location === filters.location;
  const modalityMatch =
    filters.modality === "Todas" || formatModality(opportunity.modality) === filters.modality;

  return searchMatch && specialtyMatch && locationMatch && modalityMatch;
}

function TalentOpportunities() {
  const [opportunities, setOpportunities] = useState<PublicOpportunity[]>([]);
  const [appliedOpportunityIds, setAppliedOpportunityIds] = useState<Set<string>>(new Set());
  const [expandedOpportunityIds, setExpandedOpportunityIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submittingOpportunityId, setSubmittingOpportunityId] = useState("");
  const [loadingDetailId, setLoadingDetailId] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    specialty: "Todas",
    location: "Cualquiera",
    modality: "Todas",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setError("");
        setSuccessMessage("");
        const [nextOpportunities, myApplications] = await Promise.all([
          getPublicOpportunities(),
          getMyApplications(),
        ]);

        if (!isMounted) {
          return;
        }

        setOpportunities(nextOpportunities);
        setAppliedOpportunityIds(
          new Set(myApplications.map((application) => application.opportunity_id))
        );
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las convocatorias."
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

  const specialties = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.specialty?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return ["Todas", ...Array.from(values)];
  }, [opportunities]);

  const locations = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.location?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return ["Cualquiera", ...Array.from(values)];
  }, [opportunities]);

  const modalities = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => formatModality(opportunity.modality))
        .filter(Boolean)
    );

    return ["Todas", ...Array.from(values)];
  }, [opportunities]);

  const filteredOpportunities = useMemo(
    () => opportunities.filter((opportunity) => matchesFilter(opportunity, filters)),
    [filters, opportunities]
  );

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApply = async (opportunityId: string) => {
    try {
      setSubmittingOpportunityId(opportunityId);
      setError("");
      setSuccessMessage("");
      await createApplication({
        opportunity_id: opportunityId,
        message: "",
      });
      setAppliedOpportunityIds((current) => new Set(current).add(opportunityId));
      setSuccessMessage("Postulacion enviada correctamente.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar la postulacion."
      );
    } finally {
      setSubmittingOpportunityId("");
    }
  };

  const handleToggleDetails = async (opportunityId: string) => {
    const isExpanded = expandedOpportunityIds.has(opportunityId);

    if (isExpanded) {
      setExpandedOpportunityIds((current) => {
        const nextValue = new Set(current);
        nextValue.delete(opportunityId);
        return nextValue;
      });
      return;
    }

    try {
      setLoadingDetailId(opportunityId);
      const opportunityDetail = await getOpportunityById(opportunityId);
      setOpportunities((current) =>
        current.map((opportunity) =>
          opportunity.id === opportunityId ? opportunityDetail : opportunity
        )
      );
      setExpandedOpportunityIds((current) => new Set(current).add(opportunityId));
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "No se pudo cargar el detalle de la convocatoria."
      );
    } finally {
      setLoadingDetailId("");
    }
  };

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Convocatorias</p>
          <h1 className="talent-page__title">Convocatorias abiertas para talento</h1>
          <p className="talent-page__subtitle">
            Explora oportunidades reales creadas por productores y postula desde este panel.
          </p>
        </div>
      </section>

      <section className="talent-card">
        <div className="section-heading">
          <h2 className="section-heading__title">Filtros</h2>
          <p className="section-heading__text">
            Los filtros funcionan sobre el listado real entregado por `GET /opportunities`.
          </p>
        </div>

        <div className="talent-filters">
          <label className="talent-filter">
            <span>Busqueda</span>
            <input
              name="search"
              type="text"
              placeholder="Buscar por proyecto o rol"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>
          <label className="talent-filter">
            <span>Especialidad</span>
            <select name="specialty" value={filters.specialty} onChange={handleFilterChange}>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>
          <label className="talent-filter">
            <span>Ubicacion</span>
            <select name="location" value={filters.location} onChange={handleFilterChange}>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label className="talent-filter">
            <span>Modalidad</span>
            <select name="modality" value={filters.modality} onChange={handleFilterChange}>
              {modalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modality}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {successMessage ? (
        <p className="talent-feedback talent-feedback--success">{successMessage}</p>
      ) : null}

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando convocatorias...</p>
        </section>
      ) : filteredOpportunities.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">
            No hay convocatorias disponibles con los filtros actuales.
          </p>
        </section>
      ) : (
        <section className="talent-opportunities">
          {filteredOpportunities.map((opportunity) => {
            const isApplied = appliedOpportunityIds.has(opportunity.id);
            const isExpanded = expandedOpportunityIds.has(opportunity.id);

            return (
              <article key={opportunity.id} className="talent-card talent-opportunity-card">
                <div className="talent-opportunity-card__top">
                  <div>
                    <p className="talent-list__meta">{getProjectLabel(opportunity)}</p>
                    <h2 className="talent-list__title">{getOpportunityTitle(opportunity)}</h2>
                  </div>
                  <span className="talent-badge">{formatOpportunityStatus(opportunity.status)}</span>
                </div>

                <div className="talent-meta-list">
                  <span>{opportunity.role_needed || "Rol sin definir"}</span>
                  <span>{opportunity.location || "Ubicacion pendiente"}</span>
                  <span>{formatModality(opportunity.modality)}</span>
                </div>

                <p className="talent-list__text">
                  {opportunity.description || "Esta convocatoria no incluye descripcion adicional."}
                </p>

                {isExpanded ? (
                  <div className="talent-stack">
                    <div className="talent-field">
                      <span className="talent-field__label">Deadline</span>
                      <p className="talent-field__text">{formatDate(opportunity.deadline)}</p>
                    </div>
                    <div className="talent-field">
                      <span className="talent-field__label">Requisitos</span>
                      <p className="talent-field__text">
                        {opportunity.requirements?.length
                          ? opportunity.requirements.join(", ")
                          : "Sin requisitos detallados."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="talent-actions talent-actions--inline">
                  <button
                    className="talent-button talent-button--primary"
                    type="button"
                    disabled={isApplied || submittingOpportunityId === opportunity.id}
                    onClick={() => void handleApply(opportunity.id)}
                  >
                    {isApplied
                      ? "Postulado"
                      : submittingOpportunityId === opportunity.id
                        ? "Postulando..."
                        : "Postular"}
                  </button>
                  <button
                    className="talent-button"
                    type="button"
                    disabled={loadingDetailId === opportunity.id}
                    onClick={() => void handleToggleDetails(opportunity.id)}
                  >
                    {loadingDetailId === opportunity.id
                      ? "Cargando..."
                      : isExpanded
                        ? "Ocultar detalle"
                        : "Ver detalle"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default TalentOpportunities;
