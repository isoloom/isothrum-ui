"use client";

import { useContext, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Router } from "lucide-react";
import { APPLIANCES, ROUTER_H, ROUTER_PORTS, ROUTER_W, cleanName, routerPort, type MachineData, type MachineNode } from "@/lib/tool/model";
import type { RouterPorts } from "@/lib/tool/router-ports";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { LiveContext, PortsContext, SidesContext } from "./contexts";
import { InlineText } from "./inline-text";
import { BUSINESS_SOCKET, PORT_BOX, PortLed } from "./port-led";
import { Frame, gen, seedOf, useBusiness, useSketch } from "./sketch";
import { StatusDot } from "./status-dot";
import { usePortSides } from "./use-measured-ports";

const RPORT = 24;
const RPORT_GAP = 8;
const RPAD = 14;

/** The router's model under its name: a VM, a Cisco OS, or FRR. */
function modelOf(data: MachineData, vm: string): string {
  if (data.kind === "vm") return vm;
  return data.appliance ? `Cisco ${APPLIANCES.find((x) => x.id === data.appliance)?.label.split(" (")[0] ?? ""}` : "FRR";
}

type Interface = RouterPorts["interfaces"][number];

/** One port of the faceplate: its name, its square in its network's color, its handle. */
function RouterPort({ id, data, port, i, view }: { id: string; data: MachineData; port: string; i: number; view: RouterPorts }) {
  const t = useText().canvas;
  const tl = useText().canvas.live;
  const sides = useContext(SidesContext);
  const live = useContext(LiveContext);
  const business = useBusiness();
  const x = RPAD + i * (RPORT + RPORT_GAP);
  const color = view.colors[port];
  const nets = view.interfaces.filter((f) => f.name === port || f.name.startsWith(`${port}.`));
  // A port is down when one of its networks' ports is (unknown counts as up).
  const down = nets.some((f) => live?.ports[`${data.name}/${f.network}`] === false);
  const lines = nets.map((f: Interface) => `${f.name}: ${f.network}${f.ip ? ` · ${f.ip}` : ""}`).join("\n");
  return (
    <div>
      <span className={cn("absolute top-[26px] w-6 text-center font-mono text-[9px] text-muted-foreground", business && "text-slate-400")} style={{ left: x }}>
        {port}
      </span>
      <span
        title={(down ? `${tl.portDown}\n` : "") + (nets.length ? lines : t.portFree(port))}
        className={cn("absolute top-[38px]", PORT_BOX, business && BUSINESS_SOCKET, !business && down && "border-dashed border-destructive opacity-40")}
        style={{ left: x, width: RPORT, height: 20, background: business ? "#0b1017" : (color ?? "var(--muted)") }}
      >
        {business && <PortLed color={down ? "#ef4444" : (color ?? null)} />}
      </span>
      <Handle
        id={port}
        type="source"
        position={sides[`${id}:${port}`] === "top" ? Position.Top : Position.Bottom}
        style={{ left: x + RPORT / 2 }}
        className="!size-2.5 !border-2 !border-background !bg-foreground/50 transition-colors group-hover:!bg-signal"
      />
    </div>
  );
}

/** Its interfaces, beside the faceplate: port, address, network. */
function InterfaceList({ data, view }: { data: MachineData; view: RouterPorts }) {
  const live = useContext(LiveContext);
  return (
    <ul className="pointer-events-none absolute top-0 left-full ml-3 flex w-max flex-col gap-0.5 font-mono text-[10px]">
      {view.interfaces.map((f) => (
        <li key={f.name} className={cn("flex items-center gap-1.5 rounded-sm bg-background/90 px-1", live?.ports[`${data.name}/${f.network}`] === false && "text-destructive line-through")}>
          <span className="size-2 rounded-[2px]" style={{ background: f.color }} aria-hidden />
          <span className="text-muted-foreground">{f.name}</span>
          <span>{f.ip ?? "—"}</span>
          <span className="text-muted-foreground">{f.network}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A router you configure, drawn like a switch: its interfaces eth0–eth3, each in the color of the
 * network plugged into it, and beside it the list of interfaces with their addresses. A cable
 * plugs into one port; on a LAN's edge, eth0 is that LAN.
 */
export function RouterFaceplate({ id, data, selected }: NodeProps<MachineNode>) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  usePortSides(id);
  const view = useContext(PortsContext)[id] ?? { colors: {}, interfaces: [] };
  const sketch = useSketch();
  const box = useMemo(
    () => gen.rectangle(2, 2, ROUTER_W - 4, ROUTER_H - 4, { ...sketch, seed: seedOf(id), fill: "F", fillStyle: "solid", stroke: "S", strokeWidth: selected ? 2.25 : 1.4 }),
    [id, selected, sketch],
  );
  const live = useContext(LiveContext);
  const business = useBusiness();
  return (
    <div style={{ width: ROUTER_W, height: ROUTER_H }} className="group relative">
      <StatusDot name={data.name} className="-top-1 -right-1" />
      <Frame drawable={box} fill="var(--pastel-yellow)" selected={selected} dim={live?.machines[data.name]?.status === "down"} hardware={business} />
      <div className={cn("absolute top-1.5 left-3.5 flex items-center gap-1.5 font-heading text-sm font-semibold", business && "left-5 text-[13px] text-white")}>
        <Router className={cn("size-3.5", business && "text-amber-400")} aria-hidden />
        <InlineText label={t.routerName} value={data.name} clean={cleanName} onCommit={(name) => { updateNodeData(id, { name }); }} />
        <span className={cn("font-sans text-[10px] font-normal text-muted-foreground", business && "text-[9px] font-semibold tracking-wider text-slate-400 uppercase")}>{modelOf(data, t.vm)}</span>
      </div>
      {Array.from({ length: ROUTER_PORTS }, (_, i) => routerPort(i)).map((port, i) => (
        <RouterPort key={port} id={id} data={data} port={port} i={i} view={view} />
      ))}
      <InterfaceList data={data} view={view} />
    </div>
  );
}
