import type { Opportunity, Project } from "../../types/producer";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  CANCELLED: "Cancelada",
  CLOSED: "Cancelada",
  COMPLETED: "Completada",
  DRAFT: "Borrador",
  OPEN: "Activa",
  PAUSED: "Pausada",
};

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

export function formatStatusLabel(value?: string | null): string {
  const normalizedValue = normalizeStatus(value);

  return STATUS_LABELS[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

export function isActiveStatus(value?: string | null): boolean {
  return ["ACTIVE", "OPEN"].includes(normalizeStatus(value));
}

export function isCancelledStatus(value?: string | null): boolean {
  return ["CANCELLED", "CLOSED"].includes(normalizeStatus(value));
}

export function toVisibleStatusAction(value?: string | null): "ACTIVE" | "CANCELLED" {
  return isCancelledStatus(value) ? "CANCELLED" : "ACTIVE";
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) {
    return "Sin definir";
  }

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function parseRequirementsInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function requirementsToTextarea(value?: string[]): string {
  return value?.join("\n") ?? "";
}

export function normalizeProjectFormData(formData: {
  title: string;
  description: string;
  production_type: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
}) {
  return {
    title: formData.title.trim(),
    description: formData.description.trim(),
    production_type: formData.production_type.trim(),
    location: formData.location.trim(),
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
    status: formData.status,
  };
}

export function normalizeOpportunityFormData(formData: {
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
}) {
  return {
    project_id: formData.project_id,
    title: formData.title.trim(),
    role_needed: formData.role_needed.trim(),
    specialty: formData.specialty.trim(),
    description: formData.description.trim(),
    location: formData.location.trim(),
    modality: formData.modality,
    requirements: parseRequirementsInput(formData.requirements),
    status: formData.status,
    deadline: formData.deadline || null,
  };
}

export function getOpportunityProjectTitle(
  opportunity: Opportunity,
  projects: Project[]
): string {
  return (
    opportunity.project?.title ??
    projects.find((project) => project.id === opportunity.project_id)?.title ??
    "Proyecto sin nombre"
  );
}
