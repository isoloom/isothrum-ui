import type { Edge, Node, XYPosition } from "@xyflow/react";

/**
 * The lab as drawn on the canvas: machines, LANs, switches and notes are nodes, cables are edges
 * between two ports. `toTopology` translates it into the topology JSON the engine reads
 * (`isothrum_compiler::Topology`), which it compiles to Isoloom's isoloom.yml.
 */

export type IconId = "container" | "server" | "router" | "shield" | "monitor" | "laptop";

/** The Cisco OSes a container node can be (Isoloom's `app.appliance`). */
export type Appliance = "cisco-iol" | "cisco-iol-l2" | "cisco-vios" | "cisco-vios-l2" | "cisco-csr1000v" | "cisco-c8000v" | "cisco-dynamips";

/** Each Cisco OS: its usual vrnetlab image (none for Dynamips: Isoloom builds the emulator). */
export const APPLIANCES: { id: Appliance; label: string; image: string; switch?: boolean; kvm?: boolean }[] = [
  { id: "cisco-iol", label: "IOL (IOS on Linux)", image: "vrnetlab/cisco_iol:17.12.01" },
  { id: "cisco-iol-l2", label: "IOL-L2 (switch)", image: "vrnetlab/cisco_iol:L2-17.12.01", switch: true },
  { id: "cisco-vios", label: "IOSv", image: "vrnetlab/cisco_vios:15.9.3M6", kvm: true },
  { id: "cisco-vios-l2", label: "IOSvL2 (switch)", image: "vrnetlab/cisco_viosl2:15.2", switch: true, kvm: true },
  { id: "cisco-csr1000v", label: "CSR1000v (IOS XE)", image: "vrnetlab/cisco_csr1000v:17.03.08", kvm: true },
  { id: "cisco-c8000v", label: "Catalyst 8000v (IOS XE)", image: "vrnetlab/cisco_c8000v:17.15.01a", kvm: true },
  { id: "cisco-dynamips", label: "Dynamips 7200 (classic IOS)", image: "" },
];

/** The OS's name for the `k`th data interface (from 1), as Isoloom numbers them. */
export function applianceInterface(kind: Appliance, k: number): string {
  switch (kind) {
    case "cisco-iol":
    case "cisco-iol-l2":
      return `Ethernet${String(Math.floor(k / 4))}/${String(k % 4)}`;
    case "cisco-vios":
    case "cisco-vios-l2":
      return `GigabitEthernet0/${String(k)}`;
    case "cisco-csr1000v":
    case "cisco-c8000v":
      return `GigabitEthernet${String(k + 1)}`;
    case "cisco-dynamips":
      return k === 1 ? "FastEthernet0/0" : `FastEthernet${String(Math.floor(k / 2))}/${String(k % 2)}`;
  }
}

export type MachineData = {
  name: string;
  /** "router": an automatic router, not a machine (its networks reach each other). */
  kind: "container" | "vm" | "router";
  icon: IconId;
  /** Container image (`kind: container`): Isoloom's `app.image`. */
  image: string;
  /** The OS, as Isoloom writes it (`debian@12`, see `OS_CHOICES`) (`kind: vm`): Isoloom's `os`. */
  os: string;
  /** Provisioning steps, one per line (`kind: vm`): Isoloom's `app.steps`. */
  provision: string;
  /** Service ports, comma-separated, each a port and what it speaks when it isn't TCP (`80, 53/udp`): see `readPorts`. */
  ports: string;
  /** The machine the user lands on. */
  access: boolean;
  /**
   * A container with no service of its own (a stock Linux image), kept running idle as a
   * machine to work from. Unset: guessed from the image (see `idleByDefault`).
   */
  idle?: boolean;
  /** A network OS in its container, wired as its image expects (Cisco IOL, built with vrnetlab). */
  appliance?: Appliance;
  /** The appliance's own configuration (IOS commands), added to the one Isoloom generates. */
  config?: string;
  /** Addresses fixed by hand: LAN name -> last octet. Others take the next free one. */
  pins?: Record<string, number>;
};

/** Stock Linux images: a shell that exits at once, so they need to be kept running idle. */
const STOCK_IMAGES = ["alpine", "ubuntu", "debian", "kali-rolling", "fedora", "rockylinux", "almalinux", "centos", "busybox", "archlinux", "netshoot"];

/** An image's name: its last path segment, without the tag, in lowercase. */
export function imageName(image: string): string {
  return image.trim().split(":")[0].split("/").pop()?.toLowerCase() ?? "";
}

export function idleByDefault(image: string): boolean {
  return STOCK_IMAGES.includes(imageName(image));
}

/** How a cable or a LAN behaves, as a slow or lossy link: one-way delay and its jitter (ms),
 * loss (%), bandwidth (Mbit/s). Isoloom applies it with `tc netem` (its `tc`). */
export type LinkConditions = {
  delay?: number;
  jitter?: number;
  loss?: number;
  rate?: number;
};

/** The two ends of a cable: `aPort` on the source machine, `bPort` on the target. */
export type CableData = {
  aPort: string;
  bPort: string;
  /** How the cable behaves (between two machines; a cable to a LAN takes the LAN's). */
  tc?: LinkConditions;
  /** Drawing only, worked out from what the cable is plugged into (never saved). */
  color?: string;
};

/** A LAN (or VLAN) drawn as an area: machines inside it are on it. */
export type LanData = {
  name: string;
  cidr: string;
  internet: boolean;
  /** How the LAN behaves (not on a switch's VLAN yet). */
  tc?: LinkConditions;
  /** Only its label is drawn: the LAN, its machines and their addresses are unchanged. */
  hidden?: boolean;
};

/** A VLAN on a switch: `vlan<id>`, with its block. VLANs are lab-wide: `vlan10` is the same
 * network on every switch, and a LAN area named `vlan10` is that VLAN too. */
type Vlan = {
  id: number;
  cidr: string;
};

/** A switch port: a VLAN (access), "trunk" (every VLAN of the switch), or nothing. */
export type PortMode = number | "trunk" | null;

/**
 * A switch: access ports, each in a VLAN (or none), and one trunk port that carries every VLAN
 * of the switch. Not a machine: it is the network fabric, so it never appears in isoloom.yml;
 * its VLANs do, as networks, and a machine cabled to a port joins the port's VLAN.
 */
type SwitchData = {
  name: string;
  vlans: Vlan[];
  ports: PortMode[];
};

/** A note on the canvas: text, a box or an ellipse. Drawing only: never in isoloom.yml. */
export type NoteShape = "text" | "rect" | "ellipse";
export const NOTE_COLORS = ["yellow", "red", "blue", "green", "violet"] as const;
type NoteData = {
  text: string;
  shape: NoteShape;
  color: (typeof NOTE_COLORS)[number];
};

export type MachineNode = Node<MachineData, "machine">;
export type LanNode = Node<LanData, "lan">;
export type SwitchNode = Node<SwitchData, "switch">;
export type NoteNode = Node<NoteData, "note">;
export type LabNode = MachineNode | LanNode | SwitchNode | NoteNode;
export type CableEdge = Edge<CableData, "cable">;

export const isMachine = (n: LabNode): n is MachineNode => n.type === "machine";
/**
 * A router you configure (FRR as a container, or a VM): drawn as a faceplate with interfaces,
 * like a switch. The automatic router (kind "router") has no interfaces to show.
 */
export const isRealRouter = (n: LabNode): n is MachineNode => isMachine(n) && n.data.icon === "router" && n.data.kind !== "router";
export const ROUTER_PORTS = 4;
export const ROUTER_W = 168;
export const ROUTER_H = 74;
export const routerPort = (i: number) => `eth${String(i)}`;

/** Routers and firewalls: one connection point, and they snap onto a LAN's edge. */
export const isAppliance = (n: LabNode): n is MachineNode => isMachine(n) && (n.data.icon === "router" || n.data.icon === "shield");
export const isLan = (n: LabNode): n is LanNode => n.type === "lan";
export const isSwitch = (n: LabNode): n is SwitchNode => n.type === "switch";
export const isNote = (n: LabNode): n is NoteNode => n.type === "note";
/** A node's name as lists show it (a note has none). */
export const nodeName = (n: LabNode): string => (isNote(n) ? "note" : n.data.name);

export const SWITCH_PORTS = 8;
/** A switch's faceplate on the canvas (see `SwitchNodeView`). */
export const SWITCH_W = 306;
export const SWITCH_H = 74;
export const TRUNK = "trunk";

/** A machine's box on the canvas (see `MachineNodeView`). */
export const MACHINE_W = 120;
export const MACHINE_H = 116;
export const LAN_W = 420;
export const LAN_H = 300;

/** How big a node is drawn: what snapping and "is it inside the LAN" go by. */
export function sizeOf(n: LabNode): { w: number; h: number } {
  if (n.type === "lan") return { w: n.width ?? LAN_W, h: n.height ?? LAN_H };
  if (n.type === "switch") return { w: SWITCH_W, h: SWITCH_H };
  if (n.type === "note") return { w: n.width ?? 200, h: n.height ?? 90 };
  if (n.data.icon === "router" && n.data.kind !== "router") return { w: ROUTER_W, h: ROUTER_H };
  return { w: MACHINE_W, h: MACHINE_H };
}

/** A node's center on the canvas, by its drawn size (measured by React Flow, or `fallback`). */
export function centerOf(n: LabNode, fallback: { w: number; h: number } = { w: MACHINE_W, h: MACHINE_H }): XYPosition {
  return {
    x: n.position.x + (n.width ?? n.measured?.width ?? fallback.w) / 2,
    y: n.position.y + (n.height ?? n.measured?.height ?? fallback.h) / 2,
  };
}

/**
 * How a LAN behaves on the canvas, as an Excalidraw frame: it is moved and selected by its label
 * only, so a click or a drag inside it reaches the canvas (placing a device, drawing a selection
 * box). Not saved: applied to every LAN when it is created or loaded.
 */
export const LAN_BEHAVIOR = { dragHandle: ".lan-handle", className: "pointer-events-none" } as const;

/** Which side of a LAN an appliance sits on, when it is snapped onto one. */
export type Side = "top" | "bottom" | "left" | "right";

/** The canvas's look (see `DesignContext`): hand-drawn, or crisp for a report. */
export type Design = "sketch" | "business";
export const DESIGNS: Design[] = ["sketch", "business"];

export type Draft = {
  name: string;
  nodes: LabNode[];
  edges: CableEdge[];
  design?: Design;
};

/** Machine names are Isoloom keys: lowercase letters, digits and dashes. */
export function cleanName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** The first `<prefix><n>` no machine or LAN uses yet. */
export function freeName(prefix: string, nodes: LabNode[]): string {
  const taken = new Set(nodes.map(nodeName));
  for (let i = 1; ; i++) {
    if (!taken.has(`${prefix}${String(i)}`)) return `${prefix}${String(i)}`;
  }
}

/** Every node unselected: what placing or pasting something does to the rest. */
export function unselected<T extends LabNode | CableEdge>(items: T[]): T[] {
  return items.map((n) => ({ ...n, selected: false }));
}
