import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { createOpportunity } from "../../service/opportunityApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  OPPORTUNITY_MODALITY_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
} from "../../types/producer";
import type { Project } from "../../types/producer";
import { normalizeOpportunityFormData } from "./utils";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
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
  status: "ACTIVE",
  deadline: "",
};

const producerCreateOpportunityBaseTexts = [
  "No se pudieron cargar tus proyectos.",
  "No se pudo crear la convocatoria.",
  "Nueva convocatoria",
  "Crear oportunidad",
  "Publica una convocatoria conectada a uno de tus proyectos reales.",
  "Cargando proyectos...",
  "Necesitas al menos un proyecto para crear una convocatoria.",
  "Crear proyecto primero",
  "Proyecto",
  "Titulo",
  "Rol requerido",
  "Director de fotografia",
  "Especialidad",
  "Cine documental",
  "Ubicacion",
  "Modalidad",
  "Estado",
  "Iniciar",
  "Deadline",
  "Descripcion",
  "Requisitos",
  "Uno por linea o separados por comas",
  "Cancelar",
  "Creando...",
  "Crear convocatoria",
];

function ProducerCreateOpportunityContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<OpportunityFormState>(initialFormState);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const translationTexts = useMemo(
    () => [...producerCreateOpportunityBaseTexts, ...projects.map((project) => project.title)],
    [projects]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setError("");
        const nextProjects = await reusePendingRequest(
          `producer-create-opportunity-projects:${token}`,
          () => getMyProjects(token ?? undefined)
        );

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
              : tAuto("No se pudieron cargar tus proyectos.")
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
  }, [location.state, token]);

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
      const createdOpportunity = await createOpportunity(
        normalizeOpportunityFormData(formData),
        token ?? undefined
      );
      navigate("/producer/opportunities", {
        state: { createdOpportunity },
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tAuto("No se pudo crear la convocatoria.")
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
          <p className="producer-page__eyebrow">{tAuto("Nueva convocatoria")}</p>
          <h1 className="producer-page__title">{tAuto("Crear oportunidad")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Publica una convocatoria conectada a uno de tus proyectos reales.")}
          </p>
        </div>

        {isLoadingProjects ? (
          <p className="producer-muted">{tAuto("Cargando proyectos...")}</p>
        ) : !hasProjects ? (
          <div className="producer-empty">
            <p className="producer-card__text">
              {tAuto("Necesitas al menos un proyecto para crear una convocatoria.")}
            </p>
            <button
              className="producer-button producer-button--primary"
              type="button"
              onClick={() => navigate("/producer/projects/new")}
            >
              {tAuto("Crear proyecto primero")}
            </button>
          </div>
        ) : (
          <form className="producer-form" onSubmit={handleSubmit}>
            <label className="producer-field">
              <span>{tAuto("Proyecto")}</span>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {tAuto(project.title)}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{tAuto("Titulo")}</span>
              <input name="title" value={formData.title} onChange={handleChange} required />
            </label>

            <label className="producer-field">
              <span>{tAuto("Rol requerido")}</span>
              <input
                name="role_needed"
                value={formData.role_needed}
                onChange={handleChange}
                placeholder={tAuto("Director de fotografia")}
                required
              />
            </label>

            <label className="producer-field">
              <span>{tAuto("Especialidad")}</span>
              <input
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder={tAuto("Cine documental")}
                required
              />
            </label>

            <label className="producer-field">
              <span>{tAuto("Ubicacion")}</span>
              <input name="location" value={formData.location} onChange={handleChange} required />
            </label>

            <label className="producer-field">
              <span>{tAuto("Modalidad")}</span>
              <select name="modality" value={formData.modality} onChange={handleChange}>
                {OPPORTUNITY_MODALITY_OPTIONS.map((modality) => (
                  <option key={modality} value={modality}>
                    {modality}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{tAuto("Estado")}</span>
              <select name="status" value={formData.status} onChange={handleChange}>
                {OPPORTUNITY_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {tAuto(status.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="producer-field">
              <span>{tAuto("Deadline")}</span>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
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

            <label className="producer-field producer-field--full">
              <span>{tAuto("Requisitos")}</span>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={5}
                placeholder={tAuto("Uno por linea o separados por comas")}
              />
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
                {isSubmitting ? tAuto("Creando...") : tAuto("Crear convocatoria")}
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
