import { uid, type MachineData } from "./model";
import { DEFAULT_OS } from "./os";

/** The devices the toolbar places, and the ones saved from the canvas. */

export interface Preset {
  id: string;
  /** Toolbar groups: network appliances first, then containers, then VMs, then saved devices. */
  group: "network" | "container" | "vm" | "mine";
  /** A saved device's name. The built-in devices are named in the editor's text, by their id. */
  label?: string;
  /** Prefix of the generated machine name (`router1`, `router2`...). */
  prefix: string;
  data: Omit<MachineData, "name">;
}

const base = { image: "", os: "", provision: "", ports: "", access: false };

/** A built-in device: `id` in `group`, named `<prefix><n>`, with `data` over the defaults. */
const preset = (id: string, group: Preset["group"], prefix: string, data: Pick<MachineData, "kind" | "icon"> & Partial<MachineData>): Preset => ({
  id,
  group,
  prefix,
  data: { ...base, ...data },
});

export const PRESETS: Preset[] = [
  preset("router", "network", "router", { kind: "router", icon: "router" }),
  preset("router-frr", "network", "frr", { kind: "container", icon: "router", image: "frrouting/frr:v8.5.2" }),
  preset("firewall", "network", "fw", { kind: "container", icon: "shield", image: "alpine:3.20" }),
  preset("container", "container", "box", { kind: "container", icon: "container", image: "alpine:3.20" }),
  preset("web", "container", "web", { kind: "container", icon: "server", image: "nginx:1.27-alpine", ports: "80" }),
  preset("database", "container", "db", { kind: "container", icon: "server", image: "postgres:16-alpine", ports: "5432" }),
  preset("linux-vm", "vm", "vm", { kind: "vm", icon: "monitor", os: DEFAULT_OS }),
  preset("ubuntu-vm", "vm", "ubuntu", { kind: "vm", icon: "monitor", os: "ubuntu@24.04" }),
  preset("kali-vm", "vm", "kali", { kind: "vm", icon: "monitor", os: "kali@rolling" }),
  preset("windows-vm", "vm", "win", { kind: "vm", icon: "monitor", os: "windows-server@2022" }),
  preset("workstation", "vm", "user", { kind: "vm", icon: "laptop", os: DEFAULT_OS, access: true }),
  // Last, so the number keys above keep their devices.
  preset("cisco-iol", "network", "r", { kind: "container", icon: "router", image: "vrnetlab/cisco_iol:17.12.01", appliance: "cisco-iol" }),
  preset("cisco-iol-l2", "network", "sw", { kind: "container", icon: "router", image: "vrnetlab/cisco_iol:L2-17.12.01", appliance: "cisco-iol-l2" }),
  // A Linux desktop with a VNC server (GNS3's desktop appliances): its screen opens from the
  // desktop app (right-click, Screen). VNC password: vncpassword.
  preset("desktop", "container", "desk", { kind: "container", icon: "monitor", image: "consol/debian-xfce-vnc:latest" }),
];

/** Keys 1–9 then 0 pick the devices, in toolbar order. */
export function shortcutOf(presetId: string): string | null {
  const i = PRESETS.findIndex((p) => p.id === presetId);
  return i < 0 || i > 9 ? null : String((i + 1) % 10);
}

/** The device a number key picks: 1–9 the first nine, 0 the tenth. */
export function presetForKey(key: string): Preset | undefined {
  return /^[0-9]$/.test(key) ? PRESETS[(Number(key) + 9) % 10] : undefined;
}

/** A device from a machine on the canvas: everything but its name and fixed addresses. */
export function deviceFrom(m: MachineData): Preset {
  const { name, ...rest } = m;
  const data: Omit<MachineData, "name"> = { ...rest, pins: undefined };
  return {
    id: uid("my"),
    group: "mine",
    label: name,
    prefix: name.replace(/\d+$/, "") || "device",
    data,
  };
}

/** What changes when a machine is set to run as `kind`: a VM keeps its OS (Debian 12 by default), a container its image (FRR for a router, Alpine otherwise). */
export function runAs(m: MachineData, kind: string): Partial<MachineData> | null {
  if (kind === "vm") return { kind, os: m.os || DEFAULT_OS };
  if (kind === "router") return { kind };
  if (kind === "container") return { kind, image: m.image || (m.icon === "router" ? "frrouting/frr:v8.5.2" : "alpine:3.20") };
  return null;
}
