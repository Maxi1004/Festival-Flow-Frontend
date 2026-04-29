import type { Opportunity } from "./producer";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export type WorkModality = "FREELANCE" | "REMOTE" | "HYBRID" | "ONSITE";

export type TalentProfile = {
  id?: string;
  user_id?: string;
  display_name: string;
  bio: string;
  main_specialty: string;
  specialties: string[];
  location: string;
  experience_years: number;
  languages: string[];
  skills: string[];
  profile_completion: number;
  is_public: boolean;
  portfolio_links: string[];
  created_at?: string;
  updated_at?: string;
};

export type TalentProfileUpdatePayload = {
  display_name: string;
  bio: string;
  main_specialty: string;
  specialties: string[];
  location: string;
  experience_years: number;
  languages: string[];
  skills: string[];
  profile_completion: number;
  is_public: boolean;
  portfolio_links: string[];
};

export type TalentAvailability = {
  id?: string;
  user_id?: string;
  status: AvailabilityStatus;
  travel_availability: boolean;
  work_modality: WorkModality;
  location: string | null;
  work_location?: string;
  available_from: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TalentAvailabilityUpdatePayload = {
  status: AvailabilityStatus;
  travel_availability: boolean;
  work_modality: WorkModality;
  location: string;
  available_from: string | null;
  notes: string;
};

export const AVAILABILITY_STATUS_OPTIONS: Array<{
  value: AvailabilityStatus;
  label: string;
}> = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "UNAVAILABLE", label: "No disponible" },
];

export const WORK_MODALITY_OPTIONS: Array<{
  value: WorkModality;
  label: string;
}> = [
  { value: "FREELANCE", label: "Freelance" },
  { value: "REMOTE", label: "Remoto" },
  { value: "HYBRID", label: "Hibrido" },
  { value: "ONSITE", label: "Presencial" },
];

export type PublicOpportunity = Opportunity & {
  applications_count?: number;
};

export type CreateApplicationPayload = {
  opportunity_id: string;
  message: string;
};

export type TalentApplication = {
  id: string;
  opportunity_id: string;
  project_id?: string | null;
  producer_uid?: string;
  talent_id?: string;
  talent_uid?: string;
  talent_name?: string | null;
  talent_email?: string | null;
  talent?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
    profile?: Partial<TalentProfile> | null;
  } | null;
  user?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
  talent_profile?: Partial<TalentProfile> | null;
  profile?: Partial<TalentProfile> | null;
  specialties?: string[];
  main_specialty?: string | null;
  status: string;
  message: string;
  applied_at: string;
  created_at?: string;
  updated_at?: string;
  opportunity?: PublicOpportunity | null;
  opportunity_title?: string | null;
  project_title?: string | null;
};

export type AvailableTalent = {
  id?: string;
  user_id?: string;
  user_uid?: string;
  status?: AvailabilityStatus | string | null;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  work_modality?: WorkModality | string | null;
  travel_availability?: boolean | null;
  location?: string | null;
  work_location?: string | null;
  available_from?: string | null;
  notes?: string | null;
  main_specialty?: string | null;
  specialties?: string[];
  profile?: Partial<TalentProfile> | null;
};

export type CrewMember = {
  id?: string;
  application_id?: string | null;
  recruitment_id?: string | null;
  talent_user_id?: string | null;
  talent_name?: string | null;
  talent_email?: string | null;
  talent?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
    profile?: Partial<TalentProfile> | null;
  } | null;
  user?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
  producer_name?: string | null;
  producer_email?: string | null;
  producer?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
  role?: string | null;
  role_needed?: string | null;
  specialty?: string | null;
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  opportunity?: PublicOpportunity | null;
  project_id?: string | null;
  project_title?: string | null;
  project?: (Opportunity["project"] & { name?: string | null }) | null;
  status?: string | null;
  message?: string | null;
  notes?: string | null;
  task_description?: string | null;
  producer_note?: string | null;
  joined_at?: string | null;
  accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source?: "APPLICATION" | "RECRUITMENT" | string;
  messages?: CrewMessage[];
};

export type CrewMessage = {
  sender_role?: "PRODUCER" | "TALENT" | string | null;
  message?: string | null;
  created_at?: string | null;
};

export type CrewMemberUpdatePayload = {
  role: string;
  task_description: string;
  producer_note: string;
};

export type CrewMessagePayload = {
  message: string;
};
