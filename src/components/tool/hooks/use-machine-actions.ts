import { useState } from "react";
import type { Invoke, SuspendedLink } from "@/lib/tool/desktop";
import type { EditorText } from "@/lib/tool/text";
import type { LiveLab } from "./use-desktop";

export type MachineAction = "start" | "stop" | "restart";
export type LinkAction = "suspend" | "resume";

interface Deps {
  invoke: Invoke | null;
  labName: string;
  live: LiveLab;
  setToast: (message: string) => void;
  t: EditorText;
}

/**
 * One machine of the running lab (desktop): a console, its screen, starting or stopping it, its
 * snapshots, and cutting or reconnecting its links. A failure shows as a toast.
 */
export function useMachineActions({ invoke, labName, live, setToast, t }: Deps) {
  const [busy, setBusy] = useState(false);
  /** Runs a command for this lab while the machine controls wait, then reads the lab again. */
  async function act(run: (invoke: Invoke) => Promise<unknown>) {
    if (!invoke) return;
    setBusy(true);
    try {
      await run(invoke);
    } catch (e) {
      setToast(String(e));
    }
    setBusy(false);
    void live.refreshStates();
  }
  /** Opens a console on the machine, or its screen (GNS3's VNC console: its VNC server, or a VM's display). */
  async function open(command: "machine_console" | "machine_display", machine: string) {
    if (!invoke) return;
    try {
      const shown = await invoke<string>(command, { name: labName, machine });
      if (command === "machine_display") setToast(t.machineRun.displayOpened(shown));
    } catch (e) {
      setToast(String(e));
    }
  }
  return {
    busy,
    snapshotDo: (command: string, args: Record<string, unknown>) => act((run) => run(command, { name: labName, ...args })),
    machineAct: (machine: string, action: MachineAction) => act((run) => run("machine_action", { name: labName, machine, action })),
    /** Cuts or reconnects the ports of `machines` on `network` (every machine's, when not named). */
    linkAct: (network: string, machines: string[] | undefined, action: LinkAction) =>
      act(async (run) => {
        live.setLinks(await run<SuspendedLink[]>("link_action", { name: labName, network, machines, action }));
      }),
    machineConsole: (machine: string) => open("machine_console", machine),
    machineDisplay: (machine: string) => open("machine_display", machine),
  };
}
