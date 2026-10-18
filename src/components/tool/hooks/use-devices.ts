import { useEffect, useMemo, useState } from "react";
import { allPresets, deviceBlocks } from "@/lib/tool/blocks";
import type { MachineData } from "@/lib/tool/model";
import { deviceFrom, type Preset } from "@/lib/tool/presets";
import { loadBlockChoices, loadDevices, saveBlockChoices, saveDevices } from "@/lib/tool/storage";
import type { EditorText } from "@/lib/tool/text";
import type { Tools } from "./use-tools";

/**
 * Devices saved from the canvas, in this browser (loaded after mount: no localStorage on the
 * server), and the toolbar's blocks, each placing the kind picked last.
 */
export function useDevices(tools: Tools, setToast: (message: string) => void, t: EditorText) {
  const [myDevices, setMyDevices] = useState<Preset[]>([]);
  useEffect(() => {
    queueMicrotask(() => {
      setMyDevices(loadDevices());
    });
  }, []);
  const presets = useMemo(() => allPresets(myDevices), [myDevices]);
  const blocks = useMemo(() => deviceBlocks(presets, myDevices, t), [presets, myDevices, t]);
  const [blockChoice, setBlockChoice] = useState<Record<string, string>>({});
  useEffect(() => {
    const saved = loadBlockChoices();
    if (saved)
      queueMicrotask(() => {
        setBlockChoice(saved);
      });
  }, []);
  const keep = (list: Preset[]) => {
    setMyDevices(list);
    saveDevices(list);
  };
  return {
    presets,
    blocks,
    blockChoice,
    pickFromBlock: (block: string, tool: string) => {
      tools.pick(tool);
      setBlockChoice((c) => {
        const next = { ...c, [block]: tool };
        saveBlockChoices(next);
        return next;
      });
    },
    /** Saving a machine again under the same name replaces that device. */
    saveDevice: (m: MachineData) => {
      const device = deviceFrom(m);
      const name = device.label ?? "";
      keep([...myDevices.filter((d) => d.label !== name), device]);
      setToast(t.toasts.savedDevice(name));
    },
    forgetDevice: (id: string) => {
      keep(myDevices.filter((d) => d.id !== id));
      if (tools.activeTool === id) tools.setActiveTool(null);
    },
  };
}
