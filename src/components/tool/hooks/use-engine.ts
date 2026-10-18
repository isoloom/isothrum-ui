import { useEffect, useMemo, useState } from "react";
import { loadEngine, planOf, type Engine, type Plan } from "@/lib/tool/engine";
import type { EditorText } from "@/lib/tool/text";

/** The engine, once loaded (or why it didn't load). */
export function useEngine(): { engine: Engine | null; error: string | null } {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadEngine().then(
      (m) => {
        if (alive) setEngine(m);
      },
      (e: unknown) => {
        if (alive) setError(String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  return { engine, error };
}

/** The engine's plan for the lab (null until the engine has loaded). An engine crash must not take the canvas down with it. */
export function usePlan(engine: Engine | null, topology: string, t: EditorText): Plan | null {
  return useMemo(() => (engine ? planOf(engine, topology, t.engineFailed) : null), [engine, topology, t]);
}
