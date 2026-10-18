import { twoVlans } from "./create";
import { DEFAULT_OS } from "./os";
import { LAN_BEHAVIOR, MACHINE_H, MACHINE_W, type CableEdge, type Draft, type LabNode, type LanData, type LanNode, type MachineData, type MachineNode } from "./model";

/** The labs the menu loads: one to start from, and one with VLANs. */

const base = { image: "", os: "", provision: "", ports: "", access: false };

const machine = (id: string, position: { x: number; y: number }, data: MachineData): MachineNode => ({ id, type: "machine", position, data });

const lan = (id: string, area: { x: number; y: number; w: number; h: number }, data: LanData): LanNode => ({
  ...LAN_BEHAVIOR,
  id,
  type: "lan",
  position: { x: area.x, y: area.y },
  width: area.w,
  height: area.h,
  data,
});

/** A cable from `source` to `target`, its handles and port labels as [source's, target's]. */
const cable = (id: string, [source, target]: [string, string], [sh, th]: [string, string], [aPort, bPort]: [string, string]): CableEdge => ({
  id,
  type: "cable",
  source,
  sourceHandle: sh,
  target,
  targetHandle: th,
  data: { aPort, bPort },
});

/**
 * A starting lab: an office LAN with a workstation, a servers LAN with a web server and a
 * database, and a router cabled to both LANs.
 */
export function exampleLab(): Draft {
  const nodes: LabNode[] = [
    // LANs first, so they are drawn under the machines.
    lan("l-office", { x: -40, y: 40, w: 280, h: 260 }, { name: "office", cidr: "10.10.1.0/24", internet: true }),
    lan("l-servers", { x: 560, y: -80, w: 300, h: 500 }, { name: "servers", cidr: "10.10.2.0/24", internet: true }),
    machine("m-user", { x: 40, y: 110 }, { ...base, name: "user", kind: "vm", icon: "laptop", os: DEFAULT_OS, access: true }),
    // On the office LAN's right edge: a two-network appliance, office on one side, its port out.
    machine("m-router", { x: 240 - MACHINE_W / 2, y: 170 - MACHINE_H / 2 }, { ...base, name: "router", kind: "router", icon: "router" }),
    machine("m-web", { x: 650, y: 0 }, { ...base, name: "web", kind: "container", icon: "server", image: "nginx:1.27-alpine", ports: "80" }),
    machine("m-db", { x: 650, y: 240 }, { ...base, name: "db", kind: "vm", icon: "monitor", os: DEFAULT_OS, provision: "provision/db.sh", ports: "5432" }),
  ];
  const edges = [cable("c-1", ["m-router", "l-servers"], ["port", "left"], ["eth1", ""])];
  return { name: "office-lab", nodes, edges };
}

/**
 * The VLAN example: a switch with vlan10 and vlan20, two PCs on vlan10, a server on vlan20, and a
 * router on the trunk (router-on-a-stick: one address on each VLAN).
 */
export function vlanExample(): Draft {
  const nodes: LabNode[] = [
    { id: "s-sw1", type: "switch", position: { x: 40, y: 0 }, data: { ...twoVlans(), name: "sw1" } },
    machine("m-router", { x: 180, y: -230 }, { ...base, name: "router", kind: "router", icon: "router" }),
    machine("m-pc1", { x: -140, y: 220 }, { ...base, name: "pc1", kind: "vm", icon: "laptop", os: DEFAULT_OS, access: true }),
    machine("m-pc2", { x: 40, y: 220 }, { ...base, name: "pc2", kind: "container", icon: "container", image: "alpine:3.20" }),
    machine("m-srv", { x: 300, y: 220 }, { ...base, name: "srv", kind: "container", icon: "server", image: "nginx:1.27-alpine", ports: "80" }),
  ];
  const onSwitch = (id: string, m: string, mh: string, port: string, labels: [string, string]) => cable(id, [m, "s-sw1"], [mh, port], labels);
  const edges = [
    onSwitch("c-1", "m-router", "port", "trunk", ["eth0", "T"]),
    onSwitch("c-2", "m-pc1", "top", "p1", ["eth0", "1"]),
    onSwitch("c-3", "m-pc2", "top", "p2", ["eth0", "2"]),
    onSwitch("c-4", "m-srv", "top", "p5", ["eth0", "5"]),
  ];
  return { name: "vlan-lab", nodes, edges };
}
