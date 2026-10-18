"use client";

import { useContext, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import { SWITCH_H, SWITCH_PORTS, SWITCH_W, TRUNK, cleanName, type SwitchNode } from "@/lib/tool/model";
import { addVlan, changeVlan, cyclePort, removeVlan, vlanNumber } from "@/lib/tool/switch-edit";
import { trunkStripes, vlanColor, vlanName } from "@/lib/tool/vlans";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { SidesContext } from "./contexts";
import { InlineText } from "./inline-text";
import { BUSINESS_SOCKET, PORT_BOX, PortLed } from "./port-led";
import { Frame, gen, seedOf, useBusiness, useSketch } from "./sketch";
import { usePortSides } from "./use-measured-ports";

const PORT = 24;
const PORT_GAP = 6;
const SW_PAD = 14;

/** Where a port's square starts, from the switch's left. The trunk sits apart, after a gap. */
function portX(i: number | typeof TRUNK): number {
  return i === TRUNK ? SW_PAD + SWITCH_PORTS * (PORT + PORT_GAP) + 14 : SW_PAD + i * (PORT + PORT_GAP);
}

type SwitchData = SwitchNode["data"];

/** A port's tooltip: what it carries, and that a click changes it (not on the T port). */
function usePortTitle(data: SwitchData) {
  const t = useText().canvas;
  return (i: number | typeof TRUNK) => {
    const mode = i === TRUNK ? TRUNK : data.ports[i];
    const name = i === TRUNK ? "T" : t.port(i + 1);
    if (mode === TRUNK) return `${name}: ${t.trunkCarries(data.vlans.map((v) => vlanName(v.id)).join(", ") || t.noVlan)}${i === TRUNK ? "" : ` ${t.clickToChange}`}`;
    return `${name}: ${mode === null ? t.noVlan : vlanName(mode)} ${t.clickToChange}`;
  };
}

/** One port: its number, its square in its VLAN's color (striped for a trunk), its handle. */
function SwitchPort({ id, data, i, onCycle }: { id: string; data: SwitchData; i: number | typeof TRUNK; onCycle: (i: number) => void }) {
  const t = useText().canvas;
  const sides = useContext(SidesContext);
  const business = useBusiness();
  const title = usePortTitle(data);
  const trunk = i === TRUNK;
  const mode = trunk ? TRUNK : data.ports[i];
  const vlan = typeof mode === "number" ? mode : null;
  const color = mode === TRUNK ? trunkStripes(data.vlans) : vlan === null ? null : vlanColor(vlan);
  const handle = trunk ? TRUNK : `p${String(i + 1)}`;
  const x = portX(i);
  return (
    <div>
      <span className={cn("absolute top-[26px] w-6 text-center font-mono text-[9px] text-muted-foreground", business && "text-slate-400")} style={{ left: x }}>
        {trunk ? "T" : i + 1}
      </span>
      <button
        type="button"
        onClick={() => {
          if (!trunk) onCycle(i);
        }}
        title={title(i)}
        aria-label={trunk ? t.trunkPort : t.port(i + 1)}
        className={cn("nodrag absolute top-[38px]", PORT_BOX, trunk ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-signal", business && BUSINESS_SOCKET)}
        style={{ left: x, width: PORT, height: 20, background: business ? "#0b1017" : (color ?? "var(--muted)") }}
      >
        {business && <PortLed color={color} />}
      </button>
      <Handle
        id={handle}
        type="source"
        position={sides[`${id}:${handle}`] === "top" ? Position.Top : Position.Bottom}
        style={{ left: x + PORT / 2 }}
        className="!size-2.5 !border-2 !border-background !bg-foreground/50 transition-colors group-hover:!bg-signal"
      />
    </div>
  );
}

/** The VLANs, beside the faceplate (cables leave from above and below it): double-click to edit, + to add, × to remove. */
function VlanList({ id, data }: { id: string; data: SwitchData }) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  return (
    <div className="nodrag absolute top-0 left-full ml-3 flex w-max flex-col items-start gap-1 text-[11px]">
      {data.vlans.map((v) => (
        <span key={v.id} className="flex items-center gap-1 rounded-md bg-background/90 pr-1">
          <span className="size-2.5 rounded-[2px]" style={{ background: vlanColor(v.id) }} aria-hidden />
          <span className="font-heading font-semibold">
            vlan
            <InlineText
              label={t.vlanNumber}
              value={String(v.id)}
              clean={(x) => x.replace(/\D/g, "").slice(0, 4)}
              onCommit={(x) => {
                const n = vlanNumber(data, x);
                if (n !== null) updateNodeData(id, changeVlan(data, v.id, { id: n }));
              }}
            />
          </span>
          <InlineText label={t.vlanBlock} value={v.cidr} clean={(x) => x.replace(/[^0-9./]/g, "")} onCommit={(cidr) => { updateNodeData(id, changeVlan(data, v.id, { cidr })); }} className="font-mono text-muted-foreground" />
          <button type="button" onClick={() => { updateNodeData(id, removeVlan(data, v.id)); }} aria-label={t.remove(vlanName(v.id))} className="text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => { updateNodeData(id, addVlan(data)); }} className="flex items-center gap-0.5 rounded-md px-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Plus className="size-3" /> VLAN
      </button>
    </div>
  );
}

/**
 * A switch, drawn as its faceplate: numbered access ports in their VLAN's color (click one to
 * change its VLAN), and a trunk striped with every VLAN it carries. A cable plugs into a port.
 * Its VLANs are listed under it: double-click to edit, + to add, × to remove.
 */
export function SwitchNodeView({ id, data, selected }: NodeProps<SwitchNode>) {
  const t = useText().canvas;
  const { updateNodeData } = useReactFlow();
  // Each port faces the device plugged into it: up when that device is above the switch.
  usePortSides(id);
  const sketch = useSketch();
  const box = useMemo(
    () => gen.rectangle(2, 2, SWITCH_W - 4, SWITCH_H - 4, { ...sketch, seed: seedOf(id), fill: "F", fillStyle: "solid", stroke: "S", strokeWidth: selected ? 2.25 : 1.4 }),
    [id, selected, sketch],
  );
  const business = useBusiness();
  const ports: (number | typeof TRUNK)[] = [...data.ports.map((_, i) => i), TRUNK];
  return (
    <div style={{ width: SWITCH_W, height: SWITCH_H }} className="group relative">
      <Frame drawable={box} fill="var(--card)" selected={selected} hardware={business} />
      <div className={cn("absolute top-1.5 left-3.5 flex items-baseline gap-2 font-heading text-sm font-semibold", business && "left-5 text-[13px] text-white")}>
        <InlineText label={t.switchName} value={data.name} clean={cleanName} onCommit={(name) => { updateNodeData(id, { name }); }} />
        {business && <span className="font-sans text-[9px] font-semibold tracking-wider text-slate-400 uppercase">{t.switchModel(data.ports.length)}</span>}
      </div>
      {ports.map((i) => (
        <SwitchPort key={String(i)} id={id} data={data} i={i} onCycle={(port) => { updateNodeData(id, cyclePort(data, port)); }} />
      ))}
      <VlanList id={id} data={data} />
    </div>
  );
}
