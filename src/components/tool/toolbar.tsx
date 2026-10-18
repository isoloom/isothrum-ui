"use client";

import type { ReactNode } from "react";
import { Hand, MousePointer2, Network, StickyNote } from "lucide-react";
import { LAN_TOOL, NOTE_TOOL, hintFor } from "@/lib/tool/blocks";
import { cn } from "@/lib/utils";
import { DeviceBlock } from "./device-block";
import type { EditorModel } from "./hooks/use-editor";
import type { Mode } from "./hooks/use-tools";

const KEY = "absolute bottom-0 left-0.5 font-mono text-[9px] text-muted-foreground";
const TOOL = "relative grid size-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-muted";
const PICKED = "bg-brand-100 ring-1 ring-signal hover:bg-brand-100 dark:bg-brand-950";

const Separator = () => <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />;

/** Hand and selection, Excalidraw's two modes. */
function ModeButtons({ e }: { e: EditorModel }) {
  const t = e.t.toolbar;
  const { tools } = e;
  const modes: [Mode, typeof Hand, string, string][] = [
    ["hand", Hand, t.hand, "H"],
    ["select", MousePointer2, t.select, "V"],
  ];
  return modes.map(([m, Icon, label, key]) => {
    const on = tools.mode === m && !tools.activeTool;
    return (
      <button
        key={m}
        type="button"
        onClick={() => { tools.setModeOnly(m); }}
        aria-pressed={on}
        aria-label={label}
        title={`${label} · ${key}`}
        className={cn(TOOL, on && "bg-brand-100 text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300")}
      >
        <Icon className="size-[18px]" aria-hidden />
        <span className={KEY}>{key}</span>
      </button>
    );
  });
}

/** A tool of its own (a LAN, a note): picked, it is the next thing a click places. */
function ToolButton({ e, tool, label, title, letter, children }: { e: EditorModel; tool: string; label: string; title: string; letter: string; children: ReactNode }) {
  const { tools } = e;
  return (
    <button
      type="button"
      onClick={() => { tools.pick(tool); }}
      aria-pressed={tools.activeTool === tool}
      aria-label={label}
      title={`${title} · ${letter}`}
      className={cn(TOOL, tools.activeTool === tool && PICKED)}
    >
      {children}
      <span className={KEY}>{letter}</span>
    </button>
  );
}

/** The blocks from `from` to `to` (the network ones, then the machines). */
function Blocks({ e, from, to }: { e: EditorModel; from: number; to?: number }) {
  const { devices, tools } = e;
  return devices.blocks.slice(from, to).map((b) => (
    <DeviceBlock key={b.id} block={b} choice={devices.blockChoice[b.id]} active={tools.activeTool} onPick={(tool) => { devices.pickFromBlock(b.id, tool); }} onForget={devices.forgetDevice} />
  ));
}

/** Top center: the devices, grouped as network, containers, VMs; the line under it says what a click does. */
export function Toolbar({ e }: { e: EditorModel }) {
  const t = e.t;
  const { tools, lab } = e;
  const hint = hintFor(tools.activeTool, e.tool?.label, { hand: tools.mode === "hand", nodes: lab.nodes.length, edges: lab.edges.length }, t);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-16 max-sm:items-start max-sm:pl-16">
      <div role="toolbar" aria-label={t.toolbar.devices} className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border bg-popover p-1 shadow-[0_4px_20px_-6px_rgb(0_0_0/0.15)]">
        <ModeButtons e={e} />
        <Separator />
        {/* The devices as elementary blocks: a LAN, a switch, a router, a firewall, a
            container, a VM (and the devices saved from the canvas). A block places the kind
            picked last; its arrow lists the kinds. */}
        <div className="flex items-center gap-0.5">
          <ToolButton e={e} tool={LAN_TOOL} label={t.toolbar.lan} title={t.toolbar.lanTitle} letter="L">
            <span className="grid size-8 place-items-center rounded-md border border-dashed border-foreground/40 bg-pastel-blue">
              <Network className="size-4" aria-hidden />
            </span>
          </ToolButton>
          <Blocks e={e} from={0} to={3} />
        </div>
        <Separator />
        <div className="flex items-center gap-0.5">
          <Blocks e={e} from={3} />
        </div>
        <div className="flex items-center gap-0.5">
          <Separator />
          <ToolButton e={e} tool={NOTE_TOOL} label={t.toolbar.note} title={t.toolbar.noteTitle} letter="T">
            <StickyNote className="size-5" />
          </ToolButton>
        </div>
      </div>
      {/* On the empty canvas the welcome's handwritten hints say it instead. */}
      {(!e.empty || tools.activeTool) && <p className="pointer-events-none hidden text-center text-xs text-muted-foreground sm:block">{hint}</p>}
    </div>
  );
}
