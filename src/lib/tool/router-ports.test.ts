import { describe, expect, test } from "vitest";
import { routerPortsOf } from "./router-ports";
import { autoRouter, cable, lan, machine, realRouter, switchNode } from "@/test/lab";
import { trunkStripes } from "./vlans";

const office = lan("office");
const away = { x: 2000, y: 2000 };

describe("a router's cabled ports", () => {
  const sw1 = switchNode("sw1", {}, { x: 3000, y: 0 });
  const nodes = [office, sw1, realRouter("frr", away), machine("web", {}, away)];
  const edges = [
    cable("c1", "frr", "sw1", { sourceHandle: "eth0", targetHandle: "trunk" }),
    cable("c2", "frr", "office", { sourceHandle: "eth1" }),
    cable("c3", "web", "frr", { targetHandle: "eth2" }),
  ];
  const addresses = { frr: [["office", "10.10.1.1"], ["vlan10", "10.10.10.1"], ["link-0", "10.0.0.1"]] as [string, string][] };
  const ports = routerPortsOf(nodes, edges, [office], addresses).frr;

  test("lists each port's network and address, in port order, a LAN blue and a link gray", () => {
    expect(ports.interfaces.slice(0, 2)).toEqual([
      { name: "eth1", network: "office", ip: "10.10.1.1", color: "#74c0fc" },
      { name: "eth2", network: "link-0", ip: "10.0.0.1", color: "#adb5bd" },
    ]);
  });

  test("a port on a switch's trunk has one sub-interface per VLAN, named after the switch's LAN", () => {
    expect(ports.interfaces.slice(2)).toEqual([
      { name: "sw1.10", network: "vlan10", ip: "10.10.10.1", color: "#2f9e44" },
      { name: "sw1.20", network: "vlan20", ip: undefined, color: "#1971c2" },
    ]);
  });

  test("colors each port by its network, a trunk striped with its VLANs", () => {
    expect(ports.colors).toEqual({ eth0: trunkStripes(sw1.data.vlans), eth1: "#74c0fc", eth2: "#adb5bd" });
  });
});

describe("other routers", () => {
  test("a Cisco appliance's interfaces are its OS's, in the order of its addresses", () => {
    const iol = realRouter("r1", away, { appliance: "cisco-iol" });
    const ports = routerPortsOf([iol], [], [], { r1: [["office", "10.10.1.1"], ["dmz", "10.10.2.1"]] }).r1;
    expect(ports.interfaces.map((i) => [i.name, i.network])).toEqual([
      ["Ethernet0/1", "office"],
      ["Ethernet0/2", "dmz"],
    ]);
  });

  test("on a LAN's border, the LAN is on the first port no cable uses", () => {
    const edge = realRouter("frr", { x: 316, y: 113 });
    const alone = routerPortsOf([office, edge], [], [office], {}).frr;
    const cabled = routerPortsOf([office, edge, machine("web", {}, away)], [cable("c", "frr", "web", { sourceHandle: "eth0" })], [office], {}).frr;
    expect(alone.interfaces.map((i) => [i.name, i.network])).toEqual([["eth0", "office"]]);
    expect(cabled.interfaces.map((i) => [i.name, i.network])).toEqual([
      ["eth0", "link-0"],
      ["eth1", "office"],
    ]);
  });

  test("an automatic router has no ports to show", () => {
    expect(routerPortsOf([autoRouter("r")], [], [], {})).toEqual({});
  });
});
