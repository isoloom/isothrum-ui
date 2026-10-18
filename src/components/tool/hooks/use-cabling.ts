import { useCallback, useMemo, useRef } from "react";
import { addEdge, type Connection, type NodeChange } from "@xyflow/react";
import { canConnect, newCable, onLanEdge, reconnected, type LabIndex } from "@/lib/tool/cables";
import { isLan, isRealRouter, isSwitch, type CableEdge, type LabNode, type LanNode } from "@/lib/tool/model";
import { snapMoves } from "@/lib/tool/placement";
import type { Lab } from "./use-lab";

/** The ids of the LANs, switches and real routers, and the LANs themselves. */
export function useLabIndex(nodes: LabNode[]): LabIndex & { lans: LanNode[] } {
  const lanIds = useMemo(() => new Set(nodes.filter(isLan).map((n) => n.id)), [nodes]);
  const lans = useMemo(() => nodes.filter(isLan), [nodes]);
  const switchIds = useMemo(() => new Set(nodes.filter(isSwitch).map((n) => n.id)), [nodes]);
  const routerIds = useMemo(() => new Set(nodes.filter(isRealRouter).map((n) => n.id)), [nodes]);
  return useMemo(() => ({ lanIds, lans, switchIds, routerIds }), [lanIds, lans, switchIds, routerIds]);
}

/**
 * Drawing and moving cables. Machine to machine, LAN or port; never LAN to LAN or switch to LAN;
 * a switch or router port takes one cable. Cables can be moved: drag either end onto another
 * machine, LAN or port, or onto the canvas to unplug it.
 */
export function useCabling(lab: Lab, index: LabIndex & { lans: LanNode[] }) {
  const { nodes, edges, setEdges, onNodesChange } = lab;
  // Routers, firewalls and switches are magnetic: dragged near a LAN's border, they land on it.
  const onSnappingChange = useCallback(
    (changes: NodeChange<LabNode>[]) => {
      onNodesChange(snapMoves(changes, nodes, index.lans));
    },
    [onNodesChange, nodes, index.lans],
  );
  // The cable being moved, if any: its own ends don't count as taken while it moves.
  const moving = useRef<{ id: string; done: boolean } | null>(null);
  // An appliance on a LAN's edge already uses eth0 there: its cables start at eth1.
  const first = useCallback((id: string) => (onLanEdge(id, nodes, index.lans) ? 1 : 0), [nodes, index.lans]);
  const isValid = useCallback((c: Parameters<typeof canConnect>[0]) => canConnect(c, index, edges, moving.current?.id), [index, edges]);
  const onReconnect = useCallback(
    (old: CableEdge, c: Connection) => {
      if (!c.source || !c.target || !canConnect(c, index, edges, moving.current?.id)) return;
      if (moving.current) moving.current.done = true;
      setEdges((es) => reconnected(es, old, c, index, first));
    },
    [index, edges, setEdges, first],
  );
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      setEdges((es) => addEdge<CableEdge>(newCable(c, index, es, first), es));
    },
    [setEdges, index, first],
  );
  return {
    onNodesChange: onSnappingChange,
    isValid,
    onConnect,
    onReconnect,
    onReconnectStart: (_: unknown, edge: CableEdge) => {
      moving.current = { id: edge.id, done: false };
    },
    // Dropped nowhere: the cable is unplugged.
    onReconnectEnd: () => {
      const m = moving.current;
      if (m && !m.done) setEdges((es) => es.filter((e) => e.id !== m.id));
      moving.current = null;
    },
  };
}
