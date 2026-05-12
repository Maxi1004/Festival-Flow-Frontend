import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import {
  getMyOpportunities,
  updateOpportunityStatus,
} from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import { formatDisplayDate, getOpportunityProjectTitle } from "./utils";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/producer.css";

function ProducerOpportunitiesContent() {
  const { t, i18n } = useTranslation();
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
              : t("producer.errors.loadOpportunities")
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
          : t("producer.errors.closeOpportunity")
      );
    } finally {
      setClosingId("");
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{t("producer.opportunities.eyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.opportunities.title")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.opportunities.subtitle")}
          </p>
        </div>
        <Link
          className="producer-button producer-button--primary"
          to="/producer/opportunities/new"
        >
          {t("producer.opportunities.newOpportunity")}
        </Link>
      </section>

      <section className="producer-metrics">
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : opportunities.length}</span>
          <p className="producer-metric__label">{t("producer.opportunities.total")}</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : activeCount}</span>
          <p className="producer-metric__label">{t("producer.opportunities.active")}</p>
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
            <p>{t("producer.opportunities.loading")}</p>
          </article>
        ) : opportunities.length > 0 ? (
          opportunities.map((opportunity) => (
            <article key={opportunity.id} className="producer-card producer-record">
              <div className="producer-record__header">
                <div>
                  <p className="producer-record__eyebrow">
                    {getOpportunityProjectTitle(
                      opportunity,
                      projects,
                      t("producer.opportunities.fallbackProject")
                    )}
                  </p>
                  <h2 className="producer-record__title">{opportunity.title}</h2>
                </div>
                <span className="producer-status">
                  {translateStatus(t, opportunity.status)}
                </span>
              </div>

              <div className="producer-meta-list">
                <span>{opportunity.role_needed}</span>
                <span>{opportunity.specialty}</span>
                <span>{opportunity.location}</span>
                <span>
                  {t(`options.opportunityModality.${opportunity.modality}`, {
                    defaultValue: opportunity.modality,
                  })}
                </span>
                <span>
                  {formatDisplayDate(opportunity.deadline, i18n.language, t("common.noDate"))}
                </span>
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
                  {t("common.edit")}
                </button>
                <button
                  className="producer-button"
                  type="button"
                  disabled={opportunity.status === "CLOSED" || closingId === opportunity.id}
                  onClick={() => void handleCloseOpportunity(opportunity.id)}
                >
                  {closingId === opportunity.id
                    ? t("producer.opportunities.closing")
                    : opportunity.status === "CLOSED"
                    ? t("producer.opportunities.closed")
                    : t("producer.opportunities.close")}
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="producer-card producer-empty">
            <h2 className="producer-card__title">{t("producer.opportunities.emptyTitle")}</h2>
            <p className="producer-card__text">
              {t("producer.opportunities.emptyText")}
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
