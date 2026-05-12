import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createApplication, getMyApplications } from "../../service/applicationApi";
import {
  getOpportunityById,
  getPublicOpportunities,
} from "../../service/publicOpportunityApi";
import type { PublicOpportunity } from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/talent.css";

type FilterState = {
  search: string;
  specialty: string;
  location: string;
  modality: string;
};

const ALL_FILTER = "__ALL__";
const ANY_FILTER = "__ANY__";

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function formatModality(
  value: string | null | undefined,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (!normalizeText(value)) {
    return t("talent.opportunities.unreportedModality");
  }

  return t(`options.opportunityModality.${value}`, { defaultValue: value });
}

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsedDate);
}

function getOpportunityTitle(opportunity: PublicOpportunity, fallback: string): string {
  return opportunity.title?.trim() || opportunity.role_needed?.trim() || fallback;
}

function getProjectLabel(opportunity: PublicOpportunity, fallback: string): string {
  return opportunity.project?.title?.trim() || opportunity.specialty?.trim() || fallback;
}

function matchesFilter(
  opportunity: PublicOpportunity,
  filters: FilterState,
  fallbackTitle: string,
  fallbackProject: string
): boolean {
  const searchTarget = [
    getOpportunityTitle(opportunity, fallbackTitle),
    getProjectLabel(opportunity, fallbackProject),
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
    filters.specialty === ALL_FILTER || opportunity.specialty === filters.specialty;
  const locationMatch =
    filters.location === ANY_FILTER || opportunity.location === filters.location;
  const modalityMatch =
    filters.modality === ALL_FILTER || opportunity.modality === filters.modality;

  return searchMatch && specialtyMatch && locationMatch && modalityMatch;
}

function TalentOpportunities() {
  const { t, i18n } = useTranslation();
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
    specialty: ALL_FILTER,
    location: ANY_FILTER,
    modality: ALL_FILTER,
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
              : t("talent.errors.loadOpportunities")
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
  }, [t]);

  const specialties = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.specialty?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [ALL_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const locations = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.location?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [ANY_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const modalities = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.modality?.trim())
        .filter(Boolean)
    );

    return [ALL_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter((opportunity) =>
        matchesFilter(
          opportunity,
          filters,
          t("talent.opportunities.fallbackTitle"),
          t("talent.opportunities.fallbackProject")
        )
      ),
    [filters, opportunities, t]
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
      setSuccessMessage(t("talent.opportunities.success"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("talent.errors.sendApplication")
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
          : t("talent.errors.loadOpportunityDetail")
      );
    } finally {
      setLoadingDetailId("");
    }
  };

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.opportunities.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.opportunities.title")}</h1>
          <p className="talent-page__subtitle">
            {t("talent.opportunities.subtitle")}
          </p>
        </div>
      </section>

      <section className="talent-card">
        <div className="section-heading">
          <h2 className="section-heading__title">{t("talent.opportunities.filters")}</h2>
          <p className="section-heading__text">
            {t("talent.opportunities.filtersText")}
          </p>
        </div>

        <div className="talent-filters">
          <label className="talent-filter">
            <span>{t("talent.opportunities.search")}</span>
            <input
              name="search"
              type="text"
              placeholder={t("talent.opportunities.searchPlaceholder")}
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>
          <label className="talent-filter">
            <span>{t("talent.opportunities.specialty")}</span>
            <select name="specialty" value={filters.specialty} onChange={handleFilterChange}>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty === ALL_FILTER ? t("talent.opportunities.filterAll") : specialty}
                </option>
              ))}
            </select>
          </label>
          <label className="talent-filter">
            <span>{t("talent.opportunities.location")}</span>
            <select name="location" value={filters.location} onChange={handleFilterChange}>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location === ANY_FILTER ? t("talent.opportunities.filterAny") : location}
                </option>
              ))}
            </select>
          </label>
          <label className="talent-filter">
            <span>{t("talent.opportunities.modality")}</span>
            <select name="modality" value={filters.modality} onChange={handleFilterChange}>
              {modalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modality === ALL_FILTER
                    ? t("talent.opportunities.filterAll")
                    : formatModality(modality, t)}
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
          <p className="talent-feedback">{t("talent.opportunities.loading")}</p>
        </section>
      ) : filteredOpportunities.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">
            {t("talent.opportunities.empty")}
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
                    <p className="talent-list__meta">
                      {getProjectLabel(opportunity, t("talent.opportunities.fallbackProject"))}
                    </p>
                    <h2 className="talent-list__title">
                      {getOpportunityTitle(opportunity, t("talent.opportunities.fallbackTitle"))}
                    </h2>
                  </div>
                  <span className="talent-badge">
                    {opportunity.status
                      ? translateStatus(t, opportunity.status)
                      : t("talent.opportunities.defaultStatus")}
                  </span>
                </div>

                <div className="talent-meta-list">
                  <span>{opportunity.role_needed || t("talent.opportunities.undefinedRole")}</span>
                  <span>{opportunity.location || t("talent.opportunities.pendingLocation")}</span>
                  <span>{formatModality(opportunity.modality, t)}</span>
                </div>

                <p className="talent-list__text">
                  {opportunity.description || t("talent.opportunities.noDescription")}
                </p>

                {isExpanded ? (
                  <div className="talent-stack">
                    <div className="talent-field">
                      <span className="talent-field__label">
                        {t("talent.opportunities.deadline")}
                      </span>
                      <p className="talent-field__text">
                        {formatDate(
                          opportunity.deadline,
                          i18n.language,
                          t("talent.opportunities.noDeadline")
                        )}
                      </p>
                    </div>
                    <div className="talent-field">
                      <span className="talent-field__label">
                        {t("talent.opportunities.requirements")}
                      </span>
                      <p className="talent-field__text">
                        {opportunity.requirements?.length
                          ? opportunity.requirements.join(", ")
                          : t("talent.opportunities.noRequirements")}
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
                      ? t("talent.opportunities.applied")
                      : submittingOpportunityId === opportunity.id
                        ? t("talent.opportunities.applying")
                        : t("talent.opportunities.apply")}
                  </button>
                  <button
                    className="talent-button"
                    type="button"
                    disabled={loadingDetailId === opportunity.id}
                    onClick={() => void handleToggleDetails(opportunity.id)}
                  >
                    {loadingDetailId === opportunity.id
                      ? t("common.loading")
                      : isExpanded
                        ? t("talent.opportunities.hideDetail")
                        : t("talent.opportunities.showDetail")}
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
