import { networkOfCable } from "./cables";
import { insideLan, lanUnder, sideOnLan } from "./geometry";
import { centerOf, isAppliance, isMachine, isRealRouter, isSwitch, type CableEdge, type LabNode, type LanNode, type Side } from "./model";
import { vlanColor, vlanOf } from "./vlans";

/** Which way ports face and where cables attach: worked out from where things are on the canvas. */

/** A node's vertical middle, by its measured height (its top when it hasn't been measured). */
const middleY = (n: LabNode) => n.position.y + (n.height ?? n.measured?.height ?? 0) / 2;

/** The nodes at the other end of `n`'s cables. */
function peersOf(n: LabNode, nodes: LabNode[], edges: CableEdge[]): LabNode[] {
  return edges
    .filter((e) => e.source === n.id || e.target === n.id)
    .flatMap((e) => nodes.find((x) => x.id === (e.source === n.id ? e.target : e.source)) ?? []);
}

/**
 * Which way each appliance's single port faces, by node id. On a LAN's edge: out of the LAN.
 * Elsewhere: toward its cables (down when they mostly lead below it), so they don't cross the box.
 */
function applianceSides(nodes: LabNode[], edges: CableEdge[], lans: LanNode[], out: Record<string, Side>): void {
  for (const n of nodes) {
    if (!isAppliance(n)) continue;
    const side = sideOnLan(n, lans);
    if (side) {
      out[n.id] = side;
      continue;
    }
    const peers = peersOf(n, nodes, edges);
    const below = peers.filter((x) => middleY(x) > n.position.y + 58).length;
    if (peers.length && below > peers.length / 2) out[n.id] = "bottom";
  }
}

/** A switch's (or a real router's) port faces up, `<id>:<port>`, when the device on it is above. */
function portSides(nodes: LabNode[], edges: CableEdge[], out: Record<string, Side>): void {
  for (const e of edges) {
    for (const [end, handle, other] of [
      [e.source, e.sourceHandle, e.target],
      [e.target, e.targetHandle, e.source],
    ] as const) {
      const sw = nodes.find((x) => x.id === end);
      const peer = nodes.find((x) => x.id === other);
      if (sw && peer && (isSwitch(sw) || isRealRouter(sw)) && handle && middleY(peer) < sw.position.y) out[`${sw.id}:${handle}`] = "top";
    }
  }
}

/** The sides ports face: an appliance's by its id, a switch's or router's ports by `<id>:<port>`. */
export function facingSides(nodes: LabNode[], edges: CableEdge[], lans: LanNode[]): Record<string, Side> {
  const out: Record<string, Side> = {};
  applianceSides(nodes, edges, lans, out);
  portSides(nodes, edges, out);
  return out;
}

/** The side of a LAN another node lies toward, relative to the LAN's own proportions. */
function lanSideToward(lan: LabNode, other: LabNode): Side {
  const a = centerOf(lan);
  const b = centerOf(other);
  const dx = (b.x - a.x) / (lan.width ?? lan.measured?.width ?? 1);
  const dy = (b.y - a.y) / (lan.height ?? lan.measured?.height ?? 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

/**
 * Where a cable attaches to `n`, going to `other`. A switch keeps the port the cable is plugged
 * into, and a real router its port. An appliance on a LAN's edge: its inside port toward machines
 * in that LAN, the outside one otherwise. A machine: its top or bottom, whichever faces the
 * other end. A LAN: its side facing the other end.
 */
function handleFor(n: LabNode, handle: string | null | undefined, other: LabNode, lans: LanNode[]): string | null | undefined {
  if (isSwitch(n) || isRealRouter(n)) return handle;
  if (isAppliance(n)) {
    const under = lanUnder(n, lans);
    return under && insideLan(centerOf(other), under.lan) ? "lan" : "port";
  }
  if (isMachine(n)) return centerOf(other).y < centerOf(n).y ? "top" : "bottom";
  return lanSideToward(n, other);
}

/**
 * The cables as drawn: each end attached where things are now (not where the cable was first
 * drawn), and a cable on a VLAN (a switch access port, a VLAN area, a router port on it) in its
 * color.
 */
export function shownCables(nodes: LabNode[], edges: CableEdge[], lans: LanNode[]): CableEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b) return e;
    const net = networkOfCable(e.id, nodes, edges);
    const vlan = net ? vlanOf(net) : null;
    const data = e.data && vlan !== null ? { ...e.data, color: vlanColor(vlan) } : e.data;
    return { ...e, data, sourceHandle: handleFor(a, e.sourceHandle, b, lans), targetHandle: handleFor(b, e.targetHandle, a, lans) };
  });
}
