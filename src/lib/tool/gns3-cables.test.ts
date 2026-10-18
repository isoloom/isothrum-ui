import { describe, expect, test } from "vitest";
import { type Gns3Wiring, gns3Cables } from "./gns3-cables";
import { autoRouter, lan, machine } from "@/test/lab";

/** A GNS3 LAN where its switch was: 260 by 160 at the origin. */
const office = lan("office", {}, { w: 260, h: 160 });
const above = machine("above", {}, { x: 100, y: -300 });
const left = machine("left", {}, { x: -600, y: 0 });
const router = autoRouter("router", { x: 600, y: 600 });
/** The wiring of `links` (GNS3 ids: s1 the switch, the machines by their own ids). */
const wiring = (links: [string, string][]): Gns3Wiring => ({
  links,
  machines: new Map([above, left, router].map((m) => [m.id, m])),
  lanOf: new Map([["s1", office]]),
  nodes: [office, above, left, router],
  lanSize: { w: 260, h: 160 },
});
const ends = (links: [string, string][]) => gns3Cables(wiring(links)).map((e) => [e.source, e.sourceHandle, e.target, e.targetHandle]);

describe("gns3Cables", () => {
  test("cables a machine to its switch's LAN, on the sides that face each other", () => {
    expect(ends([["above", "s1"], ["s1", "left"]])).toEqual([
      ["above", "bottom", "office", "top"],
      ["left", "bottom", "office", "left"],
    ]);
  });

  test("cables a router from its single port", () => {
    expect(ends([["router", "s1"]])[0][1]).toBe("port");
  });

  test("cables two machines to each other, each end on its next free port", () => {
    const [c] = gns3Cables(wiring([["above", "left"]]));
    expect(c).toMatchObject({ source: "above", target: "left", data: { aPort: "eth0", bPort: "eth0" } });
  });

  test("cables a machine to a LAN once, however many links join them", () => {
    expect(ends([["above", "s1"], ["s1", "above"]])).toHaveLength(1);
  });

  test("hides a LAN drawn over a machine it isn't cabled to", () => {
    const covered = machine("covered", {}, { x: 50, y: 20 });
    const w = { ...wiring([]), machines: new Map([["covered", covered]]), nodes: [{ ...office, data: { ...office.data } }, covered] };
    gns3Cables(w);
    expect(w.nodes[0].type === "lan" && w.nodes[0].data.hidden).toBe(true);
  });
});
