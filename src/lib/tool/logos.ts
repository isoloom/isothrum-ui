import {
  siAlmalinux,
  siAlpinelinux,
  siApache,
  siCentos,
  siDebian,
  siDocker,
  siElasticsearch,
  siFedora,
  siGitlab,
  siGrafana,
  siJenkins,
  siKalilinux,
  siKibana,
  siLinux,
  siMariadb,
  siMongodb,
  siMysql,
  siNginx,
  siNodedotjs,
  siPostgresql,
  siPrometheus,
  siPython,
  siRedis,
  siRockylinux,
  siTraefikproxy,
  siUbuntu,
  siWireshark,
  type SimpleIcon,
} from "simple-icons";
import { imageName, type MachineData } from "./model";

/**
 * A machine's logo, from what it runs: the VM's OS, or the container's image. Logos are from
 * Simple Icons (there is none for Windows: Microsoft had theirs removed), so a Windows VM, a
 * router or an image we don't recognise keeps its generic icon.
 */

const BY_OS: [prefix: string, icon: SimpleIcon][] = [
  ["debian", siDebian],
  ["ubuntu", siUbuntu],
  ["kali", siKalilinux],
  ["rocky", siRockylinux],
  ["alma", siAlmalinux],
  ["centos", siCentos],
  ["fedora", siFedora],
];

/** Image name (its last path segment, without the tag) → logo. */
const BY_IMAGE: [name: string, icon: SimpleIcon][] = [
  ["nginx", siNginx],
  ["alpine", siAlpinelinux],
  ["postgres", siPostgresql],
  ["mysql", siMysql],
  ["mariadb", siMariadb],
  ["redis", siRedis],
  ["mongo", siMongodb],
  ["httpd", siApache],
  ["node", siNodedotjs],
  ["python", siPython],
  ["grafana", siGrafana],
  ["prometheus", siPrometheus],
  ["elasticsearch", siElasticsearch],
  ["kibana", siKibana],
  ["jenkins", siJenkins],
  ["gitlab-ce", siGitlab],
  ["gitlab-ee", siGitlab],
  ["traefik", siTraefikproxy],
  ["wireshark", siWireshark],
  ["kali-rolling", siKalilinux],
  ["debian", siDebian],
  ["ubuntu", siUbuntu],
  ["rockylinux", siRockylinux],
  ["alma", siAlmalinux],
  ["centos", siCentos],
  ["fedora", siFedora],
];

export function logoFor(m: Pick<MachineData, "kind" | "image" | "os">): SimpleIcon | null {
  if (m.kind === "vm") {
    if (m.os.startsWith("windows")) return null;
    return BY_OS.find(([prefix]) => m.os.startsWith(prefix))?.[1] ?? siLinux;
  }
  const name = imageName(m.image);
  return BY_IMAGE.find(([n]) => name === n)?.[1] ?? null;
}

/** The fallback for a container whose image we don't know: Docker's whale. */
export const dockerLogo = siDocker;

/** Brand colors too dark to read on a dark background (AlmaLinux and others use black). */
export function isDark(hex: string): boolean {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.05;
}
