/**
 * Opening a GNS3 project (.gns3, the JSON GNS3 saves) as a lab. GNS3 draws switches as boxes
 * that machines plug into; here they become LANs, the machines cabled to their edge. Docker
 * nodes keep their image, QEMU/VirtualBox/VMware nodes become VMs (the OS guessed from the
 * image), VPCS becomes a small container, Cisco routers (Dynamips, IOU) automatic routers, a NAT
 * or cloud gives its LAN the internet, and text drawings become notes. What can't come across
 * (an IOS configuration, a node type with no equivalent) is reported, not silently dropped.
 */

import { migrateEdges } from "./cables";
import { gns3Cables } from "./gns3-cables";
import { drawingNote, guessOs, type G3Drawing, type Gns3Text } from "./gns3-parts";
import { LAN_BEHAVIOR, MACHINE_H, MACHINE_W, cleanName, uid, type Draft, type LabNode, type LanNode, type MachineData, type MachineNode, type NoteNode } from "./model";

interface G3Node {
  node_id: string;
  name?: string;
  node_type?: string;
  x?: number;
  y?: number;
  properties?: Record<string, unknown>;
}
interface G3Link {
  nodes?: { node_id: string }[];
}
interface G3Project {
  name?: string;
  type?: string;
  topology?: { nodes?: G3Node[]; links?: G3Link[]; drawings?: G3Drawing[] };
}

/** GNS3 places small icons; Isothrum's machines are about twice as big, so positions spread out. */
const SCALE = 2;
const LAN_W = 260;
const LAN_H = 160;

const SWITCHES = new Set(["ethernet_switch", "ethernet_hub", "atm_switch", "frame_relay_switch"]);
const INTERNET = new Set(["nat", "cloud"]);
const CISCO = new Set(["dynamips", "iou"]);
const VMS = new Set(["qemu", "virtualbox", "vmware"]);

/** Appliances recognised by their image or name: network devices rather than hosts. */
const ROUTER_HINT = /vyos|csr|vios|xrv|routeros|mikrotik|frr|cisco|juniper|vsrx|vmx|veos|arista|nokia|sros|openwrt/i;
const FIREWALL_HINT = /fortigate|pfsense|opnsense|asav|paloalto|pan-os|checkpoint|sophos/i;
const SWITCH_HINT = /openvswitch|ovs|cumulus|nxos|iosvl2|vios_l2/i;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** What a GNS3 node becomes: part of a LAN (a switch, or the internet), or a machine. */
function kindOf(n: G3Node): "switch" | "internet" | "machine" {
  const t = n.node_type ?? "";
  const look = `${n.name ?? ""} ${str(n.properties?.image)} ${str(n.properties?.hda_disk_image)}`;
  if (SWITCHES.has(t) || ((t === "docker" || VMS.has(t)) && SWITCH_HINT.test(look))) return "switch";
  if (INTERNET.has(t)) return "internet";
  return "machine";
}

/** An import in progress: the project's nodes, the lab's nodes so far, the names taken. */
interface Import {
  g3nodes: G3Node[];
  links: [string, string][];
  nodes: LabNode[];
  names: Set<string>;
  warnings: string[];
  text: Gns3Text;
}

/** The project's nodes and its two-ended links, or why the file isn't a GNS3 project. */
function parse(source: string, text: Gns3Text): { project: G3Project; g3nodes: G3Node[]; links: [string, string][] } {
  let project: G3Project;
  try {
    project = JSON.parse(source) as G3Project;
  } catch {
    throw new Error(text.notGns3);
  }
  const g3nodes = project.topology?.nodes;
  if (!Array.isArray(g3nodes)) throw new Error(text.noTopology);
  const links = (project.topology?.links ?? [])
    .map((l) => (l.nodes ?? []).map((e) => e.node_id))
    .flatMap((ends): [string, string][] => (ends.length === 2 ? [[ends[0], ends[1]]] : []));
  return { project, g3nodes, links };
}

/** A free name from GNS3's (spaces and underscores as dashes), `-2`, `-3`… when it is taken. */
function nameFor(imp: Import, raw: string, fallback: string): string {
  const base = cleanName(raw.replace(/[\s_]+/g, "-")).replace(/^-+|-+$/g, "") || fallback;
  let name = base;
  for (let i = 2; imp.names.has(name); i++) name = `${base}-${String(i)}`;
  imp.names.add(name);
  return name;
}

const center = (n: G3Node) => ({ x: (n.x ?? 0) * SCALE + 30, y: (n.y ?? 0) * SCALE + 30 });

/** Switches cabled together are one LAN; a NAT or cloud cabled to a switch gives it the internet. */
function switchGroups(imp: Import): (id: string) => string | null {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const up = parent.get(id);
    return up === undefined || up === id ? id : find(up);
  };
  for (const n of imp.g3nodes) if (kindOf(n) !== "machine") parent.set(n.node_id, n.node_id);
  for (const [a, b] of imp.links) if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  return (id) => (parent.has(id) ? find(id) : null);
}

/** One LAN per group of switches (and NAT/cloud), where its first member was. */
function importLans(imp: Import): Map<string, LanNode> {
  const groupOf = switchGroups(imp);
  const lanOf = new Map<string, LanNode>();
  let third = 1;
  for (const n of imp.g3nodes) {
    const root = groupOf(n.node_id);
    if (root === null) continue;
    let lan = lanOf.get(root);
    if (!lan) {
      const members = imp.g3nodes.filter((m) => groupOf(m.node_id) === root);
      const first = members.find((m) => kindOf(m) === "switch") ?? members[0];
      const c = center(first);
      const data = { name: nameFor(imp, first.name ?? "", "lan"), cidr: `10.10.${String(third++)}.0/24`, internet: members.some((m) => kindOf(m) === "internet") };
      lan = { ...LAN_BEHAVIOR, id: uid("l"), type: "lan", position: { x: c.x - LAN_W / 2, y: c.y - LAN_H / 2 }, width: LAN_W, height: LAN_H, data };
      imp.nodes.push(lan);
    }
    lanOf.set(n.node_id, lan);
    lanOf.set(root, lan);
  }
  return lanOf;
}

/** What a GNS3 machine becomes, or null (with a warning) when nothing here matches it. */
function machineData(imp: Import, n: G3Node): Omit<MachineData, "name"> | null {
  const t = n.node_type ?? "";
  const p = n.properties ?? {};
  const look = `${n.name ?? ""} ${str(p.image)} ${str(p.hda_disk_image)} ${str(p.vmname)}`;
  const base = { image: "", os: "", provision: "", ports: "", access: false };
  if (CISCO.has(t) || ROUTER_HINT.test(look)) {
    if (CISCO.has(t)) imp.warnings.push(imp.text.cisco(n.name ?? n.node_id, t === "iou" ? "IOU" : "Dynamips"));
    return { ...base, kind: "router", icon: "router" };
  }
  if (FIREWALL_HINT.test(look)) {
    imp.warnings.push(imp.text.firewall(n.name ?? n.node_id));
    return { ...base, kind: "router", icon: "shield" };
  }
  if (t === "docker") return { ...base, kind: "container", icon: "container", image: str(p.image) || "alpine:3.20" };
  if (t === "vpcs" || t === "traceng") return { ...base, kind: "container", icon: "laptop", image: "alpine:3.20" };
  if (VMS.has(t)) return { ...base, kind: "vm", icon: "monitor", os: guessOs(look) };
  imp.warnings.push(imp.text.noEquivalent(n.name ?? n.node_id, t));
  return null;
}

/** The machines, where GNS3 had them, by GNS3 node id. */
function importMachines(imp: Import): Map<string, MachineNode> {
  const machines = new Map<string, MachineNode>();
  for (const n of imp.g3nodes) {
    if (kindOf(n) !== "machine") continue;
    let data = machineData(imp, n);
    if (!data) continue;
    const name = nameFor(imp, n.name ?? "", data.kind === "router" ? "router" : "machine");
    if (data.kind === "vm") data = { ...data, provision: `provision/${name}.${data.os.startsWith("windows") ? "ps1" : "sh"}` };
    const c = center(n);
    const m: MachineNode = { id: uid("m"), type: "machine", position: { x: c.x - MACHINE_W / 2, y: c.y - MACHINE_H / 2 }, data: { ...data, name } };
    machines.set(n.node_id, m);
    imp.nodes.push(m);
  }
  return machines;
}

/** The project's text drawings, as notes. */
function importNotes(imp: Import, drawings: G3Drawing[]): void {
  for (const d of drawings) {
    const note = drawingNote(d, SCALE);
    if (!note) continue;
    const n: NoteNode = {
      id: uid("n"),
      type: "note",
      position: { x: (d.x ?? 0) * SCALE, y: (d.y ?? 0) * SCALE },
      width: note.w,
      height: note.h,
      data: { text: note.text, shape: note.shape, color: "yellow" },
    };
    imp.nodes.push(n);
  }
}

/** `text`: the editor's words for what goes wrong (warnings and errors are shown as they are). */
export function fromGns3(source: string, text: Gns3Text): { lab: Draft; warnings: string[] } {
  const { project, g3nodes, links } = parse(source, text);
  const imp: Import = { g3nodes, links, nodes: [], names: new Set(), warnings: [], text };
  const lanOf = importLans(imp);
  const machines = importMachines(imp);
  const edges = gns3Cables({ links, machines, lanOf, nodes: imp.nodes, lanSize: { w: LAN_W, h: LAN_H } });
  importNotes(imp, project.topology?.drawings ?? []);
  // LANs first, so they stay under the machines.
  const ordered = [...imp.nodes.filter((n) => n.type === "lan"), ...imp.nodes.filter((n) => n.type !== "lan")];
  const lab: Draft = { name: cleanName((project.name ?? "").replace(/[\s_]+/g, "-")) || "gns3-lab", nodes: ordered, edges: migrateEdges(edges, ordered) };
  if (!g3nodes.length) imp.warnings.push(text.noNodes);
  return { lab, warnings: imp.warnings };
}
