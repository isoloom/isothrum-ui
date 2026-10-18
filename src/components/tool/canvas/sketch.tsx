"use client";

import { createContext, useContext } from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";
import type { Design } from "@/lib/tool/model";

/**
 * The whiteboard look: boxes and cables drawn by rough.js (the library behind Excalidraw), kept
 * gentle so the diagram stays clear. Each shape has a fixed seed, so its wobble doesn't change
 * from one render to the next.
 */
export const gen = rough.generator();
export const SKETCH = { roughness: 1.15, bowing: 1 };

/**
 * The canvas's look: the hand-drawn sketch (default), or business: crisp single lines, the plain
 * sans, muted fills, for a diagram that goes into a report. The fonts and colors switch through
 * CSS (`data-design` on the canvas); the strokes switch here.
 */
export const DesignContext = createContext<Design>("sketch");
const CRISP = { roughness: 0, bowing: 0, disableMultiStroke: true, disableMultiStrokeFill: true, preserveVertices: true };

/** The stroke options for this design (rough.js draws both: at roughness 0 a line is straight). */
export function useSketch() {
  return useContext(DesignContext) === "business" ? CRISP : SKETCH;
}

/** Whether the canvas is in the business look. */
export function useBusiness(): boolean {
  return useContext(DesignContext) === "business";
}

export function seedOf(id: string): number {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h || 1;
}

export type Drawable = ReturnType<typeof gen.rectangle>;

/** rough.js output as SVG paths; "F" and "S" stand for the fill and stroke we style with CSS. */
export function Sketch({
  drawable,
  fill,
  stroke,
  opacity = 1,
  dash,
}: {
  drawable: Drawable;
  fill?: string;
  stroke: string;
  opacity?: number;
  /** rough.js returns the path only: a dash pattern has to be applied here. */
  dash?: string;
}) {
  return (
    <>
      {gen.toPaths(drawable).map((p, i) => (
        <path
          key={i}
          d={p.d}
          style={{
            fill: p.fill === "F" && fill ? fill : "none",
            stroke: p.stroke === "S" ? stroke : "none",
            strokeWidth: p.strokeWidth,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeDasharray: p.stroke === "S" ? dash : undefined,
            opacity,
          }}
        />
      ))}
    </>
  );
}

interface FrameProps {
  drawable: Drawable;
  fill: string;
  selected: boolean;
  dim?: boolean;
  /** Business: network equipment, drawn as a dark faceplate instead of a card. */
  hardware?: boolean;
}

/** Business, network equipment: a dark faceplate with a screw at each end (its rack ears). */
function Faceplate({ selected, dim }: { selected: boolean; dim: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-md border border-black/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.09),0_1px_2px_rgb(15_23_42/0.25),0_10px_24px_-12px_rgb(15_23_42/0.55)]",
        selected && "ring-2 ring-signal ring-offset-2 ring-offset-background",
        dim && "opacity-55 saturate-0",
      )}
      style={{ background: "linear-gradient(180deg, #2c3646 0%, #1b2230 100%)" }}
    >
      {["left-1.5", "right-1.5"].map((side) => (
        <span key={side} className={cn("absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full bg-[#0e131b] ring-1 ring-white/15", side)} />
      ))}
    </div>
  );
}

/**
 * A node's frame. Sketch: the hand-drawn shape in its pastel. Business: a card, as in a network
 * diagram tool: rounded corners, a hairline border, a soft shadow (or, for network equipment, a
 * dark faceplate).
 */
export function Frame({ drawable, fill, selected, dim = false, hardware = false }: FrameProps) {
  if (!useBusiness()) {
    return (
      <svg aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-visible", dim && "opacity-40")} width="100%" height="100%">
        <Sketch drawable={drawable} fill={fill} stroke={selected ? "var(--signal)" : "var(--foreground)"} opacity={selected ? 1 : 0.8} />
      </svg>
    );
  }
  if (hardware) return <Faceplate selected={selected} dim={dim} />;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.06),0_4px_12px_-6px_rgb(15_23_42/0.12)] transition-shadow",
        selected ? "border-signal ring-2 ring-signal/25" : "border-border group-hover:border-foreground/25",
        dim && "border-dashed bg-muted/60 shadow-none",
      )}
    ></div>
  );
}
