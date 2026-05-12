import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { createProject } from "../../service/projectApi";
import { PROJECT_STATUS_OPTIONS } from "../../types/producer";
import { normalizeProjectFormData } from "./utils";
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

function ProducerCreateProjectContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProjectFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      await createProject(normalizeProjectFormData(formData));
      navigate("/producer/projects");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("producer.errors.createProject")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{t("producer.projectForm.newEyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.projectForm.createTitle")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.projectForm.createSubtitle")}
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
              placeholder={t("producer.projectForm.productionTypePlaceholder")}
              required
            />
          </label>

          <label className="producer-field">
            <span>{t("producer.projectForm.location")}</span>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t("producer.projectForm.locationPlaceholder")}
              required
            />
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
              {isSubmitting ? t("common.creating") : t("producer.projectForm.createButton")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProducerCreateProject() {
  return (
    <ProducerGuard>
      <ProducerCreateProjectContent />
    </ProducerGuard>
  );
}

export default ProducerCreateProject;
