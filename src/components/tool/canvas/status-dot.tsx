"use client";

import { useContext } from "react";
import type { Status } from "@/lib/tool/desktop";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { LiveContext } from "./contexts";

const STATUS_DOT: Record<Status, string> = {
  up: "bg-success",
  starting: "bg-warning animate-pulse",
  unhealthy: "bg-destructive",
  down: "bg-muted-foreground/50",
};

/** A machine's status as a dot in its corner, its state in the tooltip. */
export function StatusDot({ name, className }: { name: string; className?: string }) {
  const t = useText().canvas.live;
  const m = useContext(LiveContext)?.machines[name];
  if (!m) return null;
  return (
    <span
      role="img"
      title={`${t[m.status]} · ${m.detail}`}
      aria-label={t[m.status]}
      className={cn("pointer-events-auto absolute z-10 size-3 rounded-full ring-2 ring-background", STATUS_DOT[m.status], className)}
    />
  );
}
