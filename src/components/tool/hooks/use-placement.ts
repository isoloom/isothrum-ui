import type { DragEvent, MouseEvent, RefObject } from "react";
import type { XYPosition } from "@xyflow/react";
import { LAN_TOOL, NOTE_TOOL, SWITCH_TOOL } from "@/lib/tool/blocks";
import { newLan, newNote } from "@/lib/tool/create";
import { isLan, unselected, type LabNode, type LanNode } from "@/lib/tool/model";
import { paletteSpot, placeAppliance, placeMachine, placeSwitch } from "@/lib/tool/placement";
import type { Preset } from "@/lib/tool/presets";
import type { Lab } from "./use-lab";
import type { Tools } from "./use-tools";

/** The drag-and-drop type of a device dragged from the toolbar. */
export const PRESET_MIME = "application/x-isothrum-preset";

interface Deps {
  lab: Lab;
  lans: LanNode[];
  tools: Tools;
  presets: Preset[];
  canvasRef: RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (p: XYPosition) => XYPosition;
  /** Closes the right-click menus (a click on the canvas does). */
  closeMenus: () => void;
  /** Opens a dropped GNS3 project. */
  importGns3: (file: File) => void;
}

/** Placing devices, LANs, switches and notes: by a click on the canvas with a tool, or a drop. */
export function usePlacement({ lab, lans, tools, presets, canvasRef, screenToFlowPosition, closeMenus, importGns3 }: Deps) {
  const { setNodes } = lab;
  function addPreset(presetId: string, at?: XYPosition) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    // A click in the palette drops the machine in the middle of the view.
    const viewCenter = () => {
      const r = canvasRef.current?.getBoundingClientRect();
      return r ? screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 0, y: 0 };
    };
    const position = at ?? paletteSpot(viewCenter(), lab.nodes);
    if (preset.data.icon === "router" || preset.data.icon === "shield") setNodes((ns) => placeAppliance(preset, position, !!at, ns, lans));
    else setNodes((ns) => placeMachine(preset, position, ns));
  }
  /** Places the active tool, centered on the pointer; then back to selecting, as Excalidraw does after a shape. */
  function place(tool: string, e: MouseEvent) {
    const at = () => screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // LANs go first in the list, so they are drawn under the machines; notes on top of everything, so they can sit over a LAN.
    if (tool === LAN_TOOL) {
      const center = at();
      setNodes((ns) => [{ ...newLan(center, ns), selected: true }, ...unselected(ns)]);
    } else if (tool === NOTE_TOOL) {
      const { x, y } = at();
      setNodes((ns) => [...unselected(ns), newNote({ x: x - 100, y: y - 45 })]);
    } else if (tool === SWITCH_TOOL) {
      const center = at();
      setNodes((ns) => placeSwitch(center, ns, lans));
    } else addPreset(tool, screenToFlowPosition({ x: e.clientX - 60, y: e.clientY - 58 }));
  }
  function onPaneClick(e: MouseEvent) {
    closeMenus();
    if (!tools.activeTool) return;
    place(tools.activeTool, e);
    tools.setActiveTool(null);
  }
  return {
    onPaneClick,
    // Inside a LAN the click lands on the area, not the canvas: placing there is the common case.
    onNodeClick: (e: MouseEvent, node: LabNode) => {
      if (tools.activeTool && isLan(node)) onPaneClick(e);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const file = [...e.dataTransfer.files].find((f) => f.name.endsWith(".gns3"));
      if (file) {
        importGns3(file);
        return;
      }
      const id = e.dataTransfer.getData(PRESET_MIME);
      if (id) addPreset(id, screenToFlowPosition({ x: e.clientX - 60, y: e.clientY - 58 }));
    },
  };
}
