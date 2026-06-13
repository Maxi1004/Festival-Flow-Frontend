import API_URL from "../config/api";
import type {
  FestivalSelection,
  FestivalStatus,
  ProducerFestival,
} from "../types/festival";
import { getAuthenticatedHeaders, parseJsonResponse } from "./authApi";

export type ProducerFestivalFilters = {
  search?: string;
  country?: string;
  platform?: string;
  status?: FestivalStatus | FestivalStatus[];
  deadline_within_days?: number;
};

type FestivalListResponse =
  | ProducerFestival[]
  | {
      data?: ProducerFestival[];
      festivals?: ProducerFestival[];
      items?: ProducerFestival[];
    };

type SelectionListResponse =
  | FestivalSelection[]
  | {
      data?: FestivalSelection[];
      selections?: FestivalSelection[];
      items?: FestivalSelection[];
    };

type SelectionResponse =
  | FestivalSelection
  | {
      data?: FestivalSelection;
      selection?: FestivalSelection;
    };

function unwrapList<T>(
  payload: T[] | { data?: T[]; items?: T[]; festivals?: T[]; selections?: T[] },
  key: "festivals" | "selections"
): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.data ?? payload[key] ?? payload.items ?? [];
}

export async function getProducerFestivals(
  filters: ProducerFestivalFilters = {},
  token?: string
): Promise<ProducerFestival[]> {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });

  const suffix = query.size ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/producer/festivals${suffix}`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapList(
    await parseJsonResponse<FestivalListResponse>(response),
    "festivals"
  );
}

export async function getProducerFestivalSelections(
  token?: string
): Promise<FestivalSelection[]> {
  const response = await fetch(`${API_URL}/producer/festival-selections`, {
    method: "GET",
    headers: await getAuthenticatedHeaders(undefined, token),
  });

  return unwrapList(
    await parseJsonResponse<SelectionListResponse>(response),
    "selections"
  );
}

export async function selectProducerFestival(
  festivalId: string | number,
  token?: string
): Promise<FestivalSelection> {
  const response = await fetch(`${API_URL}/producer/festival-selections`, {
    method: "POST",
    headers: await getAuthenticatedHeaders(
      { "Content-Type": "application/json" },
      token
    ),
    body: JSON.stringify({ festival_id: festivalId }),
  });
  const payload = await parseJsonResponse<SelectionResponse>(response);

  if ("data" in payload || "selection" in payload) {
    const selection = payload.data ?? payload.selection;
    if (selection) {
      return selection;
    }
  }

  return payload as FestivalSelection;
}

export async function removeProducerFestivalSelection(
  festivalId: string | number,
  token?: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/producer/festival-selections/${encodeURIComponent(String(festivalId))}`,
    {
      method: "DELETE",
      headers: await getAuthenticatedHeaders(undefined, token),
    }
  );

  if (!response.ok) {
    await parseJsonResponse<unknown>(response);
  }
}
