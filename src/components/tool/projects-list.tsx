"use client";

import { useEffect, useState } from "react";
import { FolderOpen, History, Trash2 } from "lucide-react";
import type { Draft } from "@/lib/tool/model";
import { deleteProject, getProject, getVersion, listProjects, listVersions, type ProjectSummary, type ProjectVersion } from "@/lib/tool/projects-api";
import type { ProjectRef } from "@/lib/tool/storage";
import { Button } from "@/components/ui/button";
import { useText } from "./text";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A project: its name (and whether it is the one open), when it was saved, opening and deleting it. */
function ProjectRow({ p, current, onOpen, onDelete }: { p: ProjectSummary; current: ProjectRef | null; onOpen: () => void; onDelete: () => void }) {
  const t = useText().projects;
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {p.name}
          {current?.id === p.id && <span className="ml-1.5 text-xs font-normal text-signal">{t.open}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{when(p.updatedAt)}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onOpen}>
        <FolderOpen data-icon="inline-start" /> {t.openButton}
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label={t.delete(p.name)} title={t.delete(p.name)} onClick={onDelete}>
        <Trash2 />
      </Button>
    </li>
  );
}

/** The open project's earlier versions: listing them, and opening one. */
function VersionHistory({ current, versions, setVersions, onOpenVersion }: { current: ProjectRef; versions: ProjectVersion[] | null; setVersions: (v: ProjectVersion[]) => void; onOpenVersion: (draft: Draft) => void }) {
  const t = useText().projects;
  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" variant="ghost" className="self-start" onClick={() => void listVersions(current.id).then(setVersions)}>
        <History data-icon="inline-start" /> {t.history(current.name)}
      </Button>
      {versions &&
        (versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.noVersions}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{when(v.savedAt)}</span>
                <Button size="xs" variant="outline" onClick={() => void getVersion(current.id, v.id).then((r) => { onOpenVersion(r.draft); })}>
                  {t.restore}
                </Button>
              </li>
            ))}
          </ul>
        ))}
      <p className="text-xs text-muted-foreground">{t.historyHint}</p>
    </div>
  );
}

/** The user's projects, to open or delete one; and the open project's earlier versions. */
export function ProjectsList({ current, onOpen, onOpenVersion, onDeleted }: { current: ProjectRef | null; onOpen: (p: ProjectRef, draft: Draft) => void; onOpenVersion: (draft: Draft) => void; onDeleted: (id: string) => void }) {
  const t = useText().projects;
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listProjects().then(setList, (e: unknown) => {
      setError((e as Error).message);
    });
  }, []);
  async function remove(p: ProjectSummary) {
    if (!window.confirm(t.confirmDelete(p.name))) return;
    await deleteProject(p.id);
    setList((l) => l?.filter((x) => x.id !== p.id) ?? null);
    onDeleted(p.id);
  }
  if (error) return <p className="text-sm text-destructive">{t.failed(error)}</p>;
  if (!list) return <p className="text-sm text-muted-foreground">{t.loading}</p>;
  return (
    <div className="flex flex-col gap-4 text-sm">
      {list.length === 0 ? (
        <p className="text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {list.map((p) => (
            <ProjectRow key={p.id} p={p} current={current} onOpen={() => void getProject(p.id).then((full) => { onOpen({ id: full.id, name: full.name }, full.draft); })} onDelete={() => void remove(p)} />
          ))}
        </ul>
      )}
      {current && <VersionHistory current={current} versions={versions} setVersions={setVersions} onOpenVersion={onOpenVersion} />}
    </div>
  );
}
