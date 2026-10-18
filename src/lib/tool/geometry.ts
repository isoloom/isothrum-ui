import type { XYPosition } from "@xyflow/react";
import { LAN_H, LAN_W, MACHINE_H, MACHINE_W, isAppliance, isLan, sizeOf, type LabNode, type LanNode, type MachineNode, type Side } from "./model";

/** Where things sit on the canvas: LAN areas, their borders, and what snaps onto them. */

/** How close (canvas units) an appliance's center must come to a LAN's border to snap onto it. */
const SNAP = 36;
/** Exactly on the border, give or take rounding. */
const ON = 0.5;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The area a LAN covers on the canvas. */
export function lanRect(l: LanNode): Rect {
  return { x: l.position.x, y: l.position.y, w: l.width ?? LAN_W, h: l.height ?? LAN_H };
}

/** Whether `p` lies within `r`, borders included, give or take `slack`. */
export function within(r: Rect, p: XYPosition, slack = 0): boolean {
  return p.x >= r.x - slack && p.x <= r.x + r.w + slack && p.y >= r.y - slack && p.y <= r.y + r.h + slack;
}

/** A point on one of a rectangle's borders, and how far `p` is from it. */
interface BorderPoint {
  d: number;
  x: number;
  y: number;
}

/** The points of `r`'s borders facing `p` (top, bottom, left, right), where `p` is level with them. */
function borderPoints(r: Rect, p: XYPosition): BorderPoint[] {
  const alongX = p.x >= r.x && p.x <= r.x + r.w;
  const alongY = p.y >= r.y && p.y <= r.y + r.h;
  const out: BorderPoint[] = [];
  if (alongX) out.push({ d: Math.abs(p.y - r.y), x: p.x, y: r.y }, { d: Math.abs(p.y - (r.y + r.h)), x: p.x, y: r.y + r.h });
  if (alongY) out.push({ d: Math.abs(p.x - r.x), x: r.x, y: p.y }, { d: Math.abs(p.x - (r.x + r.w)), x: r.x + r.w, y: p.y });
  return out;
}

/**
 * Where an appliance at `position` should go: centered on the nearest LAN border within reach
 * (half inside, half outside), or where it is when no border is near.
 */
export function snapToLanEdge(position: XYPosition, lans: LanNode[], size: { w: number; h: number } = { w: MACHINE_W, h: MACHINE_H }): XYPosition {
  const center = { x: position.x + size.w / 2, y: position.y + size.h / 2 };
  let best: BorderPoint | null = null;
  for (const l of lans) {
    for (const c of borderPoints(lanRect(l), center)) if (c.d <= SNAP && (!best || c.d < best.d)) best = c;
  }
  return best ? { x: best.x - size.w / 2, y: best.y - size.h / 2 } : position;
}

/** The side of `r` that `p` lies on, if any (top, bottom, left, right, in that order). */
function sideOf(r: Rect, p: XYPosition): Side | null {
  const alongX = p.x >= r.x && p.x <= r.x + r.w;
  const alongY = p.y >= r.y && p.y <= r.y + r.h;
  if (alongX && Math.abs(p.y - r.y) < ON) return "top";
  if (alongX && Math.abs(p.y - (r.y + r.h)) < ON) return "bottom";
  if (alongY && Math.abs(p.x - r.x) < ON) return "left";
  if (alongY && Math.abs(p.x - (r.x + r.w)) < ON) return "right";
  return null;
}

/** A node's center, by the size it is drawn at (see `sizeOf`). */
function drawnCenter(m: LabNode): XYPosition {
  const { w, h } = sizeOf(m);
  return { x: m.position.x + w / 2, y: m.position.y + h / 2 };
}

/** The LAN border an appliance sits on, if any: the side of the LAN, so its port faces out. */
export function sideOnLan(m: MachineNode, lans: LanNode[]): Side | null {
  const c = drawnCenter(m);
  for (const l of lans) {
    const side = sideOf(lanRect(l), c);
    if (side) return side;
  }
  return null;
}

/** The LAN an appliance sits on the border of, and which border: its inside and outside. */
export function lanUnder(m: MachineNode, lans: LanNode[]): { lan: LanNode; side: Side } | null {
  for (const l of lans) {
    const side = sideOnLan(m, [l]);
    if (side) return { lan: l, side };
  }
  return null;
}

/** Whether a point is inside a LAN's area (not on its border). */
export function insideLan(p: XYPosition, l: LanNode): boolean {
  const r = lanRect(l);
  return p.x > r.x + ON && p.x < r.x + r.w - ON && p.y > r.y + ON && p.y < r.y + r.h - ON;
}

/**
 * The LANs a machine sits in: its center is inside the area (or on its border). A hidden LAN's
 * area isn't drawn, so it doesn't take machines by position, except routers and firewalls on
 * its edge; machines join it through its switch's ports or a cable.
 */
export function lansAround(m: MachineNode, nodes: LabNode[]): LanNode[] {
  const c = drawnCenter(m);
  const onEdge = isAppliance(m) ? lanUnder(m, nodes.filter(isLan))?.lan.id : undefined;
  return nodes.filter(isLan).filter((l) => (!l.data.hidden || l.id === onEdge) && within(lanRect(l), c));
}
