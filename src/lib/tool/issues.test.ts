import { describe, expect, test } from "vitest";
import { canvasIssues } from "./issues";
import { issueText, lan, machine, note, switchNode } from "@/test/lab";

describe("canvasIssues", () => {
  test("finds nothing on a lab with distinct names and agreeing blocks", () => {
    expect(canvasIssues([machine("web"), lan("office"), switchNode("sw1"), note("n")], issueText)).toEqual([]);
  });

  test("a VLAN with two blocks on two switches", () => {
    const other = switchNode("sw2", { vlans: [{ id: 10, cidr: "10.10.99.0/24" }] });
    expect(canvasIssues([switchNode("sw1"), other], issueText)).toEqual(["vlan10: 10.10.10.0/24 vs 10.10.99.0/24 on sw2"]);
  });

  test("a LAN area named like a VLAN with another block than its switches", () => {
    expect(canvasIssues([switchNode("sw1"), lan("l", { name: "vlan20", cidr: "10.10.2.0/24" })], issueText)).toEqual([
      "area vlan20: 10.10.2.0/24 vs 10.10.20.0/24",
    ]);
  });

  test("a machine, a LAN or a switch without a name", () => {
    const nodes = [machine("m", { name: "" }), lan("l", { name: "" }), switchNode("s", { name: "" })];
    expect(canvasIssues(nodes, issueText)).toEqual(["unnamed machine", "unnamed lan", "unnamed switch"]);
  });

  test("each port entry Isoloom couldn't take, by machine", () => {
    const nodes = [machine("web", { ports: "80, http, 53/udp, 70000" }), machine("db", { ports: "5432" })];
    expect(canvasIssues(nodes, issueText)).toEqual(["web: port http", "web: port 70000"]);
  });

  test("the same name twice, per kind of node", () => {
    const nodes = [machine("a", { name: "web" }), machine("b", { name: "web" }), lan("c", { name: "web" }), lan("d", { name: "x" }), lan("e", { name: "x" })];
    expect(canvasIssues(nodes, issueText)).toEqual(["two machines web", "two lans x"]);
  });
});
