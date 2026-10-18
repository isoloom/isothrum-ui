import { describe, expect, test } from "vitest";
import { accessVlan, isTrunkPort, switchLans, switchPortLabel, trunkInterface, trunkStripes, vlanColor, vlanName, vlanOf } from "./vlans";
import { cable, switchNode } from "@/test/lab";

describe("VLAN names and colors", () => {
  test("names a VLAN vlan<id>, and reads the number back from a LAN's name", () => {
    expect(vlanName(10)).toBe("vlan10");
    expect(["vlan10", "vlan0", "vlan", "vlan12345", "xvlan1"].map(vlanOf)).toEqual([10, 0, null, null, null]);
  });

  test("colors a VLAN by its tens, eight colors around", () => {
    expect(vlanColor(10)).toBe("#2f9e44");
    expect(vlanColor(14)).toBe(vlanColor(10));
    expect(vlanColor(90)).toBe(vlanColor(10));
    expect(vlanColor(-10)).toBe(vlanColor(10));
  });

  test("stripes a trunk with the colors of its VLANs, muted when it carries none", () => {
    expect(trunkStripes([{ id: 10 }, { id: 20 }])).toBe("repeating-linear-gradient(135deg, #2f9e44 0px 5px, #1971c2 5px 10px)");
    expect(trunkStripes([])).toBe("var(--muted)");
  });

  test("names a trunk's interface after its LAN, within Linux's limit", () => {
    expect(["sw1", "a-very-long-lan-name", "abcdefghi-x"].map(trunkInterface)).toEqual(["sw1", "a-very-lon", "abcdefghi"]);
  });
});

describe("switch ports", () => {
  const sw = switchNode("sw1");

  test("the T port and any port set to trunk are trunks", () => {
    expect(["trunk", "p4"].map((h) => isTrunkPort(sw, h))).toEqual([true, true]);
    expect(["p1", null, "eth0"].map((h) => isTrunkPort(sw, h))).toEqual([false, false, false]);
  });

  test("an access port is in its VLAN; a trunk, a free port or no port is in none", () => {
    expect(["p1", "p3"].map((h) => accessVlan(sw, h))).toEqual([10, 20]);
    expect(["p4", "p5", "trunk", "eth0", undefined].map((h) => accessVlan(sw, h))).toEqual([null, null, null, null, null]);
  });

  test("labels a port 1, 2… or T", () => {
    expect(["p1", "p12", "trunk", "", null, undefined, "x"].map(switchPortLabel)).toEqual(["1", "12", "T", "", "", "", ""]);
  });
});

describe("switchLans", () => {
  const s1 = switchNode("s1", { name: "sw1", vlans: [{ id: 10, cidr: "10.10.10.0/24" }] });
  const s2 = switchNode("s2", { name: "sw2", vlans: [{ id: 30, cidr: "10.10.30.0/24" }] });
  const s3 = switchNode("s3", { name: "sw3", vlans: [{ id: 10, cidr: "10.10.10.0/24" }] });

  test("switches cabled together are one LAN, named after the first", () => {
    const lanOf = switchLans([s1, s2], [cable("c", "s2", "s1")]);
    expect([lanOf("s1"), lanOf("s2")]).toEqual(["sw1", "sw1"]);
  });

  test("switches sharing a VLAN number are one LAN", () => {
    expect(switchLans([s1, s3], [])("s3")).toBe("sw1");
  });

  test("a switch alone is its own LAN, and an unknown id has none", () => {
    const lanOf = switchLans([s1, s2], []);
    expect([lanOf("s2"), lanOf("nope")]).toEqual(["sw2", ""]);
  });
});
