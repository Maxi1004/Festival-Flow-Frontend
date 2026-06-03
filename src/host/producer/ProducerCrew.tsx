import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import {
  getMyCrewCrm,
  removeCrewProjectMember,
  updateCrewProjectMember,
  type CrewCrmProject,
} from "../../service/crewApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import type { CrewMember, CrewMemberUpdatePayload } from "../../types/talent";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/producer.css";

type CrewProjectGroup = {
  id: string;
  title: string;
  status: string;
  lastActivity: string;
  membersCount: number;
  members: CrewMember[];
};

type CrewFilters = {
  search: string;
  status: string;
  memberCount: string;
};

const ALL_FILTER = "";

const CREW_CATEGORY_OPTIONS = [
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
] as const;

const emptyEditForm: CrewMemberUpdatePayload = {
  role: "",
  category: "",
  status: "",
  task_description: "",
  producer_note: "",
};

const producerCrewBaseTexts = [
  "Proyecto sin informar",
  "integrante",
  "integrantes",
  "No se pudo identificar el integrante o proyecto.",
  "Integrante actualizado correctamente.",
  "No se pudo actualizar el integrante.",
  "¿Seguro que deseas sacar a este integrante del proyecto?",
  "Integrante removido del proyecto.",
  "No se pudo sacar al integrante del proyecto.",
  "No se pudieron cargar los integrantes del proyecto.",
  "Crew",
  "Equipo por proyecto",
  "Gestiona integrantes, roles y tareas por proyecto.",
  "Integrantes",
  "Proyectos con equipo",
  "Equipos activos",
  "Equipos por proyecto",
  "Cargando registros...",
  "proyectos",
  "Buscar proyecto",
  "Nombre del proyecto",
  "Estado",
  "Todos",
  "Cantidad de integrantes",
  "1 integrante",
  "2 a 5 integrantes",
  "6 o mas integrantes",
  "No hay proyectos que coincidan con los filtros.",
  "Proyecto",
  "Ultima actividad",
  "Acciones",
  "Equipo del proyecto",
  "Ver integrantes",
  "Editar equipo / roles",
  "Chat del equipo",
  "Integrantes del proyecto",
  "Cerrar",
  "Integrante",
  "Email",
  "Rol",
  "Tarea",
  "Fecha ingreso",
  "Editar rol/tarea",
  "Sacando...",
  "Sacar del proyecto",
  "Este proyecto no tiene integrantes.",
  "Detalle de integrante",
  "Categoria",
  "Tarea / instrucciones",
  "Ej. Actor secundario",
  "Sin categoria",
  "Sin estado",
  "Activo",
  "Completado",
  "Cancelar",
  "Guardar cambios",
  "Guardando...",
  "Activa",
  "Activo",
  "Abierta",
  "Aceptada",
  "Pendiente",
  "Finalizada",
  "Completada",
  "Cancelada",
  "Rechazada",
  "En revisión",
  "Borrador",
  "Pausada",
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

function formatCrewStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    OPEN: "Abierta",
    ACCEPTED: "Aceptada",
    PENDING: "Pendiente",
    COMPLETED: "Completada",
    CLOSED: "Finalizada",
    CANCELLED: "Cancelada",
    REJECTED: "Rechazada",
    IN_REVIEW: "En revisión",
    DRAFT: "Borrador",
    PAUSED: "Pausada",
  };

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

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

function getTalentPhotoUrl(member: CrewMember): string {
  const nestedMember = member as CrewMember & {
    photo_url?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
    user?: (CrewMember["user"] & { photoURL?: string | null; photo_url?: string | null }) | null;
  };

  return (
    nestedMember.talent?.profile?.photo_url?.trim() ||
    nestedMember.picture?.trim() ||
    nestedMember.avatar_url?.trim() ||
    nestedMember.user?.photoURL?.trim() ||
    nestedMember.user?.photo_url?.trim() ||
    nestedMember.photo_url?.trim() ||
    ""
  );
}

function getMemberRole(member: CrewMember, fallback = "Rol no informado"): string {
  return member.role?.trim() || member.role_needed?.trim() || member.specialty?.trim() || fallback;
}

function normalizeText(value?: string | null): string {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() ?? "";
}

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function inferCrewCategory(member: CrewMember): string {
  const profile = member.talent?.profile;
  const explicitCategory = member.category?.trim() || member.task_category?.trim();

  if (explicitCategory) {
    return explicitCategory;
  }

  const candidates = [
    member.specialty,
    member.role_needed,
    member.opportunity?.specialty,
    profile?.main_specialty,
    ...(profile?.specialties ?? []),
    member.role,
    member.task_description,
  ];
  const rules: Array<[string, string[]]> = [
    ["Actress", ["actress", "actriz", "actrices"]],
    ["Actor", ["actor", "actores"]],
    ["Camera", ["camera", "camara", "fotografia", "cinematografia", "dop"]],
    ["FX", ["fx", "vfx", "sfx", "efectos especiales"]],
    ["Stunt", ["stunt", "doble de riesgo", "especialista de riesgo"]],
    ["Maquillaje", ["maquillaje", "makeup"]],
    ["Peluqueria", ["peluqueria", "hair"]],
    ["Catering", ["catering", "cocina", "alimentacion"]],
    ["Produccion", ["produccion", "productor", "production"]],
    ["Sonido", ["sonido", "audio", "sound"]],
    ["Direccion", ["direccion", "director", "realizacion"]],
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    const match = rules.find(([, keywords]) =>
      keywords.some((keyword) => normalizedCandidate.includes(keyword))
    );

    if (match) {
      return match[0];
    }
  }

  return "Otro";
}

function getProjectId(member: CrewMember): string {
  return member.project_id?.trim() || member.project?.id?.trim() || "";
}

function getProjectTitle(member: CrewMember, fallback = "Proyecto sin informar"): string {
  return member.project_title?.trim() || member.project?.title?.trim() || member.project?.name?.trim() || fallback;
}

function getMemberTask(member: CrewMember, fallback = "Sin tarea asignada"): string {
  return member.task_description?.trim() || member.notes?.trim() || fallback;
}

function getMemberDate(member: CrewMember, locale: string, fallback: string): string {
  return formatDate(member.joined_at || member.accepted_at || member.updated_at || member.created_at, locale, fallback);
}

function getRawMemberDate(member: CrewMember): string {
  return member.joined_at || member.accepted_at || member.updated_at || member.created_at || "";
}

function getMemberKey(member: CrewMember, index: number): string {
  return member.id ?? member.application_id ?? member.recruitment_id ?? `${getProjectId(member)}-${index}`;
}

function groupCrewByProject(crew: CrewMember[], fallbackProject: string): CrewProjectGroup[] {
  const groups = new Map<string, CrewProjectGroup>();

  crew.forEach((member) => {
    const projectId = getProjectId(member) || getProjectTitle(member, fallbackProject);
    const existingGroup = groups.get(projectId);

    if (existingGroup) {
      existingGroup.members.push(member);
      return;
    }

    groups.set(projectId, {
      id: projectId,
      title: getProjectTitle(member, fallbackProject),
      status: member.project?.status?.trim() || member.status?.trim() || "",
      lastActivity: getRawMemberDate(member),
      membersCount: 1,
      members: [member],
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    status: getProjectGroupStatus(group),
    lastActivity: getProjectGroupRawLastActivity(group),
    membersCount: group.members.length,
  }));
}

function getProjectGroupStatus(group: CrewProjectGroup): string {
  return (
    group.status ||
    group.members.find((member) => member.project?.status)?.project?.status?.trim() ||
    group.members.find((member) => member.status)?.status?.trim() ||
    ""
  );
}

function getProjectGroupRawLastActivity(group: CrewProjectGroup): string {
  const latestTimestamp = group.members.reduce((latest, member) => {
    const dateValue = getRawMemberDate(member);
    const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;

    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);

  if (!latestTimestamp) {
    return group.lastActivity || "";
  }

  return new Date(latestTimestamp).toISOString();
}

function getProjectGroupLastActivity(group: CrewProjectGroup, locale: string, fallback: string): string {
  if (group.lastActivity && group.members.length === 0) {
    return formatDate(group.lastActivity, locale, fallback);
  }

  const latestTimestamp = group.members.reduce((latest, member) => {
    const dateValue = getRawMemberDate(member);
    const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;

    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);

  if (!latestTimestamp) {
    return fallback;
  }

  return formatDate(new Date(latestTimestamp).toISOString(), locale, fallback);
}

function normalizeCrewCrmProject(project: CrewCrmProject): CrewProjectGroup {
  const projectId = project.project_id;
  const membersCount = Number(
    project.members_count ??
    project.member_count ??
    project.membersCount ??
    project.members?.length ??
    0
  );

  return {
    id: projectId,
    title: project.project_title?.trim() || project.title?.trim() || "Proyecto sin informar",
    status: project.status?.trim() || "",
    lastActivity:
      project.latest_activity?.trim() ||
      project.last_activity?.trim() ||
      project.latest_joined_at?.trim() ||
      project.joined_at?.trim() ||
      "",
    membersCount,
    members: project.members ?? [],
  };
}

function isCrewCrmProject(item: CrewCrmProject | CrewMember): item is CrewCrmProject {
  if ("members_count" in item || "member_count" in item || "membersCount" in item || "latest_activity" in item || "last_activity" in item) {
    return true;
  }

  return (
    "project_id" in item &&
    !("id" in item) &&
    !("talent_user_id" in item) &&
    !("talent_name" in item)
  );
}

function matchesMemberCountFilter(group: CrewProjectGroup, filter: string): boolean {
  const count = group.members.length;

  if (!filter) {
    return true;
  }

  if (filter === "1") {
    return count === 1;
  }

  if (filter === "2-5") {
    return count >= 2 && count <= 5;
  }

  if (filter === "6+") {
    return count >= 6;
  }

  return true;
}

function CrewAvatar({ member }: { member: CrewMember }) {
  const name = getTalentName(member, "T");
  const photoUrl = getTalentPhotoUrl(member);

  return photoUrl ? (
    <img className="producer-talent-avatar" src={photoUrl} alt={`Foto de perfil de ${name}`} />
  ) : (
    <span className="producer-talent-avatar" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function CrewTableSkeleton() {
  return (
    <div className="producer-project-table-wrap">
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

function ProducerCrewContent() {
  const { t, i18n } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const navigate = useNavigate();
  const [projectGroups, setProjectGroups] = useState<CrewProjectGroup[]>([]);
  const [membersByProject, setMembersByProject] = useState<Record<string, CrewMember[]>>({});
  const [filters, setFilters] = useState<CrewFilters>({
    search: "",
    status: ALL_FILTER,
    memberCount: ALL_FILTER,
  });
  const [projectMembersModal, setProjectMembersModal] = useState<CrewProjectGroup | null>(null);
  const [detailMember, setDetailMember] = useState<CrewMember | null>(null);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [editForm, setEditForm] = useState<CrewMemberUpdatePayload>(emptyEditForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        producerCrewBaseTexts,
        projectGroups.flatMap((group) => [
          group.title,
          formatCrewStatusLabel(getProjectGroupStatus(group)),
          ...group.members.flatMap((member) => [
            getProjectTitle(member),
            getMemberRole(member),
            getMemberTask(member),
            inferCrewCategory(member),
            member.producer_note,
            formatCrewStatusLabel(member.status),
          ]),
        ]),
        Object.values(membersByProject).flatMap((members) =>
          members.flatMap((member) => [
            getProjectTitle(member),
            getMemberRole(member),
            getMemberTask(member),
            inferCrewCategory(member),
            member.producer_note,
            formatCrewStatusLabel(member.status),
          ])
        )
      ),
    [membersByProject, projectGroups]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);
  const getVisibleProjectTitle = (title: string) =>
    title === "Proyecto sin informar" ? tAuto("Proyecto sin informar") : tAuto(title);

  useEffect(() => {
    let isMounted = true;

    async function loadCrew() {
      try {
        setError("");
        setIsLoading(true);
        const crmProjects = await reusePendingRequest(
          `producer-crew-crm-summary:${token}`,
          () => getMyCrewCrm({ summary: true }, token ?? undefined)
        );

        if (isMounted) {
          const nextProjectGroups = crmProjects
            .filter(isCrewCrmProject)
            .map(normalizeCrewCrmProject);

          setProjectGroups(nextProjectGroups);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("crew.empty")
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
  }, [token]);

  const statusOptions = useMemo(
    () => Array.from(new Set(projectGroups.map((group) => normalizeStatus(getProjectGroupStatus(group))).filter(Boolean))).sort(),
    [projectGroups]
  );
  const activeProjectCount = useMemo(
    () => projectGroups.filter((group) => ["ACTIVE", "OPEN", "ACCEPTED"].includes(normalizeStatus(group.status))).length,
    [projectGroups]
  );
  const totalMembersCount = useMemo(
    () => projectGroups.reduce((total, group) => total + group.membersCount, 0),
    [projectGroups]
  );

  const filteredProjectGroups = useMemo(() => {
    const search = normalizeText(filters.search);

    return projectGroups.filter((group) => {
      const matchesSearch = !search || normalizeText(group.title).includes(search);
      const matchesStatus = !filters.status || normalizeStatus(getProjectGroupStatus(group)) === filters.status;
      const matchesCount = matchesMemberCountFilter(group, filters.memberCount);

      return matchesSearch && matchesStatus && matchesCount;
    });
  }, [filters, projectGroups]);

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const openEditModal = (member: CrewMember) => {
    setEditingMember(member);
    setDetailMember(null);
    setModalError("");
    setSuccessMessage("");
    setEditForm({
      role: member.role?.trim() || "",
      category: inferCrewCategory(member),
      status: member.status?.trim() || "",
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

  const handleEditChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const mergeUpdatedMember = (memberId: string, projectId: string, updatedMember: CrewMember) => {
    const mergeMember = (member: CrewMember): CrewMember => ({
      ...member,
      ...updatedMember,
      id: member.id,
      project_id: getProjectId(member),
      role: updatedMember.role ?? editForm.role,
      category: updatedMember.category ?? editForm.category,
      status: updatedMember.status ?? editForm.status,
      task_description: updatedMember.task_description ?? editForm.task_description,
      producer_note: updatedMember.producer_note ?? editForm.producer_note,
    });

    setProjectMembersModal((current) =>
      current?.id === projectId
        ? {
            ...current,
            members: current.members.map((member) =>
              member.id === memberId ? mergeMember(member) : member
            ),
          }
        : current
    );
    setMembersByProject((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).map((member) =>
        member.id === memberId ? mergeMember(member) : member
      ),
    }));
  };

  const handleSubmitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const memberId = editingMember?.id;
    const projectId = editingMember ? getProjectId(editingMember) : "";

    if (!memberId || !projectId) {
      setModalError(tAuto("No se pudo identificar el integrante o proyecto."));
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      const updatedMember = await updateCrewProjectMember(projectId, memberId, editForm, token ?? undefined);

      mergeUpdatedMember(memberId, projectId, updatedMember);
      setSuccessMessage(tAuto("Integrante actualizado correctamente."));
      closeEditModal();
    } catch (updateError) {
      setModalError(
        updateError instanceof Error
          ? updateError.message
          : tAuto("No se pudo actualizar el integrante.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (member: CrewMember) => {
    const memberId = member.id;
    const projectId = getProjectId(member);

    if (!memberId || !projectId) {
      setError(tAuto("No se pudo identificar el integrante o proyecto."));
      return;
    }

    const confirmed = window.confirm(tAuto("¿Seguro que deseas sacar a este integrante del proyecto?"));

    if (!confirmed) {
      return;
    }

    try {
      setRemovingMemberId(memberId);
      setError("");
      setModalError("");
      await removeCrewProjectMember(projectId, memberId, token ?? undefined);
      setMembersByProject((current) => ({
        ...current,
        [projectId]: (current[projectId] ?? []).filter((currentMember) => currentMember.id !== memberId),
      }));
      setProjectGroups((current) =>
        current.map((group) =>
          group.id === projectId
            ? { ...group, membersCount: Math.max(0, group.membersCount - 1) }
            : group
        )
      );
      setProjectMembersModal((current) =>
        current
          ? {
              ...current,
              membersCount: Math.max(0, current.membersCount - 1),
              members: current.members.filter((currentMember) => currentMember.id !== memberId),
            }
          : current
      );
      if (detailMember?.id === memberId) {
        setDetailMember(null);
      }
      setSuccessMessage(tAuto("Integrante removido del proyecto."));
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : tAuto("No se pudo sacar al integrante del proyecto.");
      if (projectMembersModal) {
        setModalError(message);
      } else {
        setError(message);
      }
    } finally {
      setRemovingMemberId("");
    }
  };

  const openProjectMembersModal = async (group: CrewProjectGroup) => {
    const cachedMembers = membersByProject[group.id];

    if (cachedMembers) {
      setProjectMembersModal({ ...group, members: cachedMembers, membersCount: cachedMembers.length });
      return;
    }

    try {
      setModalError("");
      const crmMembers = await reusePendingRequest(
        `producer-crew-crm-members:${token}`,
        () => getMyCrewCrm({ summary: false }, token ?? undefined)
      );
      const allMembers = crmMembers.flatMap((item) =>
        isCrewCrmProject(item) ? item.members ?? [] : [item]
      );
      const nextMembersByProject = groupCrewByProject(allMembers, t("crew.projectMissing")).reduce<Record<string, CrewMember[]>>(
        (records, projectGroup) => ({
          ...records,
          [projectGroup.id]: projectGroup.members,
        }),
        {}
      );
      const groupMembers = nextMembersByProject[group.id] ?? [];

      setMembersByProject(nextMembersByProject);
      setProjectMembersModal({ ...group, members: groupMembers, membersCount: groupMembers.length });
    } catch (loadError) {
      setModalError(
        loadError instanceof Error
          ? loadError.message
          : tAuto("No se pudieron cargar los integrantes del proyecto.")
      );
      setProjectMembersModal(group);
    }
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner producer-banner--compact">
        <div>
          <p className="producer-page__eyebrow">{tAuto("Crew")}</p>
          <h1 className="producer-page__title">{tAuto("Equipo por proyecto")}</h1>
          <p className="producer-page__subtitle">
            {tAuto("Gestiona integrantes, roles y tareas por proyecto.")}
          </p>
        </div>
      </section>

      <section className="producer-metrics">
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : totalMembersCount}</span>
          <p className="producer-metric__label">{tAuto("Integrantes")}</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : projectGroups.length}</span>
          <p className="producer-metric__label">{tAuto("Proyectos con equipo")}</p>
        </article>
        <article className="producer-card producer-metric">
          <span className="producer-metric__value">{isLoading ? "..." : activeProjectCount}</span>
          <p className="producer-metric__label">{tAuto("Equipos activos")}</p>
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

      <section className="producer-card producer-project-crm producer-crew-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>{tAuto("Equipos por proyecto")}</h2>
            <span>
              {isLoading
                ? tAuto("Cargando registros...")
                : `${filteredProjectGroups.length} de ${projectGroups.length} ${tAuto("proyectos")}`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters producer-crew-filters">
          <label className="producer-field">
            <span>{tAuto("Buscar proyecto")}</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder={tAuto("Nombre del proyecto")}
            />
          </label>
          <label className="producer-field">
            <span>{tAuto("Estado")}</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">{tAuto("Todos")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{tAuto(formatCrewStatusLabel(status))}</option>
              ))}
            </select>
          </label>
          <label className="producer-field">
            <span>{tAuto("Cantidad de integrantes")}</span>
            <select name="memberCount" value={filters.memberCount} onChange={handleFilterChange}>
              <option value="">{tAuto("Todos")}</option>
              <option value="1">{tAuto("1 integrante")}</option>
              <option value="2-5">{tAuto("2 a 5 integrantes")}</option>
              <option value="6+">{tAuto("6 o mas integrantes")}</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <CrewTableSkeleton />
        ) : projectGroups.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <p>{t("crew.empty")}</p>
          </article>
        ) : filteredProjectGroups.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <p>{tAuto("No hay proyectos que coincidan con los filtros.")}</p>
          </article>
        ) : (
          <div className="producer-project-table-wrap">
            <table className="producer-project-table producer-crew-table">
              <thead>
                <tr>
                  <th>{tAuto("Proyecto")}</th>
                  <th>{tAuto("Integrantes")}</th>
                  <th>{tAuto("Estado")}</th>
                  <th>{tAuto("Ultima actividad")}</th>
                  <th>{tAuto("Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjectGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <div className="producer-project-table__title">
                        <strong>{getVisibleProjectTitle(group.title)}</strong>
                        <span>{tAuto("Equipo del proyecto")}</span>
                      </div>
                    </td>
                    <td>
                      <span className="producer-count-badge">
                        {group.membersCount}{" "}
                        {group.membersCount === 1 ? tAuto("integrante") : tAuto("integrantes")}
                      </span>
                    </td>
                    <td>
                      <span className={`producer-status producer-status--${normalizeStatus(getProjectGroupStatus(group)).toLowerCase() || "default"}`}>
                        {tAuto(formatCrewStatusLabel(getProjectGroupStatus(group)))}
                      </span>
                    </td>
                    <td>{getProjectGroupLastActivity(group, i18n.language, t("common.noDate"))}</td>
                    <td>
                      <div className="producer-table-actions producer-crew-table__actions">
                        <button className="producer-button" type="button" onClick={() => void openProjectMembersModal(group)}>
                          {tAuto("Ver integrantes")}
                        </button>
                        <button
                          className="producer-button"
                          type="button"
                          onClick={() => void openProjectMembersModal(group)}
                        >
                          {tAuto("Editar equipo / roles")}
                        </button>
                        <button
                          className="producer-button"
                          type="button"
                          disabled={!group.id}
                          onClick={() => navigate(`/producer/messages?projectId=${encodeURIComponent(group.id)}`)}
                        >
                          {tAuto("Chat del equipo")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {projectMembersModal ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal producer-crew-members-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">{tAuto("Integrantes del proyecto")}</p>
                <h2>{getVisibleProjectTitle(projectMembersModal.title)}</h2>
              </div>
              <button className="producer-button producer-button--primary" type="button" onClick={() => setProjectMembersModal(null)}>
                {tAuto("Cerrar")}
              </button>
            </div>

            {modalError ? <p className="producer-feedback producer-feedback--error">{modalError}</p> : null}

            {projectMembersModal.members.length ? (
              <div className="producer-project-table-wrap">
                <table className="producer-project-table producer-crew-members-table">
                  <thead>
                    <tr>
                      <th>{tAuto("Integrante")}</th>
                      <th>{tAuto("Email")}</th>
                      <th>{tAuto("Rol")}</th>
                      <th>{tAuto("Tarea")}</th>
                      <th>{tAuto("Estado")}</th>
                      <th>{tAuto("Fecha ingreso")}</th>
                      <th>{tAuto("Acciones")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectMembersModal.members.map((member, index) => (
                      <tr key={getMemberKey(member, index)}>
                        <td>
                          <div className="producer-talent-table__identity">
                            <CrewAvatar member={member} />
                            <div className="producer-project-table__title">
                              <strong>{getTalentName(member, t("producer.talents.unnamed"))}</strong>
                              <span>{tAuto(inferCrewCategory(member))}</span>
                            </div>
                          </div>
                        </td>
                        <td>{getTalentEmail(member, t("common.noEmail"))}</td>
                        <td>{tAuto(getMemberRole(member))}</td>
                        <td>{tAuto(getMemberTask(member))}</td>
                        <td>
                          <span className={`producer-status producer-status--${normalizeStatus(member.status).toLowerCase() || "default"}`}>
                            {tAuto(formatCrewStatusLabel(member.status))}
                          </span>
                        </td>
                        <td>{getMemberDate(member, i18n.language, t("common.noDate"))}</td>
                        <td>
                          <div className="producer-table-actions producer-crew-table__actions">
                            <button className="producer-button" type="button" onClick={() => openEditModal(member)}>
                              {tAuto("Editar rol/tarea")}
                            </button>
                            <button
                              className="producer-button producer-button--danger"
                              type="button"
                              disabled={!member.id || removingMemberId === member.id}
                              onClick={() => void handleRemoveMember(member)}
                            >
                              {removingMemberId === member.id
                                ? tAuto("Sacando...")
                                : tAuto("Sacar del proyecto")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="producer-muted">{tAuto("Este proyecto no tiene integrantes.")}</p>
            )}
          </article>
        </div>
      ) : null}

      {detailMember ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div className="producer-talent-detail__identity">
                <CrewAvatar member={detailMember} />
                <div>
                  <p className="producer-page__eyebrow">{tAuto("Detalle de integrante")}</p>
                  <h2>{getTalentName(detailMember, t("producer.talents.unnamed"))}</h2>
                  <p className="producer-record__eyebrow">{getTalentEmail(detailMember, t("common.noEmail"))}</p>
                </div>
              </div>
              <button className="producer-button producer-button--primary" type="button" onClick={() => setDetailMember(null)}>
                {tAuto("Cerrar")}
              </button>
            </div>
            <div className="producer-project-detail-grid">
              <div>
                <span>{tAuto("Proyecto")}</span>
                <strong>{tAuto(getProjectTitle(detailMember))}</strong>
              </div>
              <div>
                <span>{tAuto("Rol")}</span>
                <strong>{tAuto(getMemberRole(detailMember))}</strong>
              </div>
              <div>
                <span>{tAuto("Categoria")}</span>
                <strong>{tAuto(inferCrewCategory(detailMember))}</strong>
              </div>
              <div>
                <span>{tAuto("Estado")}</span>
                <strong>{tAuto(formatCrewStatusLabel(detailMember.status))}</strong>
              </div>
              <div>
                <span>{tAuto("Fecha ingreso")}</span>
                <strong>{getMemberDate(detailMember, i18n.language, t("common.noDate"))}</strong>
              </div>
              <div>
                <span>{tAuto("Tarea")}</span>
                <strong>{tAuto(getMemberTask(detailMember))}</strong>
              </div>
            </div>
            <div className="producer-actions">
              <button className="producer-button" type="button" onClick={() => openEditModal(detailMember)}>
                {tAuto("Editar rol/tarea")}
              </button>
              <button className="producer-button producer-button--danger" type="button" onClick={() => void handleRemoveMember(detailMember)}>
                {tAuto("Sacar del proyecto")}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {editingMember ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-record__eyebrow">{tAuto("Editar rol/tarea")}</p>
                <h2>{getTalentName(editingMember, t("producer.talents.unnamed"))}</h2>
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
                <span>{tAuto("Rol")}</span>
                <input
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  placeholder={tAuto("Ej. Actor secundario")}
                />
              </label>

              <label className="producer-field">
                <span>{tAuto("Categoria")}</span>
                <select name="category" value={editForm.category ?? ""} onChange={handleEditChange}>
                  <option value="">{tAuto("Sin categoria")}</option>
                  {CREW_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{tAuto(category)}</option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{tAuto("Estado")}</span>
                <select name="status" value={editForm.status ?? ""} onChange={handleEditChange}>
                  <option value="">{tAuto("Sin estado")}</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{tAuto(formatCrewStatusLabel(status))}</option>
                  ))}
                  {!statusOptions.includes("ACTIVE") ? <option value="ACTIVE">{tAuto("Activo")}</option> : null}
                  {!statusOptions.includes("COMPLETED") ? <option value="COMPLETED">{tAuto("Completado")}</option> : null}
                </select>
              </label>

              <label className="producer-field producer-field--full">
                <span>{tAuto("Tarea / instrucciones")}</span>
                <textarea
                  name="task_description"
                  value={editForm.task_description}
                  onChange={handleEditChange}
                  rows={4}
                  placeholder={t("crew.taskPlaceholder")}
                />
              </label>

              <div className="producer-actions">
                <button className="producer-button" type="button" onClick={closeEditModal}>
                  {tAuto("Cancelar")}
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? tAuto("Guardando...") : tAuto("Guardar cambios")}
                </button>
              </div>
            </form>
          </article>
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
