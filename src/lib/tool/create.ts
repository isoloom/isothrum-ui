import type { XYPosition } from "@xyflow/react";
import { LAN_BEHAVIOR, LAN_H, LAN_W, freeName, isLan, uid, type LabNode, type LanData, type LanNode, type MachineData, type MachineNode, type NoteNode, type SwitchNode } from "./model";
import type { Preset } from "./presets";

/** New nodes, as the toolbar places them. */

export function newNote(position: XYPosition): NoteNode {
  return { id: uid("n"), type: "note", position, width: 200, height: 90, selected: true, data: { text: "", shape: "text", color: "yellow" } };
}

/** vlan10 and vlan20: a new switch's VLANs (ports 1–4 and 5–8, both on the trunk). */
export function twoVlans(): SwitchNode["data"] {
  return {
    name: "",
    vlans: [
      { id: 10, cidr: "10.10.10.0/24" },
      { id: 20, cidr: "10.10.20.0/24" },
    ],
    ports: [10, 10, 10, 10, 20, 20, 20, 20],
  };
}

/** A new switch with vlan10 on ports 1–4, vlan20 on ports 5–8, both on the trunk. */
export function newSwitch(center: XYPosition, nodes: LabNode[]): SwitchNode {
  return {
    id: uid("s"),
    type: "switch",
    position: { x: center.x - 170, y: center.y - 40 },
    data: { ...twoVlans(), name: freeName("sw", nodes) },
  };
}

export function newMachine(preset: Preset, position: XYPosition, nodes: LabNode[]): MachineNode {
  const name = freeName(preset.prefix, nodes);
  const data: MachineData = { ...preset.data, name };
  // Isoloom needs a VM's provisioning steps, except on the access machine (the runner supplies it).
  if (data.kind === "vm" && !data.access && !data.provision) {
    data.provision = `provision/${name}.${data.os.startsWith("windows") ? "ps1" : "sh"}`;
  }
  return { id: uid("m"), type: "machine", position, data };
}

/** The third number of each LAN's 10.10.<n>.0/24 block. */
export function usedThirds(nodes: LabNode[]): Set<number> {
  return new Set(
    nodes
      .filter(isLan)
      .map((n) => /^10\.10\.(\d+)\./.exec(n.data.cidr)?.[1])
      .filter(Boolean)
      .map(Number),
  );
}

/** A new LAN centered on `center`, with the next free 10.10.<n>.0/24. */
export function newLan(center: XYPosition, nodes: LabNode[]): LanNode {
  const used = usedThirds(nodes);
  let third = 1;
  while (used.has(third)) third++;
  return {
    ...LAN_BEHAVIOR,
    id: uid("l"),
    type: "lan",
    position: { x: center.x - LAN_W / 2, y: center.y - LAN_H / 2 },
    width: LAN_W,
    height: LAN_H,
    data: { name: freeName("lan", nodes), cidr: `10.10.${String(third)}.0/24`, internet: true },
  };
}

/**
 * A LAN that hangs under a device placed at `center` (a router or a switch): the device sits on
 * its top edge, toward the right, so the LAN's label (top left) stays clear and clickable.
 */
export function lanBelow(center: XYPosition, nodes: LabNode[], data?: Partial<LanData>, size = { w: LAN_W, h: LAN_H }): LanNode {
  const lan = newLan({ x: center.x, y: center.y + size.h / 2 }, nodes);
  return {
    ...lan,
    width: size.w,
    height: size.h,
    position: { x: center.x - size.w * 0.74, y: center.y },
    data: { ...lan.data, ...data },
  };
}
