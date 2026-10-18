import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { PORT_PROTOCOLS, portsText, readPorts, type Service } from "./ports";

describe("readPorts", () => {
  test("reads each port, with what it speaks when it isn't TCP", () => {
    expect(readPorts("80, 443/https,53/udp , 22/tcp")).toEqual({
      services: [{ port: 80 }, { port: 443, protocol: "https" }, { port: 53, protocol: "udp" }, { port: 22 }],
      bad: [],
    });
  });

  test("reports each entry Isoloom couldn't take, and keeps the others", () => {
    expect(readPorts("80, http, 0, 65536, 80.5, 53/UDP, 25/smtp, 22")).toEqual({
      services: [{ port: 80 }, { port: 22 }],
      bad: ["http", "0", "65536", "80.5", "53/UDP", "25/smtp"],
    });
  });

  test("an empty field is no ports and no problem", () => {
    expect(readPorts(" , ")).toEqual({ services: [], bad: [] });
  });
});

describe("portsText", () => {
  test("writes TCP as the number, and the rest with their protocol", () => {
    expect(portsText([{ port: 80 }, { port: 22, protocol: "tcp" }, { port: 53, protocol: "udp" }])).toBe("80, 22, 53/udp");
  });

  test("is read back as the same ports", () => {
    const service: fc.Arbitrary<Service> = fc.record({ port: fc.integer({ min: 1, max: 65535 }), protocol: fc.constantFrom(...PORT_PROTOCOLS) });
    fc.assert(
      fc.property(fc.array(service, { maxLength: 6 }), (services) => {
        const normal = services.map((s) => (s.protocol === "tcp" ? { port: s.port } : s));
        expect(readPorts(portsText(services))).toEqual({ services: normal, bad: [] });
      }),
    );
  });
});
