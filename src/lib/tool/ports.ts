/**
 * A machine's ports field (`80, 443/https, 53/udp`): each entry a port, 1 to 65535, and what it
 * speaks when it isn't plain TCP: Isoloom's port `protocol`. An entry Isoloom couldn't take is
 * kept out of the topology and reported (see `canvasIssues`), never guessed.
 */

/** What a port speaks: TCP (the default), UDP, or TCP that speaks HTTP, HTTPS or TLS. */
export const PORT_PROTOCOLS = ["tcp", "udp", "http", "https", "tls"] as const;
type PortProtocol = (typeof PORT_PROTOCOLS)[number];

/** A port as the engine's topology takes it (`protocol` left out for TCP). */
export interface Service {
  port: number;
  protocol?: PortProtocol;
}

const ENTRY = /^(\d{1,5})(?:\/([a-z]+))?$/;

const isProtocol = (p: string): p is PortProtocol => PORT_PROTOCOLS.some((x) => x === p);

/** One entry as a port, or null when Isoloom couldn't take it. */
function service(entry: string): Service | null {
  const m = ENTRY.exec(entry);
  if (!m) return null;
  // An entry without its protocol is TCP.
  const [, digits, protocol = "tcp"] = m;
  const port = Number(digits);
  if (port < 1 || port > 65535) return null;
  if (protocol === "tcp") return { port };
  return isProtocol(protocol) ? { port, protocol } : null;
}

/** The ports field read: its ports, and each entry it couldn't read. */
export function readPorts(text: string): { services: Service[]; bad: string[] } {
  const services: Service[] = [];
  const bad: string[] = [];
  for (const entry of text.split(",").map((e) => e.trim()).filter(Boolean)) {
    const s = service(entry);
    if (s) services.push(s);
    else bad.push(entry);
  }
  return { services, bad };
}

/** Ports as the field writes them: `80, 53/udp`. */
export function portsText(services: readonly Service[]): string {
  return services.map((s) => (s.protocol && s.protocol !== "tcp" ? `${String(s.port)}/${s.protocol}` : String(s.port))).join(", ");
}
