import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { createRecruitment } from "../../service/recruitmentApi";
import { getAvailableTalents, type AvailableTalentFilters } from "../../service/talentApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import type { Project } from "../../types/producer";
import type { AvailableTalent } from "../../types/talent";
import { formatDisplayDate } from "./utils";
import { translateStatus } from "../../utils/translateStatus";
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

const TALENT_CATEGORY_OPTIONS = [
  "Actor",
  "Actress",
  "Camera",
  "FX",
  "Stunt",
  "Maquillaje",
  "Peluquería",
  "Catering",
  "Producción",
  "Sonido",
  "Dirección",
  "Otro",
];

const initialFilters: AvailableTalentFilters = {
  search: "",
  category: "",
  location: "",
  language: "",
  availability: "AVAILABLE",
};

function formatTalentName(talent: AvailableTalent, fallback: string): string {
  return (
    talent.display_name?.trim() ||
    talent.profile?.display_name?.trim() ||
    talent.name?.trim() ||
    fallback
  );
}

function getTalentId(talent: AvailableTalent): string {
  return talent.user_uid ?? talent.user_id ?? talent.id ?? "";
}

function getTalentSpecialties(talent: AvailableTalent): string[] {
  return talent.specialties?.length
    ? talent.specialties
    : talent.profile?.specialties ?? (talent.main_specialty ? [talent.main_specialty] : []);
}

function getTalentCategory(talent: AvailableTalent): string {
  return talent.profile?.main_specialty?.trim() || getTalentSpecialties(talent)[0] || "Sin categoría";
}

function getTalentPhotoUrl(talent: AvailableTalent): string {
  return talent.picture?.trim() || talent.profile?.photo_url?.trim() || "";
}

function TalentAvatar({
  talent,
  fallback,
  large = false,
}: {
  talent: AvailableTalent;
  fallback: string;
  large?: boolean;
}) {
  const displayName = formatTalentName(talent, fallback);
  const photoUrl = getTalentPhotoUrl(talent);
  const className = `producer-talent-avatar${large ? " producer-talent-avatar--large" : ""}`;

  return photoUrl ? (
    <img className={className} src={photoUrl} alt={`Foto de perfil de ${displayName}`} />
  ) : (
    <span className={className} aria-hidden="true">
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function ProducerTalentsContent() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { token } = useCurrentProfile();
  const [talents, setTalents] = useState<AvailableTalent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<AvailableTalentFilters>(initialFilters);
  const [detailTalent, setDetailTalent] = useState<AvailableTalent | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<AvailableTalent | null>(null);
  const [formData, setFormData] = useState<RecruitmentFormState>(initialRecruitmentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const nextProjects = await reusePendingRequest(
          `producer-talents-projects:${token}`,
          () => getMyProjects(token ?? undefined)
        );

        if (!isMounted) {
          return;
        }

        setProjects(nextProjects);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
            : tRef.current("producer.talents.errors.load")
          );
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");
        const filterKey = new URLSearchParams(
          Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))
        ).toString();
        const nextTalents = await reusePendingRequest(
          `producer-talents:${token}:${filterKey}`,
          () => getAvailableTalents(filters, token ?? undefined)
        );

        if (isMounted) {
          setTalents(nextTalents);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("producer.talents.errors.load")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [filters, token]);

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const openTalentDetail = (talent: AvailableTalent) => {
    setDetailTalent(talent);
  };

  const closeTalentDetail = () => {
    setDetailTalent(null);
  };

  const handleTalentCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    talent: AvailableTalent
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTalentDetail(talent);
    }
  };

  const openRecruitmentModal = (talent: AvailableTalent) => {
    const projectId = projects[0]?.id ?? "";

    setSelectedTalent(talent);
    setDetailTalent(null);
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

      await createRecruitment(
        {
          talent_user_id: formData.talent_user_id,
          project_id: formData.project_id,
          opportunity_id: null,
          role: formData.role,
          message: formData.message.trim(),
        },
        token ?? undefined
      );
      setSuccessMessage(t("producer.talents.invitationSent"));
      closeRecruitmentModal();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("producer.talents.errors.invite")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{t("producer.talents.eyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.talents.title")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.talents.subtitle")}
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

      <section className="producer-card producer-talent-filters">
        <label className="producer-field">
          <span>Buscar por nombre</span>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Nombre del talento"
          />
        </label>
        <label className="producer-field">
          <span>Categoría o tarea</span>
          <select name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="">Todas</option>
            {TALENT_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="producer-field">
          <span>Ubicación</span>
          <input
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            placeholder="Ciudad o región"
          />
        </label>
        <label className="producer-field">
          <span>Idioma</span>
          <input
            name="language"
            value={filters.language}
            onChange={handleFilterChange}
            placeholder="Ej. Español"
          />
        </label>
        <label className="producer-field">
          <span>Disponibilidad</span>
          <select name="availability" value={filters.availability} onChange={handleFilterChange}>
            <option value="AVAILABLE">Disponible</option>
            <option value="UNAVAILABLE">No disponible</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <article className="producer-card producer-empty">
          <p>{t("producer.talents.loading")}</p>
        </article>
      ) : talents.length === 0 ? (
        <article className="producer-card producer-empty">
          <p>{t("producer.talents.empty")}</p>
        </article>
      ) : (
        <section className="producer-grid">
          {talents.map((talent) => {
            const talentId = getTalentId(talent);

            return (
              <article
                key={talentId || formatTalentName(talent, t("producer.talents.unnamed"))}
                className="producer-card producer-record producer-talent-card"
                role="button"
                tabIndex={0}
                onClick={() => openTalentDetail(talent)}
                onKeyDown={(event) => handleTalentCardKeyDown(event, talent)}
              >
                <div className="producer-record__header">
                  <div className="producer-talent-detail__identity">
                    <TalentAvatar talent={talent} fallback={t("producer.talents.unnamed")} />
                    <div>
                      <p className="producer-record__eyebrow">{talent.email ?? t("common.noEmail")}</p>
                      <h2 className="producer-record__title">
                        {formatTalentName(talent, t("producer.talents.unnamed"))}
                      </h2>
                    </div>
                  </div>
                  <span className="producer-status">
                    {translateStatus(t, talent.status)}
                  </span>
                </div>

                <div className="producer-meta-list">
                  <span>
                    {talent.work_modality
                      ? t(`options.opportunityModality.${talent.work_modality}`, {
                          defaultValue: talent.work_modality,
                        })
                      : t("producer.talents.modalityMissing")}
                  </span>
                  <span>
                    {t("producer.talents.travel", {
                      value: talent.travel_availability ? t("common.yes") : t("common.no"),
                    })}
                  </span>
                  <span>{talent.location ?? talent.work_location ?? t("producer.talents.locationMissing")}</span>
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
                     onClick={(event) => {
                       event.stopPropagation();
                       openRecruitmentModal(talent);
                     }}
                  >
                    {t("producer.talents.recruit")}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {detailTalent ? (
        <div className="producer-modal" role="dialog" aria-modal="true">
          <div className="producer-modal__panel">
            <div className="producer-record__header">
              <div className="producer-talent-detail__identity">
                <TalentAvatar talent={detailTalent} fallback="T" large />
                <div>
                  <p className="producer-record__eyebrow">Ficha de talento</p>
                  <h2 className="producer-record__title">
                    {formatTalentName(detailTalent, t("producer.talents.unnamed"))}
                  </h2>
                </div>
              </div>
              <button className="producer-button" type="button" onClick={closeTalentDetail}>
                {t("common.close")}
              </button>
            </div>

            <div className="producer-meta-list">
              <span>{getTalentCategory(detailTalent)}</span>
              <span>{detailTalent.location ?? detailTalent.work_location ?? "Ubicación no informada"}</span>
              <span>{translateStatus(t, detailTalent.status)}</span>
              <span>{formatDisplayDate(detailTalent.available_from)}</span>
            </div>

            <p className="producer-record__text">
              {detailTalent.profile?.bio?.trim() || detailTalent.notes?.trim() || "Sin resumen disponible."}
            </p>

            <div className="producer-talent-detail__section">
              <strong>Idiomas</strong>
              <div className="producer-chip-list">
                {detailTalent.profile?.languages?.length
                  ? detailTalent.profile.languages.map((language) => (
                      <span key={language} className="producer-chip">{language}</span>
                    ))
                  : <span className="producer-muted">Sin idiomas informados.</span>}
              </div>
            </div>

            <div className="producer-talent-detail__section">
              <strong>Experiencia</strong>
              <p className="producer-record__text">
                {detailTalent.profile?.experience_years !== undefined
                  ? `${detailTalent.profile.experience_years} años`
                  : "Sin experiencia informada."}
              </p>
            </div>

            <div className="producer-actions">
              <button
                className="producer-button"
                type="button"
                disabled
                title="Disponible en una fase posterior"
              >
                Ver postulaciones | Próximamente
              </button>
              <button
                className="producer-button"
                type="button"
                disabled
                title="Pendiente de integración"
              >
                Historial del postulante | Próximamente
              </button>
              <button
                className="producer-button producer-button--primary"
                type="button"
                disabled={!getTalentId(detailTalent)}
                onClick={() => openRecruitmentModal(detailTalent)}
              >
                Invitar a proyecto
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTalent ? (
        <div className="producer-modal" role="dialog" aria-modal="true">
          <div className="producer-modal__panel">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">{t("producer.talents.recruitTalent")}</p>
                <h2 className="producer-record__title">
                  {formatTalentName(selectedTalent, t("producer.talents.unnamed"))}
                </h2>
              </div>
              <button className="producer-button" type="button" onClick={closeRecruitmentModal}>
                {t("common.close")}
              </button>
            </div>

            {error ? (
              <p className="producer-feedback producer-feedback--error">{error}</p>
            ) : null}

            <form className="producer-form producer-form--single" onSubmit={handleSubmitRecruitment}>
              <label className="producer-field">
                <span>{t("producer.opportunityForm.project")}</span>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleChange}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">{t("producer.talents.noProjects")}</option>
                  ) : null}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{t("crew.assignedRole")}</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {t(`producer.talents.roles.${role}`, { defaultValue: role })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field producer-field--full">
                <span>{t("producer.talents.messageForTalent")}</span>
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
                  {t("common.cancel")}
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isSubmitting || !formData.project_id || !formData.talent_user_id}
                >
                  {isSubmitting ? t("common.sending") : t("producer.talents.sendInvitation")}
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
