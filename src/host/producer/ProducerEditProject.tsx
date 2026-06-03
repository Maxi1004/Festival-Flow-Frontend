import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getProjectById, updateProject } from "../../service/projectApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import { PROJECT_STATUS_OPTIONS } from "../../types/producer";
import { normalizeProjectFormData, toDateInputValue, toVisibleStatusAction } from "./utils";
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

const producerEditProjectBaseTexts = [
  "No se encontro el proyecto solicitado.",
  "No se pudo cargar el proyecto.",
  "No se pudo actualizar el proyecto.",
  "Cargando proyecto...",
  "Editar proyecto",
  "Actualiza la informacion del proyecto",
  "Ajusta detalles operativos y manten la base lista para nuevas convocatorias.",
  "Titulo",
  "Descripcion",
  "Tipo de produccion",
  "Ubicacion",
  "Fecha de inicio",
  "Fecha de termino",
  "Estado",
  "Iniciar",
  "Cancelar",
  "Guardando...",
  "Guardar cambios",
];

function ProducerEditProjectContent() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(producerEditProjectBaseTexts, language, token);
  const [formData, setFormData] = useState<ProjectFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      if (!projectId) {
        setError(tAuto("No se encontro el proyecto solicitado."));
        setIsLoading(false);
        return;
      }

      try {
        setError("");
        const project = await reusePendingRequest(
          `producer-edit-project:${projectId}:${token}`,
          () => getProjectById(projectId, token ?? undefined)
        );

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
          status: toVisibleStatusAction(project.status),
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tAuto("No se pudo cargar el proyecto.")
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
  }, [projectId, token]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId) {
      setError(tAuto("No se encontro el proyecto solicitado."));
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await updateProject(projectId, normalizeProjectFormData(formData), token ?? undefined);
      navigate("/producer/projects");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tAuto("No se pudo actualizar el proyecto.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="producer-shell">
        <article className="producer-card producer-empty">
          <p>{tAuto("Cargando proyecto...")}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">{tAuto("Editar proyecto")}</p>
          <h1 className="producer-page__title">{tAuto("Actualiza la informacion del proyecto")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Ajusta detalles operativos y manten la base lista para nuevas convocatorias.")}
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
              required
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Ubicacion")}</span>
            <input name="location" value={formData.location} onChange={handleChange} required />
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
              {isSubmitting ? tAuto("Guardando...") : tAuto("Guardar cambios")}
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
