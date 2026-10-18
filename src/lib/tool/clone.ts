import type { XYPosition } from "@xyflow/react";
import { usedThirds } from "./create";
import { freeName, uid, type CableEdge, type LabNode } from "./model";

const idPrefix: Record<LabNode["type"], string> = { lan: "l", switch: "s", note: "n", machine: "m" };

/** The next free 10.10.<n>.0/24 for a copied LAN (and taken from then on). */
function takeThird(used: Set<number>): number {
  let third = 1;
  while (used.has(third)) third++;
  used.add(third);
  return third;
}

/** A copy of `n` with a fresh name (web1 -> web3) at `position`, its LAN block taken from `used`. */
function copyOf(n: Exclude<LabNode, { type: "note" }>, id: string, position: XYPosition, all: LabNode[], used: Set<number>): LabNode {
  const name = freeName(n.data.name.replace(/\d+$/, "") || "copy", all);
  if (n.type === "lan") return { ...n, id, position, selected: true, data: { ...n.data, name, cidr: `10.10.${String(takeThird(used))}.0/24` } };
  if (n.type === "machine") return { ...n, id, position, selected: true, data: { ...n.data, name, pins: undefined } };
  return { ...n, id, position, selected: true, data: { ...n.data, name, vlans: n.data.vlans.map((v) => ({ ...v })), ports: [...n.data.ports] } };
}

/**
 * Copies of `picked` (and of the cables between them) ready to add to `existing`: new ids,
 * moved by `offset`, fresh names (web1 -> web3), a LAN with its own free block, no fixed
 * addresses (they would collide with the originals). VLANs keep their numbers: they are
 * lab-wide.
 */
export function cloneLab(picked: LabNode[], edges: CableEdge[], existing: LabNode[], offset: XYPosition): { nodes: LabNode[]; edges: CableEdge[] } {
  const ids = new Map<string, string>();
  const all: LabNode[] = [...existing];
  const used = usedThirds(all);
  const nodes = picked.map((n) => {
    const id = uid(idPrefix[n.type]);
    ids.set(n.id, id);
    const position = { x: n.position.x + offset.x, y: n.position.y + offset.y };
    const copy: LabNode = n.type === "note" ? { ...n, id, position, selected: true, data: { ...n.data } } : copyOf(n, id, position, all, used);
    all.push(copy);
    return copy;
  });
  const copies = edges.flatMap((e) => {
    const source = ids.get(e.source);
    const target = ids.get(e.target);
    if (source === undefined || target === undefined) return [];
    return [{ ...e, id: uid("c"), source, target, selected: false, data: e.data ? { ...e.data } : e.data }];
  });
  return { nodes, edges: copies };
}
