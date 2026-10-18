import { describe, expect, test } from "vitest";
import { pinned } from "./pins";

describe("pinned", () => {
  test("pins the last number typed alone", () => {
    expect(pinned(undefined, "office", "10.10.1.10", "20")).toEqual({ office: 20 });
  });

  test("pins the last number of a whole address typed in the same block", () => {
    expect(pinned({ servers: 7 }, "office", "10.10.1.10", "10.10.1.42")).toEqual({ servers: 7, office: 42 });
  });

  test("clearing the field unpins that LAN only", () => {
    expect(pinned({ servers: 7, office: 20 }, "office", "10.10.1.20", "  ")).toEqual({ servers: 7 });
  });

  test("refuses what can't be a host's last number", () => {
    for (const typed of ["0", "255", "-3", "abc"]) expect(pinned(undefined, "office", "10.10.1.10", typed)).toBeNull();
  });
});

test("pinned takes the last number of an address in another block", () => {
  expect(pinned(undefined, "office", "10.10.1.10", "192.168.0.9")).toEqual({ office: 9 });
});
