import { useEffect, useEffectEvent } from "react";
import { ownFiles, type Engine, type Plan } from "@/lib/tool/engine";
import type { EditorText } from "@/lib/tool/text";
import type { DesktopState, LiveLab, RunState, useAutoStart, useRunPanel } from "./use-desktop";
import type { Captures } from "./use-captures";

interface Deps {
  state: DesktopState;
  panel: ReturnType<typeof useRunPanel>;
  autoStart: ReturnType<typeof useAutoStart>;
  live: LiveLab;
  captures: Captures;
  lab: { labName: string; topology: string; plan: Plan | null; engine: Engine | null; hasVms: boolean };
  t: EditorText;
}

/** Running the lab on this machine (desktop): `environment_up` from the engine's spec, and `environment_down`. */
export function useLabRun({ state, panel, autoStart, live, captures, lab, t }: Deps) {
  const { invoke, run, setRun } = state;
  async function runLab() {
    if (!invoke || !lab.plan?.isoloom_yml) return;
    setRun("starting");
    panel.setRunOpen(true);
    panel.setRunLog(lab.hasVms ? t.run.startingVmsLog : t.run.startingLog);
    try {
      const files = lab.engine ? ownFiles(lab.engine, lab.topology) : [];
      panel.setRunLog(await invoke<string>("environment_up", { name: lab.labName, yaml: lab.plan.isoloom_yml, files }));
      setRun("running");
    } catch (e) {
      panel.setRunLog(String(e));
      setRun("stopped");
    }
  }
  async function stopLab() {
    if (!invoke) return;
    setRun("stopping");
    try {
      panel.setRunLog(await invoke<string>("environment_down", { name: lab.labName }));
    } catch (e) {
      panel.setRunLog(String(e));
    }
    captures.clearCaptures();
    live.setLinks([]);
    live.setLive(null);
    setRun("stopped");
  }
  // The auto-start waits for the engine: the lab runs from the spec it makes.
  const spec = lab.plan?.isoloom_yml;
  const { autoStartPending, setAutoStartPending } = autoStart;
  const startPending = useEffectEvent((current: RunState) => {
    setAutoStartPending(false);
    if (current === "stopped") void runLab();
  });
  useEffect(() => {
    if (!autoStartPending || !spec) return;
    queueMicrotask(() => {
      startPending(run);
    });
  }, [autoStartPending, spec, run]);
  return { runLab, stopLab };
}
