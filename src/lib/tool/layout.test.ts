import { describe, expect, test } from "vitest";
import { draftFromTopology, type Topology } from "./layout";
import { nodeName, type LabNode } from "./model";
import { byId, compile } from "@/test/lab";

/** Two LANs, a server and a workstation in the first, an automatic router between them, two machines on none. */
const topology: Topology = {
  name: "Lab One",
  nodes: {
    web: { kind: { container: { image: "nginx" } }, services: [{ port: 80 }, { port: 443, protocol: "https" }], networks: { lan1: 5, lan2: null } },
    r1: { kind: { router: {} }, networks: { lan1: null, lan2: null } },
    pc: { kind: { vm: { os: "debian@12", provision: ["a", "b"] } }, access: true, networks: { lan1: null } },
    loose: { kind: { container: { image: "alpine", idle: true } } },
    r2: { kind: { router: {} } },
  },
  networks: {
    lan1: { cidr: "10.10.1.0/24", tc: { delay: "40ms", jitter: "5ms", loss: 1, rate: "10mbit" } },
    lan2: { cidr: "10.10.2.0/24", internet: false },
  },
  links: [
    { a: { node: "web", port: "" }, b: { node: "pc", port: "eth5" }, tc: { rate: "1gbit", loss: 2 } },
    { a: { node: "ghost", port: "" }, b: { node: "pc", port: "" } },
  ],
};
const { draft } = draftFromTopology(topology);
/** The node named `name`. */
const named = (name: string): LabNode => {
  const n = draft.nodes.find((x) => x.type !== "note" && x.data.name === name);
  if (!n) throw new Error(`no node ${name}`);
  return n;
};
/** The cables from the node named `from` to LANs, as [handle, the LAN's name, port]. */
const cablesFrom = (from: string) =>
  draft.edges.filter((e) => e.source === named(from).id && byId(draft.nodes, e.target).type === "lan").map((e) => [e.sourceHandle, nodeName(byId(draft.nodes, e.target)), e.data?.aPort]);

describe("draftFromTopology", () => {
  test("names the lab after the topology, cleaned, or 'lab'", () => {
    expect(draft.name).toBe("labone");
    expect(draftFromTopology({ name: "", nodes: {} }).draft).toEqual({ name: "lab", nodes: [], edges: [] });
  });

  test("lays the LANs out side by side, each sized for the machines inside", () => {
    const lans = draft.nodes.filter((n) => n.type === "lan");
    expect(lans.map((l) => [l.data.name, l.position.x, l.width, l.height])).toEqual([
      ["lan1", 0, 420, 265],
      ["lan2", 580, 340, 265],
    ]);
  });

  test("keeps each LAN's block, its internet (on by default) and its conditions", () => {
    expect(named("lan1").data).toEqual({ name: "lan1", cidr: "10.10.1.0/24", internet: true, tc: { delay: 40, jitter: 5, loss: 1, rate: 10 } });
    expect(named("lan2").data).toMatchObject({ internet: false, tc: undefined });
  });

  test("places machines in a grid inside their first LAN", () => {
    expect([named("web").position, named("pc").position]).toEqual([
      { x: 40, y: 70 },
      { x: 210, y: 70 },
    ]);
  });

  test("puts an automatic router under the LANs it joins, and machines on no LAN in a row below", () => {
    expect([named("r1").position, named("loose").position, named("r2").position]).toEqual([
      { x: 420, y: 375 },
      { x: 0, y: 610 },
      { x: 170, y: 610 },
    ]);
  });

  test("turns each node into a machine: its kind, icon, image or OS, services and fixed addresses", () => {
    expect(named("web").data).toMatchObject({ kind: "container", icon: "server", image: "nginx", ports: "80, 443/https", pins: { lan1: 5 } });
    expect(named("pc").data).toMatchObject({ kind: "vm", icon: "laptop", os: "debian@12", provision: "a\nb", access: true });
    expect(named("loose").data).toMatchObject({ kind: "container", icon: "container", idle: true });
    expect(named("r1").data).toMatchObject({ kind: "router", icon: "router" });
  });

  test("cables a router to each LAN it joins, and a machine to the LANs it doesn't sit in", () => {
    expect(cablesFrom("r1")).toEqual([
      ["port", "lan1", "eth0"],
      ["port", "lan2", "eth1"],
    ]);
    expect(cablesFrom("web")).toEqual([["bottom", "lan2", "eth0"]]);
  });

  test("cables the links between known machines, a port left empty taking the next free one", () => {
    const link = draft.edges.find((e) => e.target === named("pc").id);
    expect(link?.data).toEqual({ aPort: "eth1", bPort: "eth5", tc: { loss: 2, rate: 1000 } });
    expect(draft.edges).toHaveLength(4);
  });

  test("reads back as the same machines on the same networks", () => {
    const t = compile(draft.nodes, draft.edges);
    expect(Object.fromEntries(Object.entries(t.nodes).map(([n, m]) => [n, m.networks]))).toEqual({
      web: { lan1: 5, lan2: null },
      pc: { lan1: null },
      r1: { lan1: null, lan2: null },
      loose: {},
      r2: {},
    });
  });
});

describe("draftFromTopology's link conditions", () => {
  test("keeps a delay written in microseconds or seconds", () => {
    const slow: Topology = { name: "slow", nodes: {}, networks: { far: { cidr: "10.10.9.0/24", tc: { delay: "1s", jitter: "500us" } } } };
    expect(draftFromTopology(slow).draft.nodes[0].data).toMatchObject({ tc: { delay: 1000, jitter: 0.5 } });
  });

  test("reports each condition it can't read, where it is, and draws the rest", () => {
    const odd: Topology = {
      name: "odd",
      nodes: { a: { kind: { container: { image: "alpine" } } }, b: { kind: { container: { image: "alpine" } } } },
      networks: { far: { cidr: "10.10.9.0/24", tc: { delay: "fast", loss: 1 } } },
      links: [{ a: { node: "a", port: "eth0" }, b: { node: "b", port: "eth0" }, tc: { rate: "lots" } }],
    };
    const { draft: laid, problems } = draftFromTopology(odd);
    expect(problems).toEqual([
      "networks.far.tc.delay: `fast` isn't a time like 40ms, 500us or 1s; the drawing leaves it out",
      "links[0].tc.rate: `lots` isn't a rate like 10mbit or 512kbit; the drawing leaves it out",
    ]);
    expect(laid.nodes.find((n) => n.type === "lan")?.data).toMatchObject({ tc: { loss: 1 } });
    expect(laid.edges[0].data?.tc).toBeUndefined();
  });

  test("has no problems with a topology whose conditions it all reads", () => {
    expect(draftFromTopology(topology).problems).toEqual([]);
  });
});
