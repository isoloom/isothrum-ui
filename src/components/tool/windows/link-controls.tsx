"use client";

import { Plug, Radio, Square, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useText } from "../text";

/** Desktop only: capture a LAN's or a cable's traffic while the lab runs. */
export function CaptureControl({ network, running, file, capturing, onStart, onStop }: { network: string; running: boolean; file: string | null | undefined; capturing: boolean; onStart: () => void; onStop: () => void }) {
  const t = useText().capture;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-pastel-violet p-3">
      {capturing ? (
        <>
          <p className="flex items-center gap-1.5 font-medium">
            <span className="size-2 animate-pulse rounded-full bg-destructive" aria-hidden /> {t.capturing(network)}
          </p>
          <p className="text-xs text-muted-foreground">
            {file ? (
              <>
                {t.writingTo} <span className="font-mono break-all">{file}</span>
              </>
            ) : (
              t.live
            )}
          </p>
          <Button size="sm" variant="outline" onClick={onStop}>
            <Square data-icon="inline-start" /> {t.stop}
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" onClick={onStart} disabled={!running}>
            <Radio data-icon="inline-start" /> {t.start}
          </Button>
          {!running && <p className="text-xs text-muted-foreground">{t.runFirst}</p>}
        </>
      )}
    </div>
  );
}

/**
 * Desktop only: suspend a link while the lab runs, as GNS3 does: a cable's ends (their ports,
 * down) or, with `all`, every link of a LAN. `suspended` says so when it is.
 */
export function LinkControl({ running, busy, all = false, suspended, onSuspend, onResume }: { running: boolean; busy: boolean; all?: boolean; suspended: string | null; onSuspend: () => void; onResume: () => void }) {
  const t = useText().link;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-pastel-violet p-3">
      {suspended ? (
        <>
          <p className="flex items-center gap-1.5 font-medium">
            <Unplug className="size-4" aria-hidden /> {suspended}
          </p>
          <Button size="sm" variant="outline" onClick={onResume} disabled={busy}>
            <Plug data-icon="inline-start" /> {all ? t.resumeAll : t.resume}
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={onSuspend} disabled={!running || busy}>
            <Unplug data-icon="inline-start" /> {all ? t.suspendAll : t.suspend}
          </Button>
          {!running && <p className="text-xs text-muted-foreground">{t.runFirst}</p>}
        </>
      )}
    </div>
  );
}
