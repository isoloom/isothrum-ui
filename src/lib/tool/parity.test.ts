import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { shippedEngine, verdict } from "@/test/engine";
import { conditionsOf, tcOf, type Tc } from "./conditions";
import { APPLIANCES } from "./model";
import { OS_CHOICES } from "./os";
import { PORT_PROTOCOLS, readPorts } from "./ports";

/**
 * The editor's model accepts exactly what Isoloom accepts: each list it offers is Isoloom's, and
 * each value it reads or writes is one Isoloom reads the same way, checked against the engine the
 * site ships (Isoloom itself, in WebAssembly).
 */

interface Choices {
  os: string[];
  appliances: string[];
  protocols: string[];
}

const choices = async () => JSON.parse((await shippedEngine()).choices_json()) as Choices;

/** A lab of one container on LAN `lan`, with `tc` on the LAN and `services` on the machine. */
const lab = (tc?: Tc, services: unknown[] = []) => ({
  name: "parity",
  networks: { lan: { cidr: "10.10.1.0/24", ...(tc ? { tc } : {}) } },
  nodes: { a: { kind: { container: { image: "alpine:3.20" } }, services, networks: { lan: null } } },
});

/** Whether Isoloom finds a problem with `field` of the LAN's `tc`. */
async function refuses(tc: Tc, field: keyof Tc): Promise<boolean> {
  const v = await verdict(lab(tc));
  return v.problems.some((p) => p.includes(`networks.lan.tc.${field} `));
}

describe("the lists the editor offers are Isoloom's", () => {
  test("every OS, and only those", async () => {
    expect([...OS_CHOICES].sort()).toEqual([...(await choices()).os].sort());
  });

  test("every network appliance, and only those", async () => {
    expect(APPLIANCES.map((a) => a.id).sort()).toEqual([...(await choices()).appliances].sort());
  });

  test("every port protocol, and only those", async () => {
    expect([...PORT_PROTOCOLS]).toEqual((await choices()).protocols);
  });
});

/** A number in one of the spellings Rust reads (or doesn't: an empty one, a lone point). */
const number = (odd: string[]) =>
  fc
    .tuple(fc.constantFrom("", "+", "-"), fc.oneof(fc.nat(100_000).map(String), fc.double({ min: 0, max: 1e6, noNaN: true }).map(String), fc.constantFrom(".5", "5.", "1e3", "2E-2", ...odd)))
    .map(([sign, n]) => `${sign}${n}`);

/** A `tc` value: a number, then letters that may or may not be a unit. */
const measured = fc
  .tuple(number(["", ".", "x1"]), fc.constantFrom("", "ms", "s", "us", "MS", "bit", "kbit", "mbit", "gbit", "bps", "kbps", "mbps", "gbps", "Mbit", "kb", "e", "m s"))
  .map(([n, unit]) => `${n}${unit}`);

/** A value Isoloom takes: a number and one of `units`. */
const taken = (units: string[]) => fc.tuple(number([]), fc.constantFrom(...units)).map(([n, unit]) => `${n}${unit}`);

/** Whether two readings hold the same numbers, but for what floating point loses. */
function same(a: Record<string, number | undefined> | undefined, b: Record<string, number | undefined> | undefined): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return [...keys].every((k) => {
    const [x, y] = [a?.[k], b?.[k]];
    return x !== undefined && y !== undefined && Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x));
  });
}

describe("a link condition is read exactly as Isoloom reads it", () => {
  test("a delay or a rate: Isoloom refuses it if and only if the editor reports it", async () => {
    await fc.assert(
      fc.asyncProperty(measured, fc.constantFrom("delay", "rate"), async (value, field) => {
        const reported = conditionsOf({ [field]: value }).problems.length > 0;
        expect(reported, `${field}: ${value}`).toBe(await refuses({ [field]: value }, field));
      }),
      { numRuns: 120 },
    );
  });

  test("a rate without its unit is reported, as Isoloom does", async () => {
    expect(conditionsOf({ rate: "10" }).problems).toEqual([{ field: "rate", value: "10" }]);
    expect(await refuses({ rate: "10" }, "rate")).toBe(true);
  });

  test("what the editor writes back, Isoloom reads as the same conditions", async () => {
    await fc.assert(
      fc.asyncProperty(taken(["us", "ms", "s"]), taken(["bit", "kbit", "mbit", "gbit", "bps", "kbps", "mbps", "gbps"]), async (delay, rate) => {
        const read = conditionsOf({ delay, rate });
        expect(read.problems).toEqual([]);
        const written = tcOf(read.conditions);
        expect(same(conditionsOf(written).conditions, read.conditions), JSON.stringify({ delay, rate, written })).toBe(true);
        expect((await verdict(lab(written))).problems).toEqual([]);
      }),
      { numRuns: 40 },
    );
  });

  test("a loss above 100% or a jitter without a delay is written for Isoloom to report, never changed", async () => {
    expect(tcOf({ loss: 150, jitter: 5 })).toEqual({ loss: 150, jitter: "5ms" });
    const problems = (await verdict(lab(tcOf({ loss: 150, jitter: 5 })))).problems.join("\n");
    expect(problems).toContain("networks.lan.tc.loss");
    expect(problems).toContain("networks.lan.tc.jitter");
  });
});

describe("a machine's ports are read exactly as Isoloom takes them", () => {
  const entry = fc.oneof(
    fc.tuple(fc.integer({ min: -5, max: 70_000 }), fc.constantFrom("", "/tcp", "/udp", "/http", "/https", "/tls", "/TCP", "/sctp", "/")).map(([p, proto]) => `${String(p)}${proto}`),
    fc.constantFrom("http", "80.5", "", "0x50"),
  );

  test("an entry the editor keeps is a port Isoloom takes; the others are reported", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(entry, { maxLength: 4 }), async (entries) => {
        const { services, bad } = readPorts(entries.join(", "));
        expect(services.length + bad.length).toBe(entries.filter((e) => e.trim()).length);
        const v = await verdict(lab(undefined, services));
        expect(v.error).toBeNull();
        expect(v.problems.filter((p) => p.includes("machines.a.ports"))).toEqual([]);
      }),
      { numRuns: 40 },
    );
  });

  test("a port out of range or a protocol Isoloom doesn't have is refused by the engine too", async () => {
    for (const service of [{ port: 0 }, { port: 70_000 }, { port: 80, protocol: "sctp" }]) {
      expect((await verdict(lab(undefined, [service]))).ok).toBe(false);
    }
  });
});

describe("an OS is one Isoloom knows", () => {
  test("every OS the editor offers compiles, and the earlier spelling doesn't", async () => {
    for (const os of OS_CHOICES) {
      const v = await verdict({ name: "os", networks: { lan: { cidr: "10.10.1.0/24" } }, nodes: { m: { kind: { vm: { os } }, networks: { lan: null } } } });
      expect(v.ok, `${os}: ${v.error ?? ""}`).toBe(true);
    }
    const old = await verdict({ name: "os", nodes: { m: { kind: { vm: { os: "debian-12" } } } } });
    expect(old.error).toContain("unknown OS `debian-12`");
  });
});
