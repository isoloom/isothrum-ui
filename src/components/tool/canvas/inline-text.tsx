"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useText } from "../text";

interface InlineTextProps {
  value: string;
  onCommit: (v: string) => void;
  clean?: (v: string) => string;
  className?: string;
  label: string;
  /** Clearing the field means something (e.g. "back to automatic"), so an empty value counts. */
  allowEmpty?: boolean;
}

/** The field while editing: as wide as the text, not the box around it. */
function InlineField({ draft, setDraft, done, clean, className, label }: { draft: string; setDraft: (v: string) => void; done: (keep: boolean) => void } & Pick<InlineTextProps, "clean" | "className" | "label">) {
  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      // As wide as the text, not the box around it: the width follows what is typed.
      size={1}
      style={{ width: `${String(Math.max(3, draft.length) + 1.5)}ch`, fieldSizing: "content", minWidth: "3ch" }}
      onChange={(e) => {
        setDraft(clean ? clean(e.target.value) : e.target.value);
      }}
      onBlur={() => {
        done(true);
      }}
      onKeyDown={(e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === "Enter") done(true);
        if (e.key === "Escape") done(false);
      }}
      className={cn("nodrag nopan w-auto max-w-[260px] rounded-sm bg-background px-0.5 outline-none ring-2 ring-signal", className)}
    />
  );
}

/**
 * Text edited in place, as in Excalidraw: double-click to edit, Enter or a click elsewhere to
 * keep, Escape to drop. `nodrag` so typing never moves the node.
 */
export function InlineText({ value, onCommit, clean, className, label, allowEmpty = false }: InlineTextProps) {
  const t = useText().canvas;
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <span
        title={t.editTitle(label)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setDraft(value);
        }}
        className={cn("cursor-text", className)}
      >
        {value || t.unnamed}
      </span>
    );
  }
  const done = (keep: boolean) => {
    if (keep && (draft.trim() || allowEmpty)) onCommit(draft.trim());
    setDraft(null);
  };
  return <InlineField draft={draft} setDraft={setDraft} done={done} clean={clean} className={className} label={label} />;
}
