"use client";

import { ChevronRight, Download } from "lucide-react";
import type { Target } from "@/lib/tool/export-targets";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { Command } from "./copy-button";

/** Which target and which file are open: kept by the Export window, so they stay open while it is. */
export interface Opened {
  target: string | null;
  setTarget: (dir: string | null) => void;
  file: string | null;
  setFile: (path: string | null) => void;
}

/** A target's commands and files; a click on a file shows it. */
function TargetDetails({ target, opened }: { target: Target; opened: Opened }) {
  const t = useText().exportPanel;
  const { file: openFile, setFile: setOpenFile } = opened;
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {target.isoloom && <Command label={t.withIsoloom} text={target.isoloom} />}
      {target.run && <Command label={target.isoloom ? t.withTool : t.run} text={target.run} />}
      <ul className="font-mono text-xs">
        {target.files.map((f) => (
          <li key={f.path}>
            <button
              type="button"
              onClick={() => { setOpenFile(openFile === f.path ? null : f.path); }}
              className={cn("w-full truncate rounded px-2 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground", openFile === f.path && "bg-muted text-foreground")}
            >
              {f.path}
            </button>
            {openFile === f.path && (
              <pre className="mt-1 max-h-80 overflow-auto rounded-md border bg-surface p-3">
                <code>{f.contents}</code>
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One target: its name and file count (a click opens it), and its own zip. */
function TargetRow({ target, opened, onDownload, ready }: { target: Target; opened: Opened; onDownload: () => void; ready: boolean }) {
  const t = useText().exportPanel;
  const expanded = opened.target === target.dir;
  const onToggle = () => {
    opened.setTarget(expanded ? null : target.dir);
  };
  return (
    <li>
      <div className="flex items-center hover:bg-muted/50">
        <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-4 text-left text-sm">
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
          <span className="flex-1 font-medium">{target.name}</span>
          <span className="text-xs text-muted-foreground">{t.files(target.files.length)}</span>
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!ready}
          title={t.downloadOnly(target.name)}
          aria-label={t.downloadTarget(target.name)}
          className="mr-2 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Download className="size-4" />
        </button>
      </div>
      {expanded && <TargetDetails target={target} opened={opened} />}
    </li>
  );
}

/** Every target the zip holds, one open at a time. */
export function TargetList({ targets, ready, opened, onDownloadTarget }: { targets: Target[]; ready: boolean; opened: Opened; onDownloadTarget: (dir: string) => void }) {
  return (
    <ul className="divide-y rounded-lg border">
      {targets.map((g) => (
        <TargetRow key={g.dir} target={g} opened={opened} onDownload={() => { onDownloadTarget(g.dir); }} ready={ready} />
      ))}
    </ul>
  );
}
