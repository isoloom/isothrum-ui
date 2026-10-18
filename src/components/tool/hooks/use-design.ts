import { useEffect, useState } from "react";
import { desktop } from "@/lib/tool/desktop";
import type { Design } from "@/lib/tool/model";
import { loadDesign, saveDesign } from "@/lib/tool/storage";

/**
 * The canvas's look: a preference of this browser (a share link brings its own). The desktop
 * app opens in business, the site in the sketch.
 */
export function useDesign() {
  const [design, setDesign] = useState<Design>(() => (desktop() ? "business" : "sketch"));
  useEffect(() => {
    const saved = loadDesign();
    if (saved)
      queueMicrotask(() => {
        setDesign(saved);
      });
  }, []);
  const chooseDesign = (d: Design) => {
    setDesign(d);
    saveDesign(d);
  };
  return { design, setDesign, chooseDesign };
}
