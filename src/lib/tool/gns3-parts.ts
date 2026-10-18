import type { NoteShape } from "./model";
import { DEFAULT_OS } from "./os";

/** Pieces of a GNS3 import that read one thing: an OS from an image name, a note from a drawing. */

/** The editor's words for what a GNS3 import can't carry over (see the editor's text). */
export interface Gns3Text {
  notGns3: string;
  noTopology: string;
  cisco: (node: string, kind: string) => string;
  firewall: (node: string) => string;
  noEquivalent: (node: string, type: string) => string;
  noNodes: string;
}

export interface G3Drawing {
  x?: number;
  y?: number;
  svg?: string;
}

function windowsOs(t: string): string {
  if (t.includes("11")) return "windows@11";
  if (t.includes("10") && !t.includes("server")) return "windows@10";
  if (t.includes("2016")) return "windows-server@2016";
  if (t.includes("2019")) return "windows-server@2019";
  if (t.includes("2025")) return "windows-server@2025";
  return "windows-server@2022";
}

/** Linux distributions by a word in the image's name, each with its version guess. */
const DISTROS: [word: string, os: (t: string) => string][] = [
  ["kali", () => "kali@rolling"],
  ["ubuntu", (t) => (t.includes("20.04") ? "ubuntu@20.04" : t.includes("24") ? "ubuntu@24.04" : "ubuntu@22.04")],
  ["rocky", () => "rocky@9"],
  ["alma", () => "alma@9"],
  ["centos", () => "centos@7"],
  ["fedora", () => "fedora@42"],
  ["alpine", () => "alpine@3.19"],
  ["debian", (t) => (t.includes("11") ? "debian@11" : t.includes("13") ? "debian@13" : DEFAULT_OS)],
];

/** The Isoloom OS a VM's image or name suggests (Debian 12 when nothing does). */
export function guessOs(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("win")) return windowsOs(t);
  const distro = DISTROS.find(([word]) => t.includes(word));
  return distro ? distro[1](t) : DEFAULT_OS;
}

/** The text in an SVG drawing's <text> elements, one line each. */
function svgText(svg: string): string {
  return [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim())
    .filter(Boolean)
    .join("\n");
}

/** The text of an SVG drawing, and its shape and size (scaled by `scale`). */
export function drawingNote(d: G3Drawing, scale: number): { text: string; shape: NoteShape; w: number; h: number } | null {
  const svg = d.svg ?? "";
  const text = svgText(svg);
  const shape: NoteShape = svg.includes("<ellipse") ? "ellipse" : svg.includes("<rect") ? "rect" : "text";
  if (!text && shape === "text") return null;
  const w = Number(/width="([\d.]+)"/.exec(svg)?.[1] ?? 0);
  const h = Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? 0);
  return { text, shape, w: Math.max(120, Math.min(600, w * scale)) || 200, h: Math.max(50, Math.min(400, h * scale)) || 90 };
}
