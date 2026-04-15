import type { Opportunity } from "./producer";

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
  status: string;
  travel_availability: string;
  work_modality: string;
  work_location: string;
  available_from: string | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

export type TalentAvailabilityUpdatePayload = {
  status: string;
  travel_availability: string;
  work_modality: string;
  work_location: string;
  available_from: string | null;
  notes: string;
};

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
  talent_id?: string;
  status: string;
  message: string;
  applied_at: string;
  created_at?: string;
  updated_at?: string;
  opportunity?: PublicOpportunity | null;
  opportunity_title?: string | null;
  project_title?: string | null;
};
