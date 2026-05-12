import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import { getProducerCrew, updateCrewMember } from "../../service/crewApi";
import type { CrewMember, CrewMemberUpdatePayload } from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/producer.css";

type CrewProjectGroup = {
  id: string;
  title: string;
  status: string;
  date: string;
  members: CrewMember[];
};

const emptyEditForm: CrewMemberUpdatePayload = {
  role: "",
  task_description: "",
  producer_note: "",
};

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getTalentName(member: CrewMember, fallback: string): string {
  return (
    member.talent_name?.trim() ||
    member.talent?.name?.trim() ||
    member.talent?.display_name?.trim() ||
    member.talent?.profile?.display_name?.trim() ||
    member.user?.name?.trim() ||
    member.user?.display_name?.trim() ||
    fallback
  );
}

function getTalentEmail(member: CrewMember, fallback: string): string {
  return (
    member.talent_email?.trim() ||
    member.talent?.email?.trim() ||
    member.user?.email?.trim() ||
    fallback
  );
}

function getMemberRole(member: CrewMember, fallback: string): string {
  return member.role?.trim() || fallback;
}

function getProjectTitle(member: CrewMember, fallback: string): string {
  return member.project?.title?.trim() || member.project?.name?.trim() || fallback;
}

function getProjectStatus(member: CrewMember): string | null | undefined {
  return member.project?.status?.trim() || member.status?.trim();
}

function getProjectDate(member: CrewMember): string {
  return (
    member.project?.start_date ||
    member.joined_at ||
    member.accepted_at ||
    member.updated_at ||
    member.created_at ||
    ""
  );
}

function getOpportunityTitle(member: CrewMember, fallback: string): string {
  return member.opportunity?.title?.trim() || fallback;
}

function getMemberDate(member: CrewMember, locale: string, fallback: string): string {
  return formatDate(member.joined_at || member.accepted_at || member.updated_at || member.created_at, locale, fallback);
}

function getMemberNote(member: CrewMember, fallback: string): string {
  return member.producer_note?.trim() || fallback;
}

function getMemberTask(member: CrewMember, fallback: string): string {
  return member.task_description?.trim() || fallback;
}

function getProjectGroupId(member: CrewMember): string {
  return (
    member.project?.id?.trim() ||
    member.project_id?.trim() ||
    member.project?.title?.trim() ||
    member.project?.name?.trim() ||
    "proyecto-sin-id"
  );
}

function groupCrewByProject(crew: CrewMember[], fallbackProject: string): CrewProjectGroup[] {
  const groups = new Map<string, CrewProjectGroup>();

  crew.forEach((member) => {
    const projectId = getProjectGroupId(member);
    const existingGroup = groups.get(projectId);

    if (existingGroup) {
      existingGroup.members.push(member);
      return;
    }

    groups.set(projectId, {
      id: projectId,
      title: getProjectTitle(member, fallbackProject),
      status: getProjectStatus(member) ?? "",
      date: getProjectDate(member),
      members: [member],
    });
  });

  return Array.from(groups.values());
}

function ProducerCrewContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [editForm, setEditForm] = useState<CrewMemberUpdatePayload>(emptyEditForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCrew() {
      try {
        setError("");
        setIsLoading(true);
        const nextCrew = await getProducerCrew();

        if (isMounted) {
          setCrew(nextCrew);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("crew.empty")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCrew();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const projectGroups = useMemo(() => groupCrewByProject(crew, t("crew.projectMissing")), [crew, t]);
  const selectedProject = useMemo(
    () =>
      projectGroups.find((group) => group.id === selectedProjectId) ??
      projectGroups[0] ??
      null,
    [projectGroups, selectedProjectId]
  );

  const acceptedCount = useMemo(
    () =>
      crew.filter((member) =>
        ["ACCEPTED", "ACTIVE", "HIRED", "RECRUITED"].includes(
          member.status?.trim().toUpperCase() ?? ""
        )
      ).length,
    [crew]
  );

  const openEditModal = (member: CrewMember) => {
    setEditingMember(member);
    setModalError("");
    setSuccessMessage("");
    setEditForm({
      role: member.role?.trim() || "",
      task_description: member.task_description?.trim() || "",
      producer_note: member.producer_note?.trim() || "",
    });
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setModalError("");
    setIsSaving(false);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingMember?.id) {
      setModalError(t("crew.errors.updateMember"));
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      const updatedMember = await updateCrewMember(editingMember.id, editForm);

      setCrew((current) =>
        current.map((member) =>
          member.id === editingMember.id
            ? { ...member, ...updatedMember, id: editingMember.id, ...editForm }
            : member
        )
      );
      setSuccessMessage(t("crew.memberUpdated"));
      closeEditModal();
    } catch {
      setModalError(t("crew.errors.updateMember"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">{t("crew.eyebrow")}</p>
          <h1 className="producer-page__title">{t("crew.producerTitle")}</h1>
          <p className="producer-page__subtitle">
            {t("crew.producerSubtitle")}
          </p>
        </div>
      </section>

      <section className="producer-metrics">
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : projectGroups.length}</span>
          <p className="producer-metric__label">{t("crew.projectsWithCrew")}</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : acceptedCount}</span>
          <p className="producer-metric__label">{t("crew.acceptedMembers")}</p>
        </article>
      </section>

      {error ? (
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
          <p>{t("crew.loading")}</p>
        </article>
      ) : crew.length === 0 ? (
        <article className="producer-card producer-empty">
          <p>{t("crew.empty")}</p>
        </article>
      ) : (
        <section className="producer-crew-layout">
          <div className="producer-crew-projects" aria-label={t("crew.projectsWithCrew")}>
            {projectGroups.map((group) => (
              <button
                key={group.id}
                className={`producer-crew-project ${
                  selectedProject?.id === group.id ? "producer-crew-project--active" : ""
                }`}
                type="button"
                onClick={() => setSelectedProjectId(group.id)}
              >
                <span>
                  <strong>{group.title}</strong>
                  <small>{formatDate(group.date, i18n.language, t("common.noDate"))}</small>
                </span>
                <span className="producer-status">{translateStatus(t, group.status)}</span>
                <span className="producer-crew-project__count">
                  {t("crew.memberCount", { count: group.members.length })}
                </span>
              </button>
            ))}
          </div>

          <section className="producer-card producer-crew-detail">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">{t("crew.selectedTeam")}</p>
                <h2 className="producer-record__title">
                  {selectedProject?.title ?? t("crew.projectMissing")}
                </h2>
              </div>
              {selectedProject ? (
                <span className="producer-status">
                  {t("crew.memberCount", { count: selectedProject.members.length })}
                </span>
              ) : null}
            </div>

            <div className="producer-list">
              {selectedProject?.members.map((member, index) => (
                <article
                  key={member.id ?? member.application_id ?? member.recruitment_id ?? index}
                  className="producer-list-card"
                >
                  <div className="producer-record__header">
                    <div>
                      <p className="producer-list-card__meta">{getTalentEmail(member, t("common.noEmail"))}</p>
                      <h3 className="producer-list-card__title">
                        {getTalentName(member, t("producer.talents.unnamed"))}
                      </h3>
                    </div>
                    <span className="producer-status">{translateStatus(t, member.status)}</span>
                  </div>

                  <div className="producer-meta-list">
                    <span>{t("crew.opportunityLabel", { value: getOpportunityTitle(member, t("crew.opportunityMissing")) })}</span>
                    <span>{t("crew.assignedRoleLabel", { value: getMemberRole(member, t("crew.roleMissing")) })}</span>
                    <span>{t("crew.joinedAt", { value: getMemberDate(member, i18n.language, t("common.noDate")) })}</span>
                  </div>

                  <p className="producer-list-card__text">{t("crew.taskLabel", { value: getMemberTask(member, t("crew.taskMissing")) })}</p>
                  <p className="producer-list-card__text">{t("crew.noteLabel", { value: getMemberNote(member, t("crew.noteMissing")) })}</p>

                  <div className="producer-actions producer-actions--inline">
                    <button
                      className="producer-button producer-button--primary"
                      type="button"
                      disabled={!member.id}
                      onClick={() => openEditModal(member)}
                    >
                      {t("crew.editMember")}
                    </button>
                    <button
                      className="producer-button"
                      type="button"
                      disabled={!member.id}
                      onClick={() => member.id && navigate(`/producer/messages?crewId=${encodeURIComponent(member.id)}`)}
                    >
                      {t("messages.viewMessages")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {editingMember ? (
        <div className="producer-modal" role="dialog" aria-modal="true">
          <div className="producer-modal__panel">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">{t("crew.editMember")}</p>
                <h2 className="producer-record__title">
                  {getTalentName(editingMember, t("producer.talents.unnamed"))}
                </h2>
              </div>
              <button className="producer-button" type="button" onClick={closeEditModal}>
                {t("common.close")}
              </button>
            </div>

            {modalError ? (
              <p className="producer-feedback producer-feedback--error">{modalError}</p>
            ) : null}

            <form className="producer-form producer-form--single" onSubmit={handleSubmitEdit}>
              <label className="producer-field">
                <span>{t("crew.assignedRole")}</span>
                <input
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  placeholder={t("producer.talents.roles.Actor secundario")}
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>{t("crew.taskDescription")}</span>
                <textarea
                  name="task_description"
                  value={editForm.task_description}
                  onChange={handleEditChange}
                  rows={4}
                  placeholder={t("crew.taskPlaceholder")}
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>{t("crew.internalNote")}</span>
                <textarea
                  name="producer_note"
                  value={editForm.producer_note}
                  onChange={handleEditChange}
                  rows={4}
                  placeholder={t("crew.notePlaceholder")}
                />
              </label>

              <div className="producer-actions">
                <button className="producer-button" type="button" onClick={closeEditModal}>
                  {t("common.cancel")}
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? t("common.saving") : t("common.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function ProducerCrew() {
  return (
    <ProducerGuard>
      <ProducerCrewContent />
    </ProducerGuard>
  );
}

export default ProducerCrew;
