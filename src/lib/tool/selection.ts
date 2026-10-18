import { canvasIssues, type IssueText } from "./issues";
import type { Plan } from "./engine";
import { isLan, isMachine, nodeName, type CableEdge, type LabNode } from "./model";

/** What is selected: one thing opens its window; several open the "selection" window instead. */
export function selectionOf(nodes: LabNode[], edges: CableEdge[]) {
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const count = selectedNodes.length + selectedEdges.length;
  const only = count === 1 ? selectedNodes.at(0) : undefined;
  return {
    selectedNodes,
    selectedEdges,
    count,
    machine: only && isMachine(only) ? only : undefined,
    lan: only && isLan(only) ? only : undefined,
    edge: count === 1 ? selectedEdges.at(0) : undefined,
  };
}

/**
 * What to fix before the lab runs: the canvas's own findings, then the engine's. An empty canvas
 * isn't a lab with problems yet: nothing until there is something to check.
 */
export function labIssues(nodes: LabNode[], plan: Plan | null, text: IssueText): string[] {
  if (nodes.length === 0) return [];
  return [...canvasIssues(nodes, text), ...(plan && !plan.ok && plan.error ? [plan.error] : []), ...(plan?.problems ?? [])];
}

/** A node's name by its id, as the windows show it ("?" for one that is gone). */
export function nameById(nodes: LabNode[], id: string): string {
  const n = nodes.find((x) => x.id === id);
  return n ? nodeName(n) : "?";
}
