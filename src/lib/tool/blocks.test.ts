import { describe, expect, test } from "vitest";
import { LAN_TOOL, NOTE_TOOL, SWITCH_TOOL, allPresets, deviceBlocks, hintFor, toolLabel } from "./blocks";
import { PRESETS, type Preset } from "./presets";
import { en } from "./text/en";

const mine: Preset = { id: "my-1", group: "mine", label: "gateway", prefix: "gateway", data: { ...PRESETS[0].data } };
const blocks = deviceBlocks(allPresets([mine]), [mine], en);
const options = (id: string) => blocks.find((b) => b.id === id)?.options ?? [];

describe("deviceBlocks", () => {
  test("has the switch, router, firewall, container and VM blocks, then the saved devices", () => {
    expect(blocks.map((b) => b.id)).toEqual(["switch", "router", "firewall", "container", "vm", "mine"]);
    expect(deviceBlocks(PRESETS, [], en).map((b) => b.id)).not.toContain("mine");
  });

  test("starts the switch block with the switch tool, on key S", () => {
    expect(options("switch").map((o) => [o.tool, o.key])).toEqual([
      [SWITCH_TOOL, "S"],
      ["cisco-iol-l2", null],
    ]);
  });

  test("names a built-in device in the editor's words, its hint what it runs when the text gives none", () => {
    expect(options("router")[0]).toMatchObject({ tool: "router", label: "Router", hint: en.devices.router.hint, key: "1" });
    expect(options("container")[0]).toMatchObject({ label: "Linux container", hint: "alpine:3.20" });
    expect(options("vm")[0]).toMatchObject({ label: "Linux VM", hint: "debian@12" });
  });

  test("names a saved device by its name, its hint what it runs", () => {
    expect(options("mine")).toEqual([{ tool: "my-1", label: "gateway", hint: "your device: automatic router", preset: mine, key: null }]);
  });
});

describe("toolLabel", () => {
  test("names the LAN, switch and note tools", () => {
    expect([LAN_TOOL, SWITCH_TOOL, NOTE_TOOL].map((t) => toolLabel(t, PRESETS, en)?.label)).toEqual(["LAN", "Switch", "Note"]);
  });

  test("names a device by its preset, and nothing when no tool or an unknown one is picked", () => {
    expect(toolLabel("web", PRESETS, en)?.label).toBe("Web server");
    expect([toolLabel(null, PRESETS, en), toolLabel("nope", PRESETS, en)]).toEqual([undefined, undefined]);
  });

  test("names a device the text doesn't know by its id", () => {
    const odd: Preset = { ...PRESETS[0], id: "odd" };
    expect(toolLabel("odd", [odd], en)).toEqual({ label: "odd", hint: "" });
  });
});

describe("hintFor", () => {
  const state = { hand: false, nodes: 0, edges: 0 };

  test("says how to place the tool picked", () => {
    expect(hintFor(LAN_TOOL, "LAN", state, en)).toBe(en.hints.lan);
    expect(hintFor(NOTE_TOOL, "Note", state, en)).toBe(en.hints.note);
    expect(hintFor("web", "Web server", state, en)).toBe(en.hints.place("Web server"));
  });

  test("with no tool: how to move the canvas, then how to cable two machines, then how to select", () => {
    expect(hintFor(null, undefined, { ...state, hand: true }, en)).toBe(en.hints.hand);
    expect(hintFor(null, undefined, { ...state, nodes: 2 }, en)).toBe(en.hints.cable);
    expect(hintFor(null, undefined, { ...state, nodes: 2, edges: 1 }, en)).toBe(en.hints.select);
  });
});
