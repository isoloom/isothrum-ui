import { describe, expect, test } from "vitest";
import { machineEnds, migrateEdges, networkOfCable, nextPort } from "./cables";
import { autoRouter, cable, lan, machine, realRouter, switchNode } from "@/test/lab";

describe("migrateEdges", () => {
  const nodes = [machine("web"), autoRouter("r"), realRouter("frr"), lan("office"), switchNode("sw1")];

  test("moves a machine's cable onto its top, or its bottom when it was there", () => {
    const edges = migrateEdges([cable("c1", "web", "office", { sourceHandle: "left", targetHandle: "right" }), cable("c2", "office", "web", { targetHandle: "bottom" })], nodes);
    expect(edges.map((e) => [e.sourceHandle, e.targetHandle])).toEqual([
      ["top", "right"],
      [null, "bottom"],
    ]);
  });

  test("moves an appliance's cable onto its single port", () => {
    expect(migrateEdges([cable("c", "r", "office", { sourceHandle: "right" })], nodes)[0].sourceHandle).toBe("port");
  });

  test("keeps a real router's port, and gives a cable on none the first free one", () => {
    const edges = migrateEdges([cable("c1", "frr", "office", { sourceHandle: "eth0" }), cable("c2", "sw1", "frr", { sourceHandle: "p1", targetHandle: "top" })], nodes);
    expect(edges.map((e) => [e.sourceHandle, e.targetHandle])).toEqual([
      ["eth0", null],
      ["p1", "eth1"],
    ]);
  });
});

describe("nextPort", () => {
  const edges = [cable("c1", "web", "db", { aPort: "eth0", bPort: "eth0" }), cable("c2", "fw", "web", { aPort: "eth0", bPort: "eth1" })];

  test("gives the first eth<n> no cable of the machine uses, at either end", () => {
    expect(nextPort("web", edges)).toBe("eth2");
    expect(nextPort("db", edges)).toBe("eth1");
    expect(nextPort("new", edges)).toBe("eth0");
  });

  test("starts from the port it is given (eth0 taken on a LAN's edge)", () => {
    expect(nextPort("new", edges, 1)).toBe("eth1");
  });
});

describe("networkOfCable", () => {
  const nodes = [lan("office"), switchNode("sw1"), machine("a"), machine("b"), machine("c"), machine("x", { name: "" })];
  const edges = [
    cable("toLan", "office", "a"),
    cable("access", "a", "sw1", { targetHandle: "p3" }),
    cable("trunk", "sw1", "b", { sourceHandle: "trunk" }),
    cable("free", "c", "sw1", { targetHandle: "p6" }),
    cable("ab", "a", "b"),
    cable("toNameless", "a", "x"),
    cable("bc", "b", "c"),
  ];
  const net = (id: string) => networkOfCable(id, nodes, edges);

  test("a cable to a LAN is that LAN", () => {
    expect(net("toLan")).toBe("office");
  });

  test("a cable on a switch's access port is its VLAN; on a trunk or a free port, no one network", () => {
    expect([net("access"), net("trunk"), net("free")]).toEqual(["vlan20", null, null]);
  });

  test("cables between named machines are links numbered in order", () => {
    expect([net("ab"), net("bc")]).toEqual(["link-0", "link-1"]);
  });

  test("a cable to a nameless machine, or an unknown cable, is no network", () => {
    expect([net("toNameless"), net("nope")]).toEqual([null, null]);
  });
});

test("machineEnds names the ends of a cable that are machines", () => {
  expect(machineEnds(cable("c", "web", "office"), [machine("web"), lan("office")])).toEqual(["web"]);
});
