import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import { getProducerCrew, updateCrewMember } from "../../service/crewApi";
import type { CrewMember, CrewMemberUpdatePayload } from "../../types/talent";
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

function formatStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptado",
    ACTIVE: "Activo",
    HIRED: "Reclutado",
    RECRUITED: "Reclutado",
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

function getTalentName(member: CrewMember): string {
  return (
    member.talent_name?.trim() ||
    member.talent?.name?.trim() ||
    member.talent?.display_name?.trim() ||
    member.talent?.profile?.display_name?.trim() ||
    member.user?.name?.trim() ||
    member.user?.display_name?.trim() ||
    "Talento sin nombre"
  );
}

function getTalentEmail(member: CrewMember): string {
  return (
    member.talent_email?.trim() ||
    member.talent?.email?.trim() ||
    member.user?.email?.trim() ||
    "Sin correo"
  );
}

function getMemberRole(member: CrewMember): string {
  return member.role?.trim() || "Rol no asignado";
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

function getMemberDate(member: CrewMember): string {
  return formatDate(member.joined_at || member.accepted_at || member.updated_at || member.created_at);
}

function getMemberNote(member: CrewMember): string {
  return member.producer_note?.trim() || "Sin nota o instruccion";
}

function getMemberTask(member: CrewMember): string {
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

function ProducerCrewContent() {
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
      setModalError("No se pudo actualizar el integrante.");
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
      setSuccessMessage("Integrante actualizado correctamente.");
      closeEditModal();
    } catch {
      setModalError("No se pudo actualizar el integrante.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner">
        <div>
          <p className="producer-page__eyebrow">Crew</p>
          <h1 className="producer-page__title">Equipo por proyecto</h1>
          <p className="producer-page__subtitle">
            Revisa cada pelicula o proyecto y administra roles, tareas e instrucciones.
          </p>
        </div>
      </section>

      <section className="producer-metrics">
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : projectGroups.length}</span>
          <p className="producer-metric__label">Proyectos con equipo</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : acceptedCount}</span>
          <p className="producer-metric__label">Integrantes aceptados</p>
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
          <p>Cargando equipo...</p>
        </article>
      ) : crew.length === 0 ? (
        <article className="producer-card producer-empty">
          <p>No hay datos de equipo disponibles todavia.</p>
        </article>
      ) : (
        <section className="producer-crew-layout">
          <div className="producer-crew-projects" aria-label="Proyectos con equipo">
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
                  <small>{formatDate(group.date)}</small>
                </span>
                <span className="producer-status">{formatStatus(group.status)}</span>
                <span className="producer-crew-project__count">
                  {group.members.length} integrante{group.members.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>

          <section className="producer-card producer-crew-detail">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">Equipo seleccionado</p>
                <h2 className="producer-record__title">
                  {selectedProject?.title ?? "Proyecto no informado"}
                </h2>
              </div>
              {selectedProject ? (
                <span className="producer-status">{selectedProject.members.length} integrantes</span>
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
                      <p className="producer-list-card__meta">{getTalentEmail(member)}</p>
                      <h3 className="producer-list-card__title">{getTalentName(member)}</h3>
                    </div>
                    <span className="producer-status">{formatStatus(member.status)}</span>
                  </div>

                  <div className="producer-meta-list">
                    <span>Convocatoria: {getOpportunityTitle(member)}</span>
                    <span>Rol asignado: {getMemberRole(member)}</span>
                    <span>Ingreso: {getMemberDate(member)}</span>
                  </div>

                  <p className="producer-list-card__text">Tarea: {getMemberTask(member)}</p>
                  <p className="producer-list-card__text">Nota: {getMemberNote(member)}</p>

                  <div className="producer-actions producer-actions--inline">
                    <button
                      className="producer-button producer-button--primary"
                      type="button"
                      disabled={!member.id}
                      onClick={() => openEditModal(member)}
                    >
                      Editar integrante
                    </button>
                    <button
                      className="producer-button"
                      type="button"
                      disabled={!member.id}
                      onClick={() => member.id && navigate(`/producer/messages?crewId=${encodeURIComponent(member.id)}`)}
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

      {editingMember ? (
        <div className="producer-modal" role="dialog" aria-modal="true">
          <div className="producer-modal__panel">
            <div className="producer-record__header">
              <div>
                <p className="producer-record__eyebrow">Editar integrante</p>
                <h2 className="producer-record__title">{getTalentName(editingMember)}</h2>
              </div>
              <button className="producer-button" type="button" onClick={closeEditModal}>
                Cerrar
              </button>
            </div>

            {modalError ? (
              <p className="producer-feedback producer-feedback--error">{modalError}</p>
            ) : null}

            <form className="producer-form producer-form--single" onSubmit={handleSubmitEdit}>
              <label className="producer-field">
                <span>Rol asignado</span>
                <input
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  placeholder="Actor secundario"
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Descripcion / tarea</span>
                <textarea
                  name="task_description"
                  value={editForm.task_description}
                  onChange={handleEditChange}
                  rows={4}
                  placeholder="Interpretar villano en escenas 3 y 4"
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Nota interna o instruccion para el talento</span>
                <textarea
                  name="producer_note"
                  value={editForm.producer_note}
                  onChange={handleEditChange}
                  rows={4}
                  placeholder="Llevar vestuario oscuro"
                />
              </label>

              <div className="producer-actions">
                <button className="producer-button" type="button" onClick={closeEditModal}>
                  Cancelar
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
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
