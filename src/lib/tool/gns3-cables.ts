import { nextPort } from "./cables";
import { lanRect, within } from "./geometry";
import { centerOf, isLan, uid, type CableEdge, type LabNode, type LanNode, type MachineNode, type Side } from "./model";

/** A GNS3 project's links as cables: machine to machine, or machine to the LAN its switch became. */

export interface Gns3Wiring {
  links: [string, string][];
  /** The machines and the LANs, by GNS3 node id. */
  machines: Map<string, MachineNode>;
  lanOf: Map<string, LanNode>;
  /** Every node of the lab so far (the LANs among them). */
  nodes: LabNode[];
  /** A GNS3 LAN's size: which side of it faces a machine goes by its proportions. */
  lanSize: { w: number; h: number };
}

const machineSide = (m: MachineNode, other: LabNode) => {
  if (m.data.icon === "router" || m.data.icon === "shield") return "port";
  return centerOf(other).y < centerOf(m).y ? "top" : "bottom";
};

function lanSide(w: Gns3Wiring, lan: LanNode, m: MachineNode): Side {
  const d = { x: centerOf(m).x - centerOf(lan).x, y: centerOf(m).y - centerOf(lan).y };
  if (Math.abs(d.x) / w.lanSize.w > Math.abs(d.y) / w.lanSize.h) return d.x < 0 ? "left" : "right";
  return d.y < 0 ? "top" : "bottom";
}

function machineCable(a: MachineNode, b: MachineNode, edges: CableEdge[]): CableEdge {
  return {
    id: uid("c"),
    type: "cable",
    source: a.id,
    sourceHandle: machineSide(a, b),
    target: b.id,
    targetHandle: machineSide(b, a),
    data: { aPort: nextPort(a.id, edges), bPort: nextPort(b.id, edges) },
  };
}

function lanCable(w: Gns3Wiring, m: MachineNode, lan: LanNode, edges: CableEdge[]): CableEdge {
  return {
    id: uid("c"),
    type: "cable",
    source: m.id,
    sourceHandle: machineSide(m, lan),
    target: lan.id,
    targetHandle: lanSide(w, lan, m),
    data: { aPort: nextPort(m.id, edges), bPort: "" },
  };
}

/**
 * A LAN drawn over a machine it isn't cabled to would put that machine on it: its area is hidden
 * (its label and cables stay).
 */
function hideCovering(w: Gns3Wiring, linked: Set<string>): void {
  for (const lan of w.nodes.filter(isLan)) {
    const covers = [...w.machines.values()].some((m) => within(lanRect(lan), centerOf(m)) && !linked.has(`${m.id}/${lan.id}`));
    if (covers) lan.data = { ...lan.data, hidden: true };
  }
}

/** The cables of the project's links (each machine–LAN pair once); hides the LANs that would mislead. */
export function gns3Cables(w: Gns3Wiring): CableEdge[] {
  const edges: CableEdge[] = [];
  const linked = new Set<string>();
  for (const [a, b] of w.links) {
    const ma = w.machines.get(a);
    const mb = w.machines.get(b);
    const lan = w.lanOf.get(b) ?? w.lanOf.get(a);
    const m = ma ?? mb;
    if (ma && mb) edges.push(machineCable(ma, mb, edges));
    else if (m && lan && !linked.has(`${m.id}/${lan.id}`)) {
      linked.add(`${m.id}/${lan.id}`);
      edges.push(lanCable(w, m, lan, edges));
    }
  }
  hideCovering(w, linked);
  return edges;
}
