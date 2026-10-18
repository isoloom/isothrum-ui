import { useState } from "react";
import type { Invoke } from "@/lib/tool/desktop";

/** Captures in progress (desktop): network -> the .pcap file, or null when Wireshark shows it live. */
export function useCaptures(invoke: Invoke | null, labName: string, onError: (error: string) => void) {
  const [captures, setCaptures] = useState<Record<string, string | null>>({});
  async function capture(network: string) {
    if (!invoke) return;
    try {
      const res = await invoke<{ file: string | null }>("capture_start", { name: labName, network });
      setCaptures((c) => ({ ...c, [network]: res.file }));
    } catch (e) {
      onError(String(e));
    }
  }
  async function stopCapture(network: string) {
    if (!invoke) return;
    await invoke("capture_stop", { name: labName, network }).catch(() => undefined);
    setCaptures((c) => Object.fromEntries(Object.entries(c).filter(([n]) => n !== network)));
  }
  return { captures, capture, stopCapture, clearCaptures: () => { setCaptures({}); } };
}

export type Captures = ReturnType<typeof useCaptures>;
