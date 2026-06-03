import type { AvailableTalent } from "./talent";

export type DashboardAvailableTalentSummary = AvailableTalent & {
  photo_url?: string | null;
  avatar_url?: string | null;
  picture?: string | null;
};

export type DashboardProjectSummary = {
  id: string;
  title: string;
  production_type: string;
  location: string;
  start_date: string | null;
  opportunities_count?: number;
  status?: string | null;
};

export type DashboardOpportunitySummary = {
  id: string;
  project_id: string | null;
  title: string;
  role_needed: string;
  specialty: string;
  location: string;
  status: string;
};

export type DashboardApplicationSummary = {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  status: string;
  message: string;
  applied_at: string | null;
};

export type DashboardActivityItem = {
  id?: string;
  title: string;
  description?: string | null;
  time_label?: string | null;
  created_at?: string | null;
  type?: string | null;
};

export type DashboardProductionEvent = {
  id?: string;
  title: string;
  date: string | null;
  type?: string | null;
};

export type ProducerDashboardQuick = {
  projects_count: number;
  opportunities_count: number;
  active_opportunities_count: number;
  closed_opportunities_count: number;
  talents_count?: number;
  active_crew_members_count?: number;
  unread_messages_count?: number;
  applications_received_count?: number;
};

export type ProducerDashboardDetails = {
  latest_projects: DashboardProjectSummary[];
  active_opportunities: DashboardOpportunitySummary[];
  closed_opportunities: DashboardOpportunitySummary[];
  available_talents: DashboardAvailableTalentSummary[];
  recent_activity?: DashboardActivityItem[];
  upcoming_activities?: DashboardProductionEvent[];
};

export type ProducerDashboard = ProducerDashboardQuick & ProducerDashboardDetails;

export type TalentDashboardQuick = {
  profile_completion: number;
  main_specialty: string;
  location: string;
  applications_count: number;
  opportunities_count: number;
};

export type TalentDashboardDetails = {
  available_opportunities: DashboardOpportunitySummary[];
  applications: DashboardApplicationSummary[];
};

export type TalentDashboard = TalentDashboardQuick & TalentDashboardDetails;
