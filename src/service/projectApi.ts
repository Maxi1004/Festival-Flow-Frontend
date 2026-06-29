import API_URL from "../config/api";
import {
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

export async function createProject(payload: ProjectCreatePayload, authenticatedToken?: string): Promise<Project> {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, authenticatedToken),
    body: JSON.stringify(payload),
  });

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}

export async function getMyProjects(authenticatedToken?: string): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects/me`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapProjectListResponse(
    await parseJsonResponse<Project[] | ProjectListEnvelope>(response)
  );
}

export async function getProjectById(projectId: string, authenticatedToken?: string): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, authenticatedToken),
  });

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdatePayload,
  authenticatedToken?: string
): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "PUT",
    headers: await getAuthenticatedHeaders({ "Content-Type": "application/json" }, authenticatedToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return await getProjectById(projectId, authenticatedToken);
  }

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}

export async function updateProjectStatus(
  projectId: string,
  status: string,
  authenticatedToken?: string
): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${projectId}/status`, {
    method: "PATCH",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      authenticatedToken
    ),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return unwrapProjectResponse(await parseJsonResponse<Project | ProjectEnvelope>(response));
}
