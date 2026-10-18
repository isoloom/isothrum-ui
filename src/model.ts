/**
 * The editor's lab model and conversions, with no React: a lab's nodes and cables, the topology the
 * engine reads, and helpers to lay a topology out again. Used by hosts that work with labs outside
 * the canvas (the website's MCP server builds and reads topologies with these).
 */
export * from "@/lib/tool/model";
export { type Topology, type LaidOut, draftFromTopology } from "@/lib/tool/layout";
export { toTopology } from "@/lib/tool/topology";
export { PORT_PROTOCOLS, readPorts, portsText, type Service } from "@/lib/tool/ports";
export { exampleLab, vlanExample } from "@/lib/tool/examples";
export { planOf, ownFiles, type Engine, type Plan, type GeneratedFile } from "@/lib/tool/engine";
export { groupByTarget, type Target, type TargetText } from "@/lib/tool/export-targets";
export { canvasIssues, type IssueText } from "@/lib/tool/issues";
