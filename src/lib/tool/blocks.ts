import { PRESETS, shortcutOf, type Preset } from "./presets";
import type { EditorText } from "./text";

/** The toolbar's blocks: a switch, a router, a firewall, a container, a VM, and the saved devices. */

/** The switch tool's id in the toolbar (devices use their preset ids). */
export const SWITCH_TOOL = "switch";
/** The LAN tool's id in the toolbar. */
export const LAN_TOOL = "lan";
export const NOTE_TOOL = "note";

/** One kind a block places: a preset (a device), or the switch tool. */
export interface BlockOption {
  tool: string;
  label: string;
  hint: string;
  preset?: Preset;
  key?: string | null;
}
export interface Block {
  id: string;
  label: string;
  options: BlockOption[];
}

/** What a device runs: its OS (a VM), or its image. */
const runs = (p: Preset) => (p.data.kind === "vm" ? p.data.os : p.data.image);

/** A device's name and hint in the toolbar: the built-in ones by id (the hint, unless the text gives one, is what it runs), a saved one by its name. */
function presetText(p: Preset, t: EditorText): { label: string; hint: string } {
  if (p.group !== "mine") {
    const d = (t.devices as Partial<Record<string, { label: string; hint?: string }>>)[p.id];
    return d ? { label: d.label, hint: d.hint ?? runs(p) } : { label: p.id, hint: "" };
  }
  const what = p.data.kind === "vm" ? p.data.os : p.data.kind === "router" ? t.myDeviceRouter : p.data.image;
  return { label: p.label ?? p.prefix, hint: t.myDevice(what) };
}

/** The blocks of the toolbar, each listing the kinds it places (the switch block starts with the switch tool). */
export function deviceBlocks(presets: Preset[], mine: Preset[], t: EditorText): Block[] {
  const kinds = (ids: string[]) =>
    ids.flatMap((id): BlockOption[] => {
      const p = presets.find((x) => x.id === id);
      return p ? [{ tool: p.id, ...presetText(p, t), preset: p, key: shortcutOf(p.id) }] : [];
    });
  const switchTool: BlockOption = { tool: SWITCH_TOOL, label: t.toolbar.switch, hint: t.toolbar.switchTitle, key: "S" };
  const blocks: Block[] = [
    { id: "switch", label: t.toolbar.blocks.switch, options: [switchTool, ...kinds(["cisco-iol-l2"])] },
    { id: "router", label: t.toolbar.blocks.router, options: kinds(["router", "router-frr", "cisco-iol"]) },
    { id: "firewall", label: t.toolbar.blocks.firewall, options: kinds(["firewall"]) },
    { id: "container", label: t.toolbar.blocks.container, options: kinds(["container", "web", "database", "desktop"]) },
    { id: "vm", label: t.toolbar.blocks.vm, options: kinds(["linux-vm", "ubuntu-vm", "kali-vm", "windows-vm", "workstation"]) },
  ];
  if (mine.length) blocks.push({ id: "mine", label: t.toolbar.blocks.mine, options: kinds(mine.map((d) => d.id)) });
  return blocks;
}

/** What the tool being placed is called, if any (a LAN, a switch, a note, or a device). */
export function toolLabel(tool: string | null, presets: Preset[], t: EditorText): { label: string } | undefined {
  if (tool === LAN_TOOL) return { label: t.toolbar.lan };
  if (tool === SWITCH_TOOL) return { label: t.toolbar.switch };
  if (tool === NOTE_TOOL) return { label: t.toolbar.note };
  const picked = presets.find((p) => p.id === tool);
  return picked && presetText(picked, t);
}

/** Every device the toolbar can place: the built-in ones, then the saved ones. */
export const allPresets = (mine: Preset[]): Preset[] => [...PRESETS, ...mine];

/** The line under the toolbar: what a click does now. */
export function hintFor(tool: string | null, label: string | undefined, state: { hand: boolean; nodes: number; edges: number }, t: EditorText): string {
  if (label !== undefined) {
    if (tool === LAN_TOOL) return t.hints.lan;
    return tool === NOTE_TOOL ? t.hints.note : t.hints.place(label);
  }
  if (state.hand) return t.hints.hand;
  return state.nodes >= 2 && state.edges === 0 ? t.hints.cable : t.hints.select;
}
