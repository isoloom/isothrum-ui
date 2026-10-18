import type { NodeChange, XYPosition } from "@xyflow/react";
import { lanBelow, newMachine, newSwitch } from "./create";
import { snapToLanEdge } from "./geometry";
import { MACHINE_H, MACHINE_W, ROUTER_H, ROUTER_W, SWITCH_H, SWITCH_W, isAppliance, isRealRouter, isSwitch, sizeOf, unselected, type LabNode, type LanNode } from "./model";
import type { Preset } from "./presets";
import { vlanName } from "./vlans";

/** Placing devices: where they land, and what comes with them. */

/** A device placed from the palette (no point given): in the middle of the view, staggered so machines added in a row don't stack exactly. */
export function paletteSpot(viewCenter: XYPosition, nodes: LabNode[]): XYPosition {
  const step = (nodes.length % 5) * 24;
  return { x: viewCenter.x - 56 + step, y: viewCenter.y - 40 + step };
}

/**
 * The nodes after placing a router or firewall at `position`: near a LAN's border it lands on
 * it, as when dragged; away from any LAN it comes with its own LAN under it (it is that LAN's
 * gateway). `dropped`: placed at a point (a click, a drop), centered there like a machine.
 */
export function placeAppliance(preset: Preset, position: XYPosition, dropped: boolean, nodes: LabNode[], lans: LanNode[]): LabNode[] {
  const real = isRealRouter({ id: "", type: "machine", position, data: { ...preset.data, name: "" } });
  const size = real ? { w: ROUTER_W, h: ROUTER_H } : { w: MACHINE_W, h: MACHINE_H };
  const at = dropped ? { x: position.x + MACHINE_W / 2 - size.w / 2, y: position.y + MACHINE_H / 2 - size.h / 2 } : position;
  const snapped = snapToLanEdge(at, lans, size);
  const m = { ...newMachine(preset, snapped, nodes), selected: true };
  if (snapped !== at) return [...unselected(nodes), m];
  const lan = lanBelow({ x: snapped.x + size.w / 2, y: snapped.y + size.h / 2 }, [...nodes, m]);
  return [lan, ...unselected(nodes), m];
}

/** The nodes after placing a machine at `position`, selected. */
export function placeMachine(preset: Preset, position: XYPosition, nodes: LabNode[]): LabNode[] {
  return [...unselected(nodes), { ...newMachine(preset, position, nodes), selected: true }];
}

/**
 * The nodes after placing a switch at `at`: on a LAN's edge when near one; away from any LAN it
 * comes with its LAN, its first VLAN, hanging under it.
 */
export function placeSwitch(at: XYPosition, nodes: LabNode[], lans: LanNode[]): LabNode[] {
  const sw = newSwitch(at, nodes);
  const snapped = snapToLanEdge(sw.position, lans, { w: SWITCH_W, h: SWITCH_H });
  const placed = { ...sw, position: snapped, selected: true };
  if (snapped !== sw.position) return [...unselected(nodes), placed];
  const first = sw.data.vlans[0];
  const lan = lanBelow({ x: sw.position.x + SWITCH_W / 2, y: sw.position.y + SWITCH_H / 2 }, nodes, { name: vlanName(first.id), cidr: first.cidr }, { w: 600, h: 300 });
  return [lan, ...unselected(nodes), placed];
}

/** Routers, firewalls and switches are magnetic: dragged near a LAN's border, they land on it. */
export function snapMoves(changes: NodeChange<LabNode>[], nodes: LabNode[], lans: LanNode[]): NodeChange<LabNode>[] {
  return changes.map((c) => {
    if (c.type !== "position" || !c.position) return c;
    const n = nodes.find((x) => x.id === c.id);
    if (n && isAppliance(n)) return { ...c, position: snapToLanEdge(c.position, lans, sizeOf(n)) };
    if (n && isSwitch(n)) return { ...c, position: snapToLanEdge(c.position, lans, { w: SWITCH_W, h: SWITCH_H }) };
    return c;
  });
}
