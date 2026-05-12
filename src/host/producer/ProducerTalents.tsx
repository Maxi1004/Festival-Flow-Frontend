import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getMyProjects } from "../../service/projectApi";
import { createRecruitment } from "../../service/recruitmentApi";
import { getAvailableTalents } from "../../service/talentApi";
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

function ProducerTalentsContent() {
  const { t } = useTranslation();
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
              : t("producer.talents.errors.load")
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
  }, [t]);

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
                className="producer-card producer-record"
              >
                <div className="producer-record__header">
                  <div>
                    <p className="producer-record__eyebrow">{talent.email ?? t("common.noEmail")}</p>
                    <h2 className="producer-record__title">
                      {formatTalentName(talent, t("producer.talents.unnamed"))}
                    </h2>
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
                    onClick={() => openRecruitmentModal(talent)}
                  >
                    {t("producer.talents.recruit")}
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
