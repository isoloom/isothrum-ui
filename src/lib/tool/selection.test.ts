import { describe, expect, test } from "vitest";
import type { Plan } from "./engine";
import { labIssues, nameById, selectionOf } from "./selection";
import { cable, issueText, lan, machine, note } from "@/test/lab";

const selected = <T extends object>(x: T): T => ({ ...x, selected: true });

describe("selectionOf", () => {
  test("one machine, LAN or cable selected opens its window", () => {
    expect(selectionOf([selected(machine("m")), lan("l")], []).machine?.id).toBe("m");
    expect(selectionOf([machine("m"), selected(lan("l"))], []).lan?.id).toBe("l");
    expect(selectionOf([machine("m")], [selected(cable("c", "m", "l"))]).edge?.id).toBe("c");
  });

  test("several selected open none of them, and are counted", () => {
    const s = selectionOf([selected(machine("m")), selected(lan("l"))], [selected(cable("c", "m", "l"))]);
    expect(s).toMatchObject({ count: 3, machine: undefined, lan: undefined, edge: undefined });
  });

  test("a selected note is counted but opens no window", () => {
    expect(selectionOf([selected(note("n"))], [])).toMatchObject({ count: 1, machine: undefined, lan: undefined });
  });
});

describe("labIssues", () => {
  const plan = (p: Partial<Plan>): Plan => ({ ok: true, error: null, isoloom_yml: null, problems: [], files: [], skipped: [], addresses: {}, ...p });

  test("an empty canvas has nothing to fix yet", () => {
    expect(labIssues([], plan({ ok: false, error: "empty" }), issueText)).toEqual([]);
  });

  test("lists the canvas's findings, then the engine's error and problems", () => {
    const nodes = [machine("a", { name: "" })];
    expect(labIssues(nodes, plan({ ok: false, error: "bad lab", problems: ["p1"] }), issueText)).toEqual(["unnamed machine", "bad lab", "p1"]);
  });

  test("lists the canvas's findings alone before the engine has run", () => {
    expect(labIssues([machine("a", { name: "" })], null, issueText)).toEqual(["unnamed machine"]);
  });
});

test("nameById shows a node's name, or ? for one that is gone", () => {
  expect([nameById([machine("m", { name: "web" })], "m"), nameById([], "m")]).toEqual(["web", "?"]);
});
