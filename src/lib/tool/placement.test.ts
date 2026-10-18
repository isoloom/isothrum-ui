import type { NodeChange } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import type { LabNode } from "./model";
import { paletteSpot, placeAppliance, placeMachine, placeSwitch, snapMoves } from "./placement";
import { PRESETS, type Preset } from "./presets";
import { autoRouter, lan, machine, switchNode } from "@/test/lab";

const preset = (id: string): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
/** The 400 by 300 office LAN at the origin, selected. */
const office = { ...lan("office"), selected: true };
const far = { x: 1000, y: 1000 };

test("paletteSpot staggers devices placed from the palette around the view's center", () => {
  expect(paletteSpot({ x: 500, y: 400 }, [])).toEqual({ x: 444, y: 360 });
  expect(paletteSpot({ x: 500, y: 400 }, Array.from({ length: 6 }, (_, i) => machine(String(i))))).toEqual({ x: 468, y: 384 });
});

describe("placeAppliance", () => {
  test("lands on a LAN's border when placed near it, the rest unselected", () => {
    const placed = placeAppliance(preset("router"), { x: 330, y: 100 }, false, [office], [office]);
    expect(placed.map((n) => [n.type, n.selected])).toEqual([
      ["lan", false],
      ["machine", true],
    ]);
    expect(placed[1].position).toEqual({ x: 340, y: 100 });
  });

  test("comes with a LAN of its own under it, away from any LAN", () => {
    const [newLan, , router] = placeAppliance(preset("router"), far, false, [office], [office]);
    expect(newLan.type === "lan" && newLan.data).toMatchObject({ name: "lan1", cidr: "10.10.2.0/24" });
    expect(newLan.position.y).toBe(router.position.y + 58);
  });

  test("centers a dropped router you configure on the point, as a machine would be", () => {
    const placed = placeAppliance(preset("router-frr"), far, true, [], []);
    expect(placed.at(-1)?.position).toEqual({ x: 976, y: 1021 });
  });
});

test("placeMachine adds the machine selected, the rest unselected", () => {
  const placed = placeMachine(preset("web"), { x: 5, y: 5 }, [{ ...machine("old"), selected: true }]);
  expect(placed.map((n) => [n.type !== "note" && n.data.name, n.selected])).toEqual([
    ["old", false],
    ["web1", true],
  ]);
});

describe("placeSwitch", () => {
  test("lands on a LAN's border when placed near it", () => {
    const placed = placeSwitch({ x: 217, y: 293 }, [office], [office]);
    expect(placed).toHaveLength(2);
    expect(placed[1].position).toEqual({ x: 47, y: 263 });
  });

  test("comes with its first VLAN's LAN hanging under it, away from any LAN", () => {
    const [vlanLan] = placeSwitch(far, [], []);
    expect(vlanLan).toMatchObject({ type: "lan", width: 600, height: 300, data: { name: "vlan10", cidr: "10.10.10.0/24" } });
  });
});

describe("snapMoves", () => {
  const nodes: LabNode[] = [office, autoRouter("r"), switchNode("sw"), machine("web")];
  const move = (id: string, position = { x: 330, y: 100 }): NodeChange<LabNode> => ({ type: "position", id, position });

  test("routers and firewalls dragged near a LAN's border land on it", () => {
    expect(snapMoves([move("r")], nodes, [office])[0]).toEqual(move("r", { x: 340, y: 100 }));
  });

  test("switches land on it too, by their own size", () => {
    expect(snapMoves([move("sw", { x: 47, y: 250 })], nodes, [office])[0]).toEqual(move("sw", { x: 47, y: 263 }));
  });

  test("other machines, and other changes, are left as they are", () => {
    const changes: NodeChange<LabNode>[] = [move("web"), { type: "select", id: "r", selected: true }];
    const snapped = snapMoves(changes, nodes, [office]);
    expect(snapped[0]).toBe(changes[0]);
    expect(snapped[1]).toBe(changes[1]);
  });
});
