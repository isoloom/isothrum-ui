/**
 * A lab given as the engine's topology (what an assistant writes through the MCP server), laid
 * out on the canvas: LANs side by side with their machines in a grid inside, automatic routers
 * under the LANs they join (cabled to each), the machines on no LAN in a row below, and the
 * cables between machines. The inverse of `toTopology`, for labs nobody drew.
 */

import { migrateEdges, nextPort } from "./cables";
import { conditionsOf, tcProblemText, type Tc } from "./conditions";
import { portsText, type Service } from "./ports";
import {
  LAN_BEHAVIOR,
  MACHINE_W,
  centerOf,
  cleanName,
  uid,
  type CableEdge,
  type Draft,
  type IconId,
  type LabNode,
  type LanNode,
  type LinkConditions,
  type MachineData,
  type MachineNode,
  type Side,
} from "./model";

type TopologyNode = {
  kind: { container?: { image: string; idle?: boolean }; vm?: { os: string; provision?: string[] }; router?: object };
  access?: boolean;
  services?: Service[];
  networks?: Record<string, number | null>;
};

export interface Topology {
  name: string;
  nodes: Record<string, TopologyNode>;
  networks?: Record<string, { cidr: string; internet?: boolean; tc?: Tc }>;
  links?: { a: { node: string; port: string }; b: { node: string; port: string }; tc?: Tc }[];
}

const COLS = 3;
const CELL_W = 170;
const CELL_H = 175;
const GAP = 160;

function icon(kind: TopologyNode["kind"], access: boolean): IconId {
  if (kind.router) return "router";
  if (kind.vm) return access ? "laptop" : "monitor";
  const image = kind.container?.image ?? "";
  return /nginx|httpd|apache|caddy|traefik|postgres|mysql|mariadb|redis|mongo|bind|dnsmasq|vsftpd|postfix/.test(image) ? "server" : "container";
}

/** What the layout builds: the nodes and cables so far, the LANs and machines by topology name,
 * and what in the topology the drawing can't keep. */
interface Layout {
  topo: Topology;
  nodes: LabNode[];
  edges: CableEdge[];
  lans: Map<string, LanNode>;
  machines: Map<string, MachineNode>;
  problems: string[];
}

/** A topology laid out: the draft, and each value in the topology the drawing leaves out. */
export interface LaidOut {
  draft: Draft;
  problems: string[];
}

/** The editor's numbers for the `tc` at path `at`, each value it can't read kept as a problem. */
function conditionsAt(layout: Layout, at: string, tc: Tc | undefined): LinkConditions | undefined {
  const { conditions, problems } = conditionsOf(tc);
  layout.problems.push(...problems.map((p) => tcProblemText(at, p)));
  return conditions;
}

/** The LANs among a machine's networks. */
const lansOf = (layout: Layout, n: TopologyNode) => Object.keys(n.networks ?? {}).filter((name) => layout.lans.has(name));

/** Each LAN's machines: those that sit in it (their first LAN); routers join theirs by cables. */
function residents(topo: Topology): Map<string, string[]> {
  const lanNames = Object.keys(topo.networks ?? {});
  const inside = new Map<string, string[]>(lanNames.map((l) => [l, []]));
  for (const [name, n] of Object.entries(topo.nodes)) {
    const first = Object.keys(n.networks ?? {}).find((l) => lanNames.includes(l));
    if (!n.kind.router && first) inside.get(first)?.push(name);
  }
  return inside;
}

/** The LANs, in a row, each sized for the grid of machines inside it. */
function placeLans(layout: Layout, inside: Map<string, string[]>): void {
  let x = 0;
  for (const [name, net] of Object.entries(layout.topo.networks ?? {})) {
    const count = Math.max(1, inside.get(name)?.length ?? 0);
    const w = Math.max(340, Math.min(COLS, count) * CELL_W + 80);
    const h = Math.max(240, Math.ceil(count / COLS) * CELL_H + 90);
    const lan: LanNode = {
      ...LAN_BEHAVIOR,
      id: uid("l"),
      type: "lan",
      position: { x, y: 0 },
      width: w,
      height: h,
      data: { name: cleanName(name), cidr: net.cidr, internet: net.internet ?? true, tc: conditionsAt(layout, `networks.${name}.tc`, net.tc) },
    };
    layout.lans.set(name, lan);
    layout.nodes.push(lan);
    x += w + GAP;
  }
}

/** A machine from its topology entry, at `position`. */
function addMachine(layout: Layout, name: string, n: TopologyNode, position: { x: number; y: number }): void {
  const access = !!n.access;
  const data: MachineData = {
    name: cleanName(name),
    kind: n.kind.router ? "router" : n.kind.vm ? "vm" : "container",
    icon: icon(n.kind, access),
    image: n.kind.container?.image ?? "",
    os: n.kind.vm?.os ?? "",
    provision: (n.kind.vm?.provision ?? []).join("\n"),
    ports: portsText(n.services ?? []),
    access,
    ...(n.kind.container ? { idle: n.kind.container.idle } : {}),
  };
  const pins = Object.fromEntries(Object.entries(n.networks ?? {}).filter((e): e is [string, number] => typeof e[1] === "number"));
  if (Object.keys(pins).length) data.pins = pins;
  const m: MachineNode = { id: uid("m"), type: "machine", position, data };
  layout.machines.set(name, m);
  layout.nodes.push(m);
}

/** Machines inside their first LAN, in a grid; routers under the LANs they join; the rest below. */
function placeMachines(layout: Layout, inside: Map<string, string[]>): void {
  for (const [lanName, names] of inside) {
    const lan = layout.lans.get(lanName);
    if (!lan) continue;
    names.forEach((name, i) => {
      const at = { x: lan.position.x + 40 + (i % COLS) * CELL_W, y: lan.position.y + 70 + Math.floor(i / COLS) * CELL_H };
      addMachine(layout, name, layout.topo.nodes[name], at);
    });
  }
  const lanBottom = Math.max(0, ...[...layout.lans.values()].map((l) => l.height ?? 0));
  let routerX = 0;
  let looseX = 0;
  for (const [name, n] of Object.entries(layout.topo.nodes)) {
    if (layout.machines.has(name)) continue;
    const joined = lansOf(layout, n).flatMap((l) => layout.lans.get(l) ?? []);
    if (n.kind.router && joined.length) {
      const center = joined.reduce((s, l) => s + l.position.x + (l.width ?? 0) / 2, 0) / joined.length;
      routerX = Math.max(routerX, center - MACHINE_W / 2);
      addMachine(layout, name, n, { x: routerX, y: lanBottom + 110 });
      routerX += MACHINE_W + 60;
    } else {
      addMachine(layout, name, n, { x: looseX, y: lanBottom + 110 + CELL_H + 60 });
      looseX += CELL_W;
    }
  }
}

/** The side of a LAN that faces a machine, relative to the LAN's own proportions. */
function side(lan: LanNode, m: MachineNode): Side {
  const d = { x: centerOf(m).x - centerOf(lan).x, y: centerOf(m).y - centerOf(lan).y };
  if (Math.abs(d.x) / (lan.width ?? 1) > Math.abs(d.y) / (lan.height ?? 1)) return d.x < 0 ? "left" : "right";
  return d.y < 0 ? "top" : "bottom";
}

/** Where a cable leaves a machine: an appliance's port, or the top or bottom facing the other end. */
function handle(m: MachineNode, other: LabNode): string {
  if (m.data.icon === "router" || m.data.icon === "shield") return "port";
  return centerOf(other).y < centerOf(m).y ? "top" : "bottom";
}

/** A cable from each machine to each LAN it joins besides the one it sits in. */
function cableToLans(layout: Layout): void {
  for (const [name, n] of Object.entries(layout.topo.nodes)) {
    const m = layout.machines.get(name);
    if (!m) continue;
    const skip = n.kind.router ? undefined : lansOf(layout, n)[0];
    for (const l of lansOf(layout, n).filter((x) => x !== skip)) {
      const lan = layout.lans.get(l);
      if (!lan) continue;
      layout.edges.push({
        id: uid("c"),
        type: "cable",
        source: m.id,
        sourceHandle: handle(m, lan),
        target: lan.id,
        targetHandle: side(lan, m),
        data: { aPort: nextPort(m.id, layout.edges), bPort: "" },
      });
    }
  }
}

/** The links between machines, each with its ports and conditions. */
function cableLinks(layout: Layout): void {
  for (const [i, link] of (layout.topo.links ?? []).entries()) {
    const a = layout.machines.get(link.a.node);
    const b = layout.machines.get(link.b.node);
    if (!a || !b) continue;
    layout.edges.push({
      id: uid("c"),
      type: "cable",
      source: a.id,
      sourceHandle: handle(a, b),
      target: b.id,
      targetHandle: handle(b, a),
      data: {
        aPort: link.a.port || nextPort(a.id, layout.edges),
        bPort: link.b.port || nextPort(b.id, layout.edges),
        tc: conditionsAt(layout, `links[${String(i)}].tc`, link.tc),
      },
    });
  }
}

export function draftFromTopology(topo: Topology): LaidOut {
  const layout: Layout = { topo, nodes: [], edges: [], lans: new Map(), machines: new Map(), problems: [] };
  const inside = residents(topo);
  placeLans(layout, inside);
  placeMachines(layout, inside);
  cableToLans(layout);
  cableLinks(layout);
  const draft = { name: cleanName(topo.name) || "lab", nodes: layout.nodes, edges: migrateEdges(layout.edges, layout.nodes) };
  return { draft, problems: layout.problems };
}
