"use client";

import { useMemo, useState } from "react";
import { NodeResizer, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Circle, Square, Type, type LucideIcon } from "lucide-react";
import { NOTE_COLORS, type NoteNode, type NoteShape } from "@/lib/tool/model";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { Sketch, gen, seedOf, useSketch } from "./sketch";

/** When selected, a small bar picks the note's shape and color. */
function NoteBar({ id, data, visible }: { id: string; data: NoteNode["data"]; visible: boolean }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  const shapes: [NoteShape, LucideIcon, string][] = [
    ["text", Type, t.textOnly],
    ["rect", Square, t.box],
    ["ellipse", Circle, t.ellipse],
  ];
  return (
    <NodeToolbar isVisible={visible} position={Position.Top} className="flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-sm">
      {shapes.map(([shape, Icon, label]) => (
        <button key={shape} type="button" title={label} aria-label={label} aria-pressed={data.shape === shape} onClick={() => { updateNodeData(id, { shape }); }} className={cn("grid size-7 place-items-center rounded-md hover:bg-muted", data.shape === shape && "bg-signal/15 text-signal")}>
          <Icon className="size-4" />
        </button>
      ))}
      <span className="mx-0.5 h-5 w-px bg-border" />
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={t.colors[color]}
          aria-label={t.color(t.colors[color])}
          aria-pressed={data.color === color}
          onClick={() => { updateNodeData(id, { color }); }}
          className={cn("size-5 rounded-full border", data.color === color && "ring-2 ring-signal ring-offset-1 ring-offset-popover")}
          style={{ background: `var(--pastel-${color})` }}
        />
      ))}
    </NodeToolbar>
  );
}

/** The note's text; double-click to write (Enter a new line; Escape or Ctrl/⌘ Enter is done). */
function NoteText({ id, data, selected, draft, setDraft }: { id: string; data: NoteNode["data"]; selected: boolean; draft: string | null; setDraft: (d: string | null) => void }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden p-3 font-heading text-base leading-snug text-foreground",
        data.shape === "ellipse" && "px-[15%]",
        data.shape === "text" && selected && "rounded-md outline-1 outline-signal/50 outline-dashed",
      )}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.text);
      }}
    >
      {draft === null ? (
        <p className={cn("w-full text-center break-words whitespace-pre-wrap", !data.text && "text-muted-foreground")}>{data.text || t.write}</p>
      ) : (
        <textarea
          autoFocus
          aria-label={t.note}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={() => {
            updateNodeData(id, { text: draft });
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) e.currentTarget.blur();
          }}
          className="nodrag nowheel size-full resize-none bg-transparent text-center outline-none"
        />
      )}
    </div>
  );
}

/**
 * A note: text on the canvas, bare or in a sketched box or ellipse, to explain the lab. It stays
 * in the editor (the draft, share links) and never reaches isoloom.yml.
 */
export function NoteNodeView({ id, data, selected, width, height }: NodeProps<NoteNode>) {
  const [draft, setDraft] = useState<string | null>(null);
  const w = width ?? 200;
  const h = height ?? 90;
  const sketch = useSketch();
  const outline = useMemo(() => {
    const o = { ...sketch, seed: seedOf(id), fill: "F", fillStyle: "solid", stroke: "S", strokeWidth: selected ? 2 : 1.3 };
    if (data.shape === "rect") return gen.rectangle(2, 2, w - 4, h - 4, o);
    if (data.shape === "ellipse") return gen.ellipse(w / 2, h / 2, w - 4, h - 4, o);
    return null;
  }, [id, w, h, selected, data.shape, sketch]);
  return (
    <div style={{ width: w, height: h }} className="relative">
      <NodeResizer isVisible={selected} minWidth={80} minHeight={40} lineClassName="!border-transparent" handleClassName="pointer-events-auto !z-10 !size-2.5 !rounded-sm !border-signal !bg-background" />
      <NoteBar id={id} data={data} visible={selected && draft === null} />
      {outline && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
          <Sketch drawable={outline} fill={`var(--pastel-${data.color})`} stroke={selected ? "var(--signal)" : "var(--foreground)"} />
        </svg>
      )}
      <NoteText id={id} data={data} selected={selected} draft={draft} setDraft={setDraft} />
    </div>
  );
}
