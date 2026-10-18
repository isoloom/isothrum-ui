"use client";

import { cleanName } from "@/lib/tool/model";
import { ExportPanel } from "../export/export-panel";
import { FloatingWindow } from "../floating-window";
import type { EditorModel } from "../hooks/use-editor";
import { ProjectsList } from "../projects-list";
import { RunWindow, SelectionWindow, StatusWindow } from "./lab-windows";
import { CableWindow, LanWindow, MachineWindow } from "./selected-windows";

/** The user's projects (signed in): open one, or one of its earlier versions. */
function ProjectsWindow({ e }: { e: EditorModel }) {
  const { projects } = e;
  return (
    <FloatingWindow title={e.t.projects.windowTitle} side="left" width={340} onClose={() => { projects.setProjectsOpen(false); }}>
      <div className="p-4">
        <ProjectsList
          current={projects.proj.project}
          onOpen={(p, d) => {
            projects.openProject(p, d);
            projects.setProjectsOpen(false);
          }}
          onOpenVersion={(d) => { projects.openDraft(d); }}
          onDeleted={(id) => {
            if (projects.proj.project?.id === id) projects.proj.detach();
          }}
        />
      </div>
    </FloatingWindow>
  );
}

/** Export: the lab's name, its zip and isoloom.yml, and where it runs. */
function ExportWindow({ e }: { e: EditorModel }) {
  const { plan, downloads, lab } = e;
  return (
    <FloatingWindow title={e.t.export} side="right" width={420} onClose={() => { e.setExportOpen(false); }}>
      {downloads.downloadError && (
        <p role="alert" className="px-4 pt-4 text-sm text-destructive">
          {downloads.downloadError}
        </p>
      )}
      <ExportPanel
        labName={lab.labName}
        onLabNameChange={(n) => { lab.setLabName(cleanName(n)); }}
        mixed={e.mixed}
        spec={plan?.isoloom_yml ?? null}
        files={plan?.ok ? plan.files : []}
        issues={e.issues}
        onDownloadAll={downloads.downloadAll}
        onDownloadSpec={downloads.downloadSpec}
        onDownloadTarget={downloads.downloadTarget}
      />
    </FloatingWindow>
  );
}

/** The windows floating over the canvas: what is selected, projects, the lab's status, Run, Export. */
export function EditorWindows({ e }: { e: EditorModel }) {
  const { selection, empty } = e;
  return (
    <>
      {selection.machine && <MachineWindow key={`m-${selection.machine.id}`} e={e} node={selection.machine} />}
      {selection.lan && <LanWindow key={`l-${selection.lan.id}`} e={e} lan={selection.lan} />}
      {selection.edge?.data && <CableWindow key={`c-${selection.edge.id}`} e={e} edge={selection.edge} data={selection.edge.data} />}
      {e.projects.projectsOpen && <ProjectsWindow e={e} />}
      {selection.count > 1 && <SelectionWindow e={e} />}
      {e.statusOpen && !empty && <StatusWindow e={e} />}
      {e.invoke && e.desk.panel.runOpen && <RunWindow e={e} />}
      {e.exportOpen && !empty && <ExportWindow e={e} />}
    </>
  );
}
