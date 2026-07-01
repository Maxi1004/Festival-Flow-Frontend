import API_URL from "../config/api";
import { parseJsonResponse } from "./authApi";

export type CamoufoxFieldOption = {
  label: string;
  value: string;
  id: string;
  selector: string;
  checked: boolean;
};

export type CamoufoxField = {
  id: string | null;
  name: string | null;
  type: string;
  label: string;
  placeholder: string;
  selector: string;
  required: boolean;
  options: CamoufoxFieldOption[];
  value: string | string[] | boolean;
};

export type CamoufoxSection = {
  section: string;
  fields: CamoufoxField[];
};

export type AnalyzeFilmFreewayCamoufoxPayload = {
  email: string;
  password: string;
  festival_url: string;
};

export type AnalyzeFilmFreewayCamoufoxResponse = {
  status: string;
  analyze_batch_id: string;
  sections: CamoufoxSection[];
  fields_count: number;
  video_dir?: string;
  screenshot_path?: string;
  final_url: string;
  final_title: string;
};

export type FillOpenFilmFreewayFormPayload = {
  analyze_batch_id: string;
  form_values: Record<string, unknown>;
};

export type FillOpenFilmFreewayFormError = {
  key: string;
  reason: string;
};

export type FillOpenFilmFreewayFormResponse = {
  status: string;
  filled_count: number;
  skipped_count: number;
  errors: FillOpenFilmFreewayFormError[];
  screenshot_path?: string;
  video_path?: string;
  video_dir?: string;
  saved_url: string;
  save_ok: boolean;
  save_errors?: string[];
  visible_error?: string;
  final_url: string;
  final_title: string;
};

// El backend espera la clave "username" aunque el valor sea el email de FilmFreeway.
export async function analyzeFilmFreewayCamoufox(
  payload: AnalyzeFilmFreewayCamoufoxPayload,
  token: string
): Promise<AnalyzeFilmFreewayCamoufoxResponse> {
  const response = await fetch(`${API_URL}/api/analyze-filmfreeway-camoufox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: payload.email,
      password: payload.password,
      festival_url: payload.festival_url,
    }),
  });

  return parseJsonResponse<AnalyzeFilmFreewayCamoufoxResponse>(response);
}

export async function fillOpenFilmFreewayForm(
  payload: FillOpenFilmFreewayFormPayload,
  token: string
): Promise<FillOpenFilmFreewayFormResponse> {
  const response = await fetch(`${API_URL}/api/fill-open-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<FillOpenFilmFreewayFormResponse>(response);
}
