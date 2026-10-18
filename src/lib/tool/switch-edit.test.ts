import { describe, expect, test } from "vitest";
import { addVlan, changeVlan, cyclePort, removeVlan, vlanNumber } from "./switch-edit";
import { switchNode } from "@/test/lab";

/** vlan10 on ports 1 and 2, vlan20 on port 3, port 4 a trunk, the rest unassigned. */
const data = switchNode("sw1").data;

test("cyclePort steps a port through each VLAN, then trunk, then unassigned", () => {
  expect([0, 2, 3, 4].map((i) => cyclePort(data, i).ports[i])).toEqual([20, "trunk", null, 10]);
});

describe("VLANs", () => {
  test("a renumbered VLAN moves its ports along", () => {
    expect(changeVlan(data, 10, { id: 30 })).toEqual({
      vlans: [
        { id: 30, cidr: "10.10.10.0/24" },
        { id: 20, cidr: "10.10.20.0/24" },
      ],
      ports: [30, 30, 20, "trunk", null, null, null, null],
    });
  });

  test("a VLAN's new block leaves its ports", () => {
    expect(changeVlan(data, 20, { cidr: "10.10.99.0/24" }).ports).toBe(data.ports);
  });

  test("a removed VLAN leaves its ports unassigned", () => {
    expect(removeVlan(data, 10)).toEqual({ vlans: [{ id: 20, cidr: "10.10.20.0/24" }], ports: [null, null, 20, "trunk", null, null, null, null] });
  });

  test("a new VLAN is numbered 10 after the highest, with its own block", () => {
    expect(addVlan(data).vlans.at(-1)).toEqual({ id: 30, cidr: "10.10.30.0/24" });
    expect(addVlan({ ...data, vlans: [] }).vlans).toEqual([{ id: 10, cidr: "10.10.10.0/24" }]);
  });

  test("a VLAN numbered past 255 gets a block outside 10.10", () => {
    expect(addVlan({ ...data, vlans: [{ id: 250, cidr: "x" }] }).vlans.at(-1)).toEqual({ id: 260, cidr: "10.11.0.0/24" });
  });
});

describe("vlanNumber", () => {
  test("takes a number from 1 to 4094", () => {
    expect(["1", "30", "4094"].map((t) => vlanNumber(data, t))).toEqual([1, 30, 4094]);
  });

  test("refuses one out of range, not a number, or one the switch has", () => {
    expect(["0", "4095", "abc", "10"].map((t) => vlanNumber(data, t))).toEqual([null, null, null, null]);
  });
});
