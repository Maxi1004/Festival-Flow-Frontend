import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { createRecruitment } from "../../service/recruitmentApi";
import { getAvailableTalents } from "../../service/talentApi";
import type { Project } from "../../types/producer";
import type { AvailableTalent } from "../../types/talent";
import { formatDisplayDate } from "./utils";
import "../../styles/producer.css";

type RecruitmentFormState = {
  talent_user_id: string;
  project_id: string;
  role: string;
  message: string;
};

const initialRecruitmentForm: RecruitmentFormState = {
  talent_user_id: "",
  project_id: "",
  role: "Actor principal",
  message: "",
};

const ROLE_OPTIONS = [
  "Actor principal",
  "Actor secundario",
  "Villano",
  "Camarógrafo",
  "Audición",
  "Extra",
  "Director de fotografía",
  "Sonidista",
  "Maquillaje",
  "Otro",
];

function formatTalentName(talent: AvailableTalent): string {
  return (
    talent.display_name?.trim() ||
    talent.profile?.display_name?.trim() ||
    talent.name?.trim() ||
    "Talento sin nombre"
  );
}

function getTalentId(talent: AvailableTalent): string {
  return talent.user_uid ?? talent.user_id ?? talent.id ?? "";
}

function formatTalentStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    UNAVAILABLE: "No disponible",
  };
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function formatTalentModality(value?: string | null): string {
  const labels: Record<string, string> = {
    FREELANCE: "Freelance",
    HYBRID: "Hibrido",
    ONSITE: "Presencial",
    REMOTE: "Remoto",
  };
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Modalidad no informada";
}

function getTalentSpecialties(talent: AvailableTalent): string[] {
  return talent.specialties?.length
    ? talent.specialties
    : talent.profile?.specialties ?? (talent.main_specialty ? [talent.main_specialty] : []);
}

function ProducerTalentsContent() {
  const [talents, setTalents] = useState<AvailableTalent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<AvailableTalent | null>(null);
  const [formData, setFormData] = useState<RecruitmentFormState>(initialRecruitmentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");
        const [nextTalents, nextProjects] = await Promise.all([
          getAvailableTalents(),
          getMyProjects(),
        ]);

        if (!isMounted) {
          return;
        }

        setTalents(nextTalents);
        setProjects(nextProjects);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los talentos disponibles."
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
  }, []);

  const openRecruitmentModal = (talent: AvailableTalent) => {
    const projectId = projects[0]?.id ?? "";

    setSelectedTalent(talent);
    setSuccessMessage("");
    setError("");
    setFormData({
      talent_user_id: getTalentId(talent),
      project_id: projectId,
      role: initialRecruitmentForm.role,
      message: "",
    });
  };

  const closeRecruitmentModal = () => {
    setSelectedTalent(null);
    setFormData(initialRecruitmentForm);
    setIsSubmitting(false);
  };

  const handleChange = (event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === "project_id") {
        return {
          ...current,
          project_id: value,
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleSubmitRecruitment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      await createRecruitment({
        talent_user_id: formData.talent_user_id,
        project_id: formData.project_id,
        opportunity_id: null,
        role: formData.role,
        message: formData.message.trim(),
      });
      setSuccessMessage("Invitacion enviada correctamente.");
      closeRecruitmentModal();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar la invitacion."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">Talentos</p>
          <h1 className="producer-page__title">Talentos disponibles</h1>
          <p className="producer-page__subtitle">
            Revisa disponibilidad real y recluta talento para tus proyectos o convocatorias.
          </p>
        </div>
      </section>

      {error && !selectedTalent ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}
      {successMessage ? (
        <section className="producer-card producer-feedback producer-feedback--success">
          <p>{successMessage}</p>
        </section>
      ) : null}

      {isLoading ? (
        <article className="producer-card producer-empty">
          <p>Cargando talentos disponibles...</p>
        </article>
      ) : talents.length === 0 ? (
        <article className="producer-card producer-empty">
          <p>No hay talentos disponibles por ahora.</p>
        </article>
      ) : (
        <section className="producer-grid">
          {talents.map((talent) => {
            const talentId = getTalentId(talent);

            return (
              <article
                key={talentId || formatTalentName(talent)}
                className="producer-card producer-record"
              >
                <div className="producer-record__header">
                  <div>
                    <p className="producer-record__eyebrow">{talent.email ?? "Sin correo"}</p>
                    <h2 className="producer-record__title">{formatTalentName(talent)}</h2>
                  </div>
                  <span className="producer-status">{formatTalentStatus(talent.status)}</span>
                </div>

                <div className="producer-meta-list">
                  <span>{formatTalentModality(talent.work_modality)}</span>
                  <span>{talent.travel_availability ? "Viaja: Si" : "Viaja: No"}</span>
                  <span>{talent.location ?? talent.work_location ?? "Ubicacion no informada"}</span>
                  <span>{formatDisplayDate(talent.available_from)}</span>
                </div>

                {talent.notes ? <p className="producer-record__text">{talent.notes}</p> : null}

                {getTalentSpecialties(talent).length ? (
                  <div className="producer-chip-list">
                    {getTalentSpecialties(talent).map((specialty) => (
                      <span key={specialty} className="producer-chip">
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="producer-actions producer-actions--inline">
                  <button
                    className="producer-button producer-button--primary"
                    type="button"
                    disabled={!talentId}
                    onClick={() => openRecruitmentModal(talent)}
                  >
                    Reclutar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedTalent ? (
        <div className="producer-modal" role="dialog" aria-modal="true">
          <div className="producer-modal__panel">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">Reclutar talento</p>
                <h2 className="producer-record__title">{formatTalentName(selectedTalent)}</h2>
              </div>
              <button className="producer-button" type="button" onClick={closeRecruitmentModal}>
                Cerrar
              </button>
            </div>

            {error ? (
              <p className="producer-feedback producer-feedback--error">{error}</p>
            ) : null}

            <form className="producer-form producer-form--single" onSubmit={handleSubmitRecruitment}>
              <label className="producer-field">
                <span>Proyecto</span>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleChange}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">No tienes proyectos disponibles</option>
                  ) : null}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>Rol a asignar</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field producer-field--full">
                <span>Mensaje para el talento</span>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  required
                />
              </label>

              <div className="producer-actions">
                <button className="producer-button" type="button" onClick={closeRecruitmentModal}>
                  Cancelar
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isSubmitting || !formData.project_id || !formData.talent_user_id}
                >
                  {isSubmitting ? "Enviando..." : "Enviar invitacion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProducerTalents() {
  return (
    <ProducerGuard>
      <ProducerTalentsContent />
    </ProducerGuard>
  );
}

export default ProducerTalents;
