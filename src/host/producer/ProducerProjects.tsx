import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import type { Project } from "../../types/producer";
import { formatDisplayDate } from "./utils";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/producer.css";

function ProducerProjectsContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setError("");
        const nextProjects = await getMyProjects();

        if (isMounted) {
          setProjects(nextProjects);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("producer.errors.loadProjects")
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
  }, [t]);

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{t("producer.projects.eyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.projects.title")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.projects.subtitle")}
          </p>
        </div>
        <Link className="producer-button producer-button--primary" to="/producer/projects/new">
          {t("producer.projects.newProject")}
        </Link>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="producer-grid producer-grid--single">
        {isLoading ? (
          <article className="producer-card producer-empty">
            <p>{t("producer.projects.loading")}</p>
          </article>
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <article key={project.id} className="producer-card producer-record">
              <div className="producer-record__header">
                <div>
                  <p className="producer-record__eyebrow">{project.production_type}</p>
                  <h2 className="producer-record__title">{project.title}</h2>
                </div>
                <span className="producer-status">
                  {translateStatus(t, project.status)}
                </span>
              </div>

              <p className="producer-record__text">{project.description}</p>

              <div className="producer-meta-list">
                <span>{project.location}</span>
                <span>{formatDisplayDate(project.start_date, i18n.language, t("common.noDate"))}</span>
                <span>{formatDisplayDate(project.end_date, i18n.language, t("common.noDate"))}</span>
              </div>

              <div className="producer-actions producer-actions--inline">
                <button
                  className="producer-button producer-button--primary"
                  type="button"
                  onClick={() => navigate(`/producer/projects/${project.id}/edit`)}
                >
                  {t("common.edit")}
                </button>
                <button
                  className="producer-button"
                  type="button"
                  onClick={() =>
                    navigate("/producer/opportunities/new", {
                      state: { projectId: project.id },
                    })
                  }
                >
                  {t("producer.projects.createOpportunity")}
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="producer-card producer-empty">
            <h2 className="producer-card__title">{t("producer.projects.emptyTitle")}</h2>
            <p className="producer-card__text">
              {t("producer.projects.emptyText")}
            </p>
          </article>
        )}
      </section>
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
