"use client";

import { CircleAlert, CircleCheck, Download, Play, Square } from "lucide-react";
import { vlanExample } from "@/lib/tool/examples";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EditorMenu } from "./editor-menu";
import { copyShareLink } from "./hooks/use-shared-link";
import type { EditorModel } from "./hooks/use-editor";

/** Top left: the menu, and where the lab is saved. */
export function TopLeft({ e, onImportGns3 }: { e: EditorModel; onImportGns3: () => void }) {
  const { projects, actions, lab, design, t } = e;
  const { proj } = projects;
  const share = () => copyShareLink({ name: lab.labName, nodes: lab.nodes, edges: lab.edges, design: design.design }, e.lang, e.setToast, t);
  const projectActions = projects.signedIn ? { onSave: () => void proj.save(), onSaveAs: () => void projects.saveAs(), onOpen: () => { projects.setProjectsOpen(true); } } : null;
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
      <EditorMenu
        lang={e.lang}
        onExample={() => { actions.loadExample(); }}
        onVlanExample={() => { actions.loadExample(vlanExample); }}
        onShare={() => void share()}
        onImportGns3={onImportGns3}
        onClear={actions.clearLab}
        onFit={() => void e.flow.fitView({ padding: 0.4, duration: 300 })}
        canClear={!e.empty}
        design={design.design}
        onDesign={design.chooseDesign}
        accounts={e.accounts}
        projects={projectActions}
      />
      {projects.signedIn && proj.project && (
        <span role="status" className={cn("pointer-events-none max-w-56 truncate rounded-md px-1.5 text-xs text-muted-foreground max-sm:hidden", proj.state === "error" && "text-destructive")}>
          {t.projects.status[proj.state](proj.project.name)}
        </span>
      )}
    </div>
  );
}

/** The lab's status: valid, or how many things to fix (the engine still loading). */
function StatusButton({ e }: { e: EditorModel }) {
  const { issues, t } = e;
  const label = !e.engine ? t.status.loading : issues.length ? t.status.toFix(issues.length) : t.status.valid;
  return (
    <button type="button" onClick={() => { e.setStatusOpen((o) => !o); }} className={cn("flex h-9 items-center gap-1.5 rounded-lg border bg-popover px-3 text-xs font-medium shadow-sm", issues.length ? "text-warning" : "text-success")}>
      {issues.length ? <CircleAlert className="size-4" /> : <CircleCheck className="size-4" />}
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}

/** Desktop app: run the lab on this machine, or stop it. */
function RunButton({ e }: { e: EditorModel }) {
  const { t, hasVms } = e;
  const { run, info } = e.desk.state;
  if (run === "running" || run === "stopping") {
    return (
      <Button variant="outline" onClick={() => void e.run.stopLab()} disabled={run === "stopping"} className="h-9 bg-popover shadow-sm">
        <Square data-icon="inline-start" /> {run === "stopping" ? t.run.stopping : t.run.stop}
      </Button>
    );
  }
  const vagrant = !!info?.vagrant;
  return (
    <Button
      variant="outline"
      onClick={() => void e.run.runLab()}
      disabled={run === "starting" || !e.plan?.ok || e.issues.length > 0 || e.empty || (hasVms && !vagrant)}
      title={hasVms ? (vagrant ? t.run.runVmsTitle : t.run.vmsTitle) : t.run.runTitle}
      className="h-9 bg-popover shadow-sm"
    >
      <Play data-icon="inline-start" /> {run === "starting" ? t.run.starting : t.run.run}
    </Button>
  );
}

/** Top right: the lab's status, Run (desktop app), and Export. */
export function TopRight({ e }: { e: EditorModel }) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
      {!e.empty && <StatusButton e={e} />}
      {e.invoke && <RunButton e={e} />}
      <Button onClick={() => { e.setExportOpen((o) => !o); }} disabled={!e.engine || e.empty} className="h-9 shadow-sm">
        <Download data-icon="inline-start" /> {e.t.export}
      </Button>
    </div>
  );
}
