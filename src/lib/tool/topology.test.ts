import { describe, expect, test } from "vitest";
import { cable, compile, lan, machine, sw1Networks, switchNode } from "@/test/lab";
import { toTopology } from "./topology";

/** A machine's box, centered in the 400 by 300 LAN at the origin. */
const inside = { x: 140, y: 92 };
/** Far from every LAN. */
const away = { x: 2000, y: 2000 };

describe("which networks a machine is on", () => {
  test("the LAN whose area it sits in, with the next free address", () => {
    expect(compile([lan("office"), machine("web", {}, inside)]).nodes.web.networks).toEqual({ office: null });
  });

  test("its fixed address there, when it has one", () => {
    expect(compile([lan("office"), machine("web", { pins: { office: 20 } }, inside)]).nodes.web.networks).toEqual({ office: 20 });
  });

  test("a LAN it is cabled to, whichever end the LAN is", () => {
    const nodes = [lan("office"), lan("dmz", {}, { x: 1000 }), machine("web", {}, away)];
    const t = compile(nodes, [cable("c1", "web", "office"), cable("c2", "dmz", "web")]);
    expect(t.nodes.web.networks).toEqual({ office: null, dmz: null });
  });

  test("the VLAN of the switch's access port it is cabled to, whichever end the switch is", () => {
    const nodes = [switchNode("sw1"), machine("a", {}, away), machine("b", {}, away)];
    const t = compile(nodes, [cable("c1", "a", "sw1", { targetHandle: "p1" }), cable("c2", "sw1", "b", { sourceHandle: "p3" })]);
    expect([t.nodes.a.networks, t.nodes.b.networks]).toEqual([{ vlan10: null }, { vlan20: null }]);
  });

  test("every VLAN of the switch on its trunk, and none on a free port", () => {
    const nodes = [switchNode("sw1"), machine("r", {}, away), machine("free", {}, away)];
    const t = compile(nodes, [cable("c1", "r", "sw1", { targetHandle: "trunk" }), cable("c2", "free", "sw1", { targetHandle: "p5" })]);
    expect([t.nodes.r.networks, t.nodes.free.networks]).toEqual([{ vlan10: null, vlan20: null }, {}]);
  });
});

describe("what a machine runs", () => {
  test("an automatic router is a router", () => {
    expect(compile([machine("r", { kind: "router", icon: "router" })]).nodes.r.kind).toEqual({ router: {} });
  });

  test("a container keeps its image trimmed, idle when it is a stock Linux image", () => {
    const t = compile([machine("a", { image: " alpine:3.20 " }), machine("b", { image: "nginx" }), machine("c", { image: "alpine", idle: false })]);
    expect([t.nodes.a.kind, t.nodes.b.kind, t.nodes.c.kind]).toEqual([
      { container: { image: "alpine:3.20", idle: true } },
      { container: { image: "nginx", idle: false } },
      { container: { image: "alpine", idle: false } },
    ]);
  });

  test("a Cisco appliance carries its OS and its own configuration, when it has one", () => {
    const iol = { image: "vrnetlab/cisco_iol:17.12.01", appliance: "cisco-iol" as const };
    const t = compile([machine("r1", { ...iol, config: "router ospf 1" }), machine("r2", { ...iol, config: "  " })]);
    expect(t.nodes.r1.kind).toEqual({ container: { ...iol, config: "router ospf 1" } });
    expect(t.nodes.r2.kind).toEqual({ container: iol });
  });

  test("a VM keeps its OS and one provisioning step per non-blank line", () => {
    const t = compile([machine("vm", { kind: "vm", os: "debian@12", provision: "a\n b \n\n" })]);
    expect(t.nodes.vm.kind).toEqual({ vm: { os: "debian@12", provision: ["a", "b"] } });
  });

  test("services are the ports of the list Isoloom takes, with what each speaks", () => {
    expect(compile([machine("web", { ports: "x, 70000, 22, 443/https ,0, 53/udp" })]).nodes.web.services).toEqual([{ port: 22 }, { port: 443, protocol: "https" }, { port: 53, protocol: "udp" }]);
  });

  test("the access machine says so", () => {
    expect(compile([machine("pc", { access: true })]).nodes.pc.access).toBe(true);
  });

  test("a machine without a name is left out", () => {
    expect(compile([machine("m", { name: "" })]).nodes).toEqual({});
  });
});

describe("links", () => {
  test("a cable between two named machines is a link, its ports trimmed and its conditions as tc", () => {
    const t = compile([machine("a", {}, away), machine("b", {}, away)], [cable("c", "a", "b", { aPort: " eth2 ", bPort: "eth1", tc: { delay: 10 } })]);
    expect(t.links).toEqual([{ a: { node: "a", port: "eth2" }, b: { node: "b", port: "eth1" }, tc: { delay: "10ms" } }]);
  });

  test("a cable to a LAN, to a nameless machine or without ends' labels is no link", () => {
    const nodes = [lan("office"), machine("a", {}, away), machine("b", { name: "" }, away)];
    const unlabelled = { ...cable("c3", "a", "a"), data: undefined };
    expect(compile(nodes, [cable("c1", "a", "office"), cable("c2", "a", "b"), unlabelled]).links).toEqual([]);
  });
});

describe("networks", () => {
  test("each named LAN area, its block trimmed, its internet and conditions", () => {
    const t = compile([lan("office", { cidr: " 10.10.1.0/24 ", internet: false, tc: { loss: 1 } }), lan("unnamed", { name: "" })]);
    expect(t.networks).toEqual({ office: { cidr: "10.10.1.0/24", internet: false, tc: { loss: 1 } } });
  });

  test("a switch's VLANs, nested under the switch's LAN", () => {
    expect(compile([switchNode("sw1")]).networks).toEqual(sw1Networks);
  });

  test("a LAN area named like a VLAN is that VLAN: its block and internet, without conditions", () => {
    const area = lan("l", { name: "vlan10", cidr: "10.10.10.0/24", internet: false, tc: { delay: 5 } });
    expect(compile([area, switchNode("sw1")]).networks.vlan10).toEqual({ cidr: "10.10.10.0/24", internet: false, switch: "sw1", vlan: 10 });
  });

  test("the topology is JSON text, named after the lab", () => {
    expect(JSON.parse(toTopology("office-lab", [], []))).toEqual({ name: "office-lab", nodes: {}, networks: {}, links: [] });
  });
});
