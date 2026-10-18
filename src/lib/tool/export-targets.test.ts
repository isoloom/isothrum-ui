import { describe, expect, test } from "vitest";
import { groupByTarget } from "./export-targets";

const text = { containersAndVms: "containers and VMs", oneVmPerMachine: "one VM per machine", dockerOnOneVm: "Docker on one VM" };
const file = (path: string) => ({ path, contents: "" });
const target = (dir: string) => groupByTarget([file(`.isoloom/${dir}/main.tf`)], text)[0];

describe("groupByTarget", () => {
  test("groups files by target, subfolders with their target", () => {
    const groups = groupByTarget([file(".isoloom/docker/compose.yml"), file(".isoloom/docker/checks/web.sh"), file(".isoloom/vagrant/Vagrantfile")], text);
    expect(groups.map((g) => [g.dir, g.files.length])).toEqual([
      ["docker", 2],
      ["vagrant", 1],
    ]);
  });

  test("names Docker Compose, with the command that starts it and the tool's own", () => {
    expect(target("docker")).toMatchObject({ name: "Docker Compose", isoloom: "isoloom run docker", run: "docker compose -f .isoloom/docker/compose.yml up -d" });
  });

  test("names the Vagrant outputs by what they run", () => {
    expect([target("vagrant").name, target("hybrid").name, target("docker-vm").name]).toEqual([
      "Vagrant (one VM per machine)",
      "Vagrant (containers and VMs)",
      "Vagrant (Docker on one VM)",
    ]);
  });

  test("a cloud output is one folder per cloud, run with Terraform", () => {
    expect(target("cloud-docker/aws")).toMatchObject({ name: "AWS (Docker on one VM)", isoloom: "isoloom run cloud-docker --cloud aws" });
    expect(target("cloud-vm/gcp")).toMatchObject({ name: "Google Cloud (one VM per machine)", run: "cd .isoloom/cloud-vm/gcp && terraform init && terraform apply" });
  });

  test("docker-vm's Proxmox module is its own output, with no Isoloom command", () => {
    expect(target("docker-vm/proxmox")).toMatchObject({ name: "Proxmox (Docker on one VM)", isoloom: null });
  });

  test("Proxmox and Kubernetes have their commands", () => {
    expect(target("proxmox")).toMatchObject({ name: "Proxmox (one VM per machine)", isoloom: "isoloom run proxmox" });
    expect(target("kubernetes").isoloom).toBe("isoloom run kubernetes");
  });

  test("an unknown cloud keeps its folder's name, an unknown target its folder and no command", () => {
    expect(target("cloud-vm/mars").name).toBe("mars (one VM per machine)");
    expect(target("mystery")).toMatchObject({ name: "mystery", isoloom: null, run: "" });
  });
});
