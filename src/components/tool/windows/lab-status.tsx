"use client";

import { machineStatus, type EnvironmentLive, type MachineLive, type Status, type SuspendedLink } from "@/lib/tool/desktop";
import { cn } from "@/lib/utils";
import { useText } from "../text";

const DOT: Record<Status, string> = { up: "bg-success", starting: "bg-warning", unhealthy: "bg-destructive", down: "bg-muted-foreground/50" };

type Port = EnvironmentLive["ports"][number];

/** A port of a running machine: its network (and interface), green when up, struck through when down. */
function PortChip({ p, cut }: { p: Port; cut: boolean }) {
  const t = useText().canvas.live;
  const title = p.up === null ? t.portUnknown : p.up ? t.portUp : cut ? t.cable.cut : t.portDown;
  return (
    <span
      title={title}
      className={cn("rounded-sm border px-1 font-mono text-[10px]", p.up === true && "border-success/40 text-success", p.up === false && "border-destructive/40 text-destructive line-through", p.up === null && "text-muted-foreground")}
    >
      {p.network}
      {p.interface ? ` ${p.interface}` : ""}
    </span>
  );
}

/** One machine now: its state (and health), then its ports. */
function MachineLine({ name, l, live, cut }: { name: string; l: MachineLive; live: EnvironmentLive; cut: SuspendedLink[] }) {
  const t = useText();
  const status = machineStatus(l);
  return (
    <li className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2 shrink-0 rounded-full", DOT[status])} aria-hidden />
        <span className="font-mono font-medium">{name}</span>
        <span className="text-muted-foreground">
          {t.canvas.live[status]}
          {l.health && status !== "unhealthy" ? ` · ${l.health}` : ""}
        </span>
      </span>
      <span className="flex flex-wrap gap-1 pl-3.5">
        {live.ports
          .filter((p) => p.machine === name)
          .map((p) => (
            <PortChip key={p.network} p={p} cut={cut.some((c) => c.machine === name && c.network === p.network)} />
          ))}
      </span>
    </li>
  );
}

/** Desktop only: the running lab now, machine by machine, with each one's ports. */
export function LabStatus({ live, cut }: { live: EnvironmentLive; cut: SuspendedLink[] }) {
  const t = useText();
  const machines = Object.entries(live.machines);
  const up = machines.filter(([, l]) => machineStatus(l) === "up").length;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">
        {t.run.statusTitle(up, machines.length)} · {live.probed ? t.run.probed : t.run.inferred}
      </h3>
      <ul className="flex max-h-64 flex-col gap-1 overflow-auto rounded-md border bg-surface p-2 text-xs">
        {machines.map(([name, l]) => (
          <MachineLine key={name} name={name} l={l} live={live} cut={cut} />
        ))}
      </ul>
    </section>
  );
}
