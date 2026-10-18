import { describe, expect, test } from "vitest";
import { fromGns3 } from "./gns3-import";
import type { Gns3Text } from "./gns3-parts";
import { MACHINE_H, MACHINE_W, nodeName } from "./model";

const text: Gns3Text = { notGns3: "", noTopology: "", cisco: () => "", firewall: () => "", noEquivalent: () => "", noNodes: "" };
const docker = (node_id: string, name: string, x = 0, y = 0) => ({ node_id, node_type: "docker", name, x, y, properties: { image: "alpine" } });
const sw = (node_id: string) => ({ node_id, node_type: "ethernet_switch", name: node_id, x: 0, y: 0 });
/** A project's lab: its nodes, links (by GNS3 id) and drawings. */
const labOf = (nodes: object[], links: string[][] = [], drawings: object[] = [], name?: string) =>
  fromGns3(JSON.stringify({ name, topology: { nodes, links: links.map((ends) => ({ nodes: ends.map((node_id) => ({ node_id })) })), drawings } }), text).lab;

describe("names", () => {
  test("spaces and underscores become dashes, and a taken name gets -2, -3", () => {
    expect(labOf([docker("a", "web"), docker("b", "web"), docker("c", "My_Box 1")]).nodes.map(nodeName)).toEqual(["web", "web-2", "my-box-1"]);
  });

  test("a nameless machine is called machine", () => {
    expect(labOf([docker("a", "")]).nodes.map(nodeName)).toEqual(["machine"]);
  });

  test("the lab is named after the project, or gns3-lab", () => {
    expect([labOf([], [], [], "a_b c").name, labOf([]).name]).toEqual(["a-b-c", "gns3-lab"]);
  });
});

describe("where things go", () => {
  test("positions spread out twice as far as GNS3's", () => {
    expect(labOf([docker("a", "web", 100, 50)]).nodes[0].position).toEqual({ x: 230 - MACHINE_W / 2, y: 130 - MACHINE_H / 2 });
  });

  test("LANs come first, so they are drawn under the machines", () => {
    expect(labOf([docker("a", "web"), sw("s1")]).nodes.map((n) => n.type)).toEqual(["lan", "machine"]);
  });

  test("a LAN drawn over a machine it isn't cabled to is hidden", () => {
    const lan = labOf([sw("s1"), docker("a", "web", 0, 10)]).nodes[0];
    expect(lan.type === "lan" && lan.data.hidden).toBe(true);
  });

  test("text drawings become notes, scaled; empty ones are left out", () => {
    const drawings = [{ x: 10, y: 20, svg: '<svg width="100" height="40"><text>Hello</text></svg>' }, { svg: "<svg></svg>" }];
    expect(labOf([], [], drawings).nodes).toEqual([
      expect.objectContaining({ type: "note", position: { x: 20, y: 40 }, width: 200, height: 80, data: { text: "Hello", shape: "text", color: "yellow" } }),
    ]);
  });
});

describe("links", () => {
  test("a link between two machines is a cable between them, each end on its next free port", () => {
    const lab = labOf([docker("a", "web"), docker("b", "db"), docker("c", "cache")], [["a", "b"], ["a", "c"]]);
    expect(lab.edges.map((e) => e.data)).toEqual([
      { aPort: "eth0", bPort: "eth0" },
      { aPort: "eth1", bPort: "eth0" },
    ]);
  });

  test("a machine linked twice to one LAN gets one cable, and a link with one end none", () => {
    const lab = labOf([sw("s1"), docker("a", "web", 300, 300)], [["s1", "a"], ["a", "s1"], ["a"]]);
    expect(lab.edges).toHaveLength(1);
  });
});
