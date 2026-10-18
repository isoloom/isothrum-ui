import { describe, expect, test, vi } from "vitest";
import { LAN_BEHAVIOR } from "./model";
import { PRESETS } from "./presets";
import {
  autoStarts,
  loadBlockChoices,
  loadDesign,
  loadDevices,
  loadDraft,
  loadProject,
  saveBlockChoices,
  saveDesign,
  saveDevices,
  saveDraft,
  saveProject,
  setAutoStarts,
} from "./storage";
import { cable, lan, machine } from "@/test/lab";

/** This browser's storage, faked: what it holds, by key. */
function useStorage(entries: Record<string, string> = {}): Map<string, string> {
  const held = new Map(Object.entries(entries));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => held.get(k) ?? null,
    setItem: (k: string, v: string) => held.set(k, v),
    removeItem: (k: string) => held.delete(k),
  });
  return held;
}

/** Storage a private window blocks: every call throws. */
function useBlockedStorage(): void {
  const blocked = () => {
    throw new Error("blocked");
  };
  vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
}

describe("the draft", () => {
  test("keeps the lab without its UI state, and reads it back current", () => {
    const held = useStorage();
    saveDraft({ name: "lab", nodes: [{ ...lan("office"), selected: true }, machine("web")], edges: [cable("c", "web", "office")], design: "business" });
    expect(JSON.parse(held.get("isothrum-canvas-v1") ?? "")).not.toHaveProperty("design");
    expect(loadDraft()?.nodes[0]).toMatchObject({ ...LAN_BEHAVIOR, id: "office" });
    expect(loadDraft()?.nodes[0]).not.toHaveProperty("selected");
  });

  test("is nothing when there is none, it isn't JSON or it hasn't a lab's shape", () => {
    useStorage();
    expect(loadDraft()).toBeNull();
    useStorage({ "isothrum-canvas-v1": "{" });
    expect(loadDraft()).toBeNull();
    useStorage({ "isothrum-canvas-v1": JSON.stringify({ nodes: [null], edges: [] }) });
    expect(loadDraft()).toBeNull();
  });
});

describe("saved devices", () => {
  test("come back as they were saved", () => {
    useStorage();
    saveDevices([PRESETS[0]]);
    expect(loadDevices()).toEqual([PRESETS[0]]);
  });

  test("come back with their OS as Isoloom names it now", () => {
    const old = { ...PRESETS[0], data: { ...PRESETS[0].data, kind: "vm", os: "windows-server-2022" } };
    useStorage({ "isothrum-devices-v1": JSON.stringify([old]) });
    expect(loadDevices()[0].data.os).toBe("windows-server@2022");
  });

  test("leave out what can't be placed, and anything that isn't a list", () => {
    useStorage({ "isothrum-devices-v1": JSON.stringify([PRESETS[1], { id: "x" }, null]) });
    expect(loadDevices()).toEqual([PRESETS[1]]);
    useStorage({ "isothrum-devices-v1": "{}" });
    expect(loadDevices()).toEqual([]);
  });
});

describe("the look and the toolbar", () => {
  test("keep the canvas's look, and only a known one", () => {
    useStorage();
    saveDesign("business");
    expect(loadDesign()).toBe("business");
    useStorage({ "isothrum-design": "neon" });
    expect(loadDesign()).toBeNull();
  });

  test("keep the kind each toolbar block places", () => {
    useStorage();
    expect(loadBlockChoices()).toEqual({});
    saveBlockChoices({ router: "router-frr" });
    expect(loadBlockChoices()).toEqual({ router: "router-frr" });
  });
});

describe("auto-start and the attached project", () => {
  test("a lab starts with the app once it is set to, until it is unset", () => {
    useStorage();
    setAutoStarts("lab-a", true);
    setAutoStarts("lab-a", true);
    expect(autoStarts("lab-a")).toBe(true);
    setAutoStarts("lab-a", false);
    expect(autoStarts("lab-a")).toBe(false);
  });

  test("keeps the attached project, and forgets it when detached", () => {
    const held = useStorage();
    saveProject({ id: "p1", name: "office" });
    expect(loadProject()).toEqual({ id: "p1", name: "office" });
    saveProject(null);
    expect(held.has("isothrum-project")).toBe(false);
  });
});

test("blocked storage keeps nothing and reads nothing, without failing", () => {
  useBlockedStorage();
  expect(() => {
    saveDraft({ name: "lab", nodes: [], edges: [] });
    saveDesign("sketch");
    setAutoStarts("lab", true);
  }).not.toThrow();
  expect([loadDraft(), loadDesign(), loadBlockChoices(), loadProject(), loadDevices()]).toEqual([null, null, null, null, []]);
});
