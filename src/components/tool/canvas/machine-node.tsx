"use client";

import { useContext, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { MACHINE_H, MACHINE_W, cleanName, type MachineData, type MachineNode, type Side } from "@/lib/tool/model";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { LiveContext, SidesContext } from "./contexts";
import { DeviceIcon, accentFor, pastelFor, roleOf } from "./device-icon";
import { InlineText } from "./inline-text";
import { MachineAddresses, MachineFacts } from "./machine-addresses";
import { RouterFaceplate } from "./router-node";
import { Frame, gen, seedOf, useBusiness, useSketch } from "./sketch";
import { StatusDot } from "./status-dot";
import { useRemeasure } from "./use-measured-ports";

/** A machine on the canvas: a hand-drawn box in its pastel, its logo and name, a socket per side. */
export function MachineNodeView(props: NodeProps<MachineNode>) {
  // A router you configure is drawn as its faceplate; the automatic one stays a box.
  if (props.data.icon === "router" && props.data.kind !== "router") return <RouterFaceplate {...props} />;
  return <MachineBox {...props} />;
}

const HANDLE = "!size-3 !border-2 !border-background !bg-foreground/50 transition-colors group-hover:!bg-signal";

/**
 * Where cables plug in. An appliance: its outside port (every cable when it stands alone; on a
 * LAN's edge, the cables to the other network), facing out of the LAN, and on a LAN's edge its
 * inside port. Another machine: its top and bottom.
 */
function MachineHandles({ appliance, side }: { appliance: boolean; side: Side | undefined }) {
  if (!appliance) {
    return (["top", "bottom"] as const).map((h) => (
      <Handle key={h} id={h} type="source" position={h === "top" ? Position.Top : Position.Bottom} className="!size-2.5 !border-2 !border-background !bg-foreground/40 transition-colors group-hover:!bg-signal" />
    ));
  }
  return (
    <>
      <Handle id="port" type="source" position={side === "bottom" ? Position.Bottom : Position.Top} className={HANDLE} />
      {side && <Handle id="lan" type="source" position={side === "bottom" ? Position.Top : Position.Bottom} className={HANDLE} />}
    </>
  );
}

/** What the machine runs as, and whether it is the access machine (two pieces of text, as drawn). */
function KindLine({ data }: { data: MachineData }) {
  const t = useText().canvas;
  return (
    <>
      {data.kind === "vm" ? t.vm : data.kind === "router" ? t.automatic : t.container}
      {data.access ? ` · ${t.access}` : ""}
    </>
  );
}

/** Business: an asset card, its icon tinted, its name and role, then its facts. */
function BusinessBody({ id, data, down }: { id: string; data: MachineData; down: boolean }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  return (
    <div className={cn("relative flex w-full flex-col items-start self-stretch px-2.5 pt-2.5", down && "opacity-50")}>
      <div className="flex w-full min-w-0 items-center gap-2">
        <DeviceIcon data={data} size="sm" accent={accentFor(data)} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] leading-tight font-semibold tracking-tight">
            <InlineText label={t.machineName} value={data.name} clean={cleanName} onCommit={(name) => { updateNodeData(id, { name }); }} />
          </div>
          <div className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">{t.roles[roleOf(data)]}</div>
        </div>
      </div>
      <div className="mt-1.5 text-[8.5px] leading-none font-semibold tracking-wider text-muted-foreground/80 uppercase"><KindLine data={data} /></div>
      <MachineFacts id={id} data={data} />
    </div>
  );
}

/** Sketch: the logo, the name, what it runs as. */
function SketchBody({ id, data, down }: { id: string; data: MachineData; down: boolean }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  return (
    <div className={cn("relative flex flex-col items-center gap-1", down && "opacity-50")}>
      <DeviceIcon data={data} />
      <div className="max-w-[104px] truncate font-heading text-sm leading-tight font-semibold">
        <InlineText label={t.machineName} value={data.name} clean={cleanName} onCommit={(name) => { updateNodeData(id, { name }); }} />
      </div>
      <div className="text-[10px] leading-none text-muted-foreground in-data-[design=business]:text-[9px] in-data-[design=business]:font-medium in-data-[design=business]:tracking-wider in-data-[design=business]:uppercase">
        <KindLine data={data} />
      </div>
    </div>
  );
}

function MachineBox({ id, data, selected }: NodeProps<MachineNode>) {
  const side = useContext(SidesContext)[id];
  // React Flow caches where handles are: re-measure when the port flips.
  useRemeasure(id, side);
  const sketch = useSketch();
  const box = useMemo(
    () => gen.rectangle(3, 3, MACHINE_W - 6, MACHINE_H - 6, { ...sketch, seed: seedOf(id), fill: "F", fillStyle: "solid", stroke: "S", strokeWidth: selected ? 2.25 : 1.4 }),
    [id, selected, sketch],
  );
  const down = useContext(LiveContext)?.machines[data.name]?.status === "down";
  const business = useBusiness();
  return (
    <div style={{ width: MACHINE_W, height: MACHINE_H }} className={cn("group relative flex flex-col items-center gap-1", business ? "justify-start" : "justify-center px-2")}>
      <Frame drawable={box} fill={pastelFor(data)} selected={selected} dim={down} />
      <StatusDot name={data.name} className="-top-1 -right-1" />
      <MachineHandles appliance={data.icon === "router" || data.icon === "shield"} side={side} />
      {business ? <BusinessBody id={id} data={data} down={down} /> : <SketchBody id={id} data={data} down={down} />}
      {!business && <MachineAddresses id={id} data={data} />}
    </div>
  );
}
