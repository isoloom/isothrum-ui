import { networkOfCable } from "./cables";
import { lanUnder } from "./geometry";
import { applianceInterface, isRealRouter, isSwitch, routerPort, type CableEdge, type LabNode, type LanNode, type MachineNode } from "./model";
import { isTrunkPort, switchLans, trunkInterface, trunkStripes, vlanColor, vlanName, vlanOf } from "./vlans";

/**
 * A real router's interfaces: each port's color (striped when it is a trunk), and the list of
 * interfaces with the network and address on each; a trunk port has one sub-interface per VLAN
 * (eth0.10, eth0.20), as router-on-a-stick.
 */
export interface RouterPorts {
  colors: Partial<Record<string, string>>;
  interfaces: { name: string; network: string; ip?: string; color: string }[];
}

/** Each machine's addresses (from the engine), by machine name: [network, IPv4][]. */
export type Addresses = Partial<Record<string, [string, string][]>>;

interface Wiring {
  nodes: LabNode[];
  edges: CableEdge[];
  lans: LanNode[];
  /** A network's color: a VLAN's own, a LAN's blue, gray for a point-to-point cable. */
  colorOf: (net: string) => string;
  /** A switch's LAN name, by its id. */
  lanOfSwitch: (id: string) => string;
}

/** One router's interfaces: its cabled ports, an appliance's own names, the LAN it sits on. */
function portsOf(w: Wiring, r: MachineNode, ips: [string, string][]): RouterPorts {
  const ipOn = (net: string) => ips.find(([n]) => n === net)?.[1];
  const view: RouterPorts = { colors: {}, interfaces: [] };
  const add = (name: string, net: string) => view.interfaces.push({ name, network: net, ip: ipOn(net), color: w.colorOf(net) });
  for (const e of w.edges) cabledPort(w, r, e, view, add);
  // Cisco IOL: Isoloom numbers its interfaces in the order of its networks (Ethernet0/0 is
  // management), which is the order of its addresses.
  const kind = r.data.appliance;
  if (kind) view.interfaces = ips.map(([net, ip], k) => ({ name: applianceInterface(kind, k + 1), network: net, ip, color: w.colorOf(net) }));
  // On a LAN's edge, the LAN is on the first port no cable uses.
  const under = lanUnder(r, w.lans);
  if (under) {
    let i = 0;
    while (view.colors[routerPort(i)] && i < 63) i++;
    add(routerPort(i), under.lan.data.name);
    view.colors[routerPort(i)] = w.colorOf(under.lan.data.name);
  }
  view.interfaces.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
  return view;
}

/**
 * The port cable `e` plugs into on router `r`, if it does: on a switch's trunk, one sub-interface
 * per VLAN, named as Isoloom names them (after the switch's LAN: `sw1.10`), and the port striped
 * with their colors; otherwise the cable's network.
 */
function cabledPort(w: Wiring, r: MachineNode, e: CableEdge, view: RouterPorts, add: (name: string, net: string) => void): void {
  const mine = e.source === r.id ? e.sourceHandle : e.target === r.id ? e.targetHandle : null;
  if (!mine) return;
  const other = w.nodes.find((n) => n.id === (e.source === r.id ? e.target : e.source));
  const otherHandle = e.source === r.id ? e.targetHandle : e.sourceHandle;
  if (other && isSwitch(other) && isTrunkPort(other, otherHandle)) {
    const trunk = trunkInterface(w.lanOfSwitch(other.id));
    other.data.vlans.forEach((v) => {
      add(`${trunk}.${String(v.id)}`, vlanName(v.id));
    });
    view.colors[mine] = trunkStripes(other.data.vlans);
    return;
  }
  const net = networkOfCable(e.id, w.nodes, w.edges);
  if (!net) return;
  add(mine, net);
  view.colors[mine] = w.colorOf(net);
}

/**
 * Each real router's interfaces, by node id: the network on each port, its address there, and a
 * color. On a LAN's edge, the LAN is on eth0 (or the first port no cable uses).
 */
export function routerPortsOf(nodes: LabNode[], edges: CableEdge[], lans: LanNode[], addresses: Addresses): Record<string, RouterPorts> {
  const lanNames = new Set(lans.map((l) => l.data.name));
  const colorOf = (net: string) => {
    const v = vlanOf(net);
    if (v !== null) return vlanColor(v);
    return lanNames.has(net) ? "#74c0fc" : "#adb5bd";
  };
  const w: Wiring = { nodes, edges, lans, colorOf, lanOfSwitch: switchLans(nodes, edges) };
  return Object.fromEntries(nodes.filter(isRealRouter).map((r) => [r.id, portsOf(w, r, addresses[r.data.name] ?? [])]));
}
