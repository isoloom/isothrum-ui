"use client";

import { Camera, Monitor, Play, RotateCw, Square, SquareTerminal, Trash2 } from "lucide-react";
import type { Snapshot } from "@/lib/tool/desktop";
import { Button } from "@/components/ui/button";
import type { MachineAction } from "../hooks/use-machine-actions";
import { useText } from "../text";

interface Props {
  state: string | undefined;
  busy: boolean;
  onConsole: () => void;
  onDisplay: () => void;
  onAction: (action: MachineAction) => void;
  snapshots: Snapshot[];
  onSnapshot: (label: string) => void;
  onUse: (id: string | null) => void;
  onDeleteSnapshot: (id: string) => void;
}

/** A console, its screen, and starting, restarting or stopping it. */
function RunButtons({ state, busy, onConsole, onDisplay, onAction }: Pick<Props, "state" | "busy" | "onConsole" | "onDisplay" | "onAction">) {
  const t = useText().machineRun;
  const running = state === "running";
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!running} onClick={onConsole}>
        <SquareTerminal data-icon="inline-start" /> {t.console}
      </Button>
      <Button size="sm" variant="outline" disabled={!running} onClick={onDisplay} title={t.displayTitle}>
        <Monitor data-icon="inline-start" /> {t.display}
      </Button>
      {running ? (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { onAction("restart"); }}>
            <RotateCw data-icon="inline-start" /> {t.restart}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { onAction("stop"); }}>
            <Square data-icon="inline-start" /> {t.stop}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" disabled={busy || !state} onClick={() => { onAction("start"); }}>
          <Play data-icon="inline-start" /> {t.start}
        </Button>
      )}
    </div>
  );
}

const when = (created: number) => new Date(created * 1000).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/** The machine's snapshots, newest first: restore one, delete one, or go back to its own image. */
function SnapshotList({ snapshots, busy, onUse, onDeleteSnapshot }: Pick<Props, "snapshots" | "busy" | "onUse" | "onDeleteSnapshot">) {
  const t = useText().machineRun;
  if (snapshots.length === 0) return <p className="text-xs text-muted-foreground">{t.noSnapshots}</p>;
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {snapshots
        .slice()
        .reverse()
        .map((x) => (
          <li key={x.id} className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate" title={x.image}>
              {x.label} <span className="text-muted-foreground">· {when(x.created)}</span>
            </span>
            {x.in_use ? (
              <span className="text-signal">{t.inUse}</span>
            ) : (
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => { onUse(x.id); }}>
                {t.restore}
              </Button>
            )}
            <Button size="icon-xs" variant="ghost" disabled={busy || x.in_use} aria-label={t.deleteSnapshot(x.label)} title={t.deleteSnapshot(x.label)} onClick={() => { onDeleteSnapshot(x.id); }}>
              <Trash2 />
            </Button>
          </li>
        ))}
    </ul>
  );
}

/** In the desktop app, for a machine of the running lab: its state, its controls, its snapshots. */
export function MachineControls(p: Props) {
  const t = useText().machineRun;
  const running = p.state === "running";
  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-3 text-sm">
      <p className="text-xs text-muted-foreground">{running ? t.running : p.state ? t.stopped : t.unknown}</p>
      <RunButtons state={p.state} busy={p.busy} onConsole={p.onConsole} onDisplay={p.onDisplay} onAction={p.onAction} />
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t.snapshots}</span>
          <Button
            size="xs"
            variant="outline"
            disabled={p.busy || !running}
            title={t.snapshotHint}
            onClick={() => {
              const label = window.prompt(t.snapshotPrompt, "");
              if (label !== null) p.onSnapshot(label);
            }}
          >
            <Camera data-icon="inline-start" /> {t.takeSnapshot}
          </Button>
        </div>
        <SnapshotList snapshots={p.snapshots} busy={p.busy} onUse={p.onUse} onDeleteSnapshot={p.onDeleteSnapshot} />
        {p.snapshots.some((x) => x.in_use) && (
          <Button size="xs" variant="ghost" className="self-start" disabled={p.busy} onClick={() => { p.onUse(null); }}>
            {t.ownImage}
          </Button>
        )}
      </div>
    </div>
  );
}
