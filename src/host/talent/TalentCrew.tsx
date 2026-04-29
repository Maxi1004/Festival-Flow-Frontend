import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTalentCrew } from "../../service/crewApi";
import type { CrewMember } from "../../types/talent";
import "../../styles/talent.css";

type CrewProjectGroup = {
  id: string;
  title: string;
  status: string;
  date: string;
  members: CrewMember[];
};

function formatStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptada",
    ACTIVE: "Activa",
    HIRED: "Reclutada",
    RECRUITED: "Reclutada",
  };
  const normalizedValue = value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getProjectTitle(member: CrewMember): string {
  return member.project?.title?.trim() || member.project?.name?.trim() || "Proyecto no informado";
}

function getProjectStatus(member: CrewMember): string {
  return member.project?.status?.trim() || member.status?.trim() || "Sin estado";
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

function getOpportunityTitle(member: CrewMember): string {
  return member.opportunity?.title?.trim() || "Convocatoria no informada";
}

function getRole(member: CrewMember): string {
  return member.role?.trim() || "Rol no asignado";
}

function getProducer(member: CrewMember): string {
  return (
    member.producer_name?.trim() ||
    member.producer?.name?.trim() ||
    member.producer?.display_name?.trim() ||
    member.producer_email?.trim() ||
    "Productor no informado"
  );
}

function getMemberDate(member: CrewMember): string {
  return formatDate(member.joined_at || member.accepted_at || member.updated_at || member.created_at);
}

function getProducerMessage(member: CrewMember): string {
  return member.producer_note?.trim() || "Sin nota o instruccion";
}

function getTaskDescription(member: CrewMember): string {
  return member.task_description?.trim() || "Sin tarea asignada";
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

function groupCrewByProject(crew: CrewMember[]): CrewProjectGroup[] {
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
      title: getProjectTitle(member),
      status: getProjectStatus(member),
      date: getProjectDate(member),
      members: [member],
    });
  });

  return Array.from(groups.values());
}

function TalentCrew() {
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
              : "No hay datos de equipo disponibles todavia."
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
  }, []);

  const projectGroups = useMemo(() => groupCrewByProject(crew), [crew]);
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
          <p className="talent-page__eyebrow">Mi equipo</p>
          <h1 className="talent-page__title">Proyectos donde participas</h1>
          <p className="talent-page__subtitle">
            Selecciona un proyecto para ver tu rol, tareas, mensajes y convocatoria asociada.
          </p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando equipo...</p>
        </section>
      ) : crew.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">No hay datos de equipo disponibles todavia.</p>
        </section>
      ) : (
        <section className="talent-crew-layout">
          <div className="talent-crew-projects" aria-label="Proyectos donde participas">
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
                  <small>{formatDate(group.date)}</small>
                </span>
                <span className="talent-badge">{formatStatus(group.status)}</span>
                <span className="talent-crew-project__count">
                  {group.members.length} participacion{group.members.length === 1 ? "" : "es"}
                </span>
              </button>
            ))}
          </div>

          <section className="talent-card talent-crew-detail">
            <div className="talent-application-card__top">
              <div>
                <p className="talent-page__eyebrow">Proyecto seleccionado</p>
                <h2 className="talent-list__title">
                  {selectedProject?.title ?? "Proyecto no informado"}
                </h2>
              </div>
              {selectedProject ? (
                <span className="talent-badge">{selectedProject.members.length} registros</span>
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
                      <h3 className="talent-list__title">{getRole(member)}</h3>
                      <p className="talent-list__meta">
                        Convocatoria: {getOpportunityTitle(member)} | {getProducer(member)}
                      </p>
                    </div>
                    <span className="talent-badge">{formatStatus(member.status)}</span>
                  </div>

                  <p className="talent-list__text">
                    Rol asignado: {getRole(member)}
                  </p>
                  <p className="talent-list__text">
                    Tarea: {getTaskDescription(member)}
                  </p>
                  <p className="talent-list__text">
                    Nota/mensaje del productor: {getProducerMessage(member)}
                  </p>
                  <p className="talent-list__text">Fecha de ingreso: {getMemberDate(member)}</p>

                  <div className="talent-actions talent-actions--inline">
                    <button
                      className="talent-button talent-button--primary"
                      type="button"
                      disabled={!member.id}
                      onClick={() => member.id && navigate(`/talent/messages?crewId=${encodeURIComponent(member.id)}`)}
                    >
                      Ver mensajes
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
