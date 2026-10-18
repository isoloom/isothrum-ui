import type { LinkConditions } from "./model";

/** Isoloom's `tc` for a slow or lossy link, as the engine's topology takes it. */
export interface Tc {
  delay?: string;
  jitter?: string;
  loss?: number;
  rate?: string;
}

/** Whether a field holds a number: every finite one is written, for Isoloom to judge (it reports a loss above 100%, or a jitter without a delay). */
const isSet = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/** Whether `n` is a whole number, give or take what floating point loses in a multiplication. */
const whole = (n: number) => Math.abs(n - Math.round(n)) < 1e-9;

/** A rate (Mbit/s) as `tc` writes one: whole Mbit/s, else whole kbit/s, else bits. */
function rateText(rate: number): string {
  if (Number.isInteger(rate)) return `${String(rate)}mbit`;
  if (whole(rate * 1000)) return `${String(Math.round(rate * 1000))}kbit`;
  return `${String(rate * 1_000_000)}bit`;
}

/** The conditions as Isoloom's `tc` takes them, or `undefined` when none is set. */
export function tcOf(c: LinkConditions | undefined): Tc | undefined {
  if (!c) return undefined;
  const tc = {
    ...(isSet(c.delay) ? { delay: `${String(c.delay)}ms` } : {}),
    ...(isSet(c.jitter) ? { jitter: `${String(c.jitter)}ms` } : {}),
    ...(isSet(c.loss) ? { loss: c.loss } : {}),
    ...(isSet(c.rate) ? { rate: rateText(c.rate) } : {}),
  };
  return Object.keys(tc).length ? tc : undefined;
}

/** A short summary for the canvas: `40 ms ±5 · 0.5% · 10 Mbit/s`. */
export function conditionsLabel(c: LinkConditions | undefined): string {
  if (!tcOf(c) || !c) return "";
  const parts: string[] = [];
  const jitter = isSet(c.jitter) ? ` ±${String(c.jitter)}` : "";
  if (isSet(c.delay)) parts.push(`${String(c.delay)} ms${jitter}`);
  else if (jitter) parts.push(`${jitter.trim()} ms`);
  if (isSet(c.loss)) parts.push(`${String(c.loss)}%`);
  if (isSet(c.rate)) parts.push(`${String(c.rate)} Mbit/s`);
  return parts.join(" · ");
}

/** The `tc` fields written as a number and a unit: two times and a rate. */
type MeasuredField = "delay" | "jitter" | "rate";

/** A `tc` value the editor can't read: left out of the drawing and reported, never guessed. */
export interface TcProblem {
  field: MeasuredField;
  value: string;
}

/** A `tc` read back: the editor's numbers (none when nothing is set), and each value it couldn't read. */
export interface ReadConditions {
  conditions: LinkConditions | undefined;
  problems: TcProblem[];
}

/** A unit as `[times, per]`: a value in it is `value * times / per` in the editor's unit. */
type Scale = readonly [times: number, per: number];

/** The time units Isoloom's `tc` takes, to milliseconds. */
const TIME: ReadonlyMap<string, Scale> = new Map([
  ["us", [1, 1000]],
  ["ms", [1, 1]],
  ["s", [1000, 1]],
]);

/** The rate units Isoloom's `tc` takes, to Mbit/s: `bps` counts bytes. A rate has its unit: Isoloom refuses a bare number. */
const RATE: ReadonlyMap<string, Scale> = new Map([
  ["bit", [1, 1_000_000]],
  ["kbit", [1, 1000]],
  ["mbit", [1, 1]],
  ["gbit", [1000, 1]],
  ["bps", [8, 1_000_000]],
  ["kbps", [8, 1000]],
  ["mbps", [8, 1]],
  ["gbps", [8000, 1]],
]);

const UNITS: Record<MeasuredField, ReadonlyMap<string, Scale>> = { delay: TIME, jitter: TIME, rate: RATE };

/**
 * A number and the letters after it, split as Isoloom splits a `tc` value: the letters at the end
 * are the unit, and what comes before is a number as Rust reads one (a sign, digits with or
 * without a point, an exponent: `40`, `-0.5`, `.5`, `5.`, `1E-3`).
 */
const MEASURE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([A-Za-z]*)$/;

/** `40ms` -> 40, `500us` -> 0.5, `1gbit` -> 1000: in the editor's unit, or undefined when `v` isn't a number and one of `units` (Isoloom's, case and all), or too large to be one. */
function measure(v: string, units: ReadonlyMap<string, Scale>): number | undefined {
  const m = MEASURE.exec(v);
  const scale = m ? units.get(m[2]) : undefined;
  if (!m || !scale) return undefined;
  const n = (Number(m[1]) * scale[0]) / scale[1];
  return Number.isFinite(n) ? n : undefined;
}

/** Isoloom's `tc` back to the editor's numbers: the inverse of `tcOf`, every value it can't read reported. */
export function conditionsOf(tc: Tc | undefined): ReadConditions {
  const conditions: LinkConditions = {};
  const problems: TcProblem[] = [];
  for (const field of ["delay", "jitter", "rate"] as const) {
    const value = tc?.[field];
    if (value === undefined) continue;
    const n = measure(value, UNITS[field]);
    if (n === undefined) problems.push({ field, value });
    else conditions[field] = n;
  }
  if (tc?.loss !== undefined) conditions.loss = tc.loss;
  return { conditions: Object.keys(conditions).length ? conditions : undefined, problems };
}

/** What each field takes, as the fix a problem names. */
const EXPECTED: Record<MeasuredField, string> = { delay: "a time like 40ms, 500us or 1s", jitter: "a time like 40ms, 500us or 1s", rate: "a rate like 10mbit or 512kbit" };

/** A problem in words, for the `tc` at path `at` in the topology: where, the value, the form it takes. */
export function tcProblemText(at: string, p: TcProblem): string {
  return `${at}.${p.field}: \`${p.value}\` isn't ${EXPECTED[p.field]}; the drawing leaves it out`;
}

/** The conditions a field edit leaves: a positive number, or the field cleared (none when all are). */
export function withCondition(value: LinkConditions | undefined, key: keyof LinkConditions, raw: string): LinkConditions | undefined {
  const n = raw === "" ? undefined : Number(raw);
  const next = { ...value, [key]: n !== undefined && Number.isFinite(n) && n > 0 ? n : undefined };
  // Every field it has, even one a stored lab carries that the editor doesn't know.
  return Object.values(next as Record<string, number | undefined>).some((v) => v !== undefined) ? next : undefined;
}
