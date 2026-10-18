"use client";

import { useContext, useMemo } from "react";
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Eye, EyeOff, Globe, GlobeLock } from "lucide-react";
import { conditionsLabel } from "@/lib/tool/conditions";
import { LAN_H, LAN_W, cleanName, type LanData, type LanNode } from "@/lib/tool/model";
import { vlanColor, vlanOf } from "@/lib/tool/vlans";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { AddressesContext, LiveContext } from "./contexts";
import { InlineText } from "./inline-text";
import { SKETCH, Sketch, gen, seedOf, useSketch, type Drawable } from "./sketch";

const SIDES = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const;

/** Business: a panel, its header a band in the LAN's color. */
function LanPanel({ tint, selected }: { tint: string | null; selected: boolean }) {
  const color = tint ?? "#2563eb";
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 rounded-xl border", selected && "ring-2 ring-signal/25")}
      style={{ background: `color-mix(in oklab, ${color} 4%, var(--background))`, borderColor: selected ? "var(--signal)" : `color-mix(in oklab, ${color} 30%, var(--border))` }}
    >
      <div className="h-10 rounded-t-xl border-b" style={{ background: `color-mix(in oklab, ${color} 9%, var(--background))`, borderColor: `color-mix(in oklab, ${color} 18%, var(--border))` }} />
    </div>
  );
}

/** Sketch: a dashed area in the LAN's tint (a VLAN's color), or a pale blue. */
function LanSketch({ frame, tint, selected, w, h }: { frame: Drawable; tint: string | null; selected: boolean; w: number; h: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
      <Sketch
        drawable={frame}
        fill={tint ? `color-mix(in oklab, ${tint} 9%, transparent)` : "color-mix(in oklab, var(--pastel-blue) 45%, transparent)"}
        stroke={selected ? "var(--signal)" : (tint ?? "var(--muted-foreground)")}
        dash="10 7"
      />
    </svg>
  );
}

/** Where cables plug in (kept while the area is hidden, cables may hang on them), and the border: the LAN's grip, to move it and everything in it. */
function LanGrips({ hidden }: { hidden: boolean }) {
  const grips = ["top-0 inset-x-0 h-3 -translate-y-1/2", "bottom-0 inset-x-0 h-3 translate-y-1/2", "left-0 inset-y-0 w-3 -translate-x-1/2", "right-0 inset-y-0 w-3 translate-x-1/2"] as const;
  return (
    <>
      {SIDES.map(([side, position]) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={position}
          style={hidden ? { opacity: 0 } : undefined}
          className="pointer-events-auto !z-10 !size-3 !border-2 !border-background !bg-muted-foreground/40 transition-colors hover:!bg-signal"
        />
      ))}
      {!hidden && grips.map((place) => <div key={place} aria-hidden className={cn("lan-handle pointer-events-auto absolute cursor-move", place)} />)}
    </>
  );
}

/** Business: how many machines a LAN has. */
function LanHosts({ name }: { name: string }) {
  const t = useText().canvas;
  const n = Object.values(useContext(AddressesContext)).filter((ips) => ips?.some(([net]) => net === name)).length;
  return <span className="rounded-sm px-1 text-[10px] whitespace-nowrap text-muted-foreground">{t.hosts(n)}</span>;
}

/** A running LAN's ports up, out of all: green when all are, amber when some aren't. */
function LanLive({ name }: { name: string }) {
  const t = useText().canvas.live;
  const lan = useContext(LiveContext)?.lans[name];
  if (!lan?.total) return null;
  const all = lan.up === lan.total;
  return (
    <span title={t.lanPorts(lan.up, lan.total)} className={cn("flex items-center gap-1 rounded-sm px-1 font-mono text-[10px] whitespace-nowrap", all ? "bg-success/15 text-success" : "bg-warning/20 text-foreground")}>
      <span className={cn("size-1.5 rounded-full", all ? "bg-success" : "bg-warning")} aria-hidden />
      {lan.up}/{lan.total}
    </span>
  );
}

/** The label: also a grip; double-click the name or the block to edit them in place. */
function LanLabel({ id, data, crisp }: { id: string; data: LanData; crisp: boolean }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  const hidden = !!data.hidden;
  const conditions = conditionsLabel(data.tc);
  const toggle = "nodrag grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <div className="lan-handle pointer-events-auto absolute top-1.5 left-2 flex cursor-move items-center gap-2 rounded-md px-1.5 py-1 hover:bg-background/70">
      <InlineText label={t.lanName} value={data.name} clean={cleanName} onCommit={(name) => { updateNodeData(id, { name }); }} className="font-heading text-base font-semibold" />
      <InlineText
        label={t.addressBlock}
        value={data.cidr}
        clean={(v) => v.replace(/[^0-9./]/g, "")}
        onCommit={(cidr) => { updateNodeData(id, { cidr }); }}
        className="font-mono text-[11px] text-muted-foreground in-data-[design=business]:rounded in-data-[design=business]:border in-data-[design=business]:bg-background in-data-[design=business]:px-1.5 in-data-[design=business]:py-px"
      />
      {conditions && <span className="rounded-sm bg-pastel-yellow/70 px-1 font-mono text-[10px] whitespace-nowrap text-foreground">{conditions}</span>}
      {crisp && <LanHosts name={data.name} />}
      <LanLive name={data.name} />
      <button type="button" onClick={() => { updateNodeData(id, { internet: !data.internet }); }} title={data.internet ? t.internetOnTitle : t.internetOffTitle} aria-label={data.internet ? t.internetOn : t.internetOff} className={toggle}>
        {data.internet ? <Globe className="size-3.5" /> : <GlobeLock className="size-3.5 text-warning" />}
      </button>
      <button type="button" onClick={() => { updateNodeData(id, { hidden: !hidden }); }} title={hidden ? t.showAreaTitle : t.hideAreaTitle} aria-label={hidden ? t.showArea : t.hideArea} className={toggle}>
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

/**
 * A LAN on the canvas: a sketched, dashed area behind the machines, with its name and block.
 * Machines inside it are on it; a cable from a machine to its edge puts that machine on it too
 * (how a router joins several LANs). Resizable from its corners when selected.
 */
export function LanNodeView({ id, data, selected, width, height }: NodeProps<LanNode>) {
  const hidden = !!data.hidden;
  // A LAN named vlan<n> is that VLAN: it takes the VLAN's color, as on the switches.
  const vlan = vlanOf(data.name);
  const tint = vlan === null ? null : vlanColor(vlan);
  const w = width ?? LAN_W;
  const h = height ?? LAN_H;
  const sketch = useSketch();
  const frame = useMemo(
    () => gen.rectangle(2, 2, w - 4, h - 4, { ...sketch, roughness: sketch.roughness && 0.8, seed: seedOf(id), fill: "F", fillStyle: "solid", stroke: "S", strokeWidth: selected ? 2 : 1.4 }),
    [id, w, h, selected, sketch],
  );
  return (
    <div style={{ width: w, height: h }} className="group relative">
      <NodeResizer isVisible={selected} minWidth={200} minHeight={160} lineClassName="!border-transparent" handleClassName="pointer-events-auto !z-10 !size-2.5 !rounded-sm !border-signal !bg-background" />
      {/* Hidden: no rectangle, no grips; the label stays, to edit the LAN or show it again. */}
      {!hidden && sketch === SKETCH && <LanSketch frame={frame} tint={tint} selected={selected} w={w} h={h} />}
      {!hidden && sketch !== SKETCH && <LanPanel tint={tint} selected={selected} />}
      <LanGrips hidden={hidden} />
      <LanLabel id={id} data={data} crisp={sketch !== SKETCH} />
    </div>
  );
}
