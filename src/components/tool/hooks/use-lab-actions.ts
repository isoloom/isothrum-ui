import { useCallback } from "react";
import { migrateEdges } from "@/lib/tool/cables";
import { exampleLab } from "@/lib/tool/examples";
import { fromGns3 } from "@/lib/tool/gns3-import";
import { isLan, isMachine, type CableData, type Draft, type MachineData } from "@/lib/tool/model";
import type { EditorText } from "@/lib/tool/text";
import { replaceLab, type Lab } from "./use-lab";

type FitView = (options: { padding: number; maxZoom: number }) => unknown;

/** After replacing the whole lab: fits once React Flow has measured the new nodes. */
export function useFitWhenDrawn(fitView: FitView) {
  return useCallback(
    (options = { padding: 0.4, maxZoom: 1 }) => {
      setTimeout(() => void fitView(options), 120);
    },
    [fitView],
  );
}

/** Editing the lab from its windows and menus: a machine's or a cable's fields, examples, a GNS3 project. */
export function useLabActions(lab: Lab, fitWhenDrawn: (options?: { padding: number; maxZoom: number }) => void, setToast: (message: string) => void, t: EditorText) {
  const { nodes, setNodes, setEdges } = lab;
  return {
    updateMachine: (id: string, patch: Partial<MachineData>) => {
      const next = nodes.map((n) => (n.id === id && isMachine(n) ? { ...n, data: { ...n.data, ...patch } } : n));
      setNodes(next);
      // Turning a router into a real one (or back) changes its connection points: its cables move
      // onto free ports, or back onto its single port.
      if ("kind" in patch) setEdges((es) => migrateEdges(es, next));
    },
    updateCable: (id: string, patch: Partial<CableData>) => {
      setEdges((es) => es.map((e) => (e.id === id && e.data ? { ...e, data: { ...e.data, ...patch } } : e)));
    },
    loadExample: (make: () => Draft = exampleLab) => {
      replaceLab(lab, make());
      fitWhenDrawn();
    },
    clearLab: () => {
      setNodes([]);
      setEdges([]);
    },
    /** A GNS3 project opens as a lab (Undo brings back the one that was there). */
    importGns3: async (file: File) => {
      try {
        const { lab: opened, warnings } = fromGns3(await file.text(), t.gns3);
        replaceLab(lab, opened);
        fitWhenDrawn({ padding: 0.3, maxZoom: 1 });
        const machines = opened.nodes.filter(isMachine).length;
        const lans = opened.nodes.filter(isLan).length;
        setToast(`${t.toasts.gns3Opened(opened.name, machines, lans)}${warnings.length ? ` ${warnings.join(" ")}` : ""} ${t.toasts.undoBringsBack}`);
      } catch (err) {
        setToast(err instanceof Error ? err.message : t.toasts.gns3Unreadable);
      }
    },
  };
}
