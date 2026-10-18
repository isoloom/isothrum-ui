import { useEffect, useState } from "react";
import { useEdgesState, useNodesState } from "@xyflow/react";
import type { CableEdge, Draft, LabNode } from "@/lib/tool/model";
import { loadDraft, saveDraft } from "@/lib/tool/storage";

/** The lab on the canvas: its name, nodes and cables, kept in this browser as it changes. */
export function useLab() {
  // The last lab drawn in this browser, or a blank canvas (the example is one click away). The
  // editor renders on the client only, so reading storage here can't mismatch the server's HTML.
  const [initial] = useState<Draft>(() => loadDraft() ?? { name: "my-lab", nodes: [], edges: [] });
  const [labName, setLabName] = useState(initial.name);
  const [nodes, setNodes, onNodesChange] = useNodesState<LabNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CableEdge>(initial.edges);
  return { initial, labName, setLabName, nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange };
}

export type Lab = ReturnType<typeof useLab>;

/** Saves the lab as it changes. */
export function useDraftSaving(lab: Lab): void {
  const { labName, nodes, edges } = lab;
  useEffect(() => {
    saveDraft({ name: labName, nodes, edges });
  }, [labName, nodes, edges]);
}

/** Replaces the whole lab (an example, a shared link, a project, a GNS3 import). */
export function replaceLab(lab: Lab, next: Draft): void {
  lab.setLabName(next.name);
  lab.setNodes(next.nodes);
  lab.setEdges(next.edges);
}
