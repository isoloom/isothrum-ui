import { machineEnds, networkOfCable } from "./cables";
import { machineStatus, type EnvironmentLive, type Status, type SuspendedLink } from "./desktop";
import type { CableEdge, LabNode } from "./model";

/**
 * The running lab as the canvas shows it (desktop app; null: not running, or in a browser).
 * Machines by name; ports by `machine/network` (up, down, or null: unknown); cables by edge id;
 * LANs by name, with how many of their ports are up.
 */
export type CableStatus = "up" | "cut" | "down" | "unknown";
export interface LiveView {
  machines: Partial<Record<string, { status: Status; detail: string }>>;
  ports: Partial<Record<string, boolean | null>>;
  cables: Partial<Record<string, CableStatus>>;
  lans: Partial<Record<string, { up: number; total: number }>>;
}

/** A cable now: cut (suspended), down (a port or a machine is), up (both ports are), or unknown. */
function cableStatus(view: Pick<LiveView, "machines" | "ports">, network: string, ends: string[], links: SuspendedLink[]): CableStatus {
  if (links.some((l) => l.network === network && ends.includes(l.machine))) return "cut";
  const states = ends.map((m) => view.ports[`${m}/${network}`]);
  if (states.some((s) => s === false) || ends.some((m) => view.machines[m]?.status === "down")) return "down";
  return states.length && states.every((s) => s === true) ? "up" : "unknown";
}

/** Each LAN's ports up, out of all. */
function lansLive(live: EnvironmentLive): LiveView["lans"] {
  const lans: Record<string, { up: number; total: number }> = {};
  for (const p of live.ports) {
    const l = (lans[p.network] ??= { up: 0, total: 0 });
    l.total += 1;
    if (p.up === true) l.up += 1;
  }
  return lans;
}

export function liveViewOf(live: EnvironmentLive, links: SuspendedLink[], nodes: LabNode[], edges: CableEdge[]): LiveView {
  const ports: Record<string, boolean | null> = {};
  for (const p of live.ports) ports[`${p.machine}/${p.network}`] = p.up;
  const machines = Object.fromEntries(
    Object.entries(live.machines).map(([m, l]) => [m, { status: machineStatus(l), detail: l.health ? `${l.state}, ${l.health}` : l.state }]),
  );
  const cables: Record<string, CableStatus> = {};
  for (const e of edges) {
    const network = networkOfCable(e.id, nodes, edges);
    if (network) cables[e.id] = cableStatus({ machines, ports }, network, machineEnds(e, nodes), links);
  }
  return { machines, ports, cables, lans: lansLive(live) };
}
