import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getProjectById, updateProject } from "../../service/projectApi";
import { PROJECT_STATUS_OPTIONS } from "../../types/producer";
import { normalizeProjectFormData, toDateInputValue } from "./utils";
import "../../styles/producer.css";

type ProjectFormState = {
  title: string;
  description: string;
  production_type: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
};

const initialFormState: ProjectFormState = {
  title: "",
  description: "",
  production_type: "",
  location: "",
  start_date: "",
  end_date: "",
  status: "DRAFT",
};

function ProducerEditProjectContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [formData, setFormData] = useState<ProjectFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      if (!projectId) {
        setError(t("producer.errors.projectNotFound"));
        setIsLoading(false);
        return;
      }

      try {
        setError("");
        const project = await getProjectById(projectId);

        if (!isMounted) {
          return;
        }

        setFormData({
          title: project.title ?? "",
          description: project.description ?? "",
          production_type: project.production_type ?? "",
          location: project.location ?? "",
          start_date: toDateInputValue(project.start_date),
          end_date: toDateInputValue(project.end_date),
          status: project.status ?? "DRAFT",
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("producer.errors.loadProject")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId, t]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId) {
      setError(t("producer.errors.projectNotFound"));
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await updateProject(projectId, normalizeProjectFormData(formData));
      navigate("/producer/projects");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("producer.errors.updateProject")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="producer-shell">
        <article className="producer-card producer-empty">
          <p>{t("producer.projectForm.loading")}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{t("producer.projectForm.editEyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.projectForm.editTitle")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.projectForm.editSubtitle")}
          </p>
        </div>

        <form className="producer-form" onSubmit={handleSubmit}>
          <label className="producer-field">
            <span>{t("producer.projectForm.title")}</span>
            <input name="title" value={formData.title} onChange={handleChange} required />
          </label>

          <label className="producer-field producer-field--full">
            <span>{t("producer.projectForm.description")}</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.productionType")}</span>
            <input
              name="production_type"
              value={formData.production_type}
              onChange={handleChange}
              required
            />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.location")}</span>
            <input name="location" value={formData.location} onChange={handleChange} required />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.startDate")}</span>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.endDate")}</span>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.status")}</span>
            <select name="status" value={formData.status} onChange={handleChange}>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`options.projectStatus.${status}`)}
                </option>
              ))}
            </select>
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
              {isSubmitting ? t("common.saving") : t("common.saveChanges")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProducerEditProject() {
  return (
    <ProducerGuard>
      <ProducerEditProjectContent />
    </ProducerGuard>
  );
}

export default ProducerEditProject;
