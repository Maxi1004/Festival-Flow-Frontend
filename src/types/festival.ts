export type FestivalStatus =
  | "OPEN"
  | "UPCOMING"
  | "CLOSED"
  | "ARCHIVED"
  | "UNKNOWN";

export type ProducerFestival = {
  id: string | number;
  name: string;
  country?: string | null;
  website?: string | null;
  submission_url?: string | null;
  platform?: string | null;
  opening_date?: string | null;
  deadline?: string | null;
  event_date?: string | null;
  fee?: string | number | null;
  status: FestivalStatus | string;
  edition_year?: string | number | null;
  notes?: string | null;
  source?: string | null;
  days_until_deadline?: number | null;
  selected_by_me: boolean;
};

export type FestivalSelection = {
  id: string | number;
  producer_uid: string;
  festival_id: string | number;
  status: string;
  created_at: string;
  updated_at: string;
  festival?: ProducerFestival;
};

export type Festival = {
  id: string | number;
  name: string;
  country?: string | null;
  website?: string | null;
  submission_url?: string | null;
  platform?: string | null;
  opening_date?: string | null;
  deadline?: string | null;
  event_date?: string | null;
  fee?: string | number | null;
  status: FestivalStatus | string;
  edition_year?: string | number | null;
  contact?: string | null;
  notes?: string | null;
  last_reviewed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type FestivalImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: number | string[];
};

export type FestivalUpdatePayload = {
  name: string;
  country: string | null;
  website: string | null;
  submission_url: string | null;
  platform: string | null;
  opening_date: string | null;
  deadline: string | null;
  event_date: string | null;
  fee: string | number | null;
  status: FestivalStatus;
  edition_year: number | null;
  contact: string | null;
  notes: string | null;
};

export type FestivalAuditSummary = {
  total_documents: number;
  valid_unique_festivals: number;
  duplicate_documents: number;
  invalid_auxiliary_documents: number;
  missing_from_firestore: number;
  incomplete_documents: number;
  status_counts: Record<FestivalStatus, number>;
};

export type FestivalDuplicateDocument = {
  id: string;
  name: string;
  country?: string | null;
  website?: string | null;
  deadline?: string | null;
  status?: string | null;
  completeness_score?: number | null;
  recommended_keep?: boolean;
  recommended_delete?: boolean;
};

export type FestivalDuplicateGroup = {
  canonical_name: string;
  documents: FestivalDuplicateDocument[];
};

export type FestivalCleanupPreview = {
  documents_to_keep?: number;
  documents_to_archive?: number;
  documents_to_merge?: number;
  blocked_by_doubt?: number;
  different_years?: number;
  invalid_documents?: number;
  keep?: unknown[];
  archive?: unknown[];
  merge?: unknown[];
  blocked?: unknown[];
  different_year_groups?: unknown[];
  invalid?: unknown[];
  [key: string]: unknown;
};

export type FestivalCleanupResult = {
  archived?: number;
  merged?: number;
  kept?: number;
  blocked?: number;
  invalid_archived?: number;
  message?: string;
  [key: string]: unknown;
};
