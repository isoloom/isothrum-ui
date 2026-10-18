import { tcOf, type Tc } from "./conditions";
import { lansAround } from "./geometry";
import { idleByDefault, isLan, isMachine, isSwitch, type CableEdge, type LabNode, type MachineData } from "./model";
import { readPorts, type Service } from "./ports";
import { accessVlan, isTrunkPort, switchLans, vlanName } from "./vlans";

/** The lab as the engine's topology JSON (`isothrum_compiler::Topology`). */

/** Machine id -> the LANs it is on. */
type Membership = Map<string, Set<string>>;

function join(membership: Membership, machine: string, lan: string): void {
  membership.set(machine, (membership.get(machine) ?? new Set()).add(lan));
}

/** A machine on a switch port joins the port's VLAN; on the trunk, every VLAN of the switch. */
function joinSwitchPorts(membership: Membership, e: CableEdge, byId: Map<string, LabNode>): void {
  const a = byId.get(e.source);
  const b = byId.get(e.target);
  for (const [m, sw, handle] of [
    [a, b, e.targetHandle],
    [b, a, e.sourceHandle],
  ] as const) {
    if (!m || !sw || !isMachine(m) || !isSwitch(sw)) continue;
    if (isTrunkPort(sw, handle)) {
      for (const v of sw.data.vlans) join(membership, m.id, vlanName(v.id));
    } else {
      const vlan = accessVlan(sw, handle);
      if (vlan !== null) join(membership, m.id, vlanName(vlan));
    }
  }
}

/** A machine is on a LAN when it sits inside its area, or when a cable runs from it to the area. */
function membershipOf(nodes: LabNode[], edges: CableEdge[], byId: Map<string, LabNode>): Membership {
  const membership: Membership = new Map();
  for (const n of nodes.filter(isMachine)) for (const l of lansAround(n, nodes)) join(membership, n.id, l.data.name);
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (a && b && isMachine(a) && isLan(b)) join(membership, a.id, b.data.name);
    if (a && b && isLan(a) && isMachine(b)) join(membership, b.id, a.data.name);
    joinSwitchPorts(membership, e, byId);
  }
  return membership;
}

/** What a machine runs, as the engine's `kind`. */
function kindOf(m: MachineData) {
  if (m.kind === "router") return { router: {} };
  if (m.kind === "container") {
    return {
      container: m.appliance
        ? { image: m.image.trim(), appliance: m.appliance, ...(m.config?.trim() ? { config: m.config } : {}) }
        : { image: m.image.trim(), idle: m.idle ?? idleByDefault(m.image) },
    };
  }
  const provision = m.provision
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return { vm: { os: m.os, provision } };
}

/** The ports in a machine's field that Isoloom takes (the others are reported: `canvasIssues`). */
const servicesOf = (m: MachineData): Service[] => readPorts(m.ports).services;

/** Cables between two machines; a cable to a LAN is a membership, not a link. */
function linksOf(edges: CableEdge[], byId: Map<string, LabNode>) {
  return edges.flatMap((e) => {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b || !isMachine(a) || !isMachine(b) || !a.data.name || !b.data.name || !e.data) return [];
    return [{ a: { node: a.data.name, port: e.data.aPort.trim() }, b: { node: b.data.name, port: e.data.bPort.trim() }, tc: tcOf(e.data.tc) }];
  });
}

interface Net {
  cidr: string;
  internet: boolean;
  tc?: Tc;
  switch?: string;
  vlan?: number;
}

/** The LAN areas, and each switch's VLANs, which nest under it in isoloom.yml (`sw1.vlan10`). */
function networksOf(nodes: LabNode[], edges: CableEdge[]): Record<string, Net> {
  const lans = nodes.filter(isLan).filter((l) => l.data.name);
  const networks: Record<string, Net> = Object.fromEntries(
    lans.map((l) => [l.data.name, { cidr: l.data.cidr.trim(), internet: l.data.internet, tc: tcOf(l.data.tc) }]),
  );
  const nameOfGroup = switchLans(nodes, edges);
  for (const sw of nodes.filter(isSwitch)) {
    for (const v of sw.data.vlans) {
      const net = (networks[vlanName(v.id)] as Net | undefined) ?? { cidr: v.cidr.trim(), internet: true };
      networks[vlanName(v.id)] = { ...net, tc: undefined, switch: nameOfGroup(sw.id), vlan: v.id };
    }
  }
  return networks;
}

export function toTopology(name: string, nodes: LabNode[], edges: CableEdge[]): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const membership = membershipOf(nodes, edges, byId);
  const machines = Object.fromEntries(
    nodes
      .filter(isMachine)
      .filter((n) => n.data.name)
      .map(({ id, data: m }) => {
        const networks = Object.fromEntries([...(membership.get(id) ?? [])].map((lan) => [lan, m.pins?.[lan] ?? null]));
        return [m.name, { kind: kindOf(m), access: m.access, services: servicesOf(m), networks }];
      }),
  );
  const links = linksOf(edges, byId);
  return JSON.stringify({ name, nodes: machines, networks: networksOf(nodes, edges), links });
}
