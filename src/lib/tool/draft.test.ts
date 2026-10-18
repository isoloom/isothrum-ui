import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { decodeLab, encodeLab, isDesign, normalizeDraft, plainDraft, storedEdges, storedNodes } from "./draft";
import { LAN_BEHAVIOR, cleanName, type CableEdge, type Draft } from "./model";
import { arbitraryLab } from "@/test/arbitrary";
import { autoRouter, cable, lan, machine } from "@/test/lab";

/** A lab with UI state on it: a selected, measured machine, a selected cable with conditions. */
const lab = (): Draft => ({
  name: "office-lab",
  nodes: [{ ...lan("office"), ...LAN_BEHAVIOR }, { ...machine("web"), selected: true, dragging: false, measured: { width: 120, height: 116 } }, autoRouter("r")],
  edges: [{ ...cable("c1", "web", "office", { sourceHandle: "top", tc: { delay: 5 }, color: "#000" }), selected: true }],
});

test("isDesign knows the canvas's two looks", () => {
  expect([isDesign("sketch"), isDesign("business"), isDesign("neon"), isDesign(undefined)]).toEqual([true, true, false, false]);
});

describe("what a lab keeps", () => {
  test("stored nodes keep the lab only: id, type, position, data, size", () => {
    expect(storedNodes(lab().nodes)[1]).toEqual({ id: "web", type: "machine", position: { x: 0, y: 0 }, data: machine("web").data, width: undefined, height: undefined });
  });

  test("stored cables keep their ends and their data, or the data they are given", () => {
    const [e] = storedEdges(lab().edges, () => undefined);
    expect(e).toEqual({ id: "c1", type: "cable", source: "web", sourceHandle: "top", target: "office", targetHandle: null, data: undefined });
  });

  test("a plain draft has no selection, drag or measured size", () => {
    const plain = plainDraft(lab());
    expect(plain.nodes.some((n) => "selected" in n || "dragging" in n || "measured" in n)).toBe(false);
    expect(plain.edges.some((e) => "selected" in e)).toBe(false);
  });
});

describe("normalizeDraft", () => {
  test("refuses what has no lists of nodes and edges", () => {
    for (const bad of [null, 1, "x", [], {}, { nodes: [], edges: {} }]) expect(normalizeDraft(bad)).toBeNull();
  });

  test("is null, not an error, for a null node or cable", () => {
    expect(normalizeDraft({ name: "x", nodes: [null], edges: [] })).toBeNull();
    expect(normalizeDraft({ name: "x", nodes: [], edges: [null] })).toBeNull();
  });

  test("refuses a node without its id, position or data, a cable without its ends, or a name that isn't text", () => {
    const m = machine("m");
    for (const bad of [{ ...m, id: 1 }, { ...m, position: null }, { ...m, data: undefined }]) expect(normalizeDraft({ name: "x", nodes: [bad], edges: [] })).toBeNull();
    for (const bad of [{ id: "c", source: "m" }, { id: "c", target: "m" }, { source: "m", target: "m" }]) expect(normalizeDraft({ name: "x", nodes: [m], edges: [bad] })).toBeNull();
    expect(normalizeDraft({ name: 5, nodes: [], edges: [] })).toBeNull();
  });

  test("makes LANs frames again and moves cables onto today's handles", () => {
    const stored = { name: "x", nodes: [lan("office"), autoRouter("r")], edges: [cable("c", "r", "office", { sourceHandle: "left" })] };
    const d = normalizeDraft(stored);
    expect(d?.nodes[0]).toMatchObject(LAN_BEHAVIOR);
    expect(d?.edges[0].sourceHandle).toBe("port");
  });

  test("names a stored machine's OS and Cisco OS as Isoloom does now", () => {
    const vm = machine("pc", { kind: "vm", os: "ubuntu-24.04" });
    const sw = machine("sw", { appliance: "cisco-viosl2" as never });
    const d = normalizeDraft({ name: "x", nodes: [vm, sw], edges: [] });
    expect(d?.nodes.map((n) => n.data)).toMatchObject([{ os: "ubuntu@24.04" }, { appliance: "cisco-vios-l2" }]);
  });
});

describe("normalizeDraft, for anything stored", () => {
  /** Something stored as a node or a cable: any of their fields, each of any JSON value or a likely one. */
  const ids = fc.constantFrom("a", "b");
  const field = <T>(likely: fc.Arbitrary<T>) => fc.oneof(likely, fc.jsonValue());
  const nodeish = fc.record(
    { id: field(ids), type: field(fc.constantFrom("machine", "lan", "switch", "note")), position: field(fc.constant({ x: 0, y: 0 })), data: field(fc.constant({ icon: "router" })) },
    { requiredKeys: [] },
  );
  const cableish = fc.record({ id: field(ids), source: field(ids), target: field(ids), sourceHandle: fc.jsonValue(), data: fc.jsonValue() }, { requiredKeys: [] });
  const stored = fc.oneof(fc.jsonValue(), fc.record({ name: field(fc.string()), nodes: fc.array(field(nodeish)), edges: fc.array(field(cableish)) }));

  test("never throws: it is a draft or null", () => {
    fc.assert(
      fc.property(stored, (v) => {
        expect(() => normalizeDraft(v)).not.toThrow();
      }),
    );
  });

  test("opens any lab the editor draws, as storage keeps it", () => {
    fc.assert(
      fc.property(arbitraryLab, (drawn) => {
        expect(normalizeDraft(JSON.parse(JSON.stringify(drawn)))?.nodes.map((n) => n.id)).toEqual(drawn.nodes.map((n) => n.id));
      }),
    );
  });
});

describe("a lab in a link", () => {
  test("is base64url, which a link carries as it is", async () => {
    expect(await encodeLab(lab())).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("comes back with its nodes, cables and ports", async () => {
    const d = await decodeLab(await encodeLab(lab()));
    expect(d?.nodes.map((n) => n.id)).toEqual(["office", "web", "r"]);
    expect(d?.edges[0]).toMatchObject({ source: "web", sourceHandle: "top", target: "office", data: { aPort: "eth0", bPort: "eth0" } });
  });

  test("comes back with its machines' OS as Isoloom names it now", async () => {
    const old = { ...lab(), nodes: [machine("pc", { kind: "vm", os: "debian-12" })], edges: [] };
    expect((await decodeLab(await encodeLab(old)))?.nodes[0].data).toMatchObject({ os: "debian@12" });
  });

  test("keeps the cables' conditions", async () => {
    const d = await decodeLab(await encodeLab(lab()));
    expect(d?.edges[0].data?.tc).toEqual({ delay: 5 });
  });

  test("leaves the UI state and the cables' drawing color behind", async () => {
    const d = await decodeLab(await encodeLab(lab()));
    expect(d?.nodes[1]).not.toHaveProperty("selected");
    expect(d?.edges[0].data).toEqual({ aPort: "eth0", bPort: "eth0", tc: { delay: 5 } });
  });

  test("carries the look only when it isn't the default sketch", async () => {
    expect((await decodeLab(await encodeLab({ ...lab(), design: "business" })))?.design).toBe("business");
    expect((await decodeLab(await encodeLab({ ...lab(), design: "sketch" })))?.design).toBeUndefined();
  });

  test("cleans the lab's name, or calls it shared-lab", async () => {
    expect((await decodeLab(await encodeLab({ ...lab(), name: "My Lab!" })))?.name).toBe("mylab");
    expect((await decodeLab(await encodeLab({ ...lab(), name: "" })))?.name).toBe("shared-lab");
  });

  test("is nothing when the code isn't a lab", async () => {
    for (const code of ["", "abc", "!!"]) expect(await decodeLab(code)).toBeNull();
  });
});

describe("any lab in a link", () => {
  test("comes back with its name, look, nodes and cables: their ends, ports and conditions", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryLab, async (drawn) => {
        const d = await decodeLab(await encodeLab(drawn));
        expect([d?.name, d?.design]).toEqual([cleanName(drawn.name) || "shared-lab", drawn.design === "business" ? "business" : undefined]);
        expect(d?.nodes.map((n) => [n.id, n.type, n.position, n.data])).toEqual(drawn.nodes.map((n) => [n.id, n.type, n.position, n.data]));
        const ends = (e: CableEdge) => [e.id, e.source, e.target, { aPort: e.data?.aPort, bPort: e.data?.bPort, tc: e.data?.tc }];
        expect(d?.edges.map((e) => [e.id, e.source, e.target, e.data])).toEqual(drawn.edges.map(ends));
      }),
    );
  });
});
