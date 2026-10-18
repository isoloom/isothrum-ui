import { useCallback, useEffect, useState } from "react";
import { desktop, runningServices, type DesktopInfo, type EnvironmentLive, type Invoke, type Snapshot, type SuspendedLink } from "@/lib/tool/desktop";
import { autoStarts } from "@/lib/tool/storage";

/** The desktop app's side of the editor: running the lab on this machine (none in a browser). */

export type RunState = "stopped" | "starting" | "running" | "stopping";

/** The app's commands (null in a browser), what the app says about itself, and the lab's run state. */
export function useDesktopState() {
  const [invoke] = useState(desktop);
  const [info, setInfo] = useState<DesktopInfo | null>(null);
  const [run, setRun] = useState<RunState>("stopped");
  const [update, setUpdate] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  return { invoke, info, setInfo, run, setRun, update, setUpdate, updating, setUpdating };
}

export type DesktopState = ReturnType<typeof useDesktopState>;

/**
 * The running lab now (desktop): its machines' states and their ports, read from them, its
 * machines' snapshots, and the links cut. Read again every 3 seconds while it runs.
 */
export function useLiveLab(invoke: Invoke | null, labName: string, run: RunState) {
  const [machineStates, setMachineStates] = useState<Record<string, string>>({});
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [links, setLinks] = useState<SuspendedLink[]>([]);
  const [live, setLive] = useState<EnvironmentLive | null>(null);
  const refreshStates = useCallback(async () => {
    if (!invoke) return;
    try {
      const now = await invoke<EnvironmentLive | null>("environment_live", { name: labName });
      setLive(now);
      setMachineStates(Object.fromEntries(Object.entries(now?.machines ?? {}).map(([m, l]) => [m, l.state])));
      setSnapshots(await invoke<Snapshot[]>("snapshot_list", { name: labName }));
      setLinks(await invoke<SuspendedLink[]>("link_list", { name: labName }));
    } catch {
      setMachineStates({});
      setLive(null);
    }
  }, [invoke, labName]);
  useEffect(() => {
    if (run !== "running") return;
    queueMicrotask(() => void refreshStates());
    const timer = setInterval(() => void refreshStates(), 3000);
    return () => {
      clearInterval(timer);
    };
  }, [run, refreshStates]);
  return { machineStates, snapshots, links, setLinks, live, setLive, refreshStates };
}

export type LiveLab = ReturnType<typeof useLiveLab>;

/** The Run window's state and its log. */
export function useRunPanel() {
  const [runOpen, setRunOpen] = useState(false);
  const [runLog, setRunLog] = useState("");
  return { runOpen, setRunOpen, runLog, setRunLog };
}

/** Auto-start (desktop): this lab starts when the app opens on it, once the engine has its spec. */
export function useAutoStart(invoke: Invoke | null, labName: string) {
  const [autoStart, setAutoStart] = useState(false);
  const [autoStartPending, setAutoStartPending] = useState(false);
  useEffect(() => {
    if (invoke)
      queueMicrotask(() => {
        setAutoStart(autoStarts(labName));
      });
  }, [invoke, labName]);
  return { autoStart, setAutoStart, autoStartPending, setAutoStartPending };
}

/**
 * On opening: what the app says about itself, whether a newer release is out (signed; from
 * GitHub's latest release), and whether the lab still runs from before the app was reopened. If
 * not, and it is set to, it starts.
 */
export function useDesktopStartup(state: DesktopState, initialName: string, setAutoStartPending: (pending: boolean) => void): void {
  const { invoke, setInfo, setUpdate, setRun } = state;
  useEffect(() => {
    if (!invoke) return;
    invoke<DesktopInfo>("desktop_info").then(setInfo, () => undefined);
    invoke<{ version: string } | null>("update_check").then(
      (u) => {
        if (u) setUpdate(u.version);
      },
      () => undefined,
    );
    invoke<string>("environment_status", { name: initialName }).then(
      (ps) => {
        if (runningServices(ps) > 0) setRun("running");
        else if (autoStarts(initialName)) setAutoStartPending(true);
      },
      () => undefined,
    );
  }, [invoke, initialName, setInfo, setUpdate, setRun, setAutoStartPending]);
}
