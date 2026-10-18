import type { Draft } from "./model";

/**
 * The site's project store (`/api/projects`), for a signed-in user: their projects, each with
 * its earlier versions. Errors carry the server's message, or the HTTP status.
 */

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}
export interface ProjectVersion {
  id: number;
  savedAt: string;
}

/** The server's reason in an error response (`{ error }`), or the status when it gives none. */
async function failure(r: Response): Promise<Error> {
  const body = (await r.json().catch(() => null)) as { error?: unknown } | null;
  const reason = body?.error;
  return new Error(typeof reason === "string" ? reason : String(r.status));
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw await failure(r);
  return (r.status === 204 ? null : await r.json()) as T;
}

export const listProjects = () => api<ProjectSummary[]>("GET", "/api/projects");
export const getProject = (id: string) => api<{ id: string; name: string; draft: Draft }>("GET", `/api/projects/${id}`);
export const deleteProject = (id: string) => api("DELETE", `/api/projects/${id}`);
export const listVersions = (id: string) => api<ProjectVersion[]>(`GET`, `/api/projects/${id}/versions`);
export const getVersion = (id: string, version: number) => api<{ draft: Draft }>("GET", `/api/projects/${id}/versions/${String(version)}`);

/** Saves the lab as a new project (POST), or as the next version of `id` (PUT). */
export function saveProject(id: string | null, body: { name?: string; draft: Draft; isoloomYml: string | null }): Promise<ProjectSummary> {
  if (id) return api<ProjectSummary>("PUT", `/api/projects/${id}`, body);
  return api<ProjectSummary>("POST", "/api/projects", body);
}

/** A project by the id in a link (#project=…), or null when it can't be read. */
export async function projectFromLink(id: string): Promise<{ id: string; name: string; draft: unknown } | null> {
  const r = await fetch(`/api/projects/${id}`);
  return r.ok ? ((await r.json()) as { id: string; name: string; draft: unknown }) : null;
}
