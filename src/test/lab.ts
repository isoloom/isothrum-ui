import type { CableData, CableEdge, LabNode, LanData, LanNode, MachineData, MachineNode, NoteNode, SwitchNode } from "@/lib/tool/model";
import type { IssueText } from "@/lib/tool/issues";
import { toTopology } from "@/lib/tool/topology";

/**
 * Builders for the editor model's tests: small labs, each node given only what the test is about.
 * A node's name defaults to its id.
 */

type At = { x: number; y: number };

/** A container machine (nginx), unless `data` says otherwise. */
export function machine(id: string, data: Partial<MachineData> = {}, position: At = { x: 0, y: 0 }): MachineNode {
  return {
    id,
    type: "machine",
    position,
    data: { name: id, kind: "container", icon: "container", image: "nginx:1.27-alpine", os: "", provision: "", ports: "", access: false, ...data },
  };
}

/** An automatic router (the kind that is no machine). */
export const autoRouter = (id: string, position: At = { x: 0, y: 0 }): MachineNode => machine(id, { kind: "router", icon: "router", image: "" }, position);

/** A router you configure (FRR in a container): drawn with ports. */
export const realRouter = (id: string, position: At = { x: 0, y: 0 }, data: Partial<MachineData> = {}): MachineNode =>
  machine(id, { icon: "router", image: "frrouting/frr:v8.5.2", ...data }, position);

/** A LAN area at `area` (400 by 300 at the origin by default). */
export function lan(id: string, data: Partial<LanData> = {}, area: Partial<{ x: number; y: number; w: number; h: number }> = {}): LanNode {
  const { x = 0, y = 0, w = 400, h = 300 } = area;
  return { id, type: "lan", position: { x, y }, width: w, height: h, data: { name: id, cidr: "10.10.1.0/24", internet: true, ...data } };
}

/** A switch: vlan10 on ports 1 and 2, vlan20 on port 3, port 4 a trunk, the rest unassigned. */
export function switchNode(id: string, data: Partial<SwitchNode["data"]> = {}, position: At = { x: 0, y: 0 }): SwitchNode {
  return {
    id,
    type: "switch",
    position,
    data: {
      name: id,
      vlans: [
        { id: 10, cidr: "10.10.10.0/24" },
        { id: 20, cidr: "10.10.20.0/24" },
      ],
      ports: [10, 10, 20, "trunk", null, null, null, null],
      ...data,
    },
  };
}

export const note = (id: string, position: At = { x: 0, y: 0 }): NoteNode => ({
  id,
  type: "note",
  position,
  width: 200,
  height: 90,
  data: { text: "remember", shape: "rect", color: "yellow" },
});

/** A cable's ends and labels: handles default to none, ports to eth0 on both ends. */
type CableOptions = { sourceHandle?: string | null; targetHandle?: string | null } & Partial<CableData>;

export function cable(id: string, source: string, target: string, options: CableOptions = {}): CableEdge {
  const { sourceHandle = null, targetHandle = null, ...data } = options;
  return { id, type: "cable", source, sourceHandle, target, targetHandle, data: { aPort: "eth0", bPort: "eth0", ...data } };
}

/** The node of `nodes` with id `id` (a test failure when there is none). */
export function byId<T extends LabNode>(nodes: T[], id: string): T {
  const found = nodes.find((n) => n.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

/** The canvas's findings in plain words, so tests can read them. */
export const issueText: IssueText = {
  vlanBlocks: (vlan, block, other, sw) => `${vlan}: ${block} vs ${other} on ${sw}`,
  areaBlock: (lan, block, switches) => `area ${lan}: ${block} vs ${switches}`,
  noName: { machine: "unnamed machine", lan: "unnamed lan", switch: "unnamed switch" },
  sameName: { machine: (n) => `two machines ${n}`, lan: (n) => `two lans ${n}`, switch: (n) => `two switches ${n}` },
  badPort: (m, entry) => `${m}: port ${entry}`,
};

/** A compiled lab: `toTopology`'s JSON, parsed. */
export interface Compiled {
  name: string;
  nodes: Record<string, { kind: Record<string, unknown>; access: boolean; services: { port: number; protocol?: string }[]; networks: Record<string, number | null> }>;
  networks: Record<string, { cidr: string; internet: boolean; tc?: unknown; switch?: string; vlan?: number }>;
  links: { a: { node: string; port: string }; b: { node: string; port: string }; tc?: unknown }[];
}

/** The lab as the engine reads it. */
export const compile = (nodes: LabNode[], edges: CableEdge[] = [], name = "lab"): Compiled => JSON.parse(toTopology(name, nodes, edges)) as Compiled;

/** The networks the VLANs of a switch named sw1 become: `switchNode("sw1")`'s, and the VLAN example's. */
export const sw1Networks: Compiled["networks"] = {
  vlan10: { cidr: "10.10.10.0/24", internet: true, switch: "sw1", vlan: 10 },
  vlan20: { cidr: "10.10.20.0/24", internet: true, switch: "sw1", vlan: 20 },
};
