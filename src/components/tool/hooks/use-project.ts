import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Draft } from "@/lib/tool/model";
import { saveProject as store } from "@/lib/tool/projects-api";
import { loadProject, saveProject as remember, type ProjectRef } from "@/lib/tool/storage";

/**
 * Saved projects (isoloom/isothrum#31): the lab on the signed-in user's account. Once a lab is
 * saved as a project, every change saves itself (a moment after the last one); each save keeps
 * the previous version. The browser draft stays the working copy, signed in or not.
 */

export type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 2500;

interface Deps {
  signedIn: boolean;
  /** The lab as it is now (its identity changes on every edit). */
  draft: Draft;
  /** The isoloom.yml the engine generated for it. */
  yml: string | null;
}

/** The lab as last saved (its JSON; empty before the first save), to tell when it changed. */
function useLastSaved() {
  const lastSaved = useRef("");
  return useMemo(
    () => ({
      get: () => lastSaved.current,
      set: (json: string) => {
        lastSaved.current = json;
      },
    }),
    [],
  );
}

type LastSaved = ReturnType<typeof useLastSaved>;

/** Autosave: a moment after the last change, when the lab is a project. */
function useAutosave(enabled: boolean, draft: Draft, lastSaved: LastSaved, save: () => unknown): void {
  useEffect(() => {
    if (!enabled) return;
    const now = JSON.stringify(draft);
    if (now === lastSaved.get()) return;
    if (!lastSaved.get()) {
      // Just attached (a reload): what's here is what was saved, or newer; save it next change.
      lastSaved.set(now);
      return;
    }
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [enabled, draft, lastSaved, save]);
}

/** The project the editor is attached to, and saving it. */
export function useProject({ signedIn, draft, yml }: Deps) {
  const [project, setProject] = useState<ProjectRef | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  useEffect(() => {
    if (signedIn) queueMicrotask(() => { setProject(loadProject()); });
  }, [signedIn]);
  const attach = useCallback((p: ProjectRef | null) => {
    setProject(p);
    remember(p);
  }, []);
  // What a save sends: the lab as it is after the last render.
  const latest = useRef({ draft, yml });
  useEffect(() => {
    latest.current = { draft, yml };
  }, [draft, yml]);
  const lastSaved = useLastSaved();
  const save = useCallback(
    async (asNew = false, name?: string): Promise<ProjectRef | null> => {
      const now = latest.current;
      setState("saving");
      try {
        const saved =
          project && !asNew
            ? await store(project.id, { draft: now.draft, isoloomYml: now.yml, ...(name ? { name } : {}) })
            : await store(null, { name: name ?? project?.name ?? now.draft.name, draft: now.draft, isoloomYml: now.yml });
        lastSaved.set(JSON.stringify(now.draft));
        attach({ id: saved.id, name: saved.name });
        setState("saved");
        return saved;
      } catch {
        setState("error");
        return null;
      }
    },
    [project, attach, lastSaved],
  );
  useAutosave(signedIn && !!project, draft, lastSaved, save);
  return {
    project,
    state,
    save,
    detach: () => {
      attach(null);
      lastSaved.set("");
      setState("idle");
    },
    /** After opening a project: attached to it, nothing to save yet. */
    opened: (p: ProjectRef, d: Draft) => {
      lastSaved.set(JSON.stringify(d));
      attach(p);
      setState("saved");
    },
  };
}
