import type { AvailableTalent } from "./talent";

export type DashboardProjectSummary = {
  id: string;
  title: string;
  production_type: string;
  location: string;
  start_date: string | null;
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

export type ProducerDashboard = {
  projects_count: number;
  opportunities_count: number;
  active_opportunities_count: number;
  closed_opportunities_count: number;
  latest_projects: DashboardProjectSummary[];
  active_opportunities: DashboardOpportunitySummary[];
  closed_opportunities: DashboardOpportunitySummary[];
  available_talents: AvailableTalent[];
};

export type TalentDashboard = {
  profile_completion: number;
  main_specialty: string;
  location: string;
  applications_count: number;
  opportunities_count: number;
  available_opportunities: DashboardOpportunitySummary[];
  applications: DashboardApplicationSummary[];
};
