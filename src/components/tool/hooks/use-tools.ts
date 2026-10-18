import { useEffect, useState } from "react";
import { LAN_TOOL, NOTE_TOOL, SWITCH_TOOL } from "@/lib/tool/blocks";
import { presetForKey } from "@/lib/tool/presets";
import { inTextField } from "./use-history";

/** Excalidraw's two modes: select (drag a box, Shift-click, Delete) or hand (drag moves the canvas). */
export type Mode = "select" | "hand";

/**
 * The device being placed (Excalidraw-style tool): the next click on the canvas drops it there.
 * Picking a tool selects again; picking the same one twice puts it down.
 */
export function useTools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const pick = (tool: string) => {
    setMode("select");
    setActiveTool(activeTool === tool ? null : tool);
  };
  const setModeOnly = (m: Mode) => {
    setMode(m);
    setActiveTool(null);
  };
  return { activeTool, setActiveTool, mode, setMode, pick, setModeOnly };
}

export type Tools = ReturnType<typeof useTools>;

/** The tool a key toggles: S a switch, L a LAN, T a note, 1–9 and 0 a device. */
function toolForKey(key: string): string | undefined {
  const lower = key.toLowerCase();
  if (lower === "s" && key.length === 1) return SWITCH_TOOL;
  if (lower === "l" && key.length === 1) return LAN_TOOL;
  if (lower === "t" && key.length === 1) return NOTE_TOOL;
  return presetForKey(key)?.id;
}

/** Keyboard: 1–9 and 0 pick a device, S, L, T a switch, LAN or note, V selects, H the hand, Escape puts it down. Not while typing in a field. */
export function useToolKeys(tools: Tools): void {
  const { setMode, setActiveTool } = tools;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || inTextField(e)) return;
      if (e.key === "Escape") setActiveTool(null);
      if (e.key === "v" || e.key === "V" || e.key === "h" || e.key === "H") {
        setMode(e.key === "h" || e.key === "H" ? "hand" : "select");
        setActiveTool(null);
      }
      const tool = toolForKey(e.key);
      if (tool) {
        setMode("select");
        setActiveTool((cur) => (cur === tool ? null : tool));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [setMode, setActiveTool]);
}
