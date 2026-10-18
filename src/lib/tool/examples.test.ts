import { describe, expect, test } from "vitest";
import { exampleLab, vlanExample } from "./examples";
import { canvasIssues } from "./issues";
import { compile, issueText, sw1Networks } from "@/test/lab";

const networksOf = (t: ReturnType<typeof compile>) => Object.fromEntries(Object.entries(t.nodes).map(([n, m]) => [n, m.networks]));

describe("the starting lab", () => {
  const t = compile(exampleLab().nodes, exampleLab().edges, exampleLab().name);

  test("puts the workstation on the office LAN, the servers on theirs, and the router on both", () => {
    expect(networksOf(t)).toEqual({ user: { office: null }, router: { office: null, servers: null }, web: { servers: null }, db: { servers: null } });
  });

  test("has the workstation as access machine and the servers' services", () => {
    expect(t.nodes.user.access).toBe(true);
    expect([t.nodes.web.services, t.nodes.db.services]).toEqual([[{ port: 80 }], [{ port: 5432 }]]);
  });

  test("has nothing to fix", () => {
    expect(canvasIssues(exampleLab().nodes, issueText)).toEqual([]);
  });
});

describe("the VLAN lab", () => {
  const t = compile(vlanExample().nodes, vlanExample().edges);

  test("puts the PCs on vlan10, the server on vlan20 and the router on the trunk", () => {
    expect(networksOf(t)).toEqual({ router: { vlan10: null, vlan20: null }, pc1: { vlan10: null }, pc2: { vlan10: null }, srv: { vlan20: null } });
  });

  test("nests both VLANs under the switch", () => {
    expect(t.networks).toEqual(sw1Networks);
  });
});
