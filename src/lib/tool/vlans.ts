import { TRUNK, isSwitch, type CableEdge, type LabNode, type SwitchNode } from "./model";

/** VLANs and switch ports. VLANs are lab-wide: `vlan10` is the same network on every switch. */

export const vlanName = (id: number) => `vlan${String(id)}`;

/** A VLAN's color, from its number, so `vlan10` has the same color on every switch and area. */
const VLAN_COLORS = ["#7048e8", "#2f9e44", "#1971c2", "#e8590c", "#e03131", "#0c8599", "#c2255c", "#5c940d"];
export function vlanColor(id: number): string {
  return VLAN_COLORS[Math.abs(Math.round(id / 10)) % VLAN_COLORS.length];
}

/** A trunk port's look: striped with the colors of the VLANs it carries (muted when none). */
export function trunkStripes(vlans: { id: number }[]): string {
  if (!vlans.length) return "var(--muted)";
  const stripes = vlans.map((v, i) => `${vlanColor(v.id)} ${String(i * 5)}px ${String((i + 1) * 5)}px`).join(", ");
  return `repeating-linear-gradient(135deg, ${stripes})`;
}

/** The VLAN number in a LAN's name (`vlan10` -> 10), when the LAN is a VLAN. */
export function vlanOf(lanName: string): number | null {
  const m = /^vlan(\d{1,4})$/.exec(lanName);
  return m ? Number(m[1]) : null;
}

/** The port a switch handle stands for: `p3` -> its index, `trunk` -> the trunk. */
function switchPort(handle: string | null | undefined): number | typeof TRUNK | null {
  if (handle === TRUNK) return TRUNK;
  const m = handle ? /^p(\d+)$/.exec(handle) : null;
  return m ? Number(m[1]) - 1 : null;
}

/** Whether a switch handle is a trunk: the T port, or any port set to "trunk". */
export function isTrunkPort(sw: SwitchNode, handle: string | null | undefined): boolean {
  const port = switchPort(handle);
  return port === TRUNK || (typeof port === "number" && sw.data.ports[port] === TRUNK);
}

/** The VLAN of an access port, or null (a trunk, an unassigned port, not a port). */
export function accessVlan(sw: SwitchNode, handle: string | null | undefined): number | null {
  const port = switchPort(handle);
  const mode = typeof port === "number" ? sw.data.ports[port] : null;
  return typeof mode === "number" ? mode : null;
}

/** A port's label next to its cable: 1, 2… or T. */
export function switchPortLabel(handle: string | null | undefined): string {
  const p = switchPort(handle);
  if (p === TRUNK) return "T";
  return p === null ? "" : String(p + 1);
}

/**
 * The LAN each switch's VLANs belong to in isoloom.yml: switches joined by a cable, or sharing a
 * VLAN number (VLANs are lab-wide here), are one LAN, named after the first. Returns a switch's
 * LAN name by its id.
 */
export function switchLans(nodes: LabNode[], edges: CableEdge[]): (switchId: string) => string {
  const switches = nodes.filter(isSwitch);
  const group = new Map(switches.map((s) => [s.id, s.id]));
  const root = (id: string): string => {
    const up = group.get(id);
    return up === undefined || up === id ? id : root(up);
  };
  const unite = (a: string, b: string) => group.set(root(a), root(b));
  for (const e of edges) if (group.has(e.source) && group.has(e.target)) unite(e.source, e.target);
  const firstWith = new Map<number, string>();
  for (const sw of switches) {
    for (const v of sw.data.vlans) {
      const other = firstWith.get(v.id);
      if (other) unite(sw.id, other);
      else firstWith.set(v.id, sw.id);
    }
  }
  return (id: string) => switches.find((s) => root(s.id) === root(id))?.data.name ?? "";
}

/** The name Isoloom gives a trunk's interface: its LAN's, within Linux's limit (`sw1`, then `sw1.10`). */
export const trunkInterface = (lan: string) => lan.slice(0, 10).replace(/-+$/, "");
