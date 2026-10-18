import { TRUNK, type PortMode, type SwitchNode } from "./model";

/** Editing a switch on the canvas: each change returns the switch's fields that change. */

type SwitchData = SwitchNode["data"];

/** A click steps a port through each VLAN, then trunk, then unassigned. */
export function cyclePort(data: SwitchData, i: number): Pick<SwitchData, "ports"> {
  const order: PortMode[] = [...data.vlans.map((v) => v.id), TRUNK, null];
  const next = order[(order.indexOf(data.ports[i]) + 1) % order.length];
  return { ports: data.ports.map((p, j) => (j === i ? next : p)) };
}

/** A VLAN's number or block changed; a new number moves its ports along. */
export function changeVlan(data: SwitchData, old: number, patch: { id?: number; cidr?: string }): Pick<SwitchData, "vlans" | "ports"> {
  const renumbered = patch.id;
  return {
    vlans: data.vlans.map((v) => (v.id === old ? { ...v, ...patch } : v)),
    ports: renumbered === undefined ? data.ports : data.ports.map((p) => (p === old ? renumbered : p)),
  };
}

/** A VLAN removed: its ports are left unassigned. */
export function removeVlan(data: SwitchData, vid: number): Pick<SwitchData, "vlans" | "ports"> {
  return { vlans: data.vlans.filter((v) => v.id !== vid), ports: data.ports.map((p) => (p === vid ? null : p)) };
}

/** A new VLAN, numbered 10 after the highest, with its own block. */
export function addVlan(data: SwitchData): Pick<SwitchData, "vlans"> {
  const next = Math.max(0, ...data.vlans.map((v) => v.id)) + 10;
  return { vlans: [...data.vlans, { id: next, cidr: next <= 255 ? `10.10.${String(next)}.0/24` : "10.11.0.0/24" }] };
}

/** A typed VLAN number, if it can be one: 1–4094, and not one the switch has already. */
export function vlanNumber(data: SwitchData, typed: string): number | null {
  const n = Number(typed);
  return n > 0 && n < 4095 && !data.vlans.some((v) => v.id === n) ? n : null;
}
