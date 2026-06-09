import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import TalentProfileModal from "../../components/TalentProfileModal";
import TalentAvatar from "../../components/TalentAvatar";
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
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import {
  getTalentIdentityEmail,
  getTalentIdentityName,
  getTalentIdentityPhoto,
  resolveTalentUserId,
  talentFallbackFromAvailableTalent,
} from "../../utils/talentProfile";
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

const producerTalentsBaseTexts = [
  "Talentos disponibles",
  "Cargando registros...",
  "talentos encontrados",
  "Buscar por nombre/email",
  "Nombre o email",
  "Categoria o especialidad",
  "Todas",
  "Ubicacion",
  "Ciudad o region",
  "Idioma",
  "Ej. Espanol",
  "Disponibilidad",
  "Disponible",
  "No disponible",
  "No hay talentos disponibles para reclutar en este momento.",
  "Talento",
  "Email",
  "Especialidad principal",
  "Categorias / habilidades",
  "Modalidad",
  "Disponible desde",
  "Estado",
  "Acciones",
  "No informadas",
  "Ver perfil",
  "Reclutar",
  "Ficha de talento",
  "Ubicacion no informada",
  "Sin bio disponible.",
  "Anos de experiencia",
  "anos",
  "No informado",
  "No informada",
  "Habilidades",
  "Sin habilidades informadas.",
  "Idiomas",
  "Sin idiomas informados.",
  "Portafolio",
  "Sin portafolio informado.",
  "Convocatoria",
  "Sin convocatoria especifica",
  "Talentos",
  "Filtra disponibilidad real, revisa perfiles y envia invitaciones sin salir del modulo.",
  "Remota",
  "Presencial",
  "Híbrida",
  "Flexible",
  "Modalidad no informada",
];

function formatTalentName(talent: AvailableTalent, fallback: string): string {
  return getTalentIdentityName(talent, fallback);
}

function getTalentEmail(talent: AvailableTalent, fallback: string): string {
  return getTalentIdentityEmail(talent, fallback);
}

function getTalentId(talent: AvailableTalent): string {
  return resolveTalentUserId(talent);
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

function formatAvailableTalentModality(talent: AvailableTalent): string {
  return talent.work_modality
    ? ({
        REMOTE: "Remota",
        ONSITE: "Presencial",
        HYBRID: "Hibrida",
        FLEXIBLE: "Flexible",
      }[talent.work_modality.trim().toUpperCase()] ?? talent.work_modality)
    : "Modalidad no informada";
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
  return getTalentIdentityPhoto(talent);
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
  const language = useFestivalFlowLanguage();
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
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        producerTalentsBaseTexts,
        talents.flatMap((talent) => [
          getTalentCategory(talent),
          getTalentLocation(talent, "Ubicacion no informada"),
          formatAvailableTalentModality(talent),
          translateStatus(t, talent.status),
          talent.profile?.bio,
          talent.notes,
          ...getTalentSkills(talent),
          ...getTalentLanguages(talent),
          ...getPortfolioLinks(talent).map((link) => link.label),
        ]),
        projects.flatMap((project) => [project.title, project.description, project.location, project.production_type, project.status]),
        opportunities.flatMap((opportunity) => [
          opportunity.title,
          opportunity.description,
          opportunity.role_needed,
          opportunity.specialty,
          opportunity.location,
          opportunity.status,
        ])
      ),
    [opportunities, projects, t, talents]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

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
      ? ({
          REMOTE: "Remota",
          ONSITE: "Presencial",
          HYBRID: "Híbrida",
          FLEXIBLE: "Flexible",
        }[talent.work_modality.trim().toUpperCase()] ?? talent.work_modality)
      : "Modalidad no informada";

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{tAuto("Talentos")}</p>
          <h1 className="producer-page__title">{tAuto("Talentos disponibles")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Filtra disponibilidad real, revisa perfiles y envia invitaciones sin salir del modulo.")}
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
            <h2>{tAuto("Talentos disponibles")}</h2>
            <span>
              {isLoading
                ? tAuto("Cargando registros...")
                : `${talents.length} ${tAuto("talentos encontrados")}`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters producer-talent-filters">
          <label className="producer-field">
            <span>{tAuto("Buscar por nombre/email")}</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder={tAuto("Nombre o email")}
            />
          </label>
          <label className="producer-field">
            <span>{tAuto("Categoria o especialidad")}</span>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">{tAuto("Todas")}</option>
              {TALENT_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>{tAuto(category)}</option>
              ))}
            </select>
          </label>
          <label className="producer-field">
            <span>{tAuto("Ubicacion")}</span>
            <input
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder={tAuto("Ciudad o region")}
            />
          </label>
          <label className="producer-field">
            <span>{tAuto("Idioma")}</span>
            <input
              name="language"
              value={filters.language}
              onChange={handleFilterChange}
              placeholder={tAuto("Ej. Espanol")}
            />
          </label>
          <label className="producer-field">
            <span>{tAuto("Disponibilidad")}</span>
            <select name="availability" value={filters.availability} onChange={handleFilterChange}>
              <option value="AVAILABLE">{tAuto("Disponible")}</option>
              <option value="UNAVAILABLE">{tAuto("No disponible")}</option>
              <option value="ALL">{tAuto("Todas")}</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <TalentTableSkeleton />
        ) : talents.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <p>{tAuto("No hay talentos disponibles para reclutar en este momento.")}</p>
          </article>
        ) : (
          <div className="producer-project-table-wrap producer-talent-table-wrap">
            <table className="producer-project-table producer-talent-table">
              <thead>
                <tr>
                  <th>{tAuto("Talento")}</th>
                  <th>{tAuto("Email")}</th>
                  <th>{tAuto("Especialidad principal")}</th>
                  <th>{tAuto("Categorias / habilidades")}</th>
                  <th>{tAuto("Ubicacion")}</th>
                  <th>{tAuto("Modalidad")}</th>
                  <th>{tAuto("Disponible desde")}</th>
                  <th>{tAuto("Estado")}</th>
                  <th>{tAuto("Acciones")}</th>
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
                        <button
                          className="producer-profile-trigger producer-talent-table__identity"
                          type="button"
                          disabled={!talentId}
                          title={talentId ? tAuto("Ver perfil") : "No se pudo identificar el user_id del talento."}
                          onClick={() => setDetailTalent(talent)}
                        >
                          <TalentAvatar
                            src={getTalentPhotoUrl(talent)}
                            name={talentName}
                            size="md"
                          />
                          <div className="producer-project-table__title">
                            <strong>{talentName}</strong>
                            <span>{tAuto(getTalentCategory(talent))}</span>
                          </div>
                        </button>
                      </td>
                      <td>{getTalentEmail(talent, t("common.noEmail"))}</td>
                      <td>{tAuto(getTalentCategory(talent))}</td>
                      <td>
                        {skills.length ? (
                          <div className="producer-chip-list producer-chip-list--compact">
                            {skills.slice(0, 3).map((skill) => (
                              <span key={skill} className="producer-chip">{tAuto(skill)}</span>
                            ))}
                            {skills.length > 3 ? <span className="producer-muted">+{skills.length - 3}</span> : null}
                          </div>
                        ) : (
                          <span className="producer-muted">{tAuto("No informadas")}</span>
                        )}
                      </td>
                      <td>{tAuto(getTalentLocation(talent, tAuto("Ubicacion no informada")))}</td>
                      <td>{tAuto(formatTalentModality(talent))}</td>
                      <td>{formatDisplayDate(talent.available_from)}</td>
                      <td>
                        <span className={`producer-status producer-status--${getTalentStatusClass(talent.status)}`}>
                          {tAuto(translateStatus(t, talent.status))}
                        </span>
                      </td>
                      <td>
                        <div className="producer-table-actions producer-talent-table__actions">
                          <button
                            className="producer-button"
                            type="button"
                            disabled={!talentId}
                            title={talentId ? undefined : "No se pudo identificar el user_id del talento."}
                            onClick={() => setDetailTalent(talent)}
                          >
                            {talentId ? tAuto("Ver perfil") : "Ficha no disponible: falta user_id"}
                          </button>
                          <button
                            className="producer-button producer-button--primary"
                            type="button"
                            disabled={!talentId}
                            onClick={() => void openRecruitmentModal(talent)}
                          >
                            {tAuto("Reclutar")}
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
        <TalentProfileModal
          userId={getTalentId(detailTalent)}
          fallback={talentFallbackFromAvailableTalent(detailTalent)}
          token={token ?? undefined}
          onClose={() => setDetailTalent(null)}
        />
      ) : null}

      {selectedTalent ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div className="producer-talent-detail__identity">
                <TalentAvatar
                  src={getTalentPhotoUrl(selectedTalent)}
                  name={formatTalentName(selectedTalent, t("producer.talents.unnamed"))}
                  size="md"
                />
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
                      {tAuto(project.title)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{tAuto("Convocatoria")}</span>
                <select
                  name="opportunity_id"
                  value={formData.opportunity_id}
                  onChange={handleChange}
                >
                  <option value="">{tAuto("Sin convocatoria especifica")}</option>
                  {filteredOpportunities.map((opportunity) => (
                    <option key={opportunity.id} value={opportunity.id}>
                      {tAuto(opportunity.title || opportunity.role_needed)}
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
                      {tAuto(t(`producer.talents.roles.${role}`, { defaultValue: role }))}
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
