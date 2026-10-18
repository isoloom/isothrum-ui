import { describe, expect, test } from "vitest";
import { insideLan, lanRect, lanUnder, lansAround, sideOnLan, snapToLanEdge, within } from "./geometry";
import { MACHINE_H, MACHINE_W } from "./model";
import { autoRouter, lan, machine } from "@/test/lab";

/** The 400 by 300 LAN at the origin. */
const office = lan("office");
/** The position that centers a machine's box on `p`. */
const centeredOn = (p: { x: number; y: number }) => ({ x: p.x - MACHINE_W / 2, y: p.y - MACHINE_H / 2 });

describe("areas", () => {
  test("a LAN covers its position and size", () => {
    expect(lanRect(lan("l", {}, { x: 5, y: 6, w: 10, h: 20 }))).toEqual({ x: 5, y: 6, w: 10, h: 20 });
  });

  test("within includes the borders, and the slack around them", () => {
    const r = { x: 0, y: 0, w: 10, h: 10 };
    expect([within(r, { x: 10, y: 0 }), within(r, { x: 12, y: 5 }), within(r, { x: 12, y: 5 }, 2)]).toEqual([true, false, true]);
  });

  test("insideLan excludes the border", () => {
    expect(insideLan({ x: 200, y: 150 }, office)).toBe(true);
    expect(insideLan({ x: 0, y: 150 }, office)).toBe(false);
  });
});

describe("snapToLanEdge", () => {
  test("centers an appliance on the nearest border within reach", () => {
    expect(snapToLanEdge(centeredOn({ x: 10, y: 150 }), [office])).toEqual(centeredOn({ x: 0, y: 150 }));
    expect(snapToLanEdge(centeredOn({ x: 200, y: 290 }), [office])).toEqual(centeredOn({ x: 200, y: 300 }));
  });

  test("snaps to the closer of two LANs", () => {
    const servers = lan("servers", {}, { x: 500, w: 400 });
    expect(snapToLanEdge(centeredOn({ x: 470, y: 100 }), [office, servers])).toEqual(centeredOn({ x: 500, y: 100 }));
  });

  test("leaves an appliance where it is when no border is within 36", () => {
    const far = centeredOn({ x: -37, y: 150 });
    expect(snapToLanEdge(far, [office])).toBe(far);
  });

  test("goes by the size it is given", () => {
    expect(snapToLanEdge({ x: -100, y: 100 }, [office], { w: 180, h: 100 })).toEqual({ x: -90, y: 100 });
  });
});

describe("appliances on a LAN's border", () => {
  test("sideOnLan names the border the appliance's center is on", () => {
    expect(sideOnLan(autoRouter("r", centeredOn({ x: 400, y: 100 })), [office])).toBe("right");
    expect(sideOnLan(autoRouter("r", centeredOn({ x: 100, y: 0 })), [office])).toBe("top");
    expect(sideOnLan(autoRouter("r", centeredOn({ x: 100, y: 100 })), [office])).toBeNull();
  });

  test("lanUnder gives the LAN and the side", () => {
    const servers = lan("servers", {}, { x: 600 });
    const under = lanUnder(autoRouter("r", centeredOn({ x: 600, y: 100 })), [office, servers]);
    expect(under?.lan.id).toBe("servers");
    expect(under?.side).toBe("left");
  });
});

describe("lansAround", () => {
  test("a machine is on every LAN its center lies in", () => {
    const inner = lan("inner", {}, { x: 100, y: 100, w: 100, h: 100 });
    const m = machine("m", {}, centeredOn({ x: 150, y: 150 }));
    expect(lansAround(m, [office, inner, m]).map((l) => l.id)).toEqual(["office", "inner"]);
  });

  test("a hidden LAN takes no machine by position", () => {
    const m = machine("m", {}, centeredOn({ x: 150, y: 150 }));
    expect(lansAround(m, [{ ...office, data: { ...office.data, hidden: true } }, m])).toEqual([]);
  });

  test("a hidden LAN still takes the appliance on its edge", () => {
    const hidden = { ...office, data: { ...office.data, hidden: true } };
    const r = autoRouter("r", centeredOn({ x: 400, y: 100 }));
    expect(lansAround(r, [hidden, r]).map((l) => l.id)).toEqual(["office"]);
  });
});
