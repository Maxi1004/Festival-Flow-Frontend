import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getProjectById, updateProject } from "../../service/projectApi";
import { PROJECT_STATUS_OPTIONS } from "../../types/producer";
import { normalizeProjectFormData, toDateInputValue, toVisibleStatusAction } from "./utils";
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

function ProducerEditProjectContent() {
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
        setError("No se encontro el proyecto solicitado.");
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
          status: toVisibleStatusAction(project.status),
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el proyecto."
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
  }, [projectId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId) {
      setError("No se encontro el proyecto solicitado.");
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
          : "No se pudo actualizar el proyecto."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="producer-shell">
        <article className="producer-card producer-empty">
          <p>Cargando proyecto...</p>
        </article>
      </div>
    );
  }

  return (
    <div className="producer-shell">
      <section className="producer-card producer-form-card">
        <div className="section-heading">
          <p className="producer-page__eyebrow">Editar proyecto</p>
          <h1 className="producer-page__title">Actualiza la informacion del proyecto</h1>
          <p className="producer-page__subtitle">
            Ajusta detalles operativos y manten la base lista para nuevas convocatorias.
          </p>
        </div>

        <form className="producer-form" onSubmit={handleSubmit}>
          <label className="producer-field">
            <span>Titulo</span>
            <input name="title" value={formData.title} onChange={handleChange} required />
          </label>

          <label className="producer-field producer-field--full">
            <span>Descripcion</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </label>

          <label className="producer-field">
            <span>Tipo de produccion</span>
            <input
              name="production_type"
              value={formData.production_type}
              onChange={handleChange}
              required
            />
          </label>

          <label className="producer-field">
            <span>Ubicacion</span>
            <input name="location" value={formData.location} onChange={handleChange} required />
          </label>

          <label className="producer-field">
            <span>Fecha de inicio</span>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>Fecha de termino</span>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </label>

          <label className="producer-field">
            <span>Estado</span>
            <select name="status" value={formData.status} onChange={handleChange}>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="producer-feedback producer-feedback--error">{error}</p> : null}

          <div className="producer-actions">
            <button className="producer-button" type="button" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button
              className="producer-button producer-button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
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
