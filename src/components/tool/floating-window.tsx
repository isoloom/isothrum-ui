"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useText } from "./text";

const MARGIN = 12;
/** Room left under the top bar (menu, toolbar, export). */
const TOP = 72;

/** Dragging a window by its title bar, kept inside the screen. */
function useWindowDrag(width: number, side: "left" | "right") {
  const ref = useRef<HTMLDivElement>(null);
  // The editor only renders in the browser, so the screen size is known from the start.
  const [pos, setPos] = useState(() => {
    const w = Math.min(width, window.innerWidth - 2 * MARGIN);
    return { x: side === "left" ? MARGIN : window.innerWidth - w - MARGIN, y: TOP };
  });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const clamp = (x: number, y: number) => {
    const w = ref.current?.offsetWidth ?? width;
    return { x: Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN), y: Math.min(Math.max(MARGIN, y), window.innerHeight - 48) };
  };
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.target instanceof Element && e.target.closest("button")) return;
      drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    },
    onPointerUp: () => {
      drag.current = null;
    },
  };
  return { ref, pos, handlers };
}

/**
 * A window floating over the canvas: drag it by its title bar, close it with the cross. It opens
 * against the left or right edge and stays inside the screen while dragged.
 */
export function FloatingWindow({ title, side, width, onClose, children, className }: { title: ReactNode; side: "left" | "right"; width: number; onClose: () => void; children: ReactNode; className?: string }) {
  const t = useText();
  const { ref, pos, handlers } = useWindowDrag(width, side);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={typeof title === "string" ? title : undefined}
      style={{ left: pos.x, top: pos.y, width: `min(${String(width)}px, calc(100vw - ${String(2 * MARGIN)}px))` }}
      className={cn(
        "absolute z-20 flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-[0_8px_30px_-8px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      <div {...handlers} className="flex cursor-grab touch-none items-center gap-2 border-b px-3 py-2 select-none active:cursor-grabbing">
        <GripHorizontal className="size-4 text-muted-foreground/60" aria-hidden />
        <span className="flex-1 truncate font-heading text-sm font-semibold">{title}</span>
        <button type="button" onClick={onClose} aria-label={t.windows.close} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
