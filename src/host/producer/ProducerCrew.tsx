import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProducerGuard from "./ProducerGuard";
import TalentProfileModal from "../../components/TalentProfileModal";
import TalentAvatar from "../../components/TalentAvatar";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
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
import {
  getCrewMemberEmail,
  getCrewMemberName,
  getCrewMemberPhoto,
  resolveTalentUserId,
  talentFallbackFromCrewMember,
} from "../../utils/talentProfile";
import {
  CREW_CATEGORIES,
  getCrewCategoryLabel,
  getCrewMemberCategory,
  inferCrewCategoryFromText,
  type CrewCategory,
} from "../../utils/crewCategory";
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
  category: "" | CrewCategory;
};

type CrewSummaryModal =
  | "members"
  | "projects"
  | "activeTeams"
  | "categories"
  | "activeMembers"
  | null;

const ALL_FILTER = "";
const ACTIVE_MEMBER_STATUSES = new Set(["ACTIVE", "ACCEPTED"]);
const ACTIVE_PROJECT_STATUSES = new Set(["ACTIVE", "OPEN", "ACCEPTED"]);

const emptyEditForm: CrewMemberUpdatePayload = {
  role: "",
  category: "OTHER",
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
  "Categorias activas",
  "Miembros activos/aceptados",
  "Integrantes del crew",
  "Todos los integrantes cargados en el crew.",
  "Proyectos con integrantes asignados.",
  "Proyectos activos que actualmente tienen crew.",
  "Categorias presentes entre los integrantes cargados.",
  "Miembros activos / aceptados",
  "Integrantes cuyo estado es activo o aceptado.",
  "No hay integrantes para mostrar.",
  "No hay proyectos con equipo para mostrar.",
  "No hay equipos activos para mostrar.",
  "No hay categorias activas para mostrar.",
  "No hay miembros activos o aceptados para mostrar.",
  "Categorias principales",
  "Vista tabla",
  "Agrupar por categoria",
  "Vista de integrantes",
  "No hay integrantes en la categoria seleccionada.",
  "Equipos por proyecto",
  "Cargando registros...",
  "proyectos",
  "Buscar proyecto",
  "Nombre del proyecto",
  "Estado",
  "Todos",
  "Todas",
  "Cantidad de integrantes",
  "Categoria",
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
  "Actor / Actress",
  "Camera",
  "Sound",
  "Lighting",
  "Production",
  "Art",
  "FX",
  "Makeup",
  "Hair",
  "Wardrobe",
  "Stunt",
  "Catering",
  "Other",
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
    category: ALL_FILTER,
  });
  const [membersView, setMembersView] = useState<"table" | "grouped">("table");
  const [crewSummaryModal, setCrewSummaryModal] = useState<CrewSummaryModal>(null);
  const [projectMembersModal, setProjectMembersModal] = useState<CrewProjectGroup | null>(null);
  const [detailMember, setDetailMember] = useState<CrewMember | null>(null);
  const [profileMember, setProfileMember] = useState<CrewMember | null>(null);
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
            getCrewCategoryLabel(getCrewMemberCategory(member)),
            member.producer_note,
            formatCrewStatusLabel(member.status),
          ]),
        ]),
        Object.values(membersByProject).flatMap((members) =>
          members.flatMap((member) => [
            getProjectTitle(member),
            getMemberRole(member),
            getMemberTask(member),
            getCrewCategoryLabel(getCrewMemberCategory(member)),
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
        const [crmProjects, crmMembers] = await Promise.all([
          reusePendingRequest(
            `producer-crew-crm-summary:${token}`,
            () => getMyCrewCrm({ summary: true }, token ?? undefined)
          ),
          reusePendingRequest(
            `producer-crew-crm-members:${token}`,
            () => getMyCrewCrm({ summary: false }, token ?? undefined)
          ),
        ]);

        if (isMounted) {
          const allMembers = crmMembers.flatMap((item) =>
            isCrewCrmProject(item) ? item.members ?? [] : [item]
          );
          const detailedGroups = groupCrewByProject(allMembers, tRef.current("crew.projectMissing"));
          const detailedGroupsById = new Map(detailedGroups.map((group) => [group.id, group]));
          const summaryGroups = crmProjects
            .filter(isCrewCrmProject)
            .map(normalizeCrewCrmProject);
          const nextProjectGroups = summaryGroups.map((group) => ({
            ...group,
            members: detailedGroupsById.get(group.id)?.members ?? group.members,
          }));
          const groupsMissingFromSummary = detailedGroups.filter(
            (group) => !nextProjectGroups.some((summaryGroup) => summaryGroup.id === group.id)
          );
          const completeGroups = [...nextProjectGroups, ...groupsMissingFromSummary];

          setProjectGroups(completeGroups);
          setMembersByProject(
            completeGroups.reduce<Record<string, CrewMember[]>>((records, group) => {
              records[group.id] = group.members;
              return records;
            }, {})
          );
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
  const allCrewMembers = useMemo(
    () => Object.values(membersByProject).flat(),
    [membersByProject]
  );
  const crewProjectGroups = useMemo(
    () => projectGroups.filter((group) => group.membersCount > 0),
    [projectGroups]
  );
  const activeProjectGroups = useMemo(
    () =>
      crewProjectGroups.filter(
        (group) =>
          ACTIVE_PROJECT_STATUSES.has(normalizeStatus(getProjectGroupStatus(group)))
      ),
    [crewProjectGroups]
  );
  const activeProjectCount = activeProjectGroups.length;
  const activeMembers = useMemo(
    () =>
      allCrewMembers.filter((member) =>
        ACTIVE_MEMBER_STATUSES.has(normalizeStatus(member.status))
      ),
    [allCrewMembers]
  );
  const categoryStats = useMemo(() => {
    const counts = new Map<CrewCategory, number>();

    allCrewMembers.forEach((member) => {
      const category = getCrewMemberCategory(member);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    return CREW_CATEGORIES.map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    })).filter(({ count }) => count > 0);
  }, [allCrewMembers]);

  const getProjectCategories = (group: CrewProjectGroup) => {
    const counts = new Map<CrewCategory, number>();
    const members = membersByProject[group.id] ?? group.members;

    members.forEach((member) => {
      const category = getCrewMemberCategory(member);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    return CREW_CATEGORIES.map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    }))
      .filter(({ count }) => count > 0)
      .sort((left, right) => right.count - left.count);
  };

  const openCachedProjectMembers = (group: CrewProjectGroup) => {
    const members = membersByProject[group.id] ?? group.members;
    setCrewSummaryModal(null);
    setProjectMembersModal({
      ...group,
      members,
      membersCount: members.length || group.membersCount,
    });
  };

  const filteredProjectGroups = useMemo(() => {
    const search = normalizeText(filters.search);

    return projectGroups.filter((group) => {
      const matchesSearch = !search || normalizeText(group.title).includes(search);
      const matchesStatus = !filters.status || normalizeStatus(getProjectGroupStatus(group)) === filters.status;
      const matchesCount = matchesMemberCountFilter(group, filters.memberCount);
      const matchesCategory =
        !filters.category ||
        group.members.some((member) => getCrewMemberCategory(member) === filters.category);

      return matchesSearch && matchesStatus && matchesCount && matchesCategory;
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
      category: getCrewMemberCategory(member),
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
    setEditForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "role" ? { category: inferCrewCategoryFromText(value) } : {}),
    }));
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

  const visibleModalMembers = useMemo(
    () =>
      (projectMembersModal?.members ?? []).filter(
        (member) =>
          !filters.category || getCrewMemberCategory(member) === filters.category
      ),
    [filters.category, projectMembersModal]
  );
  const groupedModalMembers = useMemo(
    () =>
      CREW_CATEGORIES.map((category) => ({
        category,
        members: visibleModalMembers.filter(
          (member) => getCrewMemberCategory(member) === category
        ),
      })).filter((group) => group.members.length > 0),
    [visibleModalMembers]
  );

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
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setCrewSummaryModal("members")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : allCrewMembers.length}</span>
          <p className="producer-metric__label">{tAuto("Integrantes")}</p>
        </ClickableSummaryCard>
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setCrewSummaryModal("projects")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : crewProjectGroups.length}</span>
          <p className="producer-metric__label">{tAuto("Proyectos con equipo")}</p>
        </ClickableSummaryCard>
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setCrewSummaryModal("activeTeams")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : activeProjectCount}</span>
          <p className="producer-metric__label">{tAuto("Equipos activos")}</p>
        </ClickableSummaryCard>
        <ClickableSummaryCard
          className="producer-card producer-metric producer-crew-category-metric"
          onClick={() => setCrewSummaryModal("categories")}
        >
          <span className="producer-metric__value">
            {isLoading ? "..." : categoryStats.length}
          </span>
          <p className="producer-metric__label">{tAuto("Categorias activas")}</p>
          {categoryStats.length ? (
            <div className="producer-crew-category-metric__list">
              {categoryStats.slice(0, 4).map(({ category, count }) => (
                <span key={category}>
                  {tAuto(getCrewCategoryLabel(category))} ({count})
                </span>
              ))}
            </div>
          ) : null}
        </ClickableSummaryCard>
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setCrewSummaryModal("activeMembers")}
        >
          <span className="producer-metric__value">
            {isLoading ? "..." : activeMembers.length}
          </span>
          <p className="producer-metric__label">{tAuto("Miembros activos/aceptados")}</p>
        </ClickableSummaryCard>
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
          <label className="producer-field">
            <span>{tAuto("Categoria")}</span>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">{tAuto("Todas")}</option>
              {CREW_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {tAuto(getCrewCategoryLabel(category))}
                </option>
              ))}
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

      {crewSummaryModal === "members" || crewSummaryModal === "activeMembers" ? (
        <SummaryDetailModal
          title={
            crewSummaryModal === "activeMembers"
              ? tAuto("Miembros activos / aceptados")
              : tAuto("Integrantes del crew")
          }
          description={
            crewSummaryModal === "activeMembers"
              ? tAuto("Integrantes cuyo estado es activo o aceptado.")
              : tAuto("Todos los integrantes cargados en el crew.")
          }
          onClose={() => setCrewSummaryModal(null)}
        >
          <div className="summary-detail-list producer-crew-summary-list">
            {(crewSummaryModal === "activeMembers" ? activeMembers : allCrewMembers).length ? (
              (crewSummaryModal === "activeMembers" ? activeMembers : allCrewMembers).map(
                (member, index) => (
                  <article
                    key={getMemberKey(member, index)}
                    className="summary-detail-list__item producer-crew-summary-member"
                  >
                    <div className="producer-crew-summary-member__identity">
                      <TalentAvatar
                        src={getCrewMemberPhoto(member)}
                        name={getCrewMemberName(member)}
                        size="sm"
                      />
                      <div>
                        <h3>{getCrewMemberName(member)}</h3>
                        {crewSummaryModal === "members" ? (
                          <p>{getCrewMemberEmail(member)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="producer-crew-summary-grid">
                      <span>
                        <small>{tAuto("Proyecto")}</small>
                        <strong>{tAuto(getProjectTitle(member))}</strong>
                      </span>
                      <span>
                        <small>{tAuto("Categoria")}</small>
                        <strong>{tAuto(getCrewCategoryLabel(getCrewMemberCategory(member)))}</strong>
                      </span>
                      <span>
                        <small>{tAuto("Rol")}</small>
                        <strong>{tAuto(getMemberRole(member))}</strong>
                      </span>
                      <span>
                        <small>{tAuto("Estado")}</small>
                        <strong>{tAuto(formatCrewStatusLabel(member.status))}</strong>
                      </span>
                    </div>
                    <button
                      className="producer-button"
                      type="button"
                      disabled={!resolveTalentUserId(member)}
                      onClick={() => setProfileMember(member)}
                    >
                      {resolveTalentUserId(member)
                        ? tAuto("Ver ficha")
                        : tAuto("Ficha no disponible")}
                    </button>
                  </article>
                )
              )
            ) : (
              <p className="summary-detail-empty">
                {crewSummaryModal === "activeMembers"
                  ? tAuto("No hay miembros activos o aceptados para mostrar.")
                  : tAuto("No hay integrantes para mostrar.")}
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}

      {crewSummaryModal === "projects" || crewSummaryModal === "activeTeams" ? (
        <SummaryDetailModal
          title={
            crewSummaryModal === "activeTeams"
              ? tAuto("Equipos activos")
              : tAuto("Proyectos con equipo")
          }
          description={
            crewSummaryModal === "activeTeams"
              ? tAuto("Proyectos activos que actualmente tienen crew.")
              : tAuto("Proyectos con integrantes asignados.")
          }
          onClose={() => setCrewSummaryModal(null)}
        >
          <div className="summary-detail-list producer-crew-summary-list">
            {(crewSummaryModal === "activeTeams" ? activeProjectGroups : crewProjectGroups).length ? (
              (crewSummaryModal === "activeTeams" ? activeProjectGroups : crewProjectGroups).map(
                (group) => {
                  const projectCategories = getProjectCategories(group);

                  return (
                    <article
                      key={group.id}
                      className="summary-detail-list__item producer-crew-summary-project"
                    >
                      <div>
                        <h3>{getVisibleProjectTitle(group.title)}</h3>
                        <p>
                          {group.membersCount}{" "}
                          {group.membersCount === 1
                            ? tAuto("integrante")
                            : tAuto("integrantes")}{" "}
                          | {tAuto(formatCrewStatusLabel(getProjectGroupStatus(group)))}
                        </p>
                      </div>
                      <div className="producer-crew-summary-project__categories">
                        <small>{tAuto("Categorias principales")}</small>
                        <div className="producer-chip-list">
                          {projectCategories.length ? (
                            projectCategories.slice(0, 3).map(({ category, count }) => (
                              <span key={category} className="producer-chip">
                                {tAuto(getCrewCategoryLabel(category))} ({count})
                              </span>
                            ))
                          ) : (
                            <span className="producer-muted">{tAuto("Sin categoria")}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className="producer-button"
                        type="button"
                        onClick={() => openCachedProjectMembers(group)}
                      >
                        {tAuto("Ver integrantes")}
                      </button>
                    </article>
                  );
                }
              )
            ) : (
              <p className="summary-detail-empty">
                {crewSummaryModal === "activeTeams"
                  ? tAuto("No hay equipos activos para mostrar.")
                  : tAuto("No hay proyectos con equipo para mostrar.")}
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}

      {crewSummaryModal === "categories" ? (
        <SummaryDetailModal
          title={tAuto("Categorias activas")}
          description={tAuto("Categorias presentes entre los integrantes cargados.")}
          onClose={() => setCrewSummaryModal(null)}
        >
          <div className="producer-crew-summary-categories">
            {categoryStats.length ? (
              categoryStats.map(({ category, count }) => (
                <article key={category} className="summary-detail-list__item">
                  <h3>{tAuto(getCrewCategoryLabel(category))}</h3>
                  <p>
                    {count} {count === 1 ? tAuto("integrante") : tAuto("integrantes")}
                  </p>
                </article>
              ))
            ) : (
              <p className="summary-detail-empty">
                {tAuto("No hay categorias activas para mostrar.")}
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}

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
            <div className="producer-crew-view-toggle" aria-label={tAuto("Vista de integrantes")}>
              <button
                className={`producer-button${membersView === "table" ? " producer-button--primary" : ""}`}
                type="button"
                onClick={() => setMembersView("table")}
              >
                {tAuto("Vista tabla")}
              </button>
              <button
                className={`producer-button${membersView === "grouped" ? " producer-button--primary" : ""}`}
                type="button"
                onClick={() => setMembersView("grouped")}
              >
                {tAuto("Agrupar por categoria")}
              </button>
            </div>

            {modalError ? <p className="producer-feedback producer-feedback--error">{modalError}</p> : null}

            {visibleModalMembers.length && membersView === "table" ? (
              <div className="producer-project-table-wrap">
                <table className="producer-project-table producer-crew-members-table">
                  <thead>
                    <tr>
                      <th>{tAuto("Integrante")}</th>
                      <th>{tAuto("Email")}</th>
                      <th>{tAuto("Rol")}</th>
                      <th>{tAuto("Categoria")}</th>
                      <th>{tAuto("Tarea")}</th>
                      <th>{tAuto("Estado")}</th>
                      <th>{tAuto("Fecha ingreso")}</th>
                      <th>{tAuto("Acciones")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleModalMembers.map((member, index) => (
                      <tr key={getMemberKey(member, index)}>
                        <td>
                          <button
                            className="producer-profile-trigger producer-talent-table__identity"
                            type="button"
                            disabled={!resolveTalentUserId(member)}
                            title={
                              resolveTalentUserId(member)
                                ? "Ver ficha"
                                : "No se pudo identificar el user_id del talento."
                            }
                            onClick={() => setProfileMember(member)}
                          >
                            <TalentAvatar
                              src={getCrewMemberPhoto(member)}
                              name={getCrewMemberName(member)}
                              size="sm"
                            />
                            <div className="producer-project-table__title">
                              <strong>{getCrewMemberName(member)}</strong>
                              <span>{tAuto(getCrewCategoryLabel(getCrewMemberCategory(member)))}</span>
                            </div>
                          </button>
                        </td>
                        <td>{getCrewMemberEmail(member)}</td>
                        <td>{tAuto(getMemberRole(member))}</td>
                        <td>
                          <span className="producer-count-badge">
                            {tAuto(getCrewCategoryLabel(getCrewMemberCategory(member)))}
                          </span>
                        </td>
                        <td>{tAuto(getMemberTask(member))}</td>
                        <td>
                          <span className={`producer-status producer-status--${normalizeStatus(member.status).toLowerCase() || "default"}`}>
                            {tAuto(formatCrewStatusLabel(member.status))}
                          </span>
                        </td>
                        <td>{getMemberDate(member, i18n.language, t("common.noDate"))}</td>
                        <td>
                          <div className="producer-table-actions producer-crew-table__actions">
                            <button
                              className="producer-button"
                              type="button"
                              disabled={!resolveTalentUserId(member)}
                              title={
                                resolveTalentUserId(member)
                                  ? undefined
                                  : "No se pudo identificar el user_id del talento."
                              }
                              onClick={() => setProfileMember(member)}
                            >
                              {resolveTalentUserId(member)
                                ? "Ver ficha"
                                : "Ficha no disponible: falta user_id"}
                            </button>
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
            ) : visibleModalMembers.length ? (
              <div className="producer-crew-category-groups">
                {groupedModalMembers.map((group) => (
                  <section key={group.category} className="producer-crew-category-group">
                    <h3>
                      {tAuto(getCrewCategoryLabel(group.category))} ({group.members.length})
                    </h3>
                    <div>
                      {group.members.map((member, index) => (
                        <button
                          key={getMemberKey(member, index)}
                          className="producer-profile-trigger producer-crew-category-member"
                          type="button"
                          disabled={!resolveTalentUserId(member)}
                          onClick={() => setProfileMember(member)}
                        >
                          <TalentAvatar
                            src={getCrewMemberPhoto(member)}
                            name={getCrewMemberName(member)}
                            size="sm"
                          />
                          <span>
                            <strong>{getCrewMemberName(member)}</strong>
                            <small>{tAuto(getMemberRole(member))}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="producer-muted">
                {filters.category
                  ? tAuto("No hay integrantes en la categoria seleccionada.")
                  : tAuto("Este proyecto no tiene integrantes.")}
              </p>
            )}
          </article>
        </div>
      ) : null}

      {detailMember ? (
        <div className="producer-modal" role="presentation">
          <article className="producer-modal__panel producer-project-detail-modal" role="dialog" aria-modal="true">
            <div className="producer-project-detail-modal__header">
              <div className="producer-talent-detail__identity">
                <TalentAvatar
                  src={getCrewMemberPhoto(detailMember)}
                  name={getCrewMemberName(detailMember)}
                  size="md"
                />
                <div>
                  <p className="producer-page__eyebrow">{tAuto("Detalle de integrante")}</p>
                  <h2>{getCrewMemberName(detailMember)}</h2>
                  <p className="producer-record__eyebrow">{getCrewMemberEmail(detailMember)}</p>
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
                <strong>{tAuto(getCrewCategoryLabel(getCrewMemberCategory(detailMember)))}</strong>
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
                <h2>{getCrewMemberName(editingMember)}</h2>
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
                  {CREW_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {tAuto(getCrewCategoryLabel(category))}
                    </option>
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

      {profileMember ? (
        <TalentProfileModal
          userId={resolveTalentUserId(profileMember)}
          fallback={talentFallbackFromCrewMember(profileMember)}
          token={token ?? undefined}
          onClose={() => setProfileMember(null)}
        />
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
