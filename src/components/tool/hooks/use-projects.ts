import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { normalizeDraft, plainDraft } from "@/lib/tool/draft";
import type { Design, Draft } from "@/lib/tool/model";
import type { Plan } from "@/lib/tool/engine";
import { projectFromLink } from "@/lib/tool/projects-api";
import type { ProjectRef } from "@/lib/tool/storage";
import type { EditorText } from "@/lib/tool/text";
import { useProject } from "./use-project";
import { clearHash } from "./use-shared-link";
import { replaceLab, type Lab } from "./use-lab";

interface Deps {
  /** Accounts are on (the desktop's bundled editor has no site to ask). */
  accounts: boolean;
  lab: Lab;
  design: Design;
  setDesign: (d: Design) => void;
  plan: Plan | null;
  setToast: (message: string) => void;
  fitWhenDrawn: () => void;
  t: EditorText;
}

/** Saved projects, for a signed-in user (see `useProject`): opening, saving, Ctrl/⌘ S. */
export function useProjects({ accounts, lab, design, setDesign, plan, setToast, fitWhenDrawn, t }: Deps) {
  const [signedInNow, setSignedInNow] = useState(false);
  const signedIn = accounts && signedInNow;
  const { labName, nodes, edges } = lab;
  const savedDraft = useMemo(() => plainDraft({ name: labName, nodes, edges, design }), [labName, nodes, edges, design]);
  const proj = useProject({ signedIn, draft: savedDraft, yml: plan?.ok ? plan.isoloom_yml : null });
  const [projectsOpen, setProjectsOpen] = useState(false);
  function openDraft(d: Draft) {
    const opened = normalizeDraft(d);
    if (!opened) return;
    replaceLab(lab, opened);
    if (opened.design) setDesign(opened.design);
    fitWhenDrawn();
  }
  /** Opens a project, attached to it from now on. */
  function openProject(p: ProjectRef, d: Draft) {
    const opened = normalizeDraft(d);
    if (!opened) return;
    openDraft(opened);
    proj.opened(p, plainDraft({ name: opened.name, nodes: opened.nodes, edges: opened.edges, design: opened.design ?? design }));
    setToast(t.projects.opened(p.name));
  }
  useProjectLink(signedIn, openProject);
  async function saveAs() {
    const name = window.prompt(t.projects.saveAsPrompt, proj.project ? `${proj.project.name} (2)` : labName);
    if (name?.trim()) await proj.save(true, name.trim());
  }
  useSaveKeys(signedIn, () => void proj.save(), () => void saveAs());
  return { signedIn, setSignedInNow, proj, projectsOpen, setProjectsOpen, openDraft, openProject, saveAs };
}

/** A link to a project (#project=<id>, as the MCP server gives): opens it once signed in. */
function useProjectLink(signedIn: boolean, openProject: (p: ProjectRef, d: Draft) => void): void {
  const open = useEffectEvent((id: string) => {
    void projectFromLink(id).then((p) => {
      if (p) openProject({ id: p.id, name: p.name }, p.draft as Draft);
    });
  });
  useEffect(() => {
    const m = /^#project=([\w-]+)$/.exec(window.location.hash);
    if (!m || !signedIn) return;
    clearHash();
    open(m[1]);
  }, [signedIn]);
}

/** Ctrl/⌘ S saves the project, Ctrl/⌘ Shift S saves it as a new one (signed in only). */
function useSaveKeys(signedIn: boolean, save: () => void, saveAs: () => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!signedIn || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (e.shiftKey) saveAs();
      else save();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });
}
