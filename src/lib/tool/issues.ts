import { isLan, isMachine, isSwitch, type LabNode } from "./model";
import { readPorts } from "./ports";
import { vlanName } from "./vlans";

/** The editor's words for what the canvas finds wrong (see the editor's text). */
export interface IssueText {
  vlanBlocks: (vlan: string, block: string, other: string, sw: string) => string;
  areaBlock: (lan: string, block: string, switches: string) => string;
  noName: Record<"machine" | "lan" | "switch", string>;
  sameName: Record<"machine" | "lan" | "switch", (name: string) => string>;
  /** A ports field entry Isoloom couldn't take: the machine and the entry. */
  badPort: (machine: string, entry: string) => string;
}

/** One VLAN, one block: every switch (and a LAN area of that name) must agree on it. */
function blockIssues(nodes: LabNode[], text: IssueText): string[] {
  const issues: string[] = [];
  const blocks = new Map<string, string>();
  for (const sw of nodes.filter(isSwitch)) {
    for (const v of sw.data.vlans) {
      const name = vlanName(v.id);
      const seen = blocks.get(name);
      if (seen && seen !== v.cidr) issues.push(text.vlanBlocks(name, seen, v.cidr, sw.data.name));
      blocks.set(name, v.cidr);
    }
  }
  for (const l of nodes.filter(isLan)) {
    const seen = blocks.get(l.data.name);
    if (seen && seen !== l.data.cidr) issues.push(text.areaBlock(l.data.name, l.data.cidr, seen));
  }
  return issues;
}

/** Names Isoloom would reject (none) or merge (the same twice), per kind of node. */
function nameIssues(nodes: LabNode[], text: IssueText): string[] {
  const issues: string[] = [];
  for (const [what, list] of [
    ["machine", nodes.filter(isMachine)],
    ["lan", nodes.filter(isLan)],
    ["switch", nodes.filter(isSwitch)],
  ] as const) {
    const seen = new Set<string>();
    for (const n of list) {
      if (!n.data.name) issues.push(text.noName[what]);
      else if (seen.has(n.data.name)) issues.push(text.sameName[what](n.data.name));
      seen.add(n.data.name);
    }
  }
  return issues;
}

/** Port entries Isoloom couldn't take (not a port, or not one of its protocols): left out of the topology, so said here. */
function portIssues(nodes: LabNode[], text: IssueText): string[] {
  return nodes.filter(isMachine).flatMap((m) => readPorts(m.data.ports).bad.map((entry) => text.badPort(m.data.name, entry)));
}

/** What the canvas can tell before the engine runs: names Isoloom would reject or merge, ports it couldn't take. */
export function canvasIssues(nodes: LabNode[], text: IssueText): string[] {
  return [...blockIssues(nodes, text), ...nameIssues(nodes, text), ...portIssues(nodes, text)];
}
