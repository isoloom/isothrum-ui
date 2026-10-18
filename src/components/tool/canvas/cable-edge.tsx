"use client";

import { useContext, useMemo } from "react";
import { BaseEdge, EdgeLabelRenderer, Position, getSmoothStepPath, getStraightPath, type EdgeProps } from "@xyflow/react";
import { Unplug } from "lucide-react";
import { conditionsLabel } from "@/lib/tool/conditions";
import type { CableStatus } from "@/lib/tool/live";
import type { CableEdge } from "@/lib/tool/model";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { LiveContext } from "./contexts";
import { Sketch, gen, seedOf, useBusiness, useSketch } from "./sketch";

interface Point {
  x: number;
  y: number;
}

const translate = (p: Point) => `translate(-50%, -50%) translate(${String(p.x)}px, ${String(p.y)}px)`;

function PortLabel({ at, text }: { at: Point; text?: string }) {
  if (!text) return null;
  return (
    <div style={{ transform: translate(at) }} className="nodrag nopan pointer-events-none absolute rounded-sm border bg-card px-1 py-px font-mono text-[10px] leading-none text-muted-foreground">
      {text}
    </div>
  );
}

/**
 * Where a cable runs and where its labels sit. Business: right angles with rounded corners, as in
 * a diagramming tool, a port's name just off its port in the direction the cable leaves; sketch:
 * straight, the names along the line.
 */
function cableGeometry(p: EdgeProps<CableEdge>, business: boolean) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = p;
  const [path, midX, midY] = business
    ? getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 10, offset: 18 })
    : getStraightPath({ sourceX, sourceY, targetX, targetY });
  const along = (f: number) => ({ x: sourceX + (targetX - sourceX) * f, y: sourceY + (targetY - sourceY) * f });
  const off = (x: number, y: number, side: Position) => ({
    x: x + (side === Position.Left ? -18 : side === Position.Right ? 18 : 0),
    y: y + (side === Position.Top ? -14 : side === Position.Bottom ? 14 : 0),
  });
  return {
    path,
    middle: business ? { x: midX, y: midY } : along(0.5),
    a: business ? off(sourceX, sourceY, sourcePosition) : along(0.18),
    b: business ? off(targetX, targetY, targetPosition) : along(0.82),
  };
}

/** The running lab: a cable says whether it carries traffic. */
function LiveBadge({ live, at }: { live: Exclude<CableStatus, "unknown">; at: Point }) {
  const t = useText().canvas.live;
  return (
    <div title={t.cable[live]} style={{ transform: translate(at) }} className="nodrag nopan pointer-events-auto absolute">
      {live === "up" ? (
        <span className="block size-2 rounded-full bg-success ring-2 ring-background" aria-label={t.cable.up} />
      ) : (
        <span className={cn("flex items-center gap-1 rounded-sm border bg-card px-1 py-px text-[10px] leading-none whitespace-nowrap", live === "cut" ? "border-destructive/50 text-destructive" : "text-muted-foreground")}>
          <Unplug className="size-2.5" aria-hidden /> {t.cableShort[live]}
        </span>
      )}
    </div>
  );
}

/** The line itself, in the color of the VLAN or network on the port it's plugged into. */
function CableLine({ p, path, live, stroke }: { p: EdgeProps<CableEdge>; path: string; live: CableStatus | undefined; stroke: string }) {
  const business = useBusiness();
  const sketch = useSketch();
  const { id, sourceX, sourceY, targetX, targetY, selected } = p;
  const line = useMemo(
    () => gen.line(sourceX, sourceY, targetX, targetY, { ...sketch, seed: seedOf(id), stroke: "S", strokeWidth: selected ? 2.5 : 1.5 }),
    [id, sourceX, sourceY, targetX, targetY, selected, sketch],
  );
  const broken = live === "cut" || live === "down";
  if (business) {
    return <path d={path} fill="none" style={{ stroke, strokeWidth: selected ? 2.25 : 1.5, strokeLinejoin: "round", strokeDasharray: broken ? "6 5" : undefined, opacity: live === "down" ? 0.4 : 1 }} />;
  }
  const opacity = live === "down" ? 0.35 : selected ? 1 : p.data?.color ? 0.95 : 0.7;
  return <Sketch drawable={line} stroke={stroke} opacity={opacity} dash={broken ? "7 6" : undefined} />;
}

/** A cable: a hand-drawn line with the port name next to each end, as in GNS3. */
export function CableEdgeView(p: EdgeProps<CableEdge>) {
  const { id, data, selected } = p;
  const business = useBusiness();
  const { path, middle, a, b } = cableGeometry(p, business);
  const live = useContext(LiveContext)?.cables[id];
  const stroke = selected ? "var(--signal)" : live === "cut" ? "var(--destructive)" : (data?.color ?? (business ? "#64748b" : "var(--foreground)"));
  const conditions = conditionsLabel(data?.tc);
  return (
    <>
      {/* The straight path is invisible: it only gives the cable a wide, easy target to click. */}
      <BaseEdge id={id} path={path} interactionWidth={18} style={{ stroke: "transparent" }} />
      <CableLine p={p} path={path} live={live} stroke={stroke} />
      <EdgeLabelRenderer>
        {live && live !== "unknown" && <LiveBadge live={live} at={{ x: middle.x, y: middle.y + (conditions ? 14 : 0) }} />}
        <PortLabel at={a} text={data?.aPort} />
        <PortLabel at={b} text={data?.bPort} />
        {/* A slow or lossy cable says so in its middle. */}
        {conditions && (
          <div style={{ transform: translate(middle) }} className="nodrag nopan pointer-events-none absolute rounded-sm border bg-pastel-yellow px-1 py-px font-mono text-[10px] leading-none whitespace-nowrap text-foreground">
            {conditions}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
