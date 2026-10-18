import { describe, expect, test } from "vitest";
import { type Engine, ownFiles, planOf } from "./engine";

/** An engine whose plan is `plan` (a function, to fail like a crash). */
function fakeEngine(plan: () => string, files = "[]"): Engine {
  return {
    default: () => Promise.resolve(),
    plan_json: plan,
    bundle: () => new Uint8Array(),
    own_files_json: () => files,
    bundle_target: () => new Uint8Array(),
  };
}

const failed = (e: string) => `engine failed: ${e}`;

describe("planOf", () => {
  test("reads the engine's plan", () => {
    const plan = { ok: true, error: null, isoloom_yml: "name: lab\n", problems: [], files: [], skipped: [], addresses: { web: [["office", "10.10.1.10"]] } };
    expect(planOf(fakeEngine(() => JSON.stringify(plan)), "{}", failed)).toEqual(plan);
  });

  test("gives no isoloom.yml when the engine leaves it out", () => {
    const plan = { ok: false, error: "bad", problems: ["x"], files: [], skipped: [], addresses: {} };
    expect(planOf(fakeEngine(() => JSON.stringify(plan)), "{}", failed).isoloom_yml).toBeNull();
  });

  test("turns an engine crash into a failed plan, in the editor's words", () => {
    const crash = fakeEngine(() => {
      throw new Error("unreachable");
    });
    expect(planOf(crash, "{}", failed)).toEqual({ ok: false, error: "engine failed: Error: unreachable", isoloom_yml: null, problems: [], files: [], skipped: [], addresses: {} });
  });
});

test("ownFiles reads the lab's own files from the engine", () => {
  const files = [{ path: "provision/db.sh", contents: "#!/bin/sh\n" }];
  expect(ownFiles(fakeEngine(() => "{}", JSON.stringify(files)), "{}")).toEqual(files);
});
