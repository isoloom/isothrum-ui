import type { GeneratedFile } from "./engine";

/**
 * The Isoloom outputs in a lab's zip, as the Export window lists them: how each is named for
 * people, the one Isoloom command that starts it (from the unzipped folder), and the same thing
 * with the tool itself.
 */

/** The words the names take (the editor's text). */
export interface TargetText {
  containersAndVms: string;
  oneVmPerMachine: string;
  dockerOnOneVm: string;
}

export interface Target {
  dir: string;
  files: GeneratedFile[];
  name: string;
  isoloom: string | null;
  run: string;
}

const CLOUDS: Partial<Record<string, string>> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "Google Cloud",
  digitalocean: "DigitalOcean",
  linode: "Linode",
  oci: "Oracle Cloud",
};

type Described = Pick<Target, "name" | "isoloom" | "run">;

/** A cloud output (one folder per cloud): Docker on one VM, or one VM per machine. */
function cloudTarget(target: string, cloud: string | undefined, terraform: string, t: TargetText): Described {
  const where = CLOUDS[cloud ?? ""] ?? String(cloud);
  if (target === "cloud-docker") return { name: `${where} (${t.dockerOnOneVm})`, isoloom: `isoloom run cloud-docker --cloud ${String(cloud)}`, run: terraform };
  return { name: `${where} (${t.oneVmPerMachine})`, isoloom: `isoloom run cloud-vm --cloud ${String(cloud)}`, run: terraform };
}

function describe(dir: string, t: TargetText): Described {
  const [target, cloud] = dir.split("/") as [string, string | undefined];
  const terraform = `cd .isoloom/${dir} && terraform init && terraform apply`;
  switch (target) {
    case "docker":
      return { name: "Docker Compose", isoloom: "isoloom run docker", run: "docker compose -f .isoloom/docker/compose.yml up -d" };
    case "hybrid":
      return { name: `Vagrant (${t.containersAndVms})`, isoloom: "isoloom run hybrid", run: "cd .isoloom/hybrid && vagrant up" };
    case "vagrant":
      return { name: `Vagrant (${t.oneVmPerMachine})`, isoloom: "isoloom run vagrant", run: "cd .isoloom/vagrant && vagrant up" };
    case "docker-vm":
      return cloud === "proxmox"
        ? { name: `Proxmox (${t.dockerOnOneVm})`, isoloom: null, run: terraform }
        : { name: `Vagrant (${t.dockerOnOneVm})`, isoloom: "isoloom run docker-vm", run: "cd .isoloom/docker-vm && vagrant up" };
    case "proxmox":
      return { name: `Proxmox (${t.oneVmPerMachine})`, isoloom: "isoloom run proxmox", run: terraform };
    case "kubernetes":
      return { name: "Kubernetes", isoloom: "isoloom run kubernetes", run: "kubectl kustomize --load-restrictor LoadRestrictionsNone .isoloom/kubernetes | kubectl apply -f -" };
    case "cloud-docker":
    case "cloud-vm":
      return cloudTarget(target, cloud, terraform, t);
    default:
      return { name: dir, isoloom: null, run: "" };
  }
}

/** The folder a generated file belongs to: `<target>`, or `<target>/<cloud>` for a cloud output and docker-vm's Proxmox module. */
function folderOf(path: string): string {
  const parts = path.replace(/^\.isoloom\//, "").split("/");
  // Every other subfolder (checks/, …) belongs to its target.
  const deeper = parts.length > 2 && (parts[0] === "cloud-docker" || parts[0] === "cloud-vm" || (parts[0] === "docker-vm" && parts[1] === "proxmox"));
  return deeper ? `${parts[0]}/${parts[1]}` : parts[0];
}

/** Generated files grouped by where they run: `.isoloom/<target>[/<cloud>]/…`. */
export function groupByTarget(files: GeneratedFile[], t: TargetText): Target[] {
  const groups = new Map<string, GeneratedFile[]>();
  for (const f of files) {
    const dir = folderOf(f.path);
    groups.set(dir, [...(groups.get(dir) ?? []), f]);
  }
  return [...groups.entries()].map(([dir, fs]) => ({ dir, files: fs, ...describe(dir, t) }));
}
