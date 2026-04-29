import {
  API_URL,
  getAuthenticatedHeaders,
  getErrorMessage,
  parseJsonResponse,
} from "./authApi";
import type {
  Project,
  ProjectCreatePayload,
  ProjectUpdatePayload,
} from "../types/producer";

type ProjectEnvelope = {
  project?: Project;
  data?: Project;
};

type ProjectListEnvelope = {
  projects?: Project[];
  data?: Project[];
  items?: Project[];
  records?: Project[];
  results?: Project[];
};

function unwrapProjectResponse(payload: Project | ProjectEnvelope): Project {
  if ("id" in payload) {
    return payload;
  }

  return payload.project ?? payload.data ?? (payload as unknown as Project);
}

function unwrapProjectListResponse(payload: Project[] | ProjectListEnvelope): Project[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.projects ?? payload.data ?? payload.items ?? payload.records ?? payload.results ?? [];
}

export async function createProject(payload: ProjectCreatePayload): Promise<Project> {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}

export async function getMyProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapProjectListResponse(
    await parseJsonResponse<Project[] | ProjectListEnvelope>(response)
  );
}

export async function getProjectById(projectId: string): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(),
  });

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdatePayload
): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getProjectById(projectId);
  }

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}
