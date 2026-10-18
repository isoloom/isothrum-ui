import { describe, expect, test, vi } from "vitest";
import { deleteProject, getVersion, listProjects, projectFromLink, saveProject } from "./projects-api";

/** Answers every request with `response`; the calls it gets. */
function useServer(response: () => Response) {
  const server = vi.fn<typeof fetch>(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", server);
  return server;
}

const draft = { name: "lab", nodes: [], edges: [] };

describe("the project store", () => {
  test("lists the user's projects", async () => {
    const server = useServer(() => Response.json([{ id: "p1", name: "lab", updatedAt: "2026-10-15T00:00:00.000Z" }]));
    await expect(listProjects()).resolves.toEqual([{ id: "p1", name: "lab", updatedAt: "2026-10-15T00:00:00.000Z" }]);
    expect(server).toHaveBeenCalledWith("/api/projects", { method: "GET", headers: { "content-type": "application/json" }, body: undefined });
  });

  test("saves a new project with POST, and over one with PUT", async () => {
    const server = useServer(() => Response.json({ id: "p1", name: "lab", updatedAt: "" }));
    await saveProject(null, { draft, isoloomYml: null });
    await saveProject("p1", { draft, isoloomYml: "x" });
    expect(server.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ["/api/projects", "POST", JSON.stringify({ draft, isoloomYml: null })],
      ["/api/projects/p1", "PUT", JSON.stringify({ draft, isoloomYml: "x" })],
    ]);
  });

  test("reads an earlier version by its number", async () => {
    const server = useServer(() => Response.json({ draft }));
    await expect(getVersion("p1", 3)).resolves.toEqual({ draft });
    expect(server.mock.calls[0][0]).toBe("/api/projects/p1/versions/3");
  });

  test("gives nothing for a deletion the server answers with no content", async () => {
    useServer(() => new Response(null, { status: 204 }));
    await expect(deleteProject("p1")).resolves.toBeNull();
  });

  test("fails with the server's reason, or its status when it gives none", async () => {
    useServer(() => Response.json({ error: "sign in first" }, { status: 401 }));
    await expect(listProjects()).rejects.toThrow("sign in first");
    useServer(() => new Response("oops", { status: 500 }));
    await expect(listProjects()).rejects.toThrow("500");
  });
});

describe("projectFromLink", () => {
  test("reads the project a link names", async () => {
    useServer(() => Response.json({ id: "p1", name: "lab", draft }));
    await expect(projectFromLink("p1")).resolves.toEqual({ id: "p1", name: "lab", draft });
  });

  test("is nothing when the project can't be read", async () => {
    useServer(() => new Response(null, { status: 404 }));
    await expect(projectFromLink("p1")).resolves.toBeNull();
  });
});
