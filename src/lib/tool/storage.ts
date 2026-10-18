import { isDesign, normalizeDraft, storedEdges, storedNodes } from "./draft";
import type { Design, Draft } from "./model";
import { currentMachine } from "./os";
import type { Preset } from "./presets";

/**
 * What the editor keeps in this browser (localStorage). Storage can be blocked (a private
 * window) or full: then reading gives nothing and writing keeps nothing, and the editor works on.
 */

const DRAFT_KEY = "isothrum-canvas-v1";
const DEVICES_KEY = "isothrum-devices-v1";
const DESIGN_KEY = "isothrum-design";
const BLOCKS_KEY = "isothrum-toolbar-blocks";
const AUTO_START_KEY = "isothrum-auto-start";
const PROJECT_KEY = "isothrum-project";

/** The stored value at `key`, parsed; null when there is none or it can't be read. */
function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** Stores `value` at `key` as JSON, or removes it when null. */
function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept: it lasts as long as the page.
  }
}

/** The last lab drawn in this browser; none (a blank canvas) when what is kept hasn't a lab's shape. */
export function loadDraft(): Draft | null {
  return normalizeDraft(read(DRAFT_KEY));
}

/** Keeps the lab, without its UI state (selection is not part of the lab). */
export function saveDraft(draft: Draft): void {
  write(DRAFT_KEY, { name: draft.name, nodes: storedNodes(draft.nodes), edges: storedEdges(draft.edges) });
}

/** Whether a stored device has what placing it needs: an id, its machine, a name prefix. */
function isPreset(p: unknown): p is Preset {
  if (typeof p !== "object" || p === null) return false;
  const { id, data, prefix } = p as Partial<Record<keyof Preset, unknown>>;
  return Boolean(id) && Boolean(data) && Boolean(prefix);
}

/** Devices saved from the canvas (GNS3's appliances), placed from the toolbar like the built-in ones. */
export function loadDevices(): Preset[] {
  const list = read(DEVICES_KEY);
  // Saved before Isoloom's new format: OS names as it writes them now.
  return Array.isArray(list) ? list.filter(isPreset).map((p) => ({ ...p, data: currentMachine(p.data) })) : [];
}

export function saveDevices(list: Preset[]): void {
  write(DEVICES_KEY, list);
}

/** The canvas's look picked in this browser, if any. */
export function loadDesign(): Design | null {
  try {
    const saved = localStorage.getItem(DESIGN_KEY);
    return isDesign(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveDesign(design: Design): void {
  try {
    localStorage.setItem(DESIGN_KEY, design);
  } catch {
    // The choice lasts as long as the page.
  }
}

/** The kind each toolbar block places, by block id, as picked last. */
export function loadBlockChoices(): Record<string, string> | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BLOCKS_KEY) ?? "{}");
    return saved && typeof saved === "object" ? (saved as Record<string, string>) : null;
  } catch {
    // The first kind of each block.
    return null;
  }
}

export function saveBlockChoices(choices: Record<string, string>): void {
  write(BLOCKS_KEY, choices);
}

/** The labs that start when the desktop app opens on them (GNS3's auto-start). */
function autoStartLabs(): string[] {
  const list = read(AUTO_START_KEY);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
}

/** Whether `lab` starts when the app opens on it. */
export function autoStarts(lab: string): boolean {
  return autoStartLabs().includes(lab);
}

export function setAutoStarts(lab: string, on: boolean): void {
  const others = autoStartLabs().filter((l) => l !== lab);
  write(AUTO_START_KEY, on ? [...others, lab] : others);
}

/** The saved project the editor is attached to. */
export interface ProjectRef {
  id: string;
  name: string;
}

export function loadProject(): ProjectRef | null {
  return read(PROJECT_KEY) as ProjectRef | null;
}

export function saveProject(p: ProjectRef | null): void {
  write(PROJECT_KEY, p);
}
