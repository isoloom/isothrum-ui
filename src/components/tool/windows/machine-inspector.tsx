"use client";

import { BookmarkPlus, Trash2 } from "lucide-react";
import { cleanName, type MachineData, type MachineNode } from "@/lib/tool/model";
import { runAs } from "@/lib/tool/presets";
import { Button } from "@/components/ui/button";
import { useText } from "../text";
import { field } from "./fields";
import { ContainerFields, ServiceFields, VmFields } from "./runs-fields";

type Change = (patch: Partial<MachineData>) => void;

/** Its name, and what it runs as: an automatic router (a router's only), a container or a VM. */
function NameAndKind({ m, onChange }: { m: MachineData; onChange: Change }) {
  const t = useText().inspector;
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.name}</span>
        <input className={field} value={m.name} onChange={(e) => { onChange({ name: cleanName(e.target.value) }); }} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t.runsAs}</span>
        <select
          className={field}
          value={m.kind}
          onChange={(e) => {
            const patch = runAs(m, e.target.value);
            if (patch) onChange(patch);
          }}
        >
          {m.icon === "router" && <option value="router">{t.automaticRouter}</option>}
          <option value="container">{t.container}</option>
          <option value="vm">{t.vm}</option>
        </select>
      </label>
    </>
  );
}

/** The machine's cables, as `its port → the other end's name and port`. */
function CableList({ cables }: { cables: string[] }) {
  const t = useText().inspector;
  return (
    <div>
      <span className="text-muted-foreground">{t.cables}</span>
      {cables.length ? (
        <ul className="mt-1 space-y-0.5 font-mono text-xs">
          {cables.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{t.noCables}</p>
      )}
    </div>
  );
}

/** A machine's window: its name and kind, what it runs, its services, its cables. */
export function MachineInspector({ node, cables, onChange, onDelete, onSaveDevice }: { node: MachineNode; cables: string[]; onChange: Change; onDelete: () => void; onSaveDevice: () => void }) {
  const t = useText().inspector;
  const m = node.data;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <NameAndKind m={m} onChange={onChange} />
      {m.kind === "router" && <p className="text-xs text-muted-foreground">{t.routerNote}</p>}
      {m.kind === "container" && <ContainerFields m={m} onChange={onChange} />}
      {m.kind !== "router" && m.kind !== "container" && <VmFields m={m} onChange={onChange} />}
      {/* An automatic router is not a machine, nor is an appliance one to land on: no services. */}
      {m.kind !== "router" && !m.appliance && <ServiceFields m={m} onChange={onChange} />}
      <CableList cables={cables} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onSaveDevice} title={t.saveTitle}>
          <BookmarkPlus data-icon="inline-start" /> {t.save}
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 data-icon="inline-start" /> {t.remove}
        </Button>
      </div>
    </div>
  );
}
