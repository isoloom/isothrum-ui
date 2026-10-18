import { describe, expect, test } from "vitest";
import { facingSides, shownCables } from "./facing";
import { autoRouter, cable, lan, machine, switchNode } from "@/test/lab";

const office = lan("office");
const vlanArea = lan("v20", { name: "vlan20" }, { x: 2000 });
/** On the office LAN's right border. */
const r = autoRouter("r", { x: 340, y: 92 });
const web = machine("web", {}, { x: 140, y: 92 });
const dmz = machine("dmz", {}, { x: 600, y: 92 });
const cli = machine("cli", {}, { x: 140, y: 500 });
const sw = switchNode("sw", {}, { x: 0, y: 500 });
const pc = machine("pc", {}, { x: 0, y: 300 });
const nodes = [office, vlanArea, r, web, dmz, cli, sw, pc];
const lans = [office, vlanArea];
const edges = [
  cable("toInside", "r", "web", { sourceHandle: "port" }),
  cable("toOutside", "r", "dmz", { sourceHandle: "port" }),
  cable("onSwitch", "pc", "sw", { sourceHandle: "top", targetHandle: "p1" }),
  cable("toLan", "cli", "office", { sourceHandle: "top", targetHandle: "left" }),
  cable("toVlanArea", "cli", "v20"),
];
const shown = (id: string) => shownCables(nodes, edges, lans).find((e) => e.id === id);

describe("facingSides", () => {
  test("an appliance on a LAN's border faces out of it", () => {
    expect(facingSides(nodes, edges, lans).r).toBe("right");
  });

  test("an appliance elsewhere faces down when most of its cables lead below it", () => {
    const fw = machine("fw", { icon: "shield" }, { x: 1000, y: 0 });
    const below = [machine("b1", {}, { x: 900, y: 200 }), machine("b2", {}, { x: 1100, y: 200 })];
    const sides = facingSides([fw, ...below], [cable("c1", "fw", "b1"), cable("c2", "b2", "fw")], []);
    expect(sides.fw).toBe("bottom");
  });

  test("an appliance with its cables above keeps its default side", () => {
    const fw = machine("fw", { icon: "shield" }, { x: 1000, y: 500 });
    expect(facingSides([fw, pc], [cable("c", "fw", "pc")], []).fw).toBeUndefined();
  });

  test("a switch's port faces up when the device on it is above the switch", () => {
    expect(facingSides(nodes, edges, lans)["sw:p1"]).toBe("top");
  });
});

describe("shownCables", () => {
  test("an appliance on a LAN's border shows its inside port toward that LAN's machines, its outside port otherwise", () => {
    expect([shown("toInside")?.sourceHandle, shown("toOutside")?.sourceHandle]).toEqual(["lan", "port"]);
  });

  test("a machine's end leaves from its top or bottom, whichever faces the other end", () => {
    expect([shown("onSwitch")?.sourceHandle, shown("toLan")?.sourceHandle]).toEqual(["bottom", "top"]);
  });

  test("a switch keeps the port the cable is plugged into", () => {
    expect(shown("onSwitch")?.targetHandle).toBe("p1");
  });

  test("a LAN's end is on its side facing the other end", () => {
    expect(shown("toLan")?.targetHandle).toBe("bottom");
  });

  test("a cable on a VLAN takes the VLAN's color; one on a plain LAN none", () => {
    expect([shown("onSwitch")?.data?.color, shown("toVlanArea")?.data?.color, shown("toLan")?.data?.color]).toEqual(["#2f9e44", "#1971c2", undefined]);
  });

  test("a cable to a node that is gone is shown as it is", () => {
    const loose = cable("loose", "gone", "web");
    expect(shownCables(nodes, [loose], lans)[0]).toBe(loose);
  });
});
