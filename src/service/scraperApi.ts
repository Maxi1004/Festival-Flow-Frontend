import API_URL from "../config/api";

export type LoginPayload = {
  login_url: string;
  target_url: string;
  username: string;
  password: string;
};

export type LoginOKResponse = {
  status: "LOGIN_OK";
  session_id: string;
};

export type LoginCaptchaResponse = {
  status: "CAPTCHA_REQUIRED";
};

export type LoginFailedResponse = {
  status: "LOGIN_FAILED";
  message: string;
};

export type LoginResponse =
  | LoginOKResponse
  | LoginCaptchaResponse
  | LoginFailedResponse;

export type FormField = {
  tag: string;
  type: string;
  name: string;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  value: string;
  options: string[];
};

export type ExtractFormPayload = {
  target_url: string;
  session_id?: string;
};

export type ExtractFormResponse = {
  url: string;
  fields: FormField[];
};

export async function scraperLogin(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/scraper/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}`);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function scraperExtractForm(
  payload: ExtractFormPayload
): Promise<ExtractFormResponse> {
  const response = await fetch(`${API_URL}/api/scraper/extract-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}`);
  }

  return response.json() as Promise<ExtractFormResponse>;
}

export type UnifiedFormField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  sourceFields: string[];
};

export type UnifiedFormSection = {
  title: string;
  fields: UnifiedFormField[];
};

export type UnifiedForm = {
  title: string;
  description: string;
  sections: UnifiedFormSection[];
};

export type UnifiedFormResponse = {
  form: UnifiedForm;
};

export type GenerateUnifiedFormPayload = {
  source_url: string;
  fields: FormField[];
};

export async function scraperGenerateUnifiedForm(
  payload: GenerateUnifiedFormPayload,
  token: string
): Promise<UnifiedFormResponse> {
  const response = await fetch(`${API_URL}/api/scraper/generate-unified-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}`);
  }

  return response.json() as Promise<UnifiedFormResponse>;
}
