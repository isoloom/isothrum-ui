/**
 * The desktop app's commands (Isothrum desktop loads this editor in its window and exposes them
 * on `window.__TAURI__`). In a browser there is no such object, and the desktop-only controls
 * (Run, Stop, Capture) stay hidden.
 */
export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

interface TauriWindow {
  __TAURI__?: { core?: { invoke?: Invoke } };
}

export function desktop(): Invoke | null {
  if (typeof window === "undefined") return null;
  const tauri = (window as unknown as TauriWindow).__TAURI__;
  return tauri?.core?.invoke ?? null;
}

/**
 * Whether the desktop app runs the lab on VMs (with Vagrant): it runs it on Docker whenever Isoloom
 * generates its Docker files, which a machine drawn as a Linux VM has (its OS and steps build a
 * container); only a lab with a machine that is a VM only (Windows, a playbook step) needs VMs.
 */
export function runsOnVms(hasVmNodes: boolean, plan: { files: { path: string }[] } | null): boolean {
  return hasVmNodes && !(plan?.files.some((f) => f.path === ".isoloom/docker/compose.yml") ?? false);
}

/** One machine now (desktop: `environment_live`): Docker's state, and its health when it has a check. */
export interface MachineLive {
  state: string;
  health: string;
}
/** One machine's port on one network now: up, down, or unknown (stopped, or a Cisco OS's). */
interface PortLive {
  machine: string;
  network: string;
  up: boolean | null;
  interface: string | null;
}
/** The running environment now. `probed`: the ports were read from the machines (not inferred). */
export interface EnvironmentLive {
  machines: Record<string, MachineLive>;
  ports: PortLive[];
  probed: boolean;
}

/** A machine at a glance: up, on its way (starting, restarting), unhealthy, or down. */
export type Status = "up" | "starting" | "unhealthy" | "down";

export function machineStatus(m: MachineLive | undefined): Status {
  if (!m) return "down";
  if (m.state === "restarting" || m.state === "created") return "starting";
  if (m.state !== "running") return "down";
  if (m.health === "unhealthy") return "unhealthy";
  return m.health === "starting" ? "starting" : "up";
}

/** A link cut while the lab runs: `machine`'s port on `network`, down. */
export interface SuspendedLink {
  network: string;
  machine: string;
}

/** A machine saved as an image (desktop: `docker commit`). */
export interface Snapshot {
  id: string;
  machine: string;
  image: string;
  label: string;
  created: number;
  in_use: boolean;
}

export interface DesktopInfo {
  version: string;
  docker: boolean;
  vagrant?: boolean;
  wireshark: boolean;
  live_capture: boolean;
  labs: string;
}

/** A line of `docker compose ps --format json` (nothing in particular when it isn't one). */
function serviceLine(line: string): { State?: string } {
  try {
    return JSON.parse(line) as { State?: string };
  } catch {
    return {};
  }
}

/** `docker compose ps --format json`: one JSON object per line. */
export function runningServices(ps: string): number {
  return ps
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(serviceLine)
    .filter((s) => s.State === "running").length;
}
