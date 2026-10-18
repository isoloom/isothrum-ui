import { describe, expect, test } from "vitest";
import { PRESETS } from "../presets";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { defaultText, editorText } from "./index";

const languages = { en, fr, es, de };

describe("editorText", () => {
  test("gives each site language its own words", () => {
    expect([editorText("en"), editorText("fr"), editorText("es"), editorText("de")]).toEqual([en, fr, es, de]);
  });

  test("falls back to English, the source the others follow", () => {
    expect(editorText("it")).toBe(en);
    expect(defaultText).toBe(en);
  });
});

describe.each(Object.entries(languages))("%s", (_, text) => {
  test("names every built-in device of the toolbar", () => {
    for (const p of PRESETS) expect(p.id in text.devices, p.id).toBe(true);
  });

  test("puts the names it is given in its messages", () => {
    expect(text.issues.sameName.machine("web7")).toContain("web7");
    expect(text.issues.badPort("web7", "80/sctp")).toContain("80/sctp");
    expect(text.gns3.cisco("R1", "IOU")).toContain("R1");
    expect(text.myDevice("alpine:3.20")).toContain("alpine:3.20");
  });
});
