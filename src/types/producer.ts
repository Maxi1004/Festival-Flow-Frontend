export type ProjectStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type OpportunityStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "OPEN"
  | "CLOSED"
  | "PAUSED"
  | "DRAFT"
  | "COMPLETED";

export type OpportunityModality = "REMOTE" | "ONSITE" | "HYBRID" | "FLEXIBLE";

export type Project = {
  id: string;
  producer_id?: string;
  title: string;
  description: string;
  production_type: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus | string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectCreatePayload = {
  title: string;
  description: string;
  production_type: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus | string;
};

export type ProjectUpdatePayload = ProjectCreatePayload;

export type Opportunity = {
  id: string;
  project_id: string;
  producer_id?: string;
  owner_uid?: string;
  title: string;
  role_needed: string;
  specialty: string;
  description: string;
  location: string;
  modality: OpportunityModality | string;
  requirements: string[];
  status: OpportunityStatus | string;
  deadline: string | null;
  created_at?: string;
  updated_at?: string;
  project?: Project | null;
};

export type OpportunityCreatePayload = {
  project_id: string;
  title: string;
  role_needed: string;
  specialty: string;
  description: string;
  location: string;
  modality: OpportunityModality | string;
  requirements: string[];
  status: OpportunityStatus | string;
  deadline: string | null;
};

export type OpportunityUpdatePayload = OpportunityCreatePayload;

export type OpportunityStatusPayload = {
  status: OpportunityStatus | string;
};

export const STATUS_ACTION_OPTIONS: Array<{
  value: ProjectStatus | OpportunityStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Iniciar" },
  { value: "CANCELLED", label: "Cancelar" },
];

export const PROJECT_STATUS_OPTIONS = STATUS_ACTION_OPTIONS;

export const OPPORTUNITY_STATUS_OPTIONS = STATUS_ACTION_OPTIONS;

export const OPPORTUNITY_MODALITY_OPTIONS: OpportunityModality[] = [
  "REMOTE",
  "ONSITE",
  "HYBRID",
  "FLEXIBLE",
];
