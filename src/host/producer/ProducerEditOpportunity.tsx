import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { getOpportunityById, updateOpportunity } from "../../service/opportunityApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  OPPORTUNITY_MODALITY_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
} from "../../types/producer";
import type { Project } from "../../types/producer";
import {
  normalizeOpportunityFormData,
  requirementsToTextarea,
  toDateInputValue,
  toVisibleStatusAction,
} from "./utils";
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

const producerEditOpportunityBaseTexts = [
  "No se encontro la convocatoria solicitada.",
  "No se pudo cargar la convocatoria.",
  "No se pudo actualizar la convocatoria.",
  "Cargando convocatoria...",
  "Editar convocatoria",
  "Actualiza la oportunidad",
  "Ajusta los datos del rol requerido y el estado de la convocatoria.",
  "Proyecto",
  "Titulo",
  "Rol requerido",
  "Especialidad",
  "Ubicacion",
  "Modalidad",
  "Estado",
  "Iniciar",
  "Cancelar",
  "Deadline",
  "Descripcion",
  "Requisitos",
  "Guardando...",
  "Guardar cambios",
];

function ProducerEditOpportunityContent() {
  const navigate = useNavigate();
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<OpportunityFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const translationTexts = useMemo(
    () => [...producerEditOpportunityBaseTexts, ...projects.map((project) => project.title)],
    [projects]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!opportunityId) {
        setError(tAuto("No se encontro la convocatoria solicitada."));
        setIsLoading(false);
        return;
      }

      try {
        setError("");
        const [nextProjects, opportunity] = await reusePendingRequest(
          `producer-edit-opportunity:${opportunityId}:${token}`,
          () => Promise.all([
            getMyProjects(token ?? undefined),
            getOpportunityById(opportunityId, token ?? undefined),
          ])
        );

        if (!isMounted) {
          return;
        }

        setProjects(nextProjects);
        setFormData({
          project_id: opportunity.project_id ?? nextProjects[0]?.id ?? "",
          title: opportunity.title ?? "",
          role_needed: opportunity.role_needed ?? "",
          specialty: opportunity.specialty ?? "",
          description: opportunity.description ?? "",
          location: opportunity.location ?? "",
          modality: opportunity.modality ?? "REMOTE",
          requirements: requirementsToTextarea(opportunity.requirements),
          status: toVisibleStatusAction(opportunity.status),
          deadline: toDateInputValue(opportunity.deadline),
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tAuto("No se pudo cargar la convocatoria.")
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
  }, [opportunityId, token]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!opportunityId) {
      setError(tAuto("No se encontro la convocatoria solicitada."));
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await updateOpportunity(opportunityId, normalizeOpportunityFormData(formData), token ?? undefined);
      navigate("/producer/opportunities");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tAuto("No se pudo actualizar la convocatoria.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="producer-shell">
        <article className="producer-card producer-empty">
          <p>{tAuto("Cargando convocatoria...")}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{tAuto("Editar convocatoria")}</p>
          <h1 className="producer-page__title">{tAuto("Actualiza la oportunidad")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Ajusta los datos del rol requerido y el estado de la convocatoria.")}
          </p>
        </div>

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
              required
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Especialidad")}</span>
            <input
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
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
              {isSubmitting ? tAuto("Guardando...") : tAuto("Guardar cambios")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProducerEditOpportunity() {
  return (
    <ProducerGuard>
      <ProducerEditOpportunityContent />
    </ProducerGuard>
  );
}

export default ProducerEditOpportunity;
