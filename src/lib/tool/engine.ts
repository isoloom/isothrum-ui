import type { Addresses } from "./router-ports";

/**
 * The engine's JavaScript surface, from `public/wasm/isothrum_wasm.js` (built from
 * `crates/isothrum-wasm`). Everything runs in the browser: nothing is sent to a server.
 */
export interface Engine {
  default: () => Promise<unknown>;
  plan_json: (topology: string) => string;
  bundle: (topology: string) => Uint8Array;
  /** The lab's own files (provisioning starters, appliance configurations), as JSON. */
  own_files_json: (topology: string) => string;
  bundle_target: (topology: string, targetDir: string) => Uint8Array;
}

export interface GeneratedFile {
  path: string;
  contents: string;
}

/** What the engine makes of a lab: isoloom.yml and every target's files, or what is wrong. */
export interface Plan {
  ok: boolean;
  error: string | null;
  isoloom_yml: string | null;
  problems: string[];
  files: GeneratedFile[];
  skipped: string[];
  addresses: Addresses;
}

/** Served from `public/wasm/`; loaded at runtime, not bundled. */
const ENGINE_URL: string = "/wasm/isothrum_wasm.js";

/** Loads and starts the engine. */
export async function loadEngine(): Promise<Engine> {
  const m = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ ENGINE_URL)) as Engine;
  await m.default();
  return m;
}

/** The plan as the engine writes it: isoloom.yml may be left out when there is none. */
type RawPlan = Omit<Plan, "isoloom_yml"> & { isoloom_yml?: string | null };

/** The engine's plan for a topology; an engine crash becomes a plan with `error` (from `failed`). */
export function planOf(engine: Engine, topology: string, failed: (error: string) => string): Plan {
  try {
    const raw = JSON.parse(engine.plan_json(topology)) as RawPlan;
    return { ...raw, isoloom_yml: raw.isoloom_yml ?? null };
  } catch (e) {
    return { ok: false, error: failed(String(e)), isoloom_yml: null, problems: [], files: [], skipped: [], addresses: {} };
  }
}

/** The lab's own files (provisioning starters, appliance configurations). */
export function ownFiles(engine: Engine, topology: string): GeneratedFile[] {
  return JSON.parse(engine.own_files_json(topology)) as GeneratedFile[];
}
