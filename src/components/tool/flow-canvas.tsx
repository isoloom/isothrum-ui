"use client";

import type { MouseEvent, ReactNode } from "react";
import { Background, BackgroundVariant, ConnectionMode, Controls, Panel, ReactFlow, SelectionMode, type EdgeTypes, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Redo2, Undo2 } from "lucide-react";
import { machineEnds, networkOfCable } from "@/lib/tool/cables";
import { isLan, isMachine, type CableEdge, type LabNode } from "@/lib/tool/model";
import { nameById } from "@/lib/tool/selection";
import { CableEdgeView } from "./canvas/cable-edge";
import { AddressesContext, LiveContext, PortsContext, SidesContext } from "./canvas/contexts";
import { LanNodeView } from "./canvas/lan-node";
import { MachineNodeView } from "./canvas/machine-node";
import { NoteNodeView } from "./canvas/note-node";
import { DesignContext } from "./canvas/sketch";
import { SwitchNodeView } from "./canvas/switch-node";
import type { EditorModel } from "./hooks/use-editor";

const nodeTypes: NodeTypes = { machine: MachineNodeView, lan: LanNodeView, switch: SwitchNodeView, note: NoteNodeView };
const edgeTypes: EdgeTypes = { cable: CableEdgeView };

/** What the canvas's nodes and cables read: the look, addresses, port sides and the running lab. */
function CanvasContexts({ e, children }: { e: EditorModel; children: ReactNode }) {
  return (
    <DesignContext.Provider value={e.design.design}>
      <AddressesContext.Provider value={e.addresses}>
        <SidesContext.Provider value={e.views.sides}>
          <PortsContext.Provider value={e.views.routerPorts}>
            <LiveContext.Provider value={e.liveView}>{children}</LiveContext.Provider>
          </PortsContext.Provider>
        </SidesContext.Provider>
      </AddressesContext.Provider>
    </DesignContext.Provider>
  );
}

/** As in GNS3: double-click a running machine for its console, right-click for the rest (desktop app only). */
function runningLabMenus(e: EditorModel) {
  const { invoke, desk, lab } = e;
  const running = desk.state.run === "running";
  return {
    onNodeDoubleClick: (_: MouseEvent, node: LabNode) => {
      if (invoke && running && isMachine(node)) void desk.actions.machineConsole(node.data.name);
    },
    onNodeContextMenu: (ev: MouseEvent, node: LabNode) => {
      if (!invoke) return;
      if (isMachine(node)) {
        ev.preventDefault();
        desk.menus.setMachineMenu({ x: ev.clientX, y: ev.clientY, machine: node.data.name });
      } else if (isLan(node)) {
        ev.preventDefault();
        desk.menus.setLinkMenu({ x: ev.clientX, y: ev.clientY, network: node.data.name, title: node.data.name });
      }
    },
    onEdgeContextMenu: (ev: MouseEvent, edge: CableEdge) => {
      const network = invoke ? networkOfCable(edge.id, lab.nodes, lab.edges) : null;
      if (!network) return;
      ev.preventDefault();
      const title = `${nameById(lab.nodes, edge.source)} ↔ ${nameById(lab.nodes, edge.target)}`;
      desk.menus.setLinkMenu({ x: ev.clientX, y: ev.clientY, network, title, machines: machineEnds(edge, lab.nodes) });
    },
  };
}

/** Undo and redo, beside the zoom controls. */
function HistoryButtons({ e }: { e: EditorModel }) {
  const { step, canUndo, canRedo } = e.history;
  const t = e.t.toolbar;
  return (
    <Panel position="bottom-left" className="!mb-4 !ml-16 flex overflow-hidden rounded-lg border bg-popover shadow-sm">
      <button type="button" onClick={() => { step(true); }} disabled={!canUndo} title={t.undoTitle} aria-label={t.undo} className="grid size-8 place-items-center text-foreground hover:bg-muted disabled:opacity-35">
        <Undo2 className="size-4" />
      </button>
      <button type="button" onClick={() => { step(false); }} disabled={!canRedo} title={t.redoTitle} aria-label={t.redo} className="grid size-8 place-items-center border-l text-foreground hover:bg-muted disabled:opacity-35">
        <Redo2 className="size-4" />
      </button>
    </Panel>
  );
}

/** The canvas: React Flow with the lab's nodes and cables, in Excalidraw's two modes. */
export function FlowCanvas({ e }: { e: EditorModel }) {
  const { lab, tools, cabling, carry, placement } = e;
  const select = tools.mode === "select";
  const menus = runningLabMenus(e);
  return (
    <CanvasContexts e={e}>
      <ReactFlow<LabNode, CableEdge>
        nodes={lab.nodes}
        edges={e.views.shownEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={cabling.onNodesChange}
        onNodeDragStart={carry.onNodeDragStart}
        onNodeDrag={carry.onNodeDrag}
        onNodeDragStop={carry.onNodeDragStop}
        // A selected LAN must stay under its machines.
        elevateNodesOnSelect={false}
        onEdgesChange={lab.onEdgesChange}
        onConnect={cabling.onConnect}
        onPaneClick={placement.onPaneClick}
        onNodeClick={placement.onNodeClick}
        onNodeDoubleClick={menus.onNodeDoubleClick}
        onNodeContextMenu={menus.onNodeContextMenu}
        onEdgeContextMenu={menus.onEdgeContextMenu}
        onMoveStart={e.desk.menus.closeMenus}
        connectionMode={ConnectionMode.Loose}
        // Select: dragging the canvas draws a selection box; the middle button or Space pans.
        // Hand: dragging pans, and nothing on the canvas can be changed.
        panOnDrag={select ? [1] : true}
        selectionOnDrag={select}
        // Only what is wholly inside the box, so selecting a LAN's machines leaves the LAN alone.
        selectionMode={SelectionMode.Full}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        panActivationKeyCode="Space"
        nodesDraggable={select}
        nodesConnectable={select}
        elementsSelectable={select}
        panOnScroll
        zoomActivationKeyCode={["Meta", "Control"]}
        isValidConnection={cabling.isValid}
        edgesReconnectable
        onReconnectStart={cabling.onReconnectStart}
        onReconnect={cabling.onReconnect}
        onReconnectEnd={cabling.onReconnectEnd}
        colorMode={e.resolvedTheme === "dark" ? "dark" : "light"}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: true }}
      >
        {e.design.design === "business" && <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--border)" />}
        <Controls position="bottom-left" showInteractive={false} className="!m-4 overflow-hidden !rounded-lg !border !shadow-sm" />
        <HistoryButtons e={e} />
      </ReactFlow>
    </CanvasContexts>
  );
}
