"use client";

import { useContext } from "react";
import { useReactFlow } from "@xyflow/react";
import { Disc3, Package, Pin } from "lucide-react";
import type { MachineData } from "@/lib/tool/model";
import { pinned } from "@/lib/tool/pins";
import { cn } from "@/lib/utils";
import { useText } from "../text";
import { AddressesContext, LiveContext } from "./contexts";
import { InlineText } from "./inline-text";

/** A machine's LAN addresses ([network, IPv4]; cables' /29 left out), whether each port is down, and fixing one by hand. */
function useAddresses(id: string, data: MachineData) {
  const { updateNodeData } = useReactFlow();
  const ips = (useContext(AddressesContext)[data.name] ?? []).filter(([net]) => !net.startsWith("link-"));
  const ports = useContext(LiveContext)?.ports;
  // Double-click an address to fix it by hand (same block, a new last number); clear it to go
  // back to the next free one.
  const pin = (net: string, ip: string, typed: string) => {
    const pins = pinned(data.pins, net, ip, typed);
    if (pins) updateNodeData(id, { pins });
  };
  const down = (net: string) => ports?.[`${data.name}/${net}`] === false;
  return { ips, pin, down };
}

/** An address's tooltip: the network, whether it is fixed, and whether its port is down. */
function useAddressTitle(data: MachineData) {
  const t = useText().canvas;
  return (net: string, down: boolean) => {
    const title = t.addressTitle(net, !!data.pins?.[net]);
    return down ? `${t.live.portDown} · ${title}` : title;
  };
}

const onlyAddressChars = (v: string) => v.replace(/[^0-9.]/g, "");

/** An address, edited in place. */
function Address({ id, data, net, ip, className }: { id: string; data: MachineData; net: string; ip: string; className?: string }) {
  const t = useText().canvas;
  const { pin } = useAddresses(id, data);
  return <InlineText allowEmpty label={t.addressOn(net)} value={ip} clean={onlyAddressChars} onCommit={(v) => { pin(net, ip, v); }} className={className} />;
}

/** What a machine runs, in a short form: its OS, or its image's last part. */
function runsOf(data: MachineData): string | undefined {
  if (data.kind === "vm") return data.os;
  return data.kind === "container" ? data.image.split("/").pop() : "";
}

/**
 * Business: what an asset card says about a machine, in labelled rows: its addresses (two at
 * most, then how many more), and what it runs (its image or OS).
 */
export function MachineFacts({ id, data }: { id: string; data: MachineData }) {
  const t = useText().canvas;
  const { ips, down } = useAddresses(id, data);
  const title = useAddressTitle(data);
  const runs = runsOf(data);
  const shown = ips.slice(0, 2);
  // The automatic router has no address of its own: nothing to list.
  if (!shown.length && !runs) return null;
  return (
    <dl className="mt-2 grid w-full grid-cols-[12px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-[3px] border-t pt-1.5 text-[10px] leading-tight">
      {shown.map(([net, ip], i) => (
        <div key={net} className="contents">
          <dt className="text-[8.5px] font-semibold text-muted-foreground/80">{i === 0 ? "IP" : ""}</dt>
          <dd title={title(net, down(net))} className={cn("nodrag flex min-w-0 items-center gap-0.5 font-mono", down(net) && "text-destructive line-through")}>
            <Address id={id} data={data} net={net} ip={ip} className="truncate" />
            {data.pins?.[net] !== undefined && <Pin className="size-2.5 shrink-0 text-signal" aria-label={t.fixed} />}
            {i === 1 && ips.length > 2 && (
              <span className="shrink-0 font-sans text-muted-foreground" title={ips.slice(2).map(([n, a]) => `${n}: ${a}`).join("\n")}>
                +{ips.length - 2}
              </span>
            )}
          </dd>
        </div>
      ))}
      {runs && (
        <>
          <dt className="text-muted-foreground/80" title={data.kind === "vm" ? "OS" : t.imageShort}>
            {data.kind === "vm" ? <Disc3 className="size-3" aria-label="OS" /> : <Package className="size-3" aria-label={t.imageShort} />}
          </dt>
          <dd className="truncate font-mono text-muted-foreground" title={data.kind === "vm" ? data.os : data.image}>
            {runs}
          </dd>
        </>
      )}
    </dl>
  );
}

/** The machine's IPs, under its box, as on a network diagram. */
export function MachineAddresses({ id, data }: { id: string; data: MachineData }) {
  const t = useText().canvas;
  const { ips, down } = useAddresses(id, data);
  const title = useAddressTitle(data);
  if (!ips.length) return null;
  return (
    <div className="pointer-events-none absolute top-full left-1/2 mt-1.5 flex -translate-x-1/2 flex-col items-center gap-0.5">
      {ips.map(([net, ip]) => (
        <span
          key={net}
          title={title(net, down(net))}
          className={cn(
            "nodrag pointer-events-auto flex items-center gap-0.5 rounded-sm bg-background/90 px-1 font-mono text-[10px] leading-tight whitespace-nowrap text-foreground",
            down(net) && "text-destructive line-through",
          )}
        >
          {data.pins?.[net] !== undefined && <Pin className="size-2.5 text-signal" aria-label={t.fixed} />}
          <Address id={id} data={data} net={net} ip={ip} />
        </span>
      ))}
    </div>
  );
}
