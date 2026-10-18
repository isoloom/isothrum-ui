import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { conditionsLabel, conditionsOf, tcOf, tcProblemText, withCondition } from "./conditions";
import { arbitraryConditions } from "@/test/arbitrary";

describe("tcOf", () => {
  test("writes delay, jitter, loss and rate as Isoloom's tc takes them", () => {
    expect(tcOf({ delay: 40, jitter: 5, loss: 0.5, rate: 10 })).toEqual({ delay: "40ms", jitter: "5ms", loss: 0.5, rate: "10mbit" });
  });

  test("writes a fractional rate in kbit", () => {
    expect(tcOf({ rate: 2.5 })).toEqual({ rate: "2500kbit" });
  });

  test("writes a rate that isn't whole kbit/s in bits", () => {
    expect(tcOf({ rate: 0.0005 })).toEqual({ rate: "500bit" });
  });

  test("writes a loss above 100% and a jitter without a delay as they are, for Isoloom to report", () => {
    expect(tcOf({ loss: 150, jitter: 5 })).toEqual({ loss: 150, jitter: "5ms" });
  });

  test("writes every number it holds, zero and negative ones too, as Isoloom reads them", () => {
    expect(tcOf({ delay: 0, loss: -1 })).toEqual({ delay: "0ms", loss: -1 });
  });

  test("is undefined when nothing is set", () => {
    for (const c of [undefined, {}, { delay: Number.NaN }, { rate: Number.POSITIVE_INFINITY }]) expect(tcOf(c)).toBeUndefined();
  });
});

describe("conditionsLabel", () => {
  test("summarizes the conditions for the canvas", () => {
    expect(conditionsLabel({ delay: 40, jitter: 5, loss: 0.5, rate: 10 })).toBe("40 ms ±5 · 0.5% · 10 Mbit/s");
  });

  test("is empty when there are no conditions", () => {
    expect(conditionsLabel(undefined)).toBe("");
    expect(conditionsLabel({})).toBe("");
  });

  test("shows a jitter without a delay, as it is written", () => {
    expect(conditionsLabel({ jitter: 5 })).toBe("±5 ms");
  });
});

describe("conditionsOf", () => {
  test("reads Isoloom's tc back into the editor's numbers", () => {
    expect(conditionsOf({ delay: "40ms", jitter: "5ms", loss: 1, rate: "10mbit" })).toEqual({ conditions: { delay: 40, jitter: 5, loss: 1, rate: 10 }, problems: [] });
  });

  test("reads a time in microseconds or seconds as milliseconds", () => {
    expect(conditionsOf({ delay: "1s", jitter: "500us" }).conditions).toEqual({ delay: 1000, jitter: 0.5 });
  });

  test("converts gbit, kbit and bits to Mbit/s", () => {
    expect(conditionsOf({ rate: "1gbit" }).conditions?.rate).toBe(1000);
    expect(conditionsOf({ rate: "500kbit" }).conditions?.rate).toBe(0.5);
    expect(conditionsOf({ rate: "2000000bit" }).conditions?.rate).toBe(2);
  });

  test("reports a rate without its unit, as Isoloom does", () => {
    expect(conditionsOf({ rate: "2000000" })).toEqual({ conditions: undefined, problems: [{ field: "rate", value: "2000000" }] });
  });

  test("reads a number in any spelling Isoloom reads: a sign, a lone point, an exponent", () => {
    expect(conditionsOf({ delay: "+.5ms", jitter: "5.ms", rate: "1E-3gbit" }).conditions).toEqual({ delay: 0.5, jitter: 5, rate: 1 });
  });

  test("reads a rate in bytes per second as eight bits a byte", () => {
    expect(conditionsOf({ rate: "2mbps" }).conditions?.rate).toBe(16);
  });

  test("reports each value it can't read, and keeps the others", () => {
    expect(conditionsOf({ delay: "fast", jitter: "5", loss: 1, rate: "10Mbit" })).toEqual({
      conditions: { loss: 1 },
      problems: [
        { field: "delay", value: "fast" },
        { field: "jitter", value: "5" },
        { field: "rate", value: "10Mbit" },
      ],
    });
  });

  test("reads a negative time as Isoloom does, and reports one too large to be a number", () => {
    expect(conditionsOf({ delay: "-5ms", jitter: "1e999ms" })).toEqual({ conditions: { delay: -5 }, problems: [{ field: "jitter", value: "1e999ms" }] });
  });

  test("is no conditions and no problems when there is no tc, or nothing in it", () => {
    expect(conditionsOf(undefined)).toEqual({ conditions: undefined, problems: [] });
    expect(conditionsOf({})).toEqual({ conditions: undefined, problems: [] });
  });

  test("inverts tcOf", () => {
    const c = { delay: 40, jitter: 5, loss: 0.5, rate: 2.5 };
    expect(conditionsOf(tcOf(c))).toEqual({ conditions: c, problems: [] });
  });

});

describe("conditionsOf, for any value", () => {
  test("inverts tcOf for any conditions the editor keeps", () => {
    fc.assert(
      fc.property(arbitraryConditions, (c) => {
        expect(conditionsOf(tcOf(c)).conditions).toEqual(c);
      }),
    );
  });

  test("reads a time the same in any of its units", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (s) => {
        const read = [`${String(s)}s`, `${String(s * 1000)}ms`, `${String(s * 1_000_000)}us`].map((delay) => conditionsOf({ delay }).conditions?.delay);
        expect(read).toEqual([s * 1000, s * 1000, s * 1000]);
      }),
    );
  });

  test("reads a rate the same in any of its units, in bits or bytes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (g) => {
        const bits = [`${String(g)}gbit`, `${String(g * 1000)}mbit`, `${String(g * 1e6)}kbit`, `${String(g * 1e9)}bit`];
        const bytes = [`${String(g * 125)}mbps`, `${String(g * 125_000)}kbps`, `${String(g * 125e6)}bps`];
        expect([...bits, ...bytes].map((rate) => conditionsOf({ rate }).conditions?.rate)).toEqual(Array<number>(7).fill(g * 1000));
      }),
    );
  });

  test("reads or reports every value, never dropping one", () => {
    const value = fc.oneof(fc.string(), fc.tuple(fc.double(), fc.constantFrom("", "us", "ms", "s", "kbit", "mbit", "x")).map(([n, unit]) => `${String(n)}${unit}`));
    fc.assert(
      fc.property(fc.record({ delay: value, jitter: value, rate: value }, { requiredKeys: [] }), (tc) => {
        const { conditions, problems } = conditionsOf(tc);
        for (const field of ["delay", "jitter", "rate"] as const) {
          const read = conditions?.[field];
          const reported = problems.some((p) => p.field === field && p.value === tc[field]);
          expect(read !== undefined || reported).toBe(tc[field] !== undefined);
          expect(read !== undefined && reported).toBe(false);
          expect(Number.isNaN(read)).toBe(false);
        }
      }),
    );
  });
});

describe("tcProblemText", () => {
  test("names the field's path, the value, the form it takes, and what the editor does", () => {
    expect(tcProblemText("networks.slow.tc", { field: "delay", value: "fast" })).toBe("networks.slow.tc.delay: `fast` isn't a time like 40ms, 500us or 1s; the drawing leaves it out");
    expect(tcProblemText("links[0].tc", { field: "rate", value: "lots" })).toBe("links[0].tc.rate: `lots` isn't a rate like 10mbit or 512kbit; the drawing leaves it out");
  });
});

describe("withCondition", () => {
  test("sets a field to the positive number typed", () => {
    expect(withCondition(undefined, "delay", "40")).toEqual({ delay: 40 });
  });

  test("clears a field typed empty or not positive, keeping the others", () => {
    expect(withCondition({ delay: 40, loss: 1 }, "delay", "-5")).toEqual({ loss: 1 });
  });

  test("leaves no conditions once every field is cleared", () => {
    expect(withCondition({ delay: 40 }, "delay", "")).toBeUndefined();
  });

  test("keeps a field a stored lab carries that the editor doesn't know", () => {
    const stored = { delay: 40, mtu: 1400 };
    expect(withCondition(stored, "delay", "")).toEqual({ mtu: 1400 });
  });
});
