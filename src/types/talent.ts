import type { Opportunity } from "./producer";
import type { CrewCategory } from "../utils/crewCategory";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export type WorkModality = "FREELANCE" | "REMOTE" | "HYBRID" | "ONSITE";

export type PortfolioLink = {
  label: string;
  url: string;
};

export type PortfolioItem = {
  title: string;
  project_type?: string;
  role: string;
  year: number | null;
  url: string;
};

export type TalentProfile = {
  id?: string;
  user_id?: string;
  user_uid?: string;
  display_name: string;
  bio: string;
  main_specialty: string;
  specialties: string[];
  location: string;
  experience_years: number;
  languages: string[];
  skills: string[];
  photo_url?: string | null;
  portfolio_pdf_url?: string | null;
  profile_completion: number;
  is_public: boolean;
  portfolio_links: Array<string | PortfolioLink>;
  portfolio_items?: PortfolioItem[];
  created_at?: string;
  updated_at?: string;
};

export type TalentPublicProfile = Partial<TalentProfile> & {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  portfolio_url?: string | null;
  availability?: Partial<TalentAvailability> | null;
  availability_status?: AvailabilityStatus | string | null;
  work_modality?: WorkModality | string | null;
  available_from?: string | null;
  availability_notes?: string | null;
  notes?: string | null;
};

export type TalentProfileFallback = Partial<TalentPublicProfile> & {
  user_id?: string;
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
  portfolio_links: PortfolioLink[];
  portfolio_items: PortfolioItem[];
};

export type TalentProfilePhotoResponse = {
  photo_url: string;
};

export type TalentProfilePortfolioPdfResponse = {
  portfolio_pdf_url: string;
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

export type TalentCommitment = {
  project_id: string;
  project_title: string;
  opportunity_id: string | null;
  opportunity_title: string | null;
  start_date: string | null;
  end_date: string | null;
  available_again_from: string | null;
  status: "OCCUPIED" | string;
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
  user_id?: string;
  user_uid?: string;
  talent_id?: string;
  talent_uid?: string;
  talent_user_id?: string;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  talent_name?: string | null;
  talent_email?: string | null;
  talent?: {
    id?: string;
    user_id?: string;
    user_uid?: string;
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
  result?: string | null;
};

export type TalentApplicationFeedSummary = {
  total: number;
  active: number;
  reviewing: number;
  accepted: number;
  rejected: number;
  cancelled: number;
  completed: number;
  closed: number;
  acceptance_rate: number;
};

export type TalentApplicationFeed = {
  items: TalentApplication[];
  next_cursor: string | null;
};

export type AvailableTalent = {
  id?: string;
  user_id?: string;
  user_uid?: string;
  talent_id?: string;
  talent_uid?: string;
  talent_user_id?: string;
  status?: AvailabilityStatus | string | null;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
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
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  main_specialty?: string | null;
  specialties?: string[];
  application_id?: string | null;
  recruitment_id?: string | null;
  talent_user_id?: string | null;
  talent_id?: string | null;
  talent_uid?: string | null;
  user_id?: string | null;
  user_uid?: string | null;
  talent_name?: string | null;
  talent_email?: string | null;
  profile?: Partial<TalentProfile> | null;
  talent_profile?: Partial<TalentProfile> | null;
  talent?: {
    id?: string;
    user_id?: string;
    user_uid?: string;
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
  category?: CrewCategory | string | null;
  task_category?: string | null;
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
  category?: CrewCategory;
  status?: string;
  task_description: string;
  producer_note: string;
};

export type CrewMessagePayload = {
  message: string;
};

export type CrewProjectMember = {
  id: string;
  project_id: string;
  user_uid: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  role: string;
  category?: CrewCategory | string | null;
  task_description: string | null;
  status: string;
  joined_at: string | null;
};

export type CrewProjectMessage = {
  id: string;
  project_id: string;
  sender_uid: string;
  sender_name: string;
  sender_role: string;
  sender_photo_url: string | null;
  message: string;
  created_at: string;
};

export type CrewDirectMessage = {
  id: string;
  project_id: string;
  conversation_key: string;
  sender_uid: string;
  receiver_uid: string;
  sender_name: string;
  receiver_name: string;
  sender_photo_url: string | null;
  receiver_photo_url: string | null;
  message: string;
  created_at: string;
};
