import type { Connection } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import { type LabIndex, canConnect, newCable, onLanEdge, reconnected } from "./cables";
import { autoRouter, cable, lan, machine } from "@/test/lab";

const index: LabIndex = { lanIds: new Set(["office", "dmz"]), switchIds: new Set(["sw1", "sw2"]), routerIds: new Set(["frr"]) };
const link = (source: string, target: string, sourceHandle: string | null = null, targetHandle: string | null = null): Connection => ({ source, target, sourceHandle, targetHandle });
/** Every machine's first port is eth0. */
const fromZero = () => 0;

describe("canConnect", () => {
  test("joins a machine to a machine, a LAN or a port, and two switches", () => {
    expect([canConnect(link("a", "b"), index, []), canConnect(link("a", "office"), index, []), canConnect(link("sw1", "sw2"), index, [])]).toEqual([true, true, true]);
  });

  test("never joins a node to itself, a LAN to a LAN or a switch to a LAN", () => {
    expect([canConnect(link("a", "a"), index, []), canConnect(link("office", "dmz"), index, []), canConnect(link("sw1", "office"), index, [])]).toEqual([false, false, false]);
  });

  test("a switch or router port takes one cable, unless that cable is the one moving", () => {
    const edges = [cable("c1", "a", "sw1", { targetHandle: "p1" }), cable("c2", "frr", "b", { sourceHandle: "eth0" })];
    expect(canConnect(link("x", "sw1", null, "p1"), index, edges)).toBe(false);
    expect(canConnect(link("frr", "y", "eth0"), index, edges)).toBe(false);
    expect(canConnect(link("x", "sw1", null, "p1"), index, edges, "c1")).toBe(true);
  });
});

test("onLanEdge is true of an appliance on a LAN's border only", () => {
  const office = lan("office");
  const nodes = [office, autoRouter("r", { x: 340, y: 50 }), machine("web", {}, { x: 340, y: 50 })];
  expect([onLanEdge("r", nodes, [office]), onLanEdge("web", nodes, [office]), onLanEdge("nope", nodes, [office])]).toEqual([true, false, false]);
});

describe("newCable", () => {
  const edges = [cable("c1", "a", "b", { aPort: "eth0", bPort: "eth0" })];

  test("labels a machine's end with its next free port", () => {
    expect(newCable(link("a", "b"), index, edges, fromZero).data).toEqual({ aPort: "eth1", bPort: "eth1" });
  });

  test("labels a LAN's end with nothing, a switch's with the port, a router's with its port", () => {
    expect(newCable(link("office", "sw1", null, "p3"), index, [], fromZero).data).toEqual({ aPort: "", bPort: "3" });
    expect(newCable(link("frr", "a", "eth2"), index, edges, fromZero).data).toEqual({ aPort: "eth2", bPort: "eth1" });
  });

  test("gives a machine's first port from where it is told to start", () => {
    expect(newCable(link("r", "a"), index, [], (n) => (n === "r" ? 1 : 0)).data).toEqual({ aPort: "eth1", bPort: "eth0" });
  });

  test("plugs into the handles of the connection, under a new id", () => {
    const c = newCable(link("a", "sw1", "bottom", "p2"), index, [], fromZero);
    expect(c).toMatchObject({ type: "cable", source: "a", sourceHandle: "bottom", target: "sw1", targetHandle: "p2" });
    expect(c.id).toMatch(/^c-/);
  });
});

describe("reconnected", () => {
  const old = cable("c1", "a", "b", { aPort: "eth3", bPort: "eth0" });
  const edges = [old, cable("c2", "d", "x", { aPort: "eth0", bPort: "eth0" })];

  test("an end that stays on its machine keeps its port", () => {
    const moved = reconnected(edges, old, link("a", "d", "bottom"), index, fromZero);
    expect(moved[0]).toMatchObject({ source: "a", sourceHandle: "bottom", target: "d", data: { aPort: "eth3", bPort: "eth1" } });
  });

  test("an end moved onto a switch or a LAN takes its label there", () => {
    const moved = reconnected(edges, old, link("a", "sw1", null, "p4"), index, fromZero);
    expect(moved[0].data).toEqual({ aPort: "eth3", bPort: "4" });
  });

  test("leaves the other cables as they are", () => {
    expect(reconnected(edges, old, link("a", "office"), index, fromZero)[1]).toBe(edges[1]);
  });
});
