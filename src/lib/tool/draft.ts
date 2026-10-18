import { migrateEdges } from "./cables";
import { DESIGNS, LAN_BEHAVIOR, cleanName, type CableEdge, type Design, type Draft, type LabNode } from "./model";
import { currentMachine } from "./os";

/** A lab as it is kept: in storage, in a saved project, or in a share link. */

/** Whether `v` is one of the canvas's looks. */
export const isDesign = (v: unknown): v is Design => DESIGNS.some((d) => d === v);

/** A lab's nodes and cables as stored: the lab only, no UI state. */
export function storedNodes(nodes: LabNode[]): Pick<LabNode, "id" | "type" | "position" | "data" | "width" | "height">[] {
  return nodes.map(({ id, type, position, data, width, height }) => ({ id, type, position, data, width, height }));
}

export function storedEdges(edges: CableEdge[], data: (e: CableEdge) => CableEdge["data"] = (e) => e.data): CableEdge[] {
  return edges.map((e) => ({ id: e.id, type: e.type, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle, data: data(e) }));
}

/** LANs behave as frames again, machines name their OS as Isoloom does, and cables move onto today's handles. */
function current(nodes: LabNode[], edges: CableEdge[]): { nodes: LabNode[]; edges: CableEdge[] } {
  const withBehavior = nodes.map((n): LabNode => {
    if (n.type === "lan") return { ...n, ...LAN_BEHAVIOR };
    return n.type === "machine" ? { ...n, data: currentMachine(n.data) } : n;
  });
  return { nodes: withBehavior, edges: migrateEdges(edges, withBehavior) };
}

/** Whether `v` is a JSON object: not null, not a list. */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Whether a stored node has what the editor reads of every node: an id, a position and its data. */
const isNode = (v: unknown): v is LabNode => isRecord(v) && typeof v.id === "string" && isRecord(v.position) && isRecord(v.data);

/** Whether a stored cable has what the editor reads of every cable: an id and its two ends. */
const isCable = (v: unknown): v is CableEdge => isRecord(v) && typeof v.id === "string" && typeof v.source === "string" && typeof v.target === "string";

/** Whether a parsed value has the shape of a draft: a name (if any) in text, lists of nodes and cables. */
function hasLists(d: unknown): d is { name?: string; nodes: LabNode[]; edges: CableEdge[]; design?: unknown } {
  if (!isRecord(d)) return false;
  const { name, nodes, edges } = d;
  if (name !== undefined && typeof name !== "string") return false;
  return Array.isArray(nodes) && Array.isArray(edges) && nodes.every(isNode) && edges.every(isCable);
}

/**
 * A draft from storage or a saved project, made current: LAN behavior, machines' OS names, today's cable handles.
 * Null when it isn't a lab's shape (a node or a cable that isn't one, as a damaged store holds).
 */
export function normalizeDraft(d: unknown): Draft | null {
  if (!hasLists(d)) return null;
  return { ...(d as Draft), ...current(d.nodes, d.edges) };
}

/** A draft without what is only UI state (selection, drag, measured sizes): what a save keeps. */
export function plainDraft(d: Draft): Draft {
  return {
    ...d,
    nodes: d.nodes.map((n) => {
      const c = { ...n };
      delete c.selected;
      delete c.dragging;
      delete c.measured;
      return c;
    }),
    edges: d.edges.map((e) => {
      const c = { ...e };
      delete c.selected;
      return c;
    }),
  };
}

/** Base64url without padding, as a link carries it. */
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * A lab in a link: its JSON, deflated, in base64url, after `#lab=`. The part after `#` never
 * reaches a server, so a shared lab stays as private as the editor (the link is the only copy).
 */
export async function encodeLab(draft: Draft): Promise<string> {
  const plain = {
    name: draft.name,
    // The look goes with the link, so the reader sees the diagram as it was drawn.
    ...(draft.design && draft.design !== "sketch" ? { design: draft.design } : {}),
    nodes: storedNodes(draft.nodes),
    // A cable keeps its ports and conditions; its color is only drawing, worked out again.
    edges: storedEdges(draft.edges, (e) => (e.data ? { aPort: e.data.aPort, bPort: e.data.bPort, tc: e.data.tc } : e.data)),
  };
  const stream = new Blob([JSON.stringify(plain)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function decodeLab(code: string): Promise<Draft | null> {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const d: unknown = JSON.parse(await new Response(stream).text());
    if (!hasLists(d)) return null;
    const design = isDesign(d.design) ? d.design : undefined;
    return { name: cleanName(d.name ?? "") || "shared-lab", ...current(d.nodes, d.edges), design };
  } catch {
    return null;
  }
}
