// Typed wrappers around the JSON endpoints. The only place that knows URLs.

import type { ArenaRunDetail, EquitySeries } from "../types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return (await response.json()) as T;
}

export function getEquity(mode?: string): Promise<EquitySeries> {
  const params = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  return getJson<EquitySeries>(`/api/equity${params}`);
}

export function getArenaRun(runId: number): Promise<ArenaRunDetail> {
  return getJson<ArenaRunDetail>(`/api/arena/runs/${runId}`);
}

export async function getPartial(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Partial failed (${response.status}): ${url}`);
  }
  return response.text();
}
