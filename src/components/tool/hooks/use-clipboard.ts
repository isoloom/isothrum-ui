import { useCallback, useEffect, useRef } from "react";
import type { XYPosition } from "@xyflow/react";
import { cloneLab } from "@/lib/tool/clone";
import { isLan, unselected, type CableEdge, type LabNode } from "@/lib/tool/model";
import { inTextField } from "./use-history";
import type { Lab } from "./use-lab";

type DeleteNodes = (elements: { nodes: { id: string }[] }) => unknown;

/** The cables between `picked` nodes: what goes with them when they are copied. */
function cablesWithin(picked: LabNode[], edges: CableEdge[]): CableEdge[] {
  const ids = new Set(picked.map((n) => n.id));
  return edges.filter((c) => ids.has(c.source) && ids.has(c.target));
}

/**
 * Copy, cut, paste and duplicate (Ctrl/⌘ C, X, V, D). Copies get new names and ids, a LAN its own
 * block; LANs go first in the list so they stay under the machines.
 */
export function useClipboard(lab: Lab, deleteElements: DeleteNodes): void {
  const { nodes, edges, setNodes, setEdges } = lab;
  const clipboard = useRef<{ nodes: LabNode[]; edges: CableEdge[]; pastes: number } | null>(null);
  const addCopies = useCallback(
    (picked: LabNode[], from: CableEdge[], offset: XYPosition) => {
      const copies = cloneLab(picked, from, nodes, offset);
      setNodes([...copies.nodes.filter(isLan), ...unselected(nodes), ...copies.nodes.filter((n) => !isLan(n))]);
      setEdges((es) => [...unselected(es), ...copies.edges]);
    },
    [nodes, setNodes, setEdges],
  );
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (inTextField(e)) return;
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return;
      const key = e.key.toLowerCase();
      const picked = nodes.filter((n) => n.selected);
      const pasted = clipboard.current;
      if ((key === "c" || key === "x") && picked.length) {
        clipboard.current = { nodes: picked, edges: cablesWithin(picked, edges), pastes: 0 };
        if (key === "x") void deleteElements({ nodes: picked.map((n) => ({ id: n.id })) });
      } else if (key === "v" && pasted) {
        pasted.pastes += 1;
        addCopies(pasted.nodes, pasted.edges, { x: 40 * pasted.pastes, y: 40 * pasted.pastes });
      } else if (key === "d" && picked.length) {
        addCopies(picked, cablesWithin(picked, edges), { x: 40, y: 40 });
      } else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [nodes, edges, addCopies, deleteElements]);
}
