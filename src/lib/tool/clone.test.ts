import { describe, expect, test } from "vitest";
import { cloneLab } from "./clone";
import type { LabNode } from "./model";
import { byId, cable, lan, machine, note, switchNode } from "@/test/lab";

const office = lan("l1", { name: "office", cidr: "10.10.1.0/24" });
const web = machine("m1", { name: "web1", pins: { office: 20 } }, { x: 10, y: 20 });
const db = machine("m2", { name: "db1" });
const sw = switchNode("s1", { name: "sw1" });
const existing: LabNode[] = [office, web, db, sw];
const copy = (picked: LabNode[], edges = [cable("c1", "m1", "m2"), cable("c2", "m1", "l1")]) => cloneLab(picked, edges, existing, { x: 40, y: 50 });

describe("cloneLab", () => {
  test("copies under new ids, moved by the offset, selected", () => {
    const [c] = copy([web]).nodes;
    expect(c.id).not.toBe(web.id);
    expect(c).toMatchObject({ position: { x: 50, y: 70 }, selected: true });
  });

  test("gives each copy the next free name of its kind", () => {
    expect(copy([web, db, sw]).nodes.map((n) => (n.type === "note" ? "" : n.data.name))).toEqual(["web2", "db2", "sw2"]);
  });

  test("names a copy of a nameless machine copy<n>", () => {
    expect(copy([machine("m9", { name: "" })]).nodes.map((n) => (n.type === "note" ? "" : n.data.name))).toEqual(["copy1"]);
  });

  test("drops a machine's fixed addresses, which would collide with the original's", () => {
    const [c] = copy([web]).nodes;
    expect(c.type === "machine" && c.data.pins).toBeUndefined();
  });

  test("gives each copied LAN the next block free in the lab, one each", () => {
    const blocks = copy([office, office]).nodes.map((n) => (n.type === "lan" ? n.data.cidr : ""));
    expect(blocks).toEqual(["10.10.2.0/24", "10.10.3.0/24"]);
  });

  test("keeps a switch's VLAN numbers, in lists of its own", () => {
    const [c] = copy([sw]).nodes;
    expect(c.type === "switch" && c.data.vlans).toEqual(sw.data.vlans);
    expect(c.type === "switch" && c.data.vlans !== sw.data.vlans && c.data.ports !== sw.data.ports).toBe(true);
  });

  test("copies a note as it is", () => {
    expect(copy([note("n1")]).nodes[0].data).toEqual(note("n1").data);
  });

  test("copies only the cables between copied nodes, joined to the copies", () => {
    const { nodes, edges } = copy([web, db]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: nodes[0].id, target: nodes[1].id, selected: false, data: { aPort: "eth0", bPort: "eth0" } });
    expect(byId(nodes, edges[0].source).id).not.toBe("m1");
  });
});
