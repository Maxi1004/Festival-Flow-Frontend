import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ProducerGuard from "./ProducerGuard";
import TalentProfileModal from "../../components/TalentProfileModal";
import TalentAvatar from "../../components/TalentAvatar";
import DonutChart, { type DonutChartItem } from "../../components/DonutChart";
import {
  ClickableSummaryCard,
  SummaryDetailModal,
} from "../../components/SummaryDetailModal";
import {
  getOpportunityApplications,
  updateApplicationStatus,
} from "../../service/applicationApi";
import { getMyProjects } from "../../service/projectApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import {
  getMyOpportunitiesCrm,
  updateOpportunity,
  updateOpportunityStatus,
} from "../../service/opportunityApi";
import type { Opportunity, Project } from "../../types/producer";
import type { TalentApplication } from "../../types/talent";
import {
  formatDisplayDate,
  formatStatusLabel,
  isActiveStatus,
  isCancelledStatus,
  normalizeOpportunityFormData,
  requirementsToTextarea,
  toDateInputValue,
  toVisibleStatusAction,
} from "./utils";
import {
  OPPORTUNITY_MODALITY_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
} from "../../types/producer";
import "../../styles/producer.css";
import { useCurrentProfile } from "../useCurrentProfile";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import {
  getTalentIdentityEmail,
  getTalentIdentityName,
  getTalentIdentityPhoto,
  resolveTalentUserId,
  talentFallbackFromApplication,
} from "../../utils/talentProfile";
import { inferCrewCategoryFromText } from "../../utils/crewCategory";

type OpportunityFormState = {
  project_id: string;
  title: string;
  role_needed: string;
  specialty: string;
  description: string;
  location: string;
  modality: string;
  requirements: string;
  status: string;
  deadline: string;
};

type OpportunityStatusGroup = {
  key: string;
  label: string;
  statuses: string[];
  colorClass: string;
};

type ApplicationStatusGroup = {
  key: string;
  label: string;
  statuses: string[];
  colorClass: string;
};

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  OPEN: "Activa",
  DRAFT: "Borrador",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  PAUSED: "Pausada",
};

const OPPORTUNITY_STATUS_GROUPS: OpportunityStatusGroup[] = [
  {
    key: "active",
    label: "Activas",
    statuses: ["ACTIVE", "OPEN"],
    colorClass: "donut-chart__segment--green",
  },
  {
    key: "cancelled",
    label: "Canceladas",
    statuses: ["CANCELLED"],
    colorClass: "donut-chart__segment--rose",
  },
  {
    key: "closed",
    label: "Cerradas",
    statuses: ["CLOSED"],
    colorClass: "donut-chart__segment--slate",
  },
  {
    key: "completed",
    label: "Completadas",
    statuses: ["COMPLETED"],
    colorClass: "donut-chart__segment--blue",
  },
  {
    key: "draft",
    label: "Borrador",
    statuses: ["DRAFT"],
    colorClass: "donut-chart__segment--amber",
  },
  {
    key: "paused",
    label: "Pausadas",
    statuses: ["PAUSED"],
    colorClass: "donut-chart__segment--violet",
  },
];

const APPLICATION_STATUS_GROUPS: ApplicationStatusGroup[] = [
  {
    key: "accepted",
    label: "Aceptadas",
    statuses: ["ACCEPTED"],
    colorClass: "donut-chart__segment--green",
  },
  {
    key: "rejected",
    label: "Rechazadas",
    statuses: ["REJECTED"],
    colorClass: "donut-chart__segment--rose",
  },
  {
    key: "pending",
    label: "Pendientes",
    statuses: ["PENDING", "SUBMITTED", "IN_REVIEW", "PRESELECTED"],
    colorClass: "donut-chart__segment--amber",
  },
  {
    key: "cancelled",
    label: "Canceladas",
    statuses: ["CANCELLED"],
    colorClass: "donut-chart__segment--slate",
  },
];

const OPPORTUNITY_MODALITY_LABELS: Record<string, string> = {
  REMOTE: "Remota",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
  FLEXIBLE: "Flexible",
};

const producerOpportunitiesBaseTexts = [
  "Activa",
  "Borrador",
  "Cerrada",
  "Cancelada",
  "Completada",
  "Pausada",
  "Remota",
  "Presencial",
  "Híbrida",
  "Flexible",
  "No informada",
  "Aceptada",
  "En revisión",
  "Pendiente",
  "Preseleccionada",
  "Rechazada",
  "Enviada",
  "Sin estado",
  "Sin fecha",
  "Talento sin nombre",
  "Sin correo",
  "Proyecto sin informar",
  "No se pudieron cargar tus convocatorias.",
  "No se pudieron cargar los proyectos para editar.",
  "No se pudo actualizar la convocatoria.",
  "No se pudo cerrar la convocatoria.",
  "No se pudieron cargar los postulantes.",
  "Postulante aceptado correctamente.",
  "Postulante rechazado correctamente.",
  "No se pudo actualizar el estado del postulante.",
  "Convocatorias",
  "Administra tus oportunidades",
  "Publica, actualiza o cierra convocatorias conectadas a tus proyectos reales.",
  "Nueva convocatoria",
  "Total convocatorias",
  "Activas",
  "Estado de convocatorias",
  "Distribucion real por estado",
  "Postulantes totales",
  "Distribucion de convocatorias",
  "Distribucion de postulaciones",
  "Postulantes agrupados por convocatoria",
  "Los detalles se cargan al abrir este resumen.",
  "Cargando postulantes de las convocatorias...",
  "No fue posible cargar todas las convocatorias. La distribucion considera solo postulaciones cargadas.",
  "No hay postulaciones cargadas para mostrar.",
  "No hay postulantes registrados.",
  "Aceptadas",
  "Rechazadas",
  "Pendientes",
  "Canceladas",
  "Otros",
  "Cerradas",
  "Completadas",
  "Borrador",
  "Pausadas",
  "convocatorias",
  "postulaciones cargadas",
  "Postulantes por proyecto",
  "Proyecto seleccionado",
  "Revisa las convocatorias asociadas y abre sus postulantes para aceptar o rechazar.",
  "Ver todas las convocatorias",
  "Cargando registros...",
  "proyectos",
  "Buscar convocatoria",
  "Buscar",
  "Buscar convocatoria, proyecto o rol",
  "Todas",
  "convocatorias",
  "Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.",
  "Proyecto",
  "Todos",
  "Estado",
  "Modalidad",
  "Cargando convocatorias...",
  "Este proyecto todavía no tiene convocatorias",
  "No hay convocatorias todavía",
  "Sin resultados",
  "Ajusta los filtros para ver otras convocatorias.",
  "Convocatoria",
  "Rol",
  "Especialidad",
  "Fecha límite",
  "Postulantes",
  "Acciones",
  "Sin descripción",
  "No informado",
  "postul.",
  "Ver detalle",
  "Editar",
  "Cargando...",
  "Ver postulantes",
  "Cancelando...",
  "Cancelar",
  "Detalle de convocatoria",
  "Esta convocatoria no incluye descripción adicional.",
  "Rol requerido",
  "Ubicación",
  "Cancelar convocatoria",
  "Cerrar",
  "Editar convocatoria",
  "Título",
  "Descripción",
  "Requisitos",
  "Guardando...",
  "Guardar cambios",
  "Iniciar",
  "Postulantes",
  "Cargando postulantes...",
  "Fecha de postulación:",
  "Mensaje:",
  "No disponible todavía.",
  "Actualizando...",
  "Aceptar",
  "Rechazar",
  "No hay postulantes para esta convocatoria.",
  "Convocatorias activas",
  "No hay convocatorias para mostrar.",
];

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeUpper(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function formatOpportunityStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeUpper(value);
  return OPPORTUNITY_STATUS_LABELS[normalizedValue] ?? formatStatusLabel(value);
}

function formatOpportunityModality(value?: string | null): string {
  const normalizedValue = normalizeUpper(value);
  return OPPORTUNITY_MODALITY_LABELS[normalizedValue] ?? value?.trim() ?? "No informada";
}

function formatApplicationStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptada",
    CANCELLED: "Cancelada",
    IN_REVIEW: "En revisión",
    PENDING: "Pendiente",
    PRESELECTED: "Preseleccionada",
    REJECTED: "Rechazada",
    SUBMITTED: "Enviada",
  };
  const normalizedValue = value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function isTerminalApplicationStatus(value?: string | null): boolean {
  return ["ACCEPTED", "REJECTED", "CANCELLED"].includes(normalizeUpper(value));
}

function getApplicationsByStatusGroup(
  applications: TalentApplication[],
  group: ApplicationStatusGroup
): TalentApplication[] {
  return applications.filter((application) =>
    group.statuses.includes(normalizeUpper(application.status).replaceAll(" ", "_"))
  );
}

function getOpportunityStatusGroupItems(
  opportunities: Opportunity[]
): Array<OpportunityStatusGroup & { opportunities: Opportunity[] }> {
  return OPPORTUNITY_STATUS_GROUPS.map((group) => ({
    ...group,
    opportunities: opportunities.filter((opportunity) =>
      group.statuses.includes(normalizeUpper(opportunity.status))
    ),
  })).filter((group) => group.opportunities.length > 0);
}

function formatPercentage(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  const percentage = (value / total) * 100;
  return `${percentage >= 10 ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
}

function formatApplicationDate(value?: string | null): string {
  if (!value) return "Sin fecha";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getApplicantName(application: TalentApplication): string {
  return getTalentIdentityName(application);
}

function getApplicantEmail(application: TalentApplication): string {
  return getTalentIdentityEmail(application);
}

function getApplicantSpecialties(application: TalentApplication): string[] {
  return (
    application.specialties ??
    application.talent_profile?.specialties ??
    application.profile?.specialties ??
    (application.main_specialty ? [application.main_specialty] : [])
  );
}

function getOpportunityApplicantsCount(opportunity: Opportunity): number {
  return Number(
    opportunity.applications_count ??
    opportunity.applicants_count ??
    opportunity.applicantsCount ??
    0
  );
}

function getOpportunityProjectLabel(opportunity: Opportunity, fallback = "Proyecto sin informar"): string {
  return (
    opportunity.project_title?.trim() ||
    opportunity.project?.title?.trim() ||
    fallback
  );
}

function buildFormState(opportunity: Opportunity): OpportunityFormState {
  return {
    project_id: opportunity.project_id ?? "",
    title: opportunity.title ?? "",
    role_needed: opportunity.role_needed ?? "",
    specialty: opportunity.specialty ?? "",
    description: opportunity.description ?? "",
    location: opportunity.location ?? "",
    modality: opportunity.modality ?? "REMOTE",
    requirements: requirementsToTextarea(opportunity.requirements),
    status: toVisibleStatusAction(opportunity.status),
    deadline: toDateInputValue(opportunity.deadline),
  };
}

function ProducerOpportunitiesContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState("");
  const [loadingApplicantsId, setLoadingApplicantsId] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [detailOpportunity, setDetailOpportunity] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [editFormData, setEditFormData] = useState<OpportunityFormState | null>(null);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [applicantsModalOpportunity, setApplicantsModalOpportunity] =
    useState<Opportunity | null>(null);
  const [profileApplication, setProfileApplication] =
    useState<TalentApplication | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    projectId: "",
    status: "",
    modality: "",
  });
  const [applicantsByOpportunity, setApplicantsByOpportunity] = useState<
    Record<string, TalentApplication[]>
  >({});
  const [applicantsErrorByOpportunity, setApplicantsErrorByOpportunity] = useState<
    Record<string, string>
  >({});
  const [applicantsSuccessByOpportunity, setApplicantsSuccessByOpportunity] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");
  const [summaryModal, setSummaryModal] = useState<
    "all" | "active" | "status" | "applicants" | null
  >(null);
  const [isApplicantsSummaryLoading, setIsApplicantsSummaryLoading] = useState(false);
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        producerOpportunitiesBaseTexts,
        projects.flatMap((project) => [project.title, project.description, project.location, project.production_type, project.status]),
        opportunities.flatMap((opportunity) => [
          opportunity.title,
          opportunity.description,
          opportunity.role_needed,
          opportunity.specialty,
          opportunity.location,
          opportunity.modality,
          formatOpportunityStatusLabel(opportunity.status),
          getOpportunityProjectLabel(opportunity),
          ...(opportunity.requirements ?? []),
        ]),
        Object.values(applicantsByOpportunity).flatMap((applications) =>
          applications.flatMap((application) => [
            application.message,
            application.status,
            application.main_specialty,
            ...getApplicantSpecialties(application),
          ])
        )
      ),
    [applicantsByOpportunity, opportunities, projects]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);
  const getVisibleOpportunityProjectLabel = (opportunity: Opportunity) => {
    const label = getOpportunityProjectLabel(opportunity);

    return label === "Proyecto sin informar" ? tAuto("Proyecto sin informar") : tAuto(label);
  };

  const focusedProjectId =
    (location.state as { projectId?: string } | null)?.projectId ?? "";

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const nextOpportunities = await reusePendingRequest(
          `producer-opportunities-crm:${token}`,
          () => getMyOpportunitiesCrm(token ?? undefined)
        );

        if (!isMounted) return;

        const createdOpportunity =
          (location.state as { createdOpportunity?: Opportunity } | null)
            ?.createdOpportunity ?? null;

        const mergedOpportunities =
          createdOpportunity &&
          !nextOpportunities.some((opportunity) => opportunity.id === createdOpportunity.id)
            ? [createdOpportunity, ...nextOpportunities]
            : nextOpportunities;

        setOpportunities(mergedOpportunities);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tAuto("No se pudieron cargar tus convocatorias.")
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [location.state, token]);

  const activeCount = opportunities.filter((item) => isActiveStatus(item.status)).length;
  const opportunityStatusGroups = useMemo(
    () => getOpportunityStatusGroupItems(opportunities),
    [opportunities]
  );
  const opportunityStatusChartItems = useMemo<DonutChartItem[]>(
    () =>
      opportunityStatusGroups.map((group) => ({
        label: tAuto(group.label),
        value: group.opportunities.length,
        colorClass: group.colorClass,
      })),
    [opportunityStatusGroups, tAuto]
  );
  const totalApplicantsCount = useMemo(
    () =>
      opportunities.reduce((total, opportunity) => {
        const loadedApplicants = applicantsByOpportunity[opportunity.id];
        return total + (loadedApplicants?.length ?? getOpportunityApplicantsCount(opportunity));
      }, 0),
    [applicantsByOpportunity, opportunities]
  );
  const loadedApplications = useMemo(
    () => Object.values(applicantsByOpportunity).flat(),
    [applicantsByOpportunity]
  );
  const applicationStatusChartItems = useMemo<DonutChartItem[]>(
    () => {
      const groupedItems = APPLICATION_STATUS_GROUPS.map((group) => ({
        label: tAuto(group.label),
        value: getApplicationsByStatusGroup(loadedApplications, group).length,
        colorClass: group.colorClass,
      }));
      const groupedStatuses = new Set(
        APPLICATION_STATUS_GROUPS.flatMap((group) => group.statuses)
      );
      const otherCount = loadedApplications.filter(
        (application) =>
          !groupedStatuses.has(
            normalizeUpper(application.status).replaceAll(" ", "_")
          )
      ).length;

      return [
        ...groupedItems,
        {
          label: tAuto("Otros"),
          value: otherCount,
          colorClass: "donut-chart__segment--violet",
        },
      ].filter((item) => item.value > 0);
    },
    [loadedApplications, tAuto]
  );
  const hasApplicantsSummaryErrors = opportunities.some(
    (opportunity) => Boolean(applicantsErrorByOpportunity[opportunity.id])
  );
  const focusedProjectTitle =
    opportunities.find((opportunity) => opportunity.project_id === focusedProjectId)?.project_title ??
    opportunities.find((opportunity) => opportunity.project_id === focusedProjectId)?.project?.title ??
    "";

  const displayedOpportunities = focusedProjectId
    ? opportunities.filter((opportunity) => opportunity.project_id === focusedProjectId)
    : opportunities;

  const summaryOpportunities =
    summaryModal === "active"
      ? opportunities.filter((item) => isActiveStatus(item.status))
      : opportunities;

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(displayedOpportunities.map((item) => normalizeUpper(item.status)).filter(Boolean))
      ).sort(),
    [displayedOpportunities]
  );

  const modalityOptions = useMemo(
    () =>
      Array.from(
        new Set(displayedOpportunities.map((item) => normalizeUpper(item.modality)).filter(Boolean))
      ).sort(),
    [displayedOpportunities]
  );

  const projectOptions = useMemo(() => {
    const options = new Map<string, string>();

    opportunities.forEach((opportunity) => {
      if (opportunity.project_id) {
        options.set(opportunity.project_id, getOpportunityProjectLabel(opportunity));
      }
    });

    return Array.from(options.entries()).map(([id, title]) => ({ id, title }));
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const search = normalizeText(filters.search);

    return displayedOpportunities.filter((opportunity) => {
      const projectTitle = getOpportunityProjectLabel(opportunity);

      const matchesSearch =
        !search ||
        normalizeText(opportunity.title).includes(search) ||
        normalizeText(projectTitle).includes(search) ||
        normalizeText(opportunity.role_needed).includes(search) ||
        normalizeText(opportunity.specialty).includes(search);

      const matchesProject = !filters.projectId || opportunity.project_id === filters.projectId;
      const matchesStatus = !filters.status || normalizeUpper(opportunity.status) === filters.status;
      const matchesModality =
        !filters.modality || normalizeUpper(opportunity.modality) === filters.modality;

      return matchesSearch && matchesProject && matchesStatus && matchesModality;
    });
  }, [displayedOpportunities, filters]);

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const ensureProjectsLoaded = async () => {
    if (projects.length > 0) {
      return;
    }

    const nextProjects = await reusePendingRequest(
      `producer-opportunities-projects:${token}`,
      () => getMyProjects(token ?? undefined)
    );

    setProjects(nextProjects);
  };

  const handleOpenEditModal = async (opportunity: Opportunity) => {
    try {
      setEditError("");
      await ensureProjectsLoaded();
    } catch (loadError) {
      setEditError(
        loadError instanceof Error
          ? loadError.message
          : tAuto("No se pudieron cargar los proyectos para editar.")
      );
    }

    setEditingOpportunity(opportunity);
    setEditFormData(buildFormState(opportunity));
  };

  const handleEditChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setEditFormData((current) => (current ? { ...current, [name]: value } : current));
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingOpportunity || !editFormData) return;

    try {
      setIsEditingSubmitting(true);
      setEditError("");

      const updated = await updateOpportunity(
        editingOpportunity.id,
        normalizeOpportunityFormData(editFormData),
        token ?? undefined
      );

      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setDetailOpportunity((current) => (current?.id === updated.id ? updated : current));
      setApplicantsModalOpportunity((current) =>
        current?.id === updated.id ? updated : current
      );

      setEditingOpportunity(null);
      setEditFormData(null);
    } catch (submitError) {
      setEditError(
        submitError instanceof Error
          ? submitError.message
          : tAuto("No se pudo actualizar la convocatoria.")
      );
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      setClosingId(opportunityId);
      setError("");

      const updated = await updateOpportunityStatus(
        opportunityId,
        { status: "CANCELLED" },
        token ?? undefined
      );

      setOpportunities((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setDetailOpportunity((current) => (current?.id === updated.id ? updated : current));
      setEditingOpportunity((current) => (current?.id === updated.id ? updated : current));
      setApplicantsModalOpportunity((current) =>
        current?.id === updated.id ? updated : current
      );
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : tAuto("No se pudo cerrar la convocatoria.")
      );
    } finally {
      setClosingId("");
    }
  };

  const handleOpenApplicantsModal = async (opportunity: Opportunity) => {
    setApplicantsModalOpportunity(opportunity);
    setApplicantsSuccessByOpportunity((current) => {
      const nextValue = { ...current };
      delete nextValue[opportunity.id];
      return nextValue;
    });

    if (Object.hasOwn(applicantsByOpportunity, opportunity.id)) {
      return;
    }

    try {
      setLoadingApplicantsId(opportunity.id);
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunity.id];
        return nextValue;
      });

      const applicants = await getOpportunityApplications(opportunity.id, token ?? undefined);

      setApplicantsByOpportunity((current) => ({
        ...current,
        [opportunity.id]: applicants,
      }));
    } catch (loadError) {
      setApplicantsErrorByOpportunity((current) => ({
        ...current,
        [opportunity.id]:
          loadError instanceof Error
            ? loadError.message
            : tAuto("No se pudieron cargar los postulantes."),
      }));
    } finally {
      setLoadingApplicantsId("");
    }
  };

  const handleOpenApplicantsSummary = async () => {
    setSummaryModal("applicants");

    const opportunitiesToLoad = opportunities.filter(
      (opportunity) => !Object.hasOwn(applicantsByOpportunity, opportunity.id)
    );

    if (!opportunitiesToLoad.length || isApplicantsSummaryLoading) {
      return;
    }

    try {
      setIsApplicantsSummaryLoading(true);
      const results = await Promise.all(
        opportunitiesToLoad.map(async (opportunity) => {
          try {
            const applications = await getOpportunityApplications(
              opportunity.id,
              token ?? undefined
            );
            return { opportunityId: opportunity.id, applications, error: "" };
          } catch (loadError) {
            return {
              opportunityId: opportunity.id,
              applications: null,
              error:
                loadError instanceof Error
                  ? loadError.message
                  : tAuto("No se pudieron cargar los postulantes."),
            };
          }
        })
      );

      setApplicantsByOpportunity((current) => {
        const nextValue = { ...current };
        results.forEach((result) => {
          if (result.applications) {
            nextValue[result.opportunityId] = result.applications;
          }
        });
        return nextValue;
      });
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        results.forEach((result) => {
          if (result.error) {
            nextValue[result.opportunityId] = result.error;
          } else {
            delete nextValue[result.opportunityId];
          }
        });
        return nextValue;
      });
    } finally {
      setIsApplicantsSummaryLoading(false);
    }
  };

  const handleUpdateApplicantStatus = async (
    opportunityId: string,
    applicationId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    try {
      setUpdatingApplicationId(applicationId);
      setApplicantsErrorByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunityId];
        return nextValue;
      });

      const updatedApplication = await updateApplicationStatus(
        applicationId,
        status,
        token ?? undefined,
        status === "ACCEPTED"
          ? inferCrewCategoryFromText(
              opportunities.find((opportunity) => opportunity.id === opportunityId)?.role_needed,
              opportunities.find((opportunity) => opportunity.id === opportunityId)?.specialty
            )
          : undefined
      );

      setApplicantsByOpportunity((current) => ({
        ...current,
        [opportunityId]: (current[opportunityId] ?? []).map((application) =>
          application.id === applicationId
            ? {
                ...application,
                ...(updatedApplication.opportunity_id ? updatedApplication : {}),
                id: application.id,
                opportunity_id: application.opportunity_id,
                status: updatedApplication.status || status,
              }
            : application
        ),
      }));

      setApplicantsSuccessByOpportunity((current) => ({
        ...current,
        [opportunityId]:
          status === "ACCEPTED"
            ? tAuto("Postulante aceptado correctamente.")
            : tAuto("Postulante rechazado correctamente."),
      }));
    } catch (updateError) {
      setApplicantsErrorByOpportunity((current) => ({
        ...current,
        [opportunityId]:
          updateError instanceof Error
            ? updateError.message
            : tAuto("No se pudo actualizar el estado del postulante."),
      }));
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const handleCloseApplicantsModal = () => {
    const opportunityId = applicantsModalOpportunity?.id;

    if (opportunityId) {
      setApplicantsSuccessByOpportunity((current) => {
        const nextValue = { ...current };
        delete nextValue[opportunityId];
        return nextValue;
      });
    }

    setApplicantsModalOpportunity(null);
  };

  return (
    <div className="producer-shell">
      <section className="producer-card producer-banner producer-banner--compact">
        <div>
          <p className="producer-page__eyebrow">{tAuto("Convocatorias")}</p>
          <h1 className="producer-page__title">{tAuto("Administra tus oportunidades")}</h1>
          <p className="producer-page__subtitle">
            {tAuto(
              "Publica, actualiza o cierra convocatorias conectadas a tus proyectos reales."
            )}
          </p>
        </div>
        <Link className="producer-button producer-button--primary" to="/producer/opportunities/new">
          {tAuto("Nueva convocatoria")}
        </Link>
      </section>

      <section className="producer-metrics">
        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setSummaryModal("all")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : opportunities.length}</span>
          <p className="producer-metric__label">{tAuto("Total convocatorias")}</p>
        </ClickableSummaryCard>

        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => setSummaryModal("active")}
        >
          <span className="producer-metric__value">{isLoading ? "..." : activeCount}</span>
          <p className="producer-metric__label">{tAuto("Activas")}</p>
        </ClickableSummaryCard>

        <ClickableSummaryCard
          className="producer-card producer-metric producer-opportunity-chart-metric"
          onClick={() => setSummaryModal("status")}
        >
          <p className="producer-metric__label">{tAuto("Estado de convocatorias")}</p>
          <DonutChart
            items={opportunityStatusChartItems}
            size={132}
            thickness={18}
            centerValue={isLoading ? "..." : opportunities.length}
            centerLabel={tAuto("convocatorias")}
          />
        </ClickableSummaryCard>

        <ClickableSummaryCard
          className="producer-card producer-metric"
          onClick={() => void handleOpenApplicantsSummary()}
        >
          <span className="producer-metric__value">
            {isLoading ? "..." : totalApplicantsCount}
          </span>
          <p className="producer-metric__label">{tAuto("Postulantes")}</p>
          <p className="producer-opportunity-metric__caption">
            {tAuto("Los detalles se cargan al abrir este resumen.")}
          </p>
        </ClickableSummaryCard>
      </section>

      {error ? (
        <section className="producer-card producer-feedback producer-feedback--error">
          <p>{error}</p>
        </section>
      ) : null}

      {focusedProjectId ? (
        <section className="producer-card producer-flow-focus">
          <div>
            <p className="producer-page__eyebrow">{tAuto("Postulantes por proyecto")}</p>
            <h2 className="producer-record__title">
              {focusedProjectTitle || tAuto("Proyecto seleccionado")}
            </h2>
            <p className="producer-record__text">
              {tAuto(
                "Revisa las convocatorias asociadas y abre sus postulantes para aceptar o rechazar."
              )}
            </p>
          </div>
          <button
            className="producer-button"
            type="button"
            onClick={() => navigate("/producer/opportunities", { replace: true })}
          >
            {tAuto("Ver todas las convocatorias")}
          </button>
        </section>
      ) : null}

      <section className="producer-card producer-project-crm">
        <div className="producer-project-crm__heading">
          <div>
            <h2>{tAuto("Convocatorias")}</h2>
            <span>
              {isLoading
                ? tAuto("Cargando registros...")
                : `${filteredOpportunities.length} de ${displayedOpportunities.length} ${tAuto("convocatorias")}`}
            </span>
          </div>
        </div>

        <div className="producer-project-filters">
          <label className="producer-field">
            <span>{tAuto("Buscar")}</span>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder={tAuto("Buscar convocatoria, proyecto o rol")}
            />
          </label>

          <label className="producer-field">
            <span>{tAuto("Proyecto")}</span>
            <select name="projectId" value={filters.projectId} onChange={handleFilterChange}>
              <option value="">{tAuto("Todos")}</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {tAuto(project.title)}
                </option>
              ))}
            </select>
          </label>

          <label className="producer-field">
            <span>{tAuto("Estado")}</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">{tAuto("Todos")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {tAuto(formatOpportunityStatusLabel(status))}
                </option>
              ))}
            </select>
          </label>

          <label className="producer-field">
            <span>{tAuto("Modalidad")}</span>
            <select name="modality" value={filters.modality} onChange={handleFilterChange}>
              <option value="">{tAuto("Todas")}</option>
              {modalityOptions.map((modality) => (
                <option key={modality} value={modality}>
                  {tAuto(formatOpportunityModality(modality))}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <article className="producer-empty">
            <p>{tAuto("Cargando convocatorias...")}</p>
          </article>
        ) : displayedOpportunities.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">
              {focusedProjectId
                ? tAuto("Este proyecto todavía no tiene convocatorias")
                : tAuto("No hay convocatorias todavía")}
            </h2>
            <p className="producer-card__text">
              {tAuto("Crea una oportunidad real para comenzar a recibir postulaciones desde el backend.")}
            </p>
          </article>
        ) : filteredOpportunities.length === 0 ? (
          <article className="producer-empty producer-project-crm__empty">
            <h2 className="producer-card__title">{tAuto("Sin resultados")}</h2>
            <p className="producer-card__text">
              {tAuto("Ajusta los filtros para ver otras convocatorias.")}
            </p>
          </article>
        ) : (
          <div className="producer-project-table-wrap">
            <table className="producer-project-table">
              <thead>
                <tr>
                  <th>{tAuto("Convocatoria")}</th>
                  <th>{tAuto("Proyecto")}</th>
                  <th>{tAuto("Rol")}</th>
                  <th>{tAuto("Especialidad")}</th>
                  <th>{tAuto("Modalidad")}</th>
                  <th>{tAuto("Fecha límite")}</th>
                  <th>{tAuto("Estado")}</th>
                  <th>{tAuto("Postulantes")}</th>
                  <th>{tAuto("Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>
                      <div className="producer-project-table__title">
                        <strong>{tAuto(opportunity.title)}</strong>
                        <span>
                          {opportunity.description
                            ? tAuto(opportunity.description)
                            : tAuto("Sin descripción")}
                        </span>
                      </div>
                    </td>
                    <td>{getVisibleOpportunityProjectLabel(opportunity)}</td>
                    <td>{opportunity.role_needed ? tAuto(opportunity.role_needed) : tAuto("No informado")}</td>
                    <td>{opportunity.specialty ? tAuto(opportunity.specialty) : tAuto("No informada")}</td>
                    <td>{tAuto(formatOpportunityModality(opportunity.modality))}</td>
                    <td>{formatDisplayDate(opportunity.deadline)}</td>
                    <td>
                      <span
                        className={`producer-status producer-status--${
                          normalizeUpper(opportunity.status).toLowerCase() || "default"
                        }`}
                      >
                        {tAuto(formatOpportunityStatusLabel(opportunity.status))}
                      </span>
                    </td>
                    <td>
                      <span className="producer-count-badge">
                        {applicantsByOpportunity[opportunity.id]?.length ??
                          getOpportunityApplicantsCount(opportunity)} {tAuto("postul.")}
                      </span>
                    </td>
                    <td>
                      <div className="producer-table-actions">
                        <button
                          className="producer-button"
                          type="button"
                          onClick={() => setDetailOpportunity(opportunity)}
                        >
                          {tAuto("Ver detalle")}
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          onClick={() => void handleOpenEditModal(opportunity)}
                        >
                          {tAuto("Editar")}
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          disabled={loadingApplicantsId === opportunity.id}
                          onClick={() => void handleOpenApplicantsModal(opportunity)}
                        >
                          {loadingApplicantsId === opportunity.id
                            ? tAuto("Cargando...")
                            : tAuto("Ver postulantes")}
                        </button>

                        <button
                          className="producer-button"
                          type="button"
                          disabled={
                            isCancelledStatus(opportunity.status) ||
                            closingId === opportunity.id
                          }
                          onClick={() => void handleCloseOpportunity(opportunity.id)}
                        >
                          {closingId === opportunity.id
                            ? tAuto("Cancelando...")
                            : isCancelledStatus(opportunity.status)
                            ? tAuto("Cancelada")
                            : tAuto("Cancelar")}
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

      {detailOpportunity ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">{tAuto("Detalle de convocatoria")}</p>
                <h2>{tAuto(detailOpportunity.title)}</h2>
              </div>
              <span
                className={`producer-status producer-status--${
                  normalizeUpper(detailOpportunity.status).toLowerCase() || "default"
                }`}
              >
                {tAuto(formatOpportunityStatusLabel(detailOpportunity.status))}
              </span>
            </div>

            <p className="producer-record__text">
              {detailOpportunity.description
                ? tAuto(detailOpportunity.description)
                : tAuto("Esta convocatoria no incluye descripción adicional.")}
            </p>

            <div className="producer-project-detail-grid">
              <div>
                <span>{tAuto("Proyecto")}</span>
                <strong>{getVisibleOpportunityProjectLabel(detailOpportunity)}</strong>
              </div>
              <div>
                <span>{tAuto("Rol requerido")}</span>
                <strong>{detailOpportunity.role_needed ? tAuto(detailOpportunity.role_needed) : tAuto("No informado")}</strong>
              </div>
              <div>
                <span>{tAuto("Especialidad")}</span>
                <strong>{detailOpportunity.specialty ? tAuto(detailOpportunity.specialty) : tAuto("No informada")}</strong>
              </div>
              <div>
                <span>{tAuto("Ubicación")}</span>
                <strong>{detailOpportunity.location ? tAuto(detailOpportunity.location) : tAuto("No informada")}</strong>
              </div>
              <div>
                <span>{tAuto("Modalidad")}</span>
                <strong>{tAuto(formatOpportunityModality(detailOpportunity.modality))}</strong>
              </div>
              <div>
                <span>{tAuto("Fecha límite")}</span>
                <strong>{formatDisplayDate(detailOpportunity.deadline)}</strong>
              </div>
            </div>

            {detailOpportunity.requirements?.length ? (
              <div className="producer-chip-list">
                {detailOpportunity.requirements.map((item) => (
                  <span key={item} className="producer-chip">
                    {tAuto(item)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="producer-actions">
              <button
                className="producer-button"
                type="button"
                onClick={() => void handleOpenEditModal(detailOpportunity)}
              >
                {tAuto("Editar")}
              </button>

              <button
                className="producer-button"
                type="button"
                onClick={() => void handleOpenApplicantsModal(detailOpportunity)}
              >
                {tAuto("Ver postulantes")}
              </button>

              <button
                className="producer-button"
                type="button"
                disabled={
                  isCancelledStatus(detailOpportunity.status) ||
                  closingId === detailOpportunity.id
                }
                onClick={() => void handleCloseOpportunity(detailOpportunity.id)}
              >
                {tAuto("Cancelar convocatoria")}
              </button>

              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => setDetailOpportunity(null)}
              >
                {tAuto("Cerrar")}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {editingOpportunity && editFormData ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">{tAuto("Editar convocatoria")}</p>
                <h2>{editingOpportunity.title}</h2>
              </div>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={() => {
                  setEditingOpportunity(null);
                  setEditFormData(null);
                  setEditError("");
                }}
              >
                {tAuto("Cerrar")}
              </button>
            </div>

            <form className="producer-form" onSubmit={handleEditSubmit}>
              <label className="producer-field">
                <span>{tAuto("Proyecto")}</span>
                <select
                  name="project_id"
                  value={editFormData.project_id}
                  onChange={handleEditChange}
                  required
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {tAuto(project.title)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{tAuto("Título")}</span>
                <input name="title" value={editFormData.title} onChange={handleEditChange} required />
              </label>

              <label className="producer-field">
                <span>{tAuto("Rol requerido")}</span>
                <input
                  name="role_needed"
                  value={editFormData.role_needed}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>{tAuto("Especialidad")}</span>
                <input
                  name="specialty"
                  value={editFormData.specialty}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>{tAuto("Ubicación")}</span>
                <input
                  name="location"
                  value={editFormData.location}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="producer-field">
                <span>{tAuto("Modalidad")}</span>
                <select name="modality" value={editFormData.modality} onChange={handleEditChange}>
                  {OPPORTUNITY_MODALITY_OPTIONS.map((modality) => (
                    <option key={modality} value={modality}>
                      {tAuto(formatOpportunityModality(modality))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{tAuto("Estado")}</span>
                <select name="status" value={editFormData.status} onChange={handleEditChange}>
                  {OPPORTUNITY_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {tAuto(status.label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="producer-field">
                <span>{tAuto("Fecha límite")}</span>
                <input
                  type="date"
                  name="deadline"
                  value={editFormData.deadline}
                  onChange={handleEditChange}
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>{tAuto("Descripción")}</span>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  rows={4}
                  required
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>{tAuto("Requisitos")}</span>
                <textarea
                  name="requirements"
                  value={editFormData.requirements}
                  onChange={handleEditChange}
                  rows={4}
                />
              </label>

              {editError ? (
                <p className="producer-feedback producer-feedback--error">{editError}</p>
              ) : null}

              <div className="producer-actions">
                <button
                  className="producer-button"
                  type="button"
                  onClick={() => {
                    setEditingOpportunity(null);
                    setEditFormData(null);
                    setEditError("");
                  }}
                >
                  {tAuto("Cancelar")}
                </button>
                <button
                  className="producer-button producer-button--primary"
                  type="submit"
                  disabled={isEditingSubmitting}
                >
                  {isEditingSubmitting ? tAuto("Guardando...") : tAuto("Guardar cambios")}
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {applicantsModalOpportunity ? (
        <div className="producer-modal" role="presentation">
          <article
            className="producer-modal__panel producer-project-detail-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="producer-project-detail-modal__header">
              <div>
                <p className="producer-page__eyebrow">{tAuto("Postulantes")}</p>
                <h2>{tAuto(applicantsModalOpportunity.title)}</h2>
              </div>
              <button
                className="producer-button producer-button--primary"
                type="button"
                onClick={handleCloseApplicantsModal}
              >
                {tAuto("Cerrar")}
              </button>
            </div>

            {applicantsSuccessByOpportunity[applicantsModalOpportunity.id] ? (
              <p className="producer-feedback producer-feedback--success">
                {applicantsSuccessByOpportunity[applicantsModalOpportunity.id]}
              </p>
            ) : null}

            {loadingApplicantsId === applicantsModalOpportunity.id ? (
              <p className="producer-muted">{tAuto("Cargando postulantes...")}</p>
            ) : applicantsErrorByOpportunity[applicantsModalOpportunity.id] ? (
              <p className="producer-feedback producer-feedback--error">
                {applicantsErrorByOpportunity[applicantsModalOpportunity.id]}
              </p>
            ) : applicantsByOpportunity[applicantsModalOpportunity.id]?.length ? (
              <div className="producer-list">
                {applicantsByOpportunity[applicantsModalOpportunity.id].map(
                  (application) => {
                    const applicationStatus = normalizeUpper(application.status);
                    const isTerminalStatus = isTerminalApplicationStatus(application.status);

                    return (
                    <article
                      key={application.id}
                      className="producer-list-card producer-applicant-card"
                    >
                      <div className="producer-record__header">
                        <button
                          className="producer-profile-trigger producer-applicant-inline"
                          type="button"
                          disabled={!resolveTalentUserId(application)}
                          title={
                            resolveTalentUserId(application)
                              ? "Ver ficha"
                              : "No se pudo identificar el user_id del talento."
                          }
                          onClick={() => setProfileApplication(application)}
                        >
                          <TalentAvatar
                            src={getTalentIdentityPhoto(application)}
                            name={getApplicantName(application)}
                            size="sm"
                          />
                          <div>
                            <p className="producer-list-card__meta">
                              {getApplicantEmail(application)}
                            </p>
                            <strong className="producer-list-card__title">
                              {getApplicantName(application)}
                            </strong>
                          </div>
                        </button>
                        <span className={`producer-status producer-status--${applicationStatus.toLowerCase() || "default"}`}>
                          {tAuto(formatApplicationStatus(application.status))}
                        </span>
                      </div>

                      <p className="producer-list-card__text">
                        {tAuto("Fecha de postulación:")}{" "}
                        {formatApplicationDate(
                          application.applied_at || application.created_at
                        )}
                      </p>
                      <p className="producer-list-card__text">
                        {tAuto("Mensaje:")}{" "}
                        {application.message?.trim()
                          ? tAuto(application.message.trim())
                          : tAuto("No disponible todavía.")}
                      </p>

                      {getApplicantSpecialties(application).length ? (
                        <div className="producer-chip-list">
                          {getApplicantSpecialties(application).map((specialty) => (
                            <span key={specialty} className="producer-chip">
                              {tAuto(specialty)}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="producer-actions producer-actions--inline">
                        <button
                          className="producer-button"
                          type="button"
                          disabled={!resolveTalentUserId(application)}
                          title={
                            resolveTalentUserId(application)
                              ? undefined
                              : "No se pudo identificar el user_id del talento."
                          }
                          onClick={() => setProfileApplication(application)}
                        >
                          {resolveTalentUserId(application)
                            ? "Ver ficha"
                            : "Ficha no disponible: falta user_id"}
                        </button>
                        {isTerminalStatus ? null : (
                          <>
                          <button
                            className="producer-button producer-button--primary"
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() =>
                              void handleUpdateApplicantStatus(
                                applicantsModalOpportunity.id,
                                application.id,
                                "ACCEPTED"
                              )
                            }
                          >
                            {updatingApplicationId === application.id
                              ? tAuto("Actualizando...")
                              : tAuto("Aceptar")}
                          </button>
                          <button
                            className="producer-button"
                            type="button"
                            disabled={updatingApplicationId === application.id}
                            onClick={() =>
                              void handleUpdateApplicantStatus(
                                applicantsModalOpportunity.id,
                                application.id,
                                "REJECTED"
                              )
                            }
                          >
                            {tAuto("Rechazar")}
                          </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                }
                )}
              </div>
            ) : (
              <p className="producer-muted">
                {tAuto("No hay postulantes para esta convocatoria.")}
              </p>
            )}
          </article>
        </div>
      ) : null}

      {summaryModal === "status" ? (
        <SummaryDetailModal
          title={tAuto("Estado de convocatorias")}
          description={tAuto("Distribucion real por estado")}
          onClose={() => setSummaryModal(null)}
        >
          <div className="producer-opportunity-summary-chart">
            <DonutChart
              items={opportunityStatusChartItems}
              size={240}
              thickness={32}
              centerValue={opportunities.length}
              centerLabel={tAuto("convocatorias")}
            />
          </div>

          <div className="producer-opportunity-status-groups">
            {opportunityStatusGroups.length ? (
              opportunityStatusGroups.map((group) => (
                <section
                  className="summary-detail-list__item producer-opportunity-status-group"
                  key={group.key}
                >
                  <header>
                    <div>
                      <h3>{tAuto(group.label)}</h3>
                      <p>
                        {group.opportunities.length}{" "}
                        {tAuto("convocatorias")} |{" "}
                        {formatPercentage(group.opportunities.length, opportunities.length)}
                      </p>
                    </div>
                    <span
                      className={`donut-chart__legend-color ${group.colorClass}`}
                      aria-hidden="true"
                    />
                  </header>
                  <div className="producer-opportunity-status-group__items">
                    {group.opportunities.map((opportunity) => (
                      <article key={opportunity.id}>
                        <strong>{tAuto(opportunity.title)}</strong>
                        <span>{getVisibleOpportunityProjectLabel(opportunity)}</span>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="summary-detail-empty">
                {tAuto("No hay convocatorias para mostrar.")}
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}

      {summaryModal === "applicants" ? (
        <SummaryDetailModal
          title={tAuto("Postulantes agrupados por convocatoria")}
          description={tAuto("Distribucion de postulaciones")}
          onClose={() => setSummaryModal(null)}
        >
          {isApplicantsSummaryLoading ? (
            <div className="producer-opportunity-applicants-skeleton" aria-hidden="true">
              <div />
              <span />
              <span />
              <span />
            </div>
          ) : loadedApplications.length ? (
            <div className="producer-opportunity-summary-chart">
              <DonutChart
                items={applicationStatusChartItems}
                size={220}
                thickness={30}
                centerValue={loadedApplications.length}
                centerLabel={tAuto("postulaciones cargadas")}
              />
            </div>
          ) : null}

          {isApplicantsSummaryLoading ? (
            <p className="producer-muted">
              {tAuto("Cargando postulantes de las convocatorias...")}
            </p>
          ) : null}
          {!isApplicantsSummaryLoading && hasApplicantsSummaryErrors ? (
            <p className="producer-feedback producer-feedback--warning">
              {tAuto(
                "No fue posible cargar todas las convocatorias. La distribucion considera solo postulaciones cargadas."
              )}
            </p>
          ) : null}

          <div className="producer-opportunity-applicant-groups">
            {!isApplicantsSummaryLoading && opportunities.length ? (
              opportunities.map((opportunity) => {
                const applications = applicantsByOpportunity[opportunity.id];
                const reportedTotal = getOpportunityApplicantsCount(opportunity);
                const acceptedCount = applications
                  ? getApplicationsByStatusGroup(applications, APPLICATION_STATUS_GROUPS[0]).length
                  : 0;
                const rejectedCount = applications
                  ? getApplicationsByStatusGroup(applications, APPLICATION_STATUS_GROUPS[1]).length
                  : 0;
                const pendingCount = applications
                  ? getApplicationsByStatusGroup(applications, APPLICATION_STATUS_GROUPS[2]).length
                  : 0;
                const cancelledCount = applications
                  ? getApplicationsByStatusGroup(applications, APPLICATION_STATUS_GROUPS[3]).length
                  : 0;
                const opportunityError = applicantsErrorByOpportunity[opportunity.id];

                return (
                  <section
                    className="summary-detail-list__item producer-opportunity-applicant-group"
                    key={opportunity.id}
                  >
                    <header>
                      <div>
                        <h3>{tAuto(opportunity.title)}</h3>
                        <p>{getVisibleOpportunityProjectLabel(opportunity)}</p>
                      </div>
                      <strong>{applications?.length ?? reportedTotal}</strong>
                    </header>

                    {applications ? (
                      <>
                        <div className="producer-opportunity-applicant-group__counts">
                          <span>{tAuto("Aceptadas")}: {acceptedCount}</span>
                          <span>{tAuto("Rechazadas")}: {rejectedCount}</span>
                          <span>{tAuto("Pendientes")}: {pendingCount}</span>
                          {cancelledCount ? (
                            <span>{tAuto("Canceladas")}: {cancelledCount}</span>
                          ) : null}
                        </div>

                        {applications.length ? (
                          <div className="producer-opportunity-applicant-group__list">
                            {applications.map((application) => (
                              <article key={application.id}>
                                <TalentAvatar
                                  src={getTalentIdentityPhoto(application)}
                                  name={getApplicantName(application)}
                                  size="sm"
                                />
                                <div>
                                  <strong>{getApplicantName(application)}</strong>
                                  <span>{getApplicantEmail(application)}</span>
                                  <small>
                                    {tAuto(formatApplicationStatus(application.status))}
                                  </small>
                                  <p>
                                    {application.message?.trim()
                                      ? tAuto(application.message.trim())
                                      : tAuto("No disponible todavia.")}
                                  </p>
                                </div>
                                <button
                                  className="producer-button"
                                  type="button"
                                  disabled={!resolveTalentUserId(application)}
                                  onClick={() => setProfileApplication(application)}
                                >
                                  {resolveTalentUserId(application)
                                    ? tAuto("Ver ficha")
                                    : tAuto("Ficha no disponible")}
                                </button>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="producer-muted">
                            {tAuto("No hay postulantes para esta convocatoria.")}
                          </p>
                        )}
                      </>
                    ) : opportunityError ? (
                      <p className="producer-feedback producer-feedback--error">
                        {opportunityError}
                      </p>
                    ) : (
                      <p className="producer-muted">
                        {tAuto("No hay postulantes registrados.")}
                      </p>
                    )}
                  </section>
                );
              })
            ) : !isApplicantsSummaryLoading ? (
              <p className="summary-detail-empty">
                {tAuto("No hay postulaciones cargadas para mostrar.")}
              </p>
            ) : null}
          </div>
        </SummaryDetailModal>
      ) : null}

      {summaryModal === "all" || summaryModal === "active" ? (
        <SummaryDetailModal
          title={
            summaryModal === "active"
              ? tAuto("Convocatorias activas")
              : tAuto("Total convocatorias")
          }
          onClose={() => setSummaryModal(null)}
        >
          <div className="summary-detail-list">
            {summaryOpportunities.length ? (
              summaryOpportunities.map((opportunity) => (
                <article key={opportunity.id} className="summary-detail-list__item">
                  <h3>{tAuto(opportunity.title)}</h3>
                  <p>
                    {getVisibleOpportunityProjectLabel(opportunity)} |{" "}
                    {tAuto(formatOpportunityStatusLabel(opportunity.status))}
                  </p>
                </article>
              ))
            ) : (
              <p className="summary-detail-empty">
                {tAuto("No hay convocatorias para mostrar.")}
              </p>
            )}
          </div>
        </SummaryDetailModal>
      ) : null}

      {profileApplication ? (
        <TalentProfileModal
          userId={resolveTalentUserId(profileApplication)}
          fallback={talentFallbackFromApplication(profileApplication)}
          token={token ?? undefined}
          onClose={() => setProfileApplication(null)}
        />
      ) : null}
    </div>
  );
}

function ProducerOpportunities() {
  return (
    <ProducerGuard>
      <ProducerOpportunitiesContent />
    </ProducerGuard>
  );
}

export default ProducerOpportunities;
