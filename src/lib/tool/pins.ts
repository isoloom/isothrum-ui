/**
 * Fixing a machine's address on a LAN by hand: same block, a new last number (typed alone, or
 * as a whole address); clearing it goes back to the next free one. Null: not a valid address.
 */
export function pinned(pins: Record<string, number> | undefined, net: string, ip: string, typed: string): Record<string, number> | null {
  const text = typed.trim();
  if (text === "") return Object.fromEntries(Object.entries(pins ?? {}).filter(([n]) => n !== net));
  const base = ip.slice(0, ip.lastIndexOf(".") + 1);
  const last = Number(text.startsWith(base) ? text.slice(base.length) : text.split(".").pop());
  return Number.isInteger(last) && last > 0 && last < 255 ? { ...pins, [net]: last } : null;
}
