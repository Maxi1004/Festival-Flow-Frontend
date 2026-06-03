import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { createProject } from "../../service/projectApi";
import { useCurrentProfile } from "../useCurrentProfile";
import { PROJECT_STATUS_OPTIONS } from "../../types/producer";
import { normalizeProjectFormData } from "./utils";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
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
  status: "ACTIVE",
};

const producerCreateProjectBaseTexts = [
  "No se pudo crear el proyecto.",
  "Nuevo proyecto",
  "Crear proyecto",
  "Registra la base del proyecto para luego abrir convocatorias asociadas.",
  "Titulo",
  "Descripcion",
  "Tipo de produccion",
  "Serie, videoclip, documental...",
  "Ubicacion",
  "Santiago, Chile",
  "Fecha de inicio",
  "Fecha de termino",
  "Estado",
  "Iniciar",
  "Cancelar",
  "Creando...",
];

function ProducerCreateProjectContent() {
  const navigate = useNavigate();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(producerCreateProjectBaseTexts, language, token);
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
      await createProject(normalizeProjectFormData(formData), token ?? undefined);
      navigate("/producer/projects");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tAuto("No se pudo crear el proyecto.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{tAuto("Nuevo proyecto")}</p>
          <h1 className="producer-page__title">{tAuto("Crear proyecto")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Registra la base del proyecto para luego abrir convocatorias asociadas.")}
          </p>
        </div>

        <form className="producer-form" onSubmit={handleSubmit}>
          <label className="producer-field">
            <span>{tAuto("Titulo")}</span>
            <input name="title" value={formData.title} onChange={handleChange} required />
          </label>

          <label className="producer-field producer-field--full">
            <span>{tAuto("Descripcion")}</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Tipo de produccion")}</span>
            <input
              name="production_type"
              value={formData.production_type}
              onChange={handleChange}
              placeholder={tAuto("Serie, videoclip, documental...")}
              required
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Ubicacion")}</span>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={tAuto("Santiago, Chile")}
              required
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Fecha de inicio")}</span>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Fecha de termino")}</span>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Estado")}</span>
            <select name="status" value={formData.status} onChange={handleChange}>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {tAuto(status.label)}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="producer-feedback producer-feedback--error">{error}</p> : null}

          <div className="producer-actions">
            <button className="producer-button" type="button" onClick={() => navigate(-1)}>
              {tAuto("Cancelar")}
            </button>
            <button
              className="producer-button producer-button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? tAuto("Creando...") : tAuto("Crear proyecto")}
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
