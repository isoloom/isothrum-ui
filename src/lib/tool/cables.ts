import type { Connection } from "@xyflow/react";
import { sideOnLan } from "./geometry";
import { isAppliance, isLan, isMachine, isRealRouter, isSwitch, routerPort, uid, type CableEdge, type LabNode, type LanNode, type MachineNode } from "./model";
import { accessVlan, switchPortLabel, vlanName } from "./vlans";

/** Cables: where they plug in, what their ends are called, and which network each one is. */

/** The handle a cable uses on a machine: an appliance's single port, or a machine's top/bottom. */
function machineHandle(m: MachineNode, old: string | null | undefined): string {
  if (isAppliance(m)) return "port";
  return old === "bottom" ? "bottom" : "top";
}

const isPort = (h: string | null | undefined): h is string => !!h && /^eth\d+$/.test(h);

/** The ports each real router's cables already plug into. */
function takenPorts(edges: CableEdge[], byId: Map<string, LabNode>): Map<string, Set<string>> {
  const taken = new Map<string, Set<string>>();
  for (const e of edges) {
    for (const [id, h] of [
      [e.source, e.sourceHandle],
      [e.target, e.targetHandle],
    ] as const) {
      const n = byId.get(id);
      if (n && isRealRouter(n) && isPort(h)) taken.set(id, (taken.get(id) ?? new Set()).add(h));
    }
  }
  return taken;
}

/**
 * Cables saved with the old handles (one on each side of every machine) move onto the current
 * ones: an appliance's single port, the top or bottom of other machines. LAN handles stay.
 */
export function migrateEdges(edges: CableEdge[], nodes: LabNode[]): CableEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // A real router's cables plug into its ports: one that isn't on a port yet takes a free one.
  const taken = takenPorts(edges, byId);
  const freePort = (id: string) => {
    const used = taken.get(id) ?? new Set<string>();
    for (let i = 0; i < 64; i++) {
      if (!used.has(routerPort(i))) {
        used.add(routerPort(i));
        taken.set(id, used);
        return routerPort(i);
      }
    }
    return routerPort(0);
  };
  const fix = (id: string, h: string | null | undefined) => {
    const n = byId.get(id);
    if (n && isRealRouter(n)) return isPort(h) ? h : freePort(id);
    return n && isMachine(n) ? machineHandle(n, h) : h;
  };
  return edges.map((e) => ({ ...e, sourceHandle: fix(e.source, e.sourceHandle), targetHandle: fix(e.target, e.targetHandle) }));
}

/** The ports a machine's cables already use. */
function usedPorts(nodeId: string, edges: CableEdge[]): string[] {
  return edges.flatMap((e) => [...(e.source === nodeId && e.data ? [e.data.aPort] : []), ...(e.target === nodeId && e.data ? [e.data.bPort] : [])]);
}

/**
 * The first free `eth<n>` on a machine, from `first`: an appliance on a LAN's edge uses eth0 on
 * that LAN, so its cables start at eth1.
 */
export function nextPort(nodeId: string, edges: CableEdge[], first = 0): string {
  const used = new Set(usedPorts(nodeId, edges));
  for (let i = first; ; i++) {
    if (!used.has(`eth${String(i)}`)) return `eth${String(i)}`;
  }
}

/** Whether a cable runs between two named machines: a link of its own in isoloom.yml. */
function isLink(e: CableEdge, byId: Map<string, LabNode>): boolean {
  const x = byId.get(e.source);
  const y = byId.get(e.target);
  return !!x && !!y && isMachine(x) && isMachine(y) && !!x.data.name && !!y.data.name && !!e.data;
}

/** The network a cable on a switch port carries: the access port's VLAN (a trunk carries several). */
function switchNetwork(edge: CableEdge, byId: Map<string, LabNode>): string | null | undefined {
  for (const [sw, handle] of [
    [byId.get(edge.source), edge.sourceHandle],
    [byId.get(edge.target), edge.targetHandle],
  ] as const) {
    if (!sw || !isSwitch(sw)) continue;
    const vlan = accessVlan(sw, handle);
    return vlan !== null ? vlanName(vlan) : null;
  }
  return undefined;
}

/**
 * The Isoloom network a cable became (`link-<n>`): cables between two machines are numbered in
 * the order `toTopology` lists them. A cable to a LAN is that LAN.
 */
export function networkOfCable(edgeId: string, nodes: LabNode[], edges: CableEdge[]): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return null;
  const a = byId.get(edge.source);
  const b = byId.get(edge.target);
  if (a && isLan(a)) return a.data.name;
  if (b && isLan(b)) return b.data.name;
  const onSwitch = switchNetwork(edge, byId);
  if (onSwitch !== undefined) return onSwitch;
  const i = edges.filter((e) => isLink(e, byId)).findIndex((e) => e.id === edgeId);
  return i < 0 ? null : `link-${String(i)}`;
}

/** The names of a cable's ends that are machines (a LAN or a switch has no port to cut). */
export function machineEnds(edge: CableEdge, nodes: LabNode[]): string[] {
  return [edge.source, edge.target].flatMap((id) => {
    const n = nodes.find((x) => x.id === id);
    return n && isMachine(n) ? [n.data.name] : [];
  });
}

/** What a cable's ends can plug into, by node id. */
export interface LabIndex {
  lanIds: Set<string>;
  switchIds: Set<string>;
  routerIds: Set<string>;
}

/** Whether a cable end on `node` takes a port: a switch's or a real router's. */
const ported = (index: LabIndex, node: string) => index.switchIds.has(node) || index.routerIds.has(node);

/** Whether a switch or router port already has a cable (other than `ignore`, the one moving). */
function portTaken(index: LabIndex, edges: CableEdge[], ignore: string | undefined, node: string, handle: string | null | undefined): boolean {
  return (
    ported(index, node) &&
    edges.some((e) => e.id !== ignore && ((e.source === node && e.sourceHandle === handle) || (e.target === node && e.targetHandle === handle)))
  );
}

/** A cable's two ends, as React Flow gives them (a connection being drawn, or a cable). */
interface Ends {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Machine to machine, LAN or port. Never LAN to LAN or switch to LAN, and a switch or router
 * port takes one cable, as on real gear. `ignore`: the cable being moved, whose ends don't count.
 */
export function canConnect(c: Ends, index: LabIndex, edges: CableEdge[], ignore?: string): boolean {
  if (c.source === c.target) return false;
  const area = (id: string) => index.lanIds.has(id) || index.switchIds.has(id);
  const bothSwitches = index.switchIds.has(c.source) && index.switchIds.has(c.target);
  if (area(c.source) && area(c.target) && !bothSwitches) return false;
  return !portTaken(index, edges, ignore, c.source, c.sourceHandle) && !portTaken(index, edges, ignore, c.target, c.targetHandle);
}

/** An appliance on a LAN's edge already uses eth0 there. */
export function onLanEdge(id: string, nodes: LabNode[], lans: LanNode[]): boolean {
  const n = nodes.find((x) => x.id === id);
  return !!n && isAppliance(n) && sideOnLan(n, lans) !== null;
}

/**
 * The label of a cable's end on `node`: the switch port, the router's port, nothing on a LAN,
 * or else `machinePort()` (the machine's next free port, or the one it keeps).
 */
function endLabel(index: LabIndex, node: string, handle: string | null | undefined, machinePort: () => string): string {
  if (index.lanIds.has(node)) return "";
  if (index.switchIds.has(node)) return switchPortLabel(handle);
  if (index.routerIds.has(node)) return handle ?? "";
  return machinePort();
}

/** A new cable for a connection, its ends labelled (`first(node)`: the first port to give). */
export function newCable(c: Connection, index: LabIndex, edges: CableEdge[], first: (node: string) => number): CableEdge {
  return {
    id: uid("c"),
    type: "cable",
    source: c.source,
    sourceHandle: c.sourceHandle,
    target: c.target,
    targetHandle: c.targetHandle,
    // A LAN has no ports: the cable's end on it stays unnamed.
    data: {
      aPort: endLabel(index, c.source, c.sourceHandle, () => nextPort(c.source, edges, first(c.source))),
      bPort: endLabel(index, c.target, c.targetHandle, () => nextPort(c.target, edges, first(c.target))),
    },
  };
}

/**
 * The cables after `old` moved to `c`. A moved end gets the label of where it lands: the switch
 * port, nothing on a LAN, or the machine's next free port. An end that stays put keeps its label
 * (same machine: same port; where on its box the cable attaches is only drawing).
 */
export function reconnected(edges: CableEdge[], old: CableEdge, c: Connection, index: LabIndex, first: (node: string) => number): CableEdge[] {
  const others = edges.filter((e) => e.id !== old.id);
  const label = (node: string, handle: string | null, keep: string, same: boolean) => endLabel(index, node, handle, () => (same ? keep : nextPort(node, others, first(node))));
  return edges.map((e) =>
    e.id !== old.id || !e.data
      ? e
      : {
          ...e,
          source: c.source,
          sourceHandle: c.sourceHandle,
          target: c.target,
          targetHandle: c.targetHandle,
          data: {
            aPort: label(c.source, c.sourceHandle, e.data.aPort, c.source === e.source),
            bPort: label(c.target, c.targetHandle, e.data.bPort, c.target === e.target),
          },
        },
  );
}
