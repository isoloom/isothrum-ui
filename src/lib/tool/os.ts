import type { Appliance } from "./model";

/**
 * The OSes a machine can be, as Isoloom writes them (`<family>@<version>`): exactly Isoloom's list,
 * which its engine gives (`choices_json`, checked by the tests). A machine of one of them is its
 * OS, set up by its provisioning steps; each target decides whether it runs as a VM or as a
 * container built from the OS's image.
 */
export const OS_CHOICES = [
  "debian@11",
  "debian@12",
  "debian@13",
  "ubuntu@14.04",
  "ubuntu@16.04",
  "ubuntu@18.04",
  "ubuntu@20.04",
  "ubuntu@22.04",
  "ubuntu@24.04",
  "rocky@9",
  "alma@9",
  "alpine@3.19",
  "kali@rolling",
  "fedora@42",
  "centos@7",
  "windows@10",
  "windows@11",
  "windows-server@2008r2",
  "windows-server@2012r2",
  "windows-server@2016",
  "windows-server@2019",
  "windows-server@2022",
  "windows-server@2025",
];

/** The OS a new VM gets. */
export const DEFAULT_OS = "debian@12";

/**
 * An OS as a lab stored before Isoloom's new format named it (its image-table name: `debian-12`,
 * `almalinux-9`, `kali`, `windows-server-2022`), in today's spelling; any other value as it is.
 */
export function currentOs(os: string): string {
  if (os === "kali") return "kali@rolling";
  const m = /^([a-z-]+?)-(\d[\da-z.]*)$/.exec(os);
  if (!m || os.includes("@")) return os;
  const family = m[1] === "almalinux" ? "alma" : m[1];
  return `${family}@${m[2]}`;
}

/** The Cisco OSes stored under the id the editor gave them before Isoloom's (`cisco-viosl2`). */
const OLD_APPLIANCES: ReadonlyMap<string, Appliance> = new Map([["cisco-viosl2", "cisco-vios-l2"]]);

/** A machine as a stored lab or device holds it, in today's spelling: its OS and its Cisco OS. */
export function currentMachine<M extends { os: string; appliance?: Appliance }>(m: M): M {
  const appliance = m.appliance === undefined ? undefined : (OLD_APPLIANCES.get(m.appliance) ?? m.appliance);
  return { ...m, os: currentOs(m.os), ...(appliance === undefined ? {} : { appliance }) };
}
