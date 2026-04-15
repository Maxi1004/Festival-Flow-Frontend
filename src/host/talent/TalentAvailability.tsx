import { useEffect, useState } from "react";
import {
  getMyTalentAvailability,
  updateMyTalentAvailability,
} from "../../service/talentApi";
import type { TalentAvailabilityUpdatePayload } from "../../types/talent";
import "../../styles/talent.css";

type AvailabilityFormState = {
  status: string;
  travel_availability: string;
  work_modality: string;
  work_location: string;
  available_from: string;
  notes: string;
};

const initialFormState: AvailabilityFormState = {
  status: "",
  travel_availability: "",
  work_modality: "",
  work_location: "",
  available_from: "",
  notes: "",
};

function mapAvailabilityToFormState(
  availability: Partial<TalentAvailabilityUpdatePayload> | null
): AvailabilityFormState {
  if (!availability) {
    return initialFormState;
  }

  return {
    status: availability.status ?? "",
    travel_availability: availability.travel_availability ?? "",
    work_modality: availability.work_modality ?? "",
    work_location: availability.work_location ?? "",
    available_from: availability.available_from ?? "",
    notes: availability.notes ?? "",
  };
}

function normalizeAvailabilityPayload(
  formData: AvailabilityFormState
): TalentAvailabilityUpdatePayload {
  return {
    status: formData.status.trim(),
    travel_availability: formData.travel_availability.trim(),
    work_modality: formData.work_modality.trim(),
    work_location: formData.work_location.trim(),
    available_from: formData.available_from || null,
    notes: formData.notes.trim(),
  };
}

function TalentAvailability() {
  const [formData, setFormData] = useState<AvailabilityFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAvailability() {
      try {
        setError("");
        setSuccessMessage("");
        const nextAvailability = await getMyTalentAvailability();

        if (!isMounted) {
          return;
        }

        setFormData(mapAvailabilityToFormState(nextAvailability));
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar tu disponibilidad."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      const savedAvailability = await updateMyTalentAvailability(
        normalizeAvailabilityPayload(formData)
      );
      setFormData(mapAvailabilityToFormState(savedAvailability));
      setSuccessMessage("Disponibilidad guardada correctamente.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la disponibilidad."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Disponibilidad</p>
          <h1 className="talent-page__title">Estado profesional y disponibilidad</h1>
          <p className="talent-page__subtitle">
            Mantiene actualizados los datos reales que usan los productores para evaluar tiempos
            y modalidad de trabajo.
          </p>
        </div>

        <button
          className="talent-button talent-button--primary"
          type="submit"
          form="talent-availability-form"
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar disponibilidad"}
        </button>
      </section>

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando disponibilidad...</p>
        </section>
      ) : (
        <form id="talent-availability-form" className="talent-grid talent-grid--sidebar" onSubmit={handleSubmit}>
          <article className="talent-card">
            <div className="section-heading">
              <h2 className="section-heading__title">Resumen actual</h2>
              <p className="section-heading__text">
                Completa y guarda tu disponibilidad usando los campos reales del backend.
              </p>
            </div>

            {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
            {successMessage ? (
              <p className="talent-feedback talent-feedback--success">{successMessage}</p>
            ) : null}

            <div className="talent-form-grid">
              <label className="talent-input-group">
                <span>Estado</span>
                <input
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  placeholder="Disponible"
                />
              </label>

              <label className="talent-input-group">
                <span>Disponibilidad para viajar</span>
                <input
                  name="travel_availability"
                  value={formData.travel_availability}
                  onChange={handleChange}
                  placeholder="Disponible para viajar dentro y fuera del pais"
                />
              </label>

              <label className="talent-input-group">
                <span>Modalidad de trabajo</span>
                <input
                  name="work_modality"
                  value={formData.work_modality}
                  onChange={handleChange}
                  placeholder="Freelance, hibrido, remoto..."
                />
              </label>

              <label className="talent-input-group">
                <span>Ubicacion de trabajo</span>
                <input
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleChange}
                  placeholder="Santiago, Chile"
                />
              </label>

              <label className="talent-input-group">
                <span>Disponible desde</span>
                <input
                  type="date"
                  name="available_from"
                  value={formData.available_from}
                  onChange={handleChange}
                />
              </label>

              <label className="talent-input-group talent-input-group--full">
                <span>Notas</span>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Comparte restricciones, intereses o consideraciones logisticas."
                />
              </label>
            </div>
          </article>

          <aside className="talent-card talent-status-card">
            <span className="talent-status talent-status--available">
              {formData.status.trim() || "Sin estado definido"}
            </span>
            <h2 className="section-heading__title">Perfil listo para postular</h2>
            <p className="section-heading__text">
              Modalidad principal: {formData.work_modality.trim() || "No informada"}.
              Inicio estimado: {formData.available_from || "Sin fecha"}.
            </p>
            <p className="section-heading__text">
              Ubicacion: {formData.work_location.trim() || "No informada"}.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}

export default TalentAvailability;
