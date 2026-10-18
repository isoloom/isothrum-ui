import { useMemo, useState, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTheme } from "next-themes";
import { toolLabel } from "@/lib/tool/blocks";
import { runsOnVms } from "@/lib/tool/desktop";
import { facingSides, shownCables } from "@/lib/tool/facing";
import { liveViewOf } from "@/lib/tool/live";
import { isMachine, type CableEdge, type LabNode } from "@/lib/tool/model";
import { routerPortsOf, type Addresses } from "@/lib/tool/router-ports";
import { labIssues, selectionOf } from "@/lib/tool/selection";
import { toTopology } from "@/lib/tool/topology";
import type { Plan } from "@/lib/tool/engine";
import { useText } from "../text";
import { useCabling, useLabIndex } from "./use-cabling";
import { useCaptures } from "./use-captures";
import { useClipboard } from "./use-clipboard";
import { useContextMenus } from "./use-context-menus";
import { useAutoStart, useDesktopStartup, useDesktopState, useLiveLab, useRunPanel } from "./use-desktop";
import { useDesign } from "./use-design";
import { useDevices } from "./use-devices";
import { useDownloads } from "./use-downloads";
import { useEngine, usePlan } from "./use-engine";
import { useHistory } from "./use-history";
import { useDraftSaving, useLab } from "./use-lab";
import { useFitWhenDrawn, useLabActions } from "./use-lab-actions";
import { useLabRun } from "./use-lab-run";
import { useLanCarry } from "./use-lan-carry";
import { useMachineActions } from "./use-machine-actions";
import { usePlacement } from "./use-placement";
import { useProjects } from "./use-projects";
import { useSharedLink } from "./use-shared-link";
import { useToast } from "./use-toast";
import { useToolKeys, useTools } from "./use-tools";

/** The desktop app's side: running the lab, its machines, captures (all inert in a browser). */
function useDesktopSide(labName: string, initialName: string, setToast: (message: string) => void) {
  const t = useText();
  const state = useDesktopState();
  const live = useLiveLab(state.invoke, labName, state.run);
  const actions = useMachineActions({ invoke: state.invoke, labName, live, setToast, t });
  const menus = useContextMenus();
  const panel = useRunPanel();
  const autoStart = useAutoStart(state.invoke, labName);
  const captures = useCaptures(state.invoke, labName, (error) => {
    panel.setRunLog(error);
    panel.setRunOpen(true);
  });
  useDesktopStartup(state, initialName, autoStart.setAutoStartPending);
  return { state, live, actions, menus, panel, autoStart, captures };
}

/** While the lab has an error the engine gives no addresses; the canvas keeps showing the last good ones, so the address in conflict can still be edited where it is. */
function useAddresses(plan: Plan | null): Addresses {
  const [last, setLast] = useState<Addresses>({});
  const good = plan?.ok && Object.keys(plan.addresses).length ? plan.addresses : null;
  if (good && good !== last) setLast(good);
  return plan?.ok ? plan.addresses : last;
}

/** What the canvas draws from the lab: port sides, cables as attached now, router ports. */
function useCanvasViews(nodes: LabNode[], edges: CableEdge[], lans: ReturnType<typeof useLabIndex>["lans"], addresses: Addresses) {
  const sides = useMemo(() => facingSides(nodes, edges, lans), [nodes, edges, lans]);
  const shownEdges = useMemo(() => shownCables(nodes, edges, lans), [nodes, edges, lans]);
  const routerPorts = useMemo(() => routerPortsOf(nodes, edges, lans, addresses), [nodes, edges, lans, addresses]);
  return { sides, shownEdges, routerPorts };
}

/** The lab editor's state and behaviour: what the canvas, the toolbar and the windows show and do. */
export function useEditor(lang: string, accounts: boolean, canvasRef: RefObject<HTMLDivElement | null>) {
  const t = useText();
  const { engine, error: engineError } = useEngine();
  const { resolvedTheme } = useTheme();
  const flow = useReactFlow<LabNode, CableEdge>();
  const lab = useLab();
  const [exportOpen, setExportOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const tools = useTools();
  const [toast, setToast] = useToast();
  const desk = useDesktopSide(lab.labName, lab.initial.name, setToast);
  const history = useHistory(lab);
  const design = useDesign();
  const fitWhenDrawn = useFitWhenDrawn(flow.fitView);
  useSharedLink({ lab, setDesign: design.setDesign, setToast, fitWhenDrawn, t });
  useClipboard(lab, flow.deleteElements);
  useDraftSaving(lab);
  const topology = useMemo(() => toTopology(lab.labName, lab.nodes, lab.edges), [lab.labName, lab.nodes, lab.edges]);
  const plan = usePlan(engine, topology, t);
  const projects = useProjects({ accounts, lab, design: design.design, setDesign: design.setDesign, plan, setToast, fitWhenDrawn, t });
  const addresses = useAddresses(plan);
  const index = useLabIndex(lab.nodes);
  const views = useCanvasViews(lab.nodes, lab.edges, index.lans, addresses);
  const carry = useLanCarry(lab);
  const cabling = useCabling(lab, index);
  const devices = useDevices(tools, setToast, t);
  useToolKeys(tools);
  const actions = useLabActions(lab, fitWhenDrawn, setToast, t);
  const machines = lab.nodes.filter(isMachine);
  const hasVms = runsOnVms(machines.some((n) => n.data.kind === "vm"), plan);
  const run = useLabRun({ ...desk, state: desk.state, lab: { labName: lab.labName, topology, plan, engine, hasVms }, t });
  const { invoke, run: runState } = desk.state;
  const { live, links } = desk.live;
  const liveView = useMemo(() => (runState === "running" && live ? liveViewOf(live, links, lab.nodes, lab.edges) : null), [runState, live, links, lab.nodes, lab.edges]);
  const placement = usePlacement({ lab, lans: index.lans, tools, presets: devices.presets, canvasRef, screenToFlowPosition: flow.screenToFlowPosition, closeMenus: desk.menus.closeMenus, importGns3: (f) => void actions.importGns3(f) });
  const downloads = useDownloads(engine, plan, topology, lab.labName);
  const tool = toolLabel(tools.activeTool, devices.presets, t);
  const issues = labIssues(lab.nodes, plan, t.issues);
  const selection = selectionOf(lab.nodes, lab.edges);
  return {
    lang, accounts, t, engine, engineError, plan, resolvedTheme, flow, lab, tools, toast, setToast, desk, history, design, projects, addresses, index, views, carry, cabling, devices, actions, run, liveView, placement, downloads, tool, issues, selection, invoke,
    exportOpen, setExportOpen, statusOpen, setStatusOpen, machines, hasVms, mixed: hasVms && machines.some((n) => n.data.kind === "container"), empty: lab.nodes.length === 0, fitWhenDrawn,
  };
}

export type EditorModel = ReturnType<typeof useEditor>;
