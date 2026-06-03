import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyOpportunitiesCrm } from "../../service/opportunityApi";
import { getMyProjects } from "../../service/projectApi";
import { createRecruitment } from "../../service/recruitmentApi";
import { getAvailableTalentsCrm, type AvailableTalentFilters } from "../../service/talentApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import type { Opportunity, Project } from "../../types/producer";
import type { AvailableTalent } from "../../types/talent";
import { formatDisplayDate } from "./utils";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/producer.css";

type RecruitmentFormState = {
  talent_user_id: string;
  project_id: string;
  opportunity_id: string;
  role: string;
  message: string;
};

const initialRecruitmentForm: RecruitmentFormState = {
  talent_user_id: "",
  project_id: "",
  opportunity_id: "",
  role: "Actor principal",
  message: "",
};

const ROLE_OPTIONS = [
  "Actor principal",
  "Actor secundario",
  "Villano",
  "Camarografo",
  "Audicion",
  "Extra",
  "Director de fotografia",
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
  "Peluqueria",
  "Catering",
  "Produccion",
  "Sonido",
  "Direccion",
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

function getTalentEmail(talent: AvailableTalent, fallback: string): string {
  return talent.email?.trim() || fallback;
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
  return (
    talent.profile?.main_specialty?.trim() ||
    talent.main_specialty?.trim() ||
    getTalentSpecialties(talent)[0] ||
    "Sin categoria"
  );
}

function getTalentSkills(talent: AvailableTalent): string[] {
  const uniqueValues = new Set(
    [...(talent.profile?.skills ?? []), ...getTalentSpecialties(talent)]
      .map((item) => item.trim())
      .filter(Boolean)
  );

  return Array.from(uniqueValues);
}

function getTalentLanguages(talent: AvailableTalent): string[] {
  return talent.profile?.languages?.map((language) => language.trim()).filter(Boolean) ?? [];
}

function getTalentPhotoUrl(talent: AvailableTalent): string {
  const nestedUser = talent as AvailableTalent & {
    user?: { photoURL?: string | null } | null;
  };

  return (
    talent.profile?.photo_url?.trim() ||
    talent.picture?.trim() ||
    talent.avatar_url?.trim() ||
    nestedUser.user?.photoURL?.trim() ||
    talent.photo_url?.trim() ||
    ""
  );
}

function getTalentLocation(talent: AvailableTalent, fallback: string): string {
  return talent.location?.trim() || talent.work_location?.trim() || talent.profile?.location?.trim() || fallback;
}

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function getTalentStatusClass(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);

  if (normalizedValue === "AVAILABLE") {
    return "available";
  }

  if (normalizedValue === "UNAVAILABLE") {
    return "unavailable";
  }

  return normalizedValue.toLowerCase() || "default";
}

function getPortfolioLinks(talent: AvailableTalent): Array<{ label: string; url: string }> {
  return (talent.profile?.portfolio_links ?? [])
    .map((link, index) => {
      if (typeof link === "string") {
        return { label: `Portafolio ${index + 1}`, url: link };
      }

      return {
        label: link.label?.trim() || `Portafolio ${index + 1}`,
        url: link.url,
      };
    })
    .filter((link) => link.url?.trim());
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

function TalentTableSkeleton() {
  return (
    <div className="producer-project-table-wrap producer-talent-table-wrap">
      <div className="producer-project-table-skeleton producer-dashboard-skeleton">
        {[0, 1, 2, 3, 4].map((item) => (
          <article key={item}>
            <span></span>
            <strong></strong>
            <small></small>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProducerTalentsContent() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { token } = useCurrentProfile();
  const [talents, setTalents] = useState<AvailableTalent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
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
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");
        const filterKey = new URLSearchParams(
          Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))
        ).toString();
        const nextTalents = await reusePendingRequest(
          `producer-talents-crm:${token}:${filterKey}`,
          () => getAvailableTalentsCrm(filters, token ?? undefined)
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

  const filteredOpportunities = useMemo(
    () => opportunities.filter((opportunity) => opportunity.project_id === formData.project_id),
    [formData.project_id, opportunities]
  );

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const ensureRecruitmentOptionsLoaded = async (): Promise<Project[]> => {
    if (projects.length > 0 || opportunities.length > 0) {
      return projects;
    }

    const [nextProjects, nextOpportunities] = await reusePendingRequest(
      `producer-talents-recruitment-options:${token}`,
      () => Promise.all([
        getMyProjects(token ?? undefined),
        getMyOpportunitiesCrm(token ?? undefined),
      ])
    );

    setProjects(nextProjects);
    setOpportunities(nextOpportunities);

    return nextProjects;
  };

  const openRecruitmentModal = async (talent: AvailableTalent) => {
    let availableProjects = projects;

    try {
      setError("");
      availableProjects = await ensureRecruitmentOptionsLoaded();
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("producer.talents.errors.load")
      );
    }

    const projectId = availableProjects[0]?.id ?? "";

    setSelectedTalent(talent);
    setDetailTalent(null);
    setSuccessMessage("");
    setError("");
    setFormData({
      talent_user_id: getTalentId(talent),
      project_id: projectId,
      opportunity_id: "",
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
          opportunity_id: "",
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
          opportunity_id: formData.opportunity_id || null,
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

  const formatTalentModality = (talent: AvailableTalent): string =>
    talent.work_modality
      ? t(`options.opportunityModality.${talent.work_modality}`, {
          defaultValue: talent.work_modality,
        })
      : t("producer.talents.modalityMissing");

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{t("producer.talents.eyebrow")}</p>
          <h1 className="producer-page__title">{t("producer.talents.title")}</h1>
          <p className="producer-page__subtitle">
            {t("producer.talents.subtitle", {
              defaultValue: "Filtra disponibilidad real, revisa perfiles y envia invitaciones sin salir del modulo.",
            })}
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

      <section className="producer-card producer-project-crm producer-talent-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>Talentos disponibles</h2>
            <span>
              {isLoading ? "Cargando registros..." : `${talents.length} talentos encontrados`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters producer-talent-filters">
          <label className="producer-field">
            <span>Buscar por nombre/email</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Nombre o email"
            />
          </label>
          <label className="producer-field">
            <span>Categoria o especialidad</span>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">Todas</option>
              {TALENT_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="producer-field">
            <span>Ubicacion</span>
            <input
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Ciudad o region"
            />
          </label>
          <label className="producer-field">
            <span>Idioma</span>
            <input
              name="language"
              value={filters.language}
              onChange={handleFilterChange}
              placeholder="Ej. Espanol"
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
        </div>

        {isLoading ? (
          <TalentTableSkeleton />
        ) : talents.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <p>No hay talentos disponibles para reclutar en este momento.</p>
          </article>
        ) : (
          <div className="producer-project-table-wrap producer-talent-table-wrap">
            <table className="producer-project-table producer-talent-table">
              <thead>
                <tr>
                  <th>Talento</th>
                  <th>Email</th>
                  <th>Especialidad principal</th>
                  <th>Categorias / habilidades</th>
                  <th>Ubicacion</th>
                  <th>Modalidad</th>
                  <th>Disponible desde</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {talents.map((talent) => {
                  const talentId = getTalentId(talent);
                  const talentName = formatTalentName(talent, t("producer.talents.unnamed"));
                  const skills = getTalentSkills(talent);

                  return (
                    <tr key={talentId || talentName}>
                      <td>
                        <div className="producer-talent-table__identity">
                          <TalentAvatar talent={talent} fallback={t("producer.talents.unnamed")} />
                          <div className="producer-project-table__title">
                            <strong>{talentName}</strong>
                            <span>{getTalentCategory(talent)}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getTalentEmail(talent, t("common.noEmail"))}</td>
                      <td>{getTalentCategory(talent)}</td>
                      <td>
                        {skills.length ? (
                          <div className="producer-chip-list producer-chip-list--compact">
                            {skills.slice(0, 3).map((skill) => (
                              <span key={skill} className="producer-chip">{skill}</span>
                            ))}
                            {skills.length > 3 ? <span className="producer-muted">+{skills.length - 3}</span> : null}
                          </div>
                        ) : (
                          <span className="producer-muted">No informadas</span>
                        )}
                      </td>
                      <td>{getTalentLocation(talent, t("producer.talents.locationMissing"))}</td>
                      <td>{formatTalentModality(talent)}</td>
                      <td>{formatDisplayDate(talent.available_from)}</td>
                      <td>
                        <span className={`producer-status producer-status--${getTalentStatusClass(talent.status)}`}>
                          {translateStatus(t, talent.status)}
                        </span>
                      </td>
                      <td>
                        <div className="producer-table-actions producer-talent-table__actions">
                          <button className="producer-button" type="button" onClick={() => setDetailTalent(talent)}>
                            Ver perfil
                          </button>
                          <button
                            className="producer-button producer-button--primary"
                            type="button"
                            disabled={!talentId}
                            onClick={() => void openRecruitmentModal(talent)}
                          >
                            Reclutar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailTalent ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal producer-talent-profile-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div className="producer-talent-detail__identity">
                <TalentAvatar talent={detailTalent} fallback={t("producer.talents.unnamed")} large />
                <div>
                  <p className="producer-record__eyebrow">Ficha de talento</p>
                  <h2 className="producer-record__title">
                    {formatTalentName(detailTalent, t("producer.talents.unnamed"))}
                  </h2>
                  <p className="producer-record__eyebrow">{getTalentEmail(detailTalent, t("common.noEmail"))}</p>
                </div>
              </div>
              <button className="producer-button" type="button" onClick={() => setDetailTalent(null)}>
                {t("common.close")}
              </button>
            </div>

            <div className="producer-meta-list">
              <span>{getTalentCategory(detailTalent)}</span>
              <span>{getTalentLocation(detailTalent, "Ubicacion no informada")}</span>
              <span>{formatTalentModality(detailTalent)}</span>
              <span>{translateStatus(t, detailTalent.status)}</span>
              <span>{formatDisplayDate(detailTalent.available_from)}</span>
            </div>

            <p className="producer-record__text">
              {detailTalent.profile?.bio?.trim() || detailTalent.notes?.trim() || "Sin bio disponible."}
            </p>

            <div className="producer-project-detail-grid">
              <div>
                <span>Especialidad principal</span>
                <strong>{getTalentCategory(detailTalent)}</strong>
              </div>
              <div>
                <span>Anos de experiencia</span>
                <strong>
                  {detailTalent.profile?.experience_years !== undefined
                    ? `${detailTalent.profile.experience_years} anos`
                    : "No informado"}
                </strong>
              </div>
              <div>
                <span>Ubicacion</span>
                <strong>{getTalentLocation(detailTalent, "No informada")}</strong>
              </div>
              <div>
                <span>Modalidad</span>
                <strong>{formatTalentModality(detailTalent)}</strong>
              </div>
              <div>
                <span>Disponibilidad</span>
                <strong>{formatDisplayDate(detailTalent.available_from)}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{translateStatus(t, detailTalent.status)}</strong>
              </div>
            </div>

            <div className="producer-talent-detail__section">
              <strong>Habilidades</strong>
              <div className="producer-chip-list">
                {getTalentSkills(detailTalent).length ? (
                  getTalentSkills(detailTalent).map((skill) => (
                    <span key={skill} className="producer-chip">{skill}</span>
                  ))
                ) : (
                  <span className="producer-muted">Sin habilidades informadas.</span>
                )}
              </div>
            </div>

            <div className="producer-talent-detail__section">
              <strong>Idiomas</strong>
              <div className="producer-chip-list">
                {getTalentLanguages(detailTalent).length ? (
                  getTalentLanguages(detailTalent).map((language) => (
                    <span key={language} className="producer-chip">{language}</span>
                  ))
                ) : (
                  <span className="producer-muted">Sin idiomas informados.</span>
                )}
              </div>
            </div>

            <div className="producer-talent-detail__section">
              <strong>Portafolio</strong>
              {getPortfolioLinks(detailTalent).length || detailTalent.profile?.portfolio_pdf_url ? (
                <div className="producer-talent-portfolio">
                  {getPortfolioLinks(detailTalent).map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                  {detailTalent.profile?.portfolio_pdf_url ? (
                    <a href={detailTalent.profile.portfolio_pdf_url} target="_blank" rel="noreferrer">
                      Portfolio PDF
                    </a>
                  ) : null}
                </div>
              ) : (
                <span className="producer-muted">Sin portafolio informado.</span>
              )}
            </div>

            <div className="producer-actions">
              <button
                className="producer-button producer-button--primary"
                type="button"
                disabled={!getTalentId(detailTalent)}
                onClick={() => void openRecruitmentModal(detailTalent)}
              >
                Reclutar
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {selectedTalent ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div className="producer-talent-detail__identity">
                <TalentAvatar talent={selectedTalent} fallback={t("producer.talents.unnamed")} />
                <div>
                  <p className="producer-record__eyebrow">{t("producer.talents.recruitTalent")}</p>
                  <h2 className="producer-record__title">
                    {formatTalentName(selectedTalent, t("producer.talents.unnamed"))}
                  </h2>
                  <p className="producer-record__eyebrow">{getTalentEmail(selectedTalent, t("common.noEmail"))}</p>
                </div>
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
                <span>Convocatoria</span>
                <select
                  name="opportunity_id"
                  value={formData.opportunity_id}
                  onChange={handleChange}
                >
                  <option value="">Sin convocatoria especifica</option>
                  {filteredOpportunities.map((opportunity) => (
                    <option key={opportunity.id} value={opportunity.id}>
                      {opportunity.title || opportunity.role_needed}
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
          </article>
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
