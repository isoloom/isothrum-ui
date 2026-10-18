"use client";

import { useState } from "react";
import { CircleAlert, Download, FileCode } from "lucide-react";
import type { GeneratedFile } from "@/lib/tool/engine";
import { groupByTarget } from "@/lib/tool/export-targets";
import { Button } from "@/components/ui/button";
import { useText } from "../text";
import { CopyButton } from "./copy-button";
import { TargetList, type Opened } from "./target-list";

/** One line to install the Isoloom command line (macOS, Linux; Windows binaries are on its releases page). */
const INSTALL = "curl -fsSL https://raw.githubusercontent.com/isoloom/isoloom/main/install.sh | sh";

interface ExportPanelProps {
  labName: string;
  onLabNameChange: (name: string) => void;
  /** Containers and VMs together: only Vagrant can run it. */
  mixed: boolean;
  spec: string | null;
  files: GeneratedFile[];
  issues: string[];
  onDownloadAll: () => void;
  onDownloadSpec: () => void;
  /** One target's zip: isoloom.yml and that target's folder. */
  onDownloadTarget: (dir: string) => void;
}

/** What to fix before the lab can be downloaded. */
function FixFirst({ issues }: { issues: string[] }) {
  const t = useText().exportPanel;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <CircleAlert className="size-4 text-warning" aria-hidden /> {t.fixFirst}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
        {issues.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/** Where it runs: one folder per target in the zip, how to install Isoloom, each target's commands. */
function WhereItRuns({ p, opened }: { p: ExportPanelProps; opened: Opened }) {
  const t = useText().exportPanel;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">{t.where}</h3>
        <p className="text-sm text-muted-foreground">{t.whereIntro}</p>
        {p.mixed && <p className="mt-2 rounded-md bg-pastel-yellow p-2.5 text-sm">{t.mixed}</p>}
      </div>
      <div className="flex flex-col gap-1.5 rounded-md bg-pastel-violet p-3 text-xs">
        <span>{t.install}</span>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono">{INSTALL}</code>
          <CopyButton text={INSTALL} />
        </div>
      </div>
      <TargetList targets={groupByTarget(p.files, t)} ready opened={opened} onDownloadTarget={p.onDownloadTarget} />
    </section>
  );
}

/** isoloom.yml: the lab as one readable file, to keep in Git or edit by hand. */
function SpecSection({ spec, show, onToggle }: { spec: string; show: boolean; onToggle: () => void }) {
  const t = useText().exportPanel;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">isoloom.yml</h3>
          <p className="text-sm text-muted-foreground">{t.specIntro}</p>
        </div>
      </div>
      <div className="rounded-lg border bg-surface">
        <div className="flex items-center justify-between border-b px-3 py-1">
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onToggle}>
            {show ? t.hideSpec : t.showSpec}
          </button>
          <CopyButton text={spec} />
        </div>
        {show && (
          <pre className="max-h-96 overflow-auto p-3 font-mono text-xs">
            <code>{spec}</code>
          </pre>
        )}
      </div>
    </section>
  );
}

/** What the Export window shows: the lab's name, the downloads, where it runs and how. */
export function ExportPanel(p: ExportPanelProps) {
  const t = useText().exportPanel;
  const [openTarget, setOpenTarget] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [showSpec, setShowSpec] = useState(false);
  const ready = p.spec !== null && p.issues.length === 0;
  const opened: Opened = { target: openTarget, setTarget: setOpenTarget, file: openFile, setFile: setOpenFile };
  return (
    <div className="flex flex-col gap-6 p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t.labName}</span>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={p.labName}
          onChange={(e) => { p.onLabNameChange(e.target.value); }}
        />
      </label>
      {!ready && <FixFirst issues={p.issues} />}
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={p.onDownloadAll} disabled={!ready}>
          <Download data-icon="inline-start" /> {t.download(p.labName || "lab")}
        </Button>
        <Button size="lg" variant="outline" onClick={p.onDownloadSpec} disabled={p.spec === null}>
          <FileCode data-icon="inline-start" /> {t.onlySpec}
        </Button>
      </div>
      {ready && <WhereItRuns p={p} opened={opened} />}
      {p.spec && <SpecSection spec={p.spec} show={showSpec} onToggle={() => { setShowSpec((s) => !s); }} />}
    </div>
  );
}
