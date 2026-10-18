/* tslint:disable */
/* eslint-disable */

/**
 * The download: a zip with `isoloom.yml` and every generated file.
 */
export function bundle(topology_json: string): Uint8Array;

/**
 * The download for one target (see [`bundle_target_bytes`]).
 */
export function bundle_target(topology_json: string, target_dir: string): Uint8Array;

/**
 * JSON for the desktop app: [`own_files`].
 */
export function own_files_json(topology_json: string): string;

/**
 * JSON for the editor: a [`Plan`].
 */
export function plan_json(topology_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly bundle: (a: number, b: number) => [number, number, number, number];
    readonly bundle_target: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly own_files_json: (a: number, b: number) => [number, number];
    readonly plan_json: (a: number, b: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
