import { describe, expect, test } from "vitest";
import { fromGns3 } from "./gns3-import";
import type { Gns3Text } from "./gns3-parts";
import { nodeName, type LabNode, type MachineData } from "./model";

const text: Gns3Text = {
  notGns3: "not gns3",
  noTopology: "no topology",
  cisco: (node, kind) => `cisco ${node} ${kind}`,
  firewall: (node) => `firewall ${node}`,
  noEquivalent: (node, type) => `skipped ${node} ${type}`,
  noNodes: "no nodes",
};

/** A GNS3 node: its id, type and name, at the origin unless `extra` says otherwise. */
const g3 = (node_id: string, node_type: string, name: string = node_id, extra: object = {}) => ({ node_id, node_type, name, x: 0, y: 0, ...extra });
/** A .gns3 project of `nodes` and two-ended `links`. */
const project = (nodes: object[], links: string[][] = [], more: object = {}) =>
  JSON.stringify({ name: "My GNS3 Lab", type: "topology", topology: { nodes, links: links.map((ends) => ({ nodes: ends.map((node_id) => ({ node_id })) })), ...more } });
const open = (nodes: object[], links: string[][] = [], more: object = {}) => fromGns3(project(nodes, links, more), text);
const names = (nodes: LabNode[]) => nodes.map(nodeName);
/** The machine named `name`'s data. */
const machineData = (nodes: LabNode[], name: string): MachineData | undefined => nodes.find((n) => n.type === "machine" && n.data.name === name)?.data as MachineData | undefined;

describe("what isn't a GNS3 project", () => {
  test("a file that isn't JSON", () => {
    expect(() => fromGns3("not json", text)).toThrow("not gns3");
  });

  test("JSON with no topology", () => {
    expect(() => fromGns3(JSON.stringify({ name: "x" }), text)).toThrow("no topology");
  });

  test("a project with no nodes opens empty, with a warning", () => {
    expect(open([])).toEqual({ lab: { name: "my-gns3-lab", nodes: [], edges: [] }, warnings: ["no nodes"] });
  });
});

describe("switches become LANs", () => {
  test("a switch is a LAN without the internet, the machines cabled to it on its edge", () => {
    const { lab } = open([g3("s1", "ethernet_switch", "Switch1"), g3("d1", "docker", "web", { x: 100, y: 100, properties: { image: "nginx:latest" } })], [["s1", "d1"]]);
    expect(lab.nodes[0]).toMatchObject({ type: "lan", data: { name: "switch1", cidr: "10.10.1.0/24", internet: false } });
    expect(lab.edges).toEqual([expect.objectContaining({ source: lab.nodes[1].id, target: lab.nodes[0].id, data: { aPort: "eth0", bPort: "" } })]);
  });

  test("switches cabled together are one LAN, named after the first; a NAT on it gives it the internet", () => {
    const { lab } = open([g3("nat", "nat", "NAT1"), g3("s1", "ethernet_switch", "Switch1"), g3("s2", "ethernet_hub", "Switch 2"), g3("s3", "ethernet_switch")], [["s1", "s2"], ["nat", "s1"]]);
    expect(lab.nodes.map((n) => n.type === "lan" && [n.data.name, n.data.cidr, n.data.internet])).toEqual([
      ["switch1", "10.10.1.0/24", true],
      ["s3", "10.10.2.0/24", false],
    ]);
  });

  test("an Open vSwitch container is a switch too", () => {
    expect(open([g3("o", "docker", "OpenvSwitch", { properties: { image: "gns3/openvswitch" } })]).lab.nodes[0].type).toBe("lan");
  });
});

describe("what each node becomes", () => {
  test("Cisco routers become automatic routers, with a warning that their configuration stays behind", () => {
    const { lab, warnings } = open([g3("r1", "dynamips", "R1"), g3("r2", "iou", "R_2")]);
    expect(names(lab.nodes)).toEqual(["r1", "r-2"]);
    expect(machineData(lab.nodes, "r1")).toMatchObject({ kind: "router", icon: "router" });
    expect(warnings).toEqual(["cisco R1 Dynamips", "cisco R_2 IOU"]);
  });

  test("a router appliance becomes an automatic router, silently", () => {
    const { lab, warnings } = open([g3("v", "qemu", "edge", { properties: { hda_disk_image: "vyos.img" } })]);
    expect(machineData(lab.nodes, "edge")).toMatchObject({ kind: "router", icon: "router" });
    expect(warnings).toEqual([]);
  });

  test("a firewall becomes an automatic router with a shield, with a warning", () => {
    const { lab, warnings } = open([g3("f", "qemu", "pfSense", { properties: { hda_disk_image: "pfsense.qcow2" } })]);
    expect(machineData(lab.nodes, "pfsense")).toMatchObject({ kind: "router", icon: "shield" });
    expect(warnings).toEqual(["firewall pfSense"]);
  });

  test("QEMU, VirtualBox and VMware nodes become VMs, the OS guessed, each with its provisioning script", () => {
    const nodes = [
      g3("q", "qemu", "Win10", { properties: { hda_disk_image: "win10.qcow2" } }),
      g3("v", "virtualbox", "srv", { properties: { vmname: "Ubuntu 20.04" } }),
      g3("w", "vmware", "kali linux"),
    ];
    const { lab } = open(nodes);
    expect(lab.nodes.map((n) => n.type === "machine" && [n.data.name, n.data.kind, n.data.os, n.data.provision])).toEqual([
      ["win10", "vm", "windows@10", "provision/win10.ps1"],
      ["srv", "vm", "ubuntu@20.04", "provision/srv.sh"],
      ["kali-linux", "vm", "kali@rolling", "provision/kali-linux.sh"],
    ]);
  });

  test("VPCS becomes a small Alpine container, and a Docker node without an image runs Alpine", () => {
    const { lab } = open([g3("p", "vpcs", "PC1"), g3("d", "docker", "box", { properties: {} })]);
    expect(machineData(lab.nodes, "pc1")).toMatchObject({ kind: "container", icon: "laptop", image: "alpine:3.20" });
    expect(machineData(lab.nodes, "box")).toMatchObject({ kind: "container", icon: "container", image: "alpine:3.20" });
  });

  test("a node with no equivalent is left out, with a warning", () => {
    expect(open([g3("x", "cloud_unknown", "Thing")])).toMatchObject({ lab: { nodes: [] }, warnings: ["skipped Thing cloud_unknown"] });
  });
});
