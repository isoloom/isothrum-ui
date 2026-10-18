"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type { Block, BlockOption } from "@/lib/tool/blocks";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeviceIcon } from "./canvas/device-icon";
import { PRESET_MIME } from "./hooks/use-placement";
import { useText } from "./text";

/** A kind's picture: the device's, or the switch's ports. */
function BlockIcon({ option }: { option: BlockOption }) {
  if (option.preset) return <DeviceIcon data={option.preset.data} size="sm" />;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center gap-[2px] rounded-md bg-background ring-1 ring-foreground/10" aria-hidden>
      {["#7048e8", "#7048e8", "#2f9e44", "#2f9e44"].map((c, i) => (
        <span key={i} className="h-3 w-1 rounded-[1px]" style={{ background: c }} />
      ))}
    </span>
  );
}

/** One kind in a block's list: what it is, its key, and (a saved device) a way to forget it. */
function KindItem({ o, current, onPick, onForget }: { o: BlockOption; current: string; onPick: (tool: string) => void; onForget: (id: string) => void }) {
  const t = useText().toolbar;
  return (
    <DropdownMenuItem onClick={() => { onPick(o.tool); }} className="gap-2.5">
      <BlockIcon option={o} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{o.label}</span>
        <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
      </span>
      {o.tool === current && <Check className="size-4 text-muted-foreground" />}
      {o.key && <DropdownMenuShortcut>{o.key}</DropdownMenuShortcut>}
      {o.preset?.group === "mine" && (
        <span
          role="button"
          tabIndex={-1}
          aria-label={t.forgetLabel(o.label)}
          title={t.forget(o.label)}
          onClick={(e) => {
            e.stopPropagation();
            onForget(o.tool);
          }}
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </span>
      )}
    </DropdownMenuItem>
  );
}

/** A block's arrow: every kind it places, with what it is and its key. */
function KindsMenu({ block, current, onPick, onForget }: { block: Block; current: string; onPick: (tool: string) => void; onForget: (id: string) => void }) {
  const t = useText().toolbar;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.kindsOf(block.label)}
        title={t.kindsOf(block.label)}
        className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full border bg-popover text-muted-foreground shadow-sm hover:text-foreground"
      >
        <ChevronDown className="size-2.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{block.label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {block.options.map((o) => (
          <KindItem key={o.tool} o={o} current={current} onPick={onPick} onForget={onForget} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A toolbar block: one button that places the kind picked last (drag it, or click then click
 * the canvas), and an arrow listing every kind with what it is and its key.
 */
export function DeviceBlock({ block, choice, active, onPick, onForget }: { block: Block; choice: string | undefined; active: string | null; onPick: (tool: string) => void; onForget: (id: string) => void }) {
  const current = block.options.find((o) => o.tool === choice) ?? block.options.at(0);
  if (!current) return null;
  const on = block.options.some((o) => o.tool === active);
  return (
    <div className={cn("relative flex shrink-0 items-center rounded-lg", on && "bg-brand-100 ring-1 ring-signal dark:bg-brand-950")}>
      <button
        type="button"
        draggable={!!current.preset}
        onDragStart={(e) => {
          if (!current.preset) return;
          e.dataTransfer.setData(PRESET_MIME, current.preset.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => { onPick(current.tool); }}
        aria-pressed={on}
        aria-label={`${block.label}: ${current.label}`}
        title={`${block.label}: ${current.label} (${current.hint})${current.key ? ` · ${current.key}` : ""}`}
        className={cn("grid size-10 place-items-center rounded-lg transition-colors hover:bg-muted", on && "hover:bg-transparent")}
      >
        <BlockIcon option={current} />
      </button>
      {block.options.length > 1 && <KindsMenu block={block} current={current.tool} onPick={onPick} onForget={onForget} />}
    </div>
  );
}
