import { useRef } from "react";
import type { XYPosition } from "@xyflow/react";
import { lansAround, within } from "@/lib/tool/geometry";
import { SWITCH_H, SWITCH_W, isLan, isMachine, isNote, isSwitch, type LabNode, type LanNode } from "@/lib/tool/model";
import type { Lab } from "./use-lab";

/** What moves with a LAN: machines inside (or on the edge, routers), switches on its edge or inside it, notes in it. */
function lanMembers(lan: LanNode, nodes: LabNode[]): Map<string, XYPosition> {
  const r = { x: lan.position.x, y: lan.position.y, w: lan.width ?? 420, h: lan.height ?? 300 };
  const inside = (cx: number, cy: number) => within(r, { x: cx, y: cy }, 0.5);
  const carried = (n: LabNode) =>
    (isMachine(n) && lansAround(n, nodes).some((l) => l.id === lan.id)) ||
    (isSwitch(n) && inside(n.position.x + SWITCH_W / 2, n.position.y + SWITCH_H / 2)) ||
    (isNote(n) && inside(n.position.x + (n.width ?? 200) / 2, n.position.y + (n.height ?? 90) / 2));
  return new Map(nodes.filter(carried).map((m) => [m.id, { ...m.position }]));
}

/** Moving a LAN carries the machines inside it, as Excalidraw frames do. */
export function useLanCarry(lab: Lab) {
  const { nodes, setNodes } = lab;
  const carried = useRef<{ lan: string; start: XYPosition; members: Map<string, XYPosition> } | null>(null);
  return {
    onNodeDragStart: (_: unknown, node: LabNode) => {
      if (!isLan(node)) return;
      carried.current = { lan: node.id, start: { ...node.position }, members: lanMembers(node, nodes) };
    },
    onNodeDrag: (_: unknown, node: LabNode) => {
      const c = carried.current;
      if (!c || c.lan !== node.id) return;
      const dx = node.position.x - c.start.x;
      const dy = node.position.y - c.start.y;
      setNodes((ns) =>
        ns.map((n) => {
          const from = c.members.get(n.id);
          return from ? { ...n, position: { x: from.x + dx, y: from.y + dy } } : n;
        }),
      );
    },
    onNodeDragStop: () => {
      carried.current = null;
    },
  };
}
