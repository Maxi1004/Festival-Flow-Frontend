import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { createOpportunity } from "../../service/opportunityApi";
import {
  OPPORTUNITY_MODALITY_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
} from "../../types/producer";
import type { Project } from "../../types/producer";
import { normalizeOpportunityFormData } from "./utils";
import "../../styles/producer.css";

type OpportunityFormState = {
  project_id: string;
  title: string;
  role_needed: string;
  specialty: string;
  description: string;
  location: string;
  modality: string;
  requirements: string;
  status: string;
  deadline: string;
};

const initialFormState: OpportunityFormState = {
  project_id: "",
  title: "",
  role_needed: "",
  specialty: "",
  description: "",
  location: "",
  modality: "REMOTE",
  requirements: "",
  status: "OPEN",
  deadline: "",
};

function ProducerCreateOpportunityContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<OpportunityFormState>(initialFormState);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setError("");
        const nextProjects = await getMyProjects();

        if (!isMounted) {
          return;
        }

        const suggestedProjectId =
          (location.state as { projectId?: string } | null)?.projectId ?? "";

        setProjects(nextProjects);
        setFormData((current) => ({
          ...current,
          project_id: suggestedProjectId || nextProjects[0]?.id || "",
        }));
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
          setIsLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [location.state, t]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      await createOpportunity(normalizeOpportunityFormData(formData));
      navigate("/producer/opportunities");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("producer.errors.createOpportunity")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasProjects = projects.length > 0;

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{t("producer.opportunityForm.newEyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.opportunityForm.createTitle")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.opportunityForm.createSubtitle")}
          </p>
        </div>

        {isLoadingProjects ? (
          <p className="producer-muted">{t("producer.projects.loading")}</p>
        ) : !hasProjects ? (
          <div className="producer-empty">
            <p className="producer-card__text">
              {t("producer.opportunityForm.needsProject")}
            </p>
            <button
              className="producer-button producer-button--primary"
              type="button"
              onClick={() => navigate("/producer/projects/new")}
            >
              {t("producer.opportunityForm.createProjectFirst")}
            </button>
          </div>
        ) : (
          <form className="producer-form" onSubmit={handleSubmit}>
            <label className="producer-field">
              <span>{t("producer.opportunityForm.project")}</span>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.title")}</span>
              <input name="title" value={formData.title} onChange={handleChange} required />
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.roleNeeded")}</span>
              <input
                name="role_needed"
                value={formData.role_needed}
                onChange={handleChange}
                placeholder={t("producer.opportunityForm.rolePlaceholder")}
                required
              />
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.specialty")}</span>
              <input
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder={t("producer.opportunityForm.specialtyPlaceholder")}
                required
              />
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.location")}</span>
              <input name="location" value={formData.location} onChange={handleChange} required />
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.modality")}</span>
              <select name="modality" value={formData.modality} onChange={handleChange}>
                {OPPORTUNITY_MODALITY_OPTIONS.map((modality) => (
                  <option key={modality} value={modality}>
                    {t(`options.opportunityModality.${modality}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.status")}</span>
              <select name="status" value={formData.status} onChange={handleChange}>
                {OPPORTUNITY_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`options.opportunityStatus.${status}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{t("producer.opportunityForm.deadline")}</span>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </label>

            <label className="producer-field producer-field--full">
              <span>{t("producer.opportunityForm.description")}</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                required
              />
            </label>

            <label className="producer-field producer-field--full">
              <span>{t("producer.opportunityForm.requirements")}</span>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={5}
                placeholder={t("producer.opportunityForm.requirementsPlaceholder")}
              />
            </label>

            {error ? <p className="producer-feedback producer-feedback--error">{error}</p> : null}

            <div className="producer-actions">
              <button className="producer-button" type="button" onClick={() => navigate(-1)}>
                {t("common.cancel")}
              </button>
              <button
                className="producer-button producer-button--primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("common.creating") : t("producer.opportunityForm.createButton")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ProducerCreateOpportunity() {
  return (
    <ProducerGuard>
      <ProducerCreateOpportunityContent />
    </ProducerGuard>
  );
}

export default ProducerCreateOpportunity;
