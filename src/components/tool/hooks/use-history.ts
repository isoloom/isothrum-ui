import { useCallback, useEffect, useRef, useState } from "react";
import type { CableEdge, LabNode } from "@/lib/tool/model";
import type { Lab } from "./use-lab";

/** A lab as the history keeps it: nothing selected or being dragged. */
interface Snapshot {
  nodes: LabNode[];
  edges: CableEdge[];
}

function snapshot(nodes: LabNode[], edges: CableEdge[]): Snapshot {
  return {
    nodes: nodes.map((n) => ({ ...n, selected: false, dragging: false })),
    edges: edges.map((e) => ({ ...e, selected: false })),
  };
}

/** What a change to the lab is (not selection, not the sizes React Flow measures). */
function signature(nodes: LabNode[], edges: CableEdge[]): string {
  return JSON.stringify([
    nodes.map((n) => [n.id, n.type, n.position.x, n.position.y, n.width, n.height, n.data]),
    edges.map((e) => [e.id, e.source, e.sourceHandle, e.target, e.targetHandle, e.data?.aPort, e.data?.bPort]),
  ]);
}

interface History {
  past: Snapshot[];
  future: Snapshot[];
  current: Snapshot;
  sig: string;
  last: number;
  applying: boolean;
}

/** Records a change: changes in quick succession (a drag, typing a name) count as one. */
function record(h: History, nodes: LabNode[], edges: CableEdge[], sig: string): void {
  const now = Date.now();
  if (!h.applying) {
    if (now - h.last > 700) {
      h.past.push(h.current);
      if (h.past.length > 200) h.past.shift();
    }
    h.future = [];
    h.last = now;
  }
  h.applying = false;
  h.current = snapshot(nodes, edges);
  h.sig = sig;
}

/** Undo and redo. Every change to the lab goes into the history. */
export function useHistory(lab: Lab) {
  const { initial, nodes, edges, setNodes, setEdges } = lab;
  const history = useRef<History>({ past: [], future: [], current: snapshot(initial.nodes, initial.edges), sig: signature(initial.nodes, initial.edges), last: 0, applying: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => {
    const h = history.current;
    const sig = signature(nodes, edges);
    if (sig === h.sig) return;
    record(h, nodes, edges, sig);
    queueMicrotask(() => {
      setCanUndo(h.past.length > 0);
      setCanRedo(h.future.length > 0);
    });
  }, [nodes, edges]);
  const step = useCallback(
    (back: boolean) => {
      const h = history.current;
      const target = (back ? h.past : h.future).pop();
      if (!target) return;
      (back ? h.future : h.past).push(h.current);
      h.applying = true;
      h.last = 0;
      setNodes(target.nodes);
      setEdges(target.edges);
    },
    [setNodes, setEdges],
  );
  useUndoKeys(step);
  return { step, canUndo, canRedo };
}

/** Whether a key event happens in a text field (where the keys edit the text, as everywhere else). */
export function inTextField(e: KeyboardEvent): boolean {
  return e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]") !== null;
}

/** Ctrl/⌘ Z undoes, Ctrl/⌘ Shift Z or Y redoes. */
function useUndoKeys(step: (back: boolean) => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // In a text field, the keys undo the typing, as everywhere else.
      if (inTextField(e)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) step(true);
      else if ((key === "z" && e.shiftKey) || key === "y") step(false);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [step]);
}
