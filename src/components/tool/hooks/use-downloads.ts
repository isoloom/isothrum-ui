import { useState } from "react";
import type { Engine, Plan } from "@/lib/tool/engine";

/** Saves `blob` as `filename`, through a link the browser follows. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const zip = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: "application/zip" });

/** The Export window's downloads: the whole lab, one target, or isoloom.yml alone. */
export function useDownloads(engine: Engine | null, plan: Plan | null, topology: string, labName: string) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  /** Builds a zip with the engine and saves it, or says why it couldn't. */
  function save(build: (engine: Engine) => Uint8Array, filename: string) {
    if (!engine) return;
    setDownloadError(null);
    try {
      download(zip(build(engine)), filename);
    } catch (e) {
      setDownloadError(String(e));
    }
  }
  return {
    downloadError,
    downloadAll: () => {
      save((e) => e.bundle(topology), `${labName || "lab"}.zip`);
    },
    /** One target's zip: isoloom.yml and that target's folder. */
    downloadTarget: (dir: string) => {
      save((e) => e.bundle_target(topology, dir), `${labName || "lab"}-${dir.replace(/\//g, "-")}.zip`);
    },
    downloadSpec: () => {
      if (plan?.isoloom_yml) download(new Blob([plan.isoloom_yml], { type: "text/yaml" }), "isoloom.yml");
    },
  };
}
