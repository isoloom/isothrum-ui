import { useEffect, useEffectEvent } from "react";
import { decodeLab, encodeLab } from "@/lib/tool/draft";
import type { Design } from "@/lib/tool/model";
import type { EditorText } from "@/lib/tool/text";
import { replaceLab, type Lab } from "./use-lab";

/** Removes the `#…` part of the address once it has been read. */
export function clearHash(): void {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

interface Deps {
  lab: Lab;
  setDesign: (d: Design) => void;
  setToast: (message: string) => void;
  /** Fits the view once React Flow has measured the new lab. */
  fitWhenDrawn: () => void;
  t: EditorText;
}

/**
 * A shared lab (#lab=… in the address) opens on arrival, and when a link is pasted into a tab
 * already on the editor (only the part after # changes then, and the browser doesn't reload).
 * Undo brings back what was there.
 */
export function useSharedLink({ lab, setDesign, setToast, fitWhenDrawn, t }: Deps): void {
  const open = useEffectEvent(() => {
    const m = /^#lab=([A-Za-z0-9_-]+)$/.exec(window.location.hash);
    if (!m) return;
    void decodeLab(m[1]).then((shared) => {
      clearHash();
      if (!shared) {
        setToast(t.toasts.brokenLink);
        return;
      }
      replaceLab(lab, shared);
      if (shared.design) setDesign(shared.design);
      setToast(t.toasts.openedShared(shared.name));
      fitWhenDrawn();
    });
  });
  useEffect(() => {
    const onHash = () => {
      open();
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
}

/** Copies a link that opens this lab (its JSON, deflated, after `#lab=`). */
export async function copyShareLink(draft: Parameters<typeof encodeLab>[0], lang: string, setToast: (message: string) => void, t: EditorText) {
  const code = await encodeLab(draft);
  const url = `${window.location.origin}/${lang}#lab=${code}`;
  try {
    await navigator.clipboard.writeText(url);
    setToast(t.toasts.linkCopied);
  } catch {
    window.prompt(t.toasts.copyPrompt, url);
  }
}
