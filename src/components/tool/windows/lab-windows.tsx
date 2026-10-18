"use client";

import { Trash2 } from "lucide-react";
import { isLan, isNote, isSwitch, nodeName, unselected } from "@/lib/tool/model";
import { setAutoStarts } from "@/lib/tool/storage";
import { Button } from "@/components/ui/button";
import { FloatingWindow } from "../floating-window";
import type { EditorModel } from "../hooks/use-editor";
import { LabStatus } from "./lab-status";

/** Several things selected: what they are, and deleting them all. */
export function SelectionWindow({ e }: { e: EditorModel }) {
  const { t, lab } = e;
  const { selectedNodes, selectedEdges, count } = e.selection;
  return (
    <FloatingWindow
      title={t.windows.selected(count)}
      side="left"
      width={280}
      onClose={() => {
        lab.setNodes((ns) => unselected(ns));
        lab.setEdges((es) => unselected(es));
      }}
    >
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p className="text-muted-foreground">{t.windows.selection(selectedNodes.length, selectedEdges.length)}</p>
        {selectedNodes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 font-mono text-xs">
            {selectedNodes.map((n) => (
              <li key={n.id} className="rounded-md border px-1.5 py-0.5">
                {isNote(n) ? t.canvas.noteName : nodeName(n)}
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" size="sm" onClick={() => void e.flow.deleteElements({ nodes: selectedNodes.map((n) => ({ id: n.id })), edges: selectedEdges.map((c) => ({ id: c.id })) })}>
          <Trash2 data-icon="inline-start" /> {t.windows.deleteSelection(count)}
        </Button>
      </div>
    </FloatingWindow>
  );
}

/** The lab at a glance: how many containers, VMs, LANs and cables, and what to fix. */
export function StatusWindow({ e }: { e: EditorModel }) {
  const { t, lab, machines, issues } = e;
  const vlans = new Set(lab.nodes.filter(isSwitch).flatMap((sw) => sw.data.vlans.map((v) => v.id)));
  const counts = [
    [t.lab.containers, machines.filter((n) => n.data.kind === "container").length],
    [t.lab.vms, machines.filter((n) => n.data.kind === "vm").length],
    [t.lab.lans, lab.nodes.filter(isLan).length + vlans.size],
    [t.lab.cables, lab.edges.length],
  ] as const;
  return (
    <FloatingWindow title={t.lab.title} side="right" width={320} onClose={() => { e.setStatusOpen(false); }}>
      <div className="flex flex-col gap-4 p-4 text-sm">
        {/* Equal columns, unless a label (Contenedores) needs more: then it widens, unbroken. */}
        <div className="grid grid-cols-[repeat(4,minmax(min-content,1fr))] gap-2 text-center">
          {counts.map(([label, count]) => (
            <div key={label} className="rounded-lg border p-2">
              <div className="font-heading text-lg font-semibold">{count}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        {issues.length > 0 ? (
          <div>
            <h3 className="mb-2 font-medium">{t.lab.toFix}</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {issues.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-success">{t.lab.valid}</p>
        )}
        <p className="text-xs text-muted-foreground">{t.lab.routing}</p>
      </div>
    </FloatingWindow>
  );
}

/** What the Run window says the lab is doing. */
function runLine(e: EditorModel): string {
  const t = e.t;
  switch (e.desk.state.run) {
    case "running":
      return `${t.run.running} ${t.machineRun.consoleHint}`;
    case "starting":
      return t.run.starting;
    case "stopping":
      return t.run.stopping;
    case "stopped":
      return t.run.stopped;
  }
}

/** Desktop app: the lab running on this machine, its log, and starting it with the app. */
export function RunWindow({ e }: { e: EditorModel }) {
  const { t, desk, lab } = e;
  const { info, run } = desk.state;
  const { autoStart, setAutoStart } = desk.autoStart;
  return (
    <FloatingWindow title={t.run.window} side="right" width={420} onClose={() => { desk.panel.setRunOpen(false); }}>
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p>{runLine(e)}</p>
        {info && !info.docker && <p className="rounded-md bg-pastel-yellow p-2.5 text-xs">{t.run.noDocker}</p>}
        {info && !info.live_capture && <p className="text-xs text-muted-foreground">{t.run.noLiveCapture(info.wireshark, info.labs.replace(/labs$/, "captures"))}</p>}
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={autoStart}
            onChange={(ev) => {
              setAutoStarts(lab.labName, ev.target.checked);
              setAutoStart(ev.target.checked);
            }}
          />
          <span>
            {t.run.autoStart}
            <span className="block text-muted-foreground">{t.run.autoStartNote}</span>
          </span>
        </label>
        {run === "running" && desk.live.live && <LabStatus live={desk.live.live} cut={desk.live.links} />}
        {desk.panel.runLog && <pre className="max-h-72 overflow-auto rounded-md border bg-surface p-3 font-mono text-xs whitespace-pre-wrap">{desk.panel.runLog}</pre>}
      </div>
    </FloatingWindow>
  );
}
