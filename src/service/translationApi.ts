import API_URL from "../config/api";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";

export type TranslationRequest = {
  texts: string[];
  target_lang: string;
  target_language?: string;
  source_language?: string;
};

export type SupportedLanguage = {
  code: string;
  label: string;
};

export type TranslationItem = {
  original: string;
  translated: string;
  detected_source_language?: string;
};

export type TranslationResponse = {
  translations: TranslationItem[];
};

export async function translateTexts(
  payload: TranslationRequest,
  authenticatedToken?: string
): Promise<TranslationResponse> {
  const response = await fetch(`${API_URL}/translate`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify(payload),
  });

  return await parseJsonResponse<TranslationResponse>(response);
}

export async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  const response = await fetch(`${API_URL}/languages`, {
    method: "GET",
  });

  return await parseJsonResponse<SupportedLanguage[]>(response);
}
