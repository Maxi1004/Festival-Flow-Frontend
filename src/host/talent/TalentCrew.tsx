import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTalentCrew } from "../../service/crewApi";
import type { CrewMember } from "../../types/talent";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/talent.css";

type CrewProjectGroup = {
  id: string;
  title: string;
  status: string;
  date: string;
  members: CrewMember[];
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

function getRole(member: CrewMember, fallback: string): string {
  return member.role?.trim() || fallback;
}

function getProducer(member: CrewMember, fallback: string): string {
  return (
    member.producer_name?.trim() ||
    member.producer?.name?.trim() ||
    member.producer?.display_name?.trim() ||
    member.producer_email?.trim() ||
    fallback
  );
}

function getMemberDate(member: CrewMember, locale: string, fallback: string): string {
  return formatDate(member.joined_at || member.accepted_at || member.updated_at || member.created_at, locale, fallback);
}

function getProducerMessage(member: CrewMember, fallback: string): string {
  return member.producer_note?.trim() || fallback;
}

function getTaskDescription(member: CrewMember, fallback: string): string {
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

function TalentCrew() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCrew() {
      try {
        setError("");
        setIsLoading(true);
        const nextCrew = await getTalentCrew();

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

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("crew.myTeam")}</p>
          <h1 className="talent-page__title">{t("crew.talentTitle")}</h1>
          <p className="talent-page__subtitle">
            {t("crew.talentSubtitle")}
          </p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("crew.loading")}</p>
        </section>
      ) : crew.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("crew.empty")}</p>
        </section>
      ) : (
        <section className="talent-crew-layout">
          <div className="talent-crew-projects" aria-label={t("crew.talentTitle")}>
            {projectGroups.map((group) => (
              <button
                key={group.id}
                className={`talent-crew-project ${
                  selectedProject?.id === group.id ? "talent-crew-project--active" : ""
                }`}
                type="button"
                onClick={() => setSelectedProjectId(group.id)}
              >
                <span>
                  <strong>{group.title}</strong>
                  <small>{formatDate(group.date, i18n.language, t("common.noDate"))}</small>
                </span>
                <span className="talent-badge">{translateStatus(t, group.status)}</span>
                <span className="talent-crew-project__count">
                  {t("crew.participationCount", { count: group.members.length })}
                </span>
              </button>
            ))}
          </div>

          <section className="talent-card talent-crew-detail">
            <div className="talent-application-card__top">
              <div>
                <p className="talent-page__eyebrow">{t("crew.selectedProject")}</p>
                <h2 className="talent-list__title">
                  {selectedProject?.title ?? t("crew.projectMissing")}
                </h2>
              </div>
              {selectedProject ? (
                <span className="talent-badge">
                  {t("crew.recordCount", { count: selectedProject.members.length })}
                </span>
              ) : null}
            </div>

            <div className="talent-list">
              {selectedProject?.members.map((member, index) => (
                <article
                  key={member.id ?? member.application_id ?? member.recruitment_id ?? index}
                  className="talent-application-card"
                >
                  <div className="talent-application-card__top">
                    <div>
                      <h3 className="talent-list__title">{getRole(member, t("crew.roleMissing"))}</h3>
                      <p className="talent-list__meta">
                        {t("crew.opportunityLabel", { value: getOpportunityTitle(member, t("crew.opportunityMissing")) })} |{" "}
                        {getProducer(member, t("crew.producerMissing"))}
                      </p>
                    </div>
                    <span className="talent-badge">{translateStatus(t, member.status)}</span>
                  </div>

                  <p className="talent-list__text">
                    {t("crew.assignedRoleLabel", { value: getRole(member, t("crew.roleMissing")) })}
                  </p>
                  <p className="talent-list__text">
                    {t("crew.taskLabel", { value: getTaskDescription(member, t("crew.taskMissing")) })}
                  </p>
                  <p className="talent-list__text">
                    {t("crew.producerMessageLabel", {
                      value: getProducerMessage(member, t("crew.noteMissing")),
                    })}
                  </p>
                  <p className="talent-list__text">
                    {t("crew.joinedAt", { value: getMemberDate(member, i18n.language, t("common.noDate")) })}
                  </p>

                  <div className="talent-actions talent-actions--inline">
                    <button
                      className="talent-button talent-button--primary"
                      type="button"
                      disabled={!member.id}
                      onClick={() => member.id && navigate(`/talent/messages?crewId=${encodeURIComponent(member.id)}`)}
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

    </div>
  );
}

export default TalentCrew;
