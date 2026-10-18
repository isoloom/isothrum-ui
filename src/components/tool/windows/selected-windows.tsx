"use client";

import { Trash2 } from "lucide-react";
import { machineEnds, networkOfCable } from "@/lib/tool/cables";
import { isSwitch, unselected, type CableEdge, type LanNode, type MachineNode } from "@/lib/tool/model";
import { nameById } from "@/lib/tool/selection";
import { vlanName } from "@/lib/tool/vlans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingWindow } from "../floating-window";
import type { EditorModel } from "../hooks/use-editor";
import { ConditionsFields } from "./conditions-fields";
import { field } from "./fields";
import { CaptureControl, LinkControl } from "./link-controls";
import { MachineControls } from "./machine-controls";
import { MachineInspector } from "./machine-inspector";

/** The cables of a machine, as its window lists them: `its port → the other end's name and port`. */
function cablesOf(e: EditorModel, id: string): string[] {
  const nameOf = (other: string) => nameById(e.lab.nodes, other);
  return e.lab.edges
    .filter((c) => c.source === id || c.target === id)
    .map((c) => (c.source === id ? `${String(c.data?.aPort)} → ${nameOf(c.target)} ${String(c.data?.bPort)}` : `${String(c.data?.bPort)} → ${nameOf(c.source)} ${String(c.data?.aPort)}`));
}

/** A machine's window: the inspector, and (desktop app, lab running) its controls. */
export function MachineWindow({ e, node }: { e: EditorModel; node: MachineNode }) {
  const { lab, desk, actions } = e;
  const name = node.data.name;
  const act = desk.actions;
  return (
    <FloatingWindow title={name || e.t.windows.machine} side="left" width={280} onClose={() => { lab.setNodes((ns) => unselected(ns)); }}>
      <div className="p-4">
        <MachineInspector
          node={node}
          cables={cablesOf(e, node.id)}
          onChange={(patch) => { actions.updateMachine(node.id, patch); }}
          onDelete={() => void e.flow.deleteElements({ nodes: [{ id: node.id }] })}
          onSaveDevice={() => { e.devices.saveDevice(node.data); }}
        />
        {e.invoke && desk.state.run === "running" && (
          <MachineControls
            state={desk.live.machineStates[name]}
            busy={act.busy}
            onConsole={() => void act.machineConsole(name)}
            onDisplay={() => void act.machineDisplay(name)}
            onAction={(action) => void act.machineAct(name, action)}
            snapshots={desk.live.snapshots.filter((x) => x.machine === name)}
            onSnapshot={(label) => void act.snapshotDo("snapshot_take", { machine: name, label })}
            onUse={(id) => void act.snapshotDo("snapshot_use", { machine: name, id })}
            onDeleteSnapshot={(id) => void act.snapshotDo("snapshot_delete", { id })}
          />
        )}
      </div>
    </FloatingWindow>
  );
}

/**
 * A LAN's window: how it behaves (its name and block are edited on the canvas itself), and in the
 * desktop app capturing its traffic and suspending its links.
 */
export function LanWindow({ e, lan }: { e: EditorModel; lan: LanNode }) {
  const { lab, desk } = e;
  const name = lan.data.name;
  const running = desk.state.run === "running";
  const { captures, capture, stopCapture } = desk.captures;
  const cut = desk.live.links.filter((l) => l.network === name).length;
  const onVlan = lab.nodes.some((n) => isSwitch(n) && n.data.vlans.some((v) => vlanName(v.id) === name));
  return (
    <FloatingWindow title={e.t.windows.lan(name)} side="left" width={280} onClose={() => { lab.setNodes((ns) => unselected(ns)); }}>
      <div className="flex flex-col gap-4 p-4 text-sm">
        {onVlan ? <p className="text-xs text-muted-foreground">{e.t.windows.conditions.onVlan}</p> : <ConditionsFields value={lan.data.tc} onChange={(tc) => { e.flow.updateNodeData(lan.id, { tc }); }} />}
        {e.invoke && (
          <>
            <CaptureControl network={name} running={running} capturing={name in captures} file={captures[name]} onStart={() => void capture(name)} onStop={() => void stopCapture(name)} />
            <LinkControl
              running={running}
              busy={desk.actions.busy}
              all
              suspended={cut ? e.t.link.lanSuspended(cut) : null}
              onSuspend={() => void desk.actions.linkAct(name, undefined, "suspend")}
              onResume={() => void desk.actions.linkAct(name, undefined, "resume")}
            />
          </>
        )}
      </div>
    </FloatingWindow>
  );
}

/** Desktop app: capturing a cable's traffic, and suspending it (when it has a machine at an end). */
function CableRunControls({ e, edge }: { e: EditorModel; edge: CableEdge }) {
  const { desk, lab } = e;
  const network = networkOfCable(edge.id, lab.nodes, lab.edges);
  if (!network) return null;
  const running = desk.state.run === "running";
  const { captures, capture, stopCapture } = desk.captures;
  const ends = machineEnds(edge, lab.nodes);
  const cut = desk.live.links.some((l) => l.network === network && ends.includes(l.machine));
  return (
    <>
      <CaptureControl network={network} running={running} capturing={network in captures} file={captures[network]} onStart={() => void capture(network)} onStop={() => void stopCapture(network)} />
      {ends.length > 0 && (
        <LinkControl
          running={running}
          busy={desk.actions.busy}
          suspended={cut ? e.t.link.cableSuspended : null}
          onSuspend={() => void desk.actions.linkAct(network, ends, "suspend")}
          onResume={() => void desk.actions.linkAct(network, ends, "resume")}
        />
      )}
    </>
  );
}

/** A cable's window: the port at each end, how it behaves, and removing it. */
export function CableWindow({ e, edge, data }: { e: EditorModel; edge: CableEdge; data: NonNullable<CableEdge["data"]> }) {
  const { lab, index, t } = e;
  const nameOf = (id: string) => nameById(lab.nodes, id);
  const ends = [
    ["aPort", edge.source],
    ["bPort", edge.target],
  ] as const;
  return (
    <FloatingWindow title={t.windows.cable(nameOf(edge.source), nameOf(edge.target))} side="left" width={280} onClose={() => { lab.setEdges((es) => unselected(es)); }}>
      <div className="flex flex-col gap-4 p-4 text-sm">
        {ends.map(([key, nodeId]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-muted-foreground">{t.windows.portOn(nameOf(nodeId))}</span>
            <input className={cn(field, "font-mono")} value={data[key]} onChange={(ev) => { e.actions.updateCable(edge.id, { [key]: ev.target.value }); }} />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">{t.windows.cableNote}</p>
        {[edge.source, edge.target].some((id) => index.lanIds.has(id) || index.switchIds.has(id)) ? (
          <p className="text-xs text-muted-foreground">{t.windows.conditions.onLan}</p>
        ) : (
          <ConditionsFields value={data.tc} onChange={(tc) => { e.actions.updateCable(edge.id, { tc }); }} />
        )}
        {e.invoke && <CableRunControls e={e} edge={edge} />}
        <Button variant="outline" size="sm" onClick={() => void e.flow.deleteElements({ edges: [{ id: edge.id }] })}>
          <Trash2 data-icon="inline-start" /> {t.windows.removeCable}
        </Button>
      </div>
    </FloatingWindow>
  );
}
