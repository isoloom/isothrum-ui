import { describe, expect, test } from "vitest";
import { PRESETS, deviceFrom, presetForKey, runAs, shortcutOf } from "./presets";
import { machine } from "@/test/lab";

describe("number keys", () => {
  test("keys 1 to 9 then 0 pick the first ten devices, in toolbar order", () => {
    expect(PRESETS.slice(0, 10).map((p) => shortcutOf(p.id))).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    expect(presetForKey("1")?.id).toBe("router");
    expect(presetForKey("0")?.id).toBe(PRESETS[9].id);
  });

  test("devices after the tenth, unknown devices and other keys have no shortcut", () => {
    expect(shortcutOf(PRESETS[10].id)).toBeNull();
    expect(shortcutOf("nope")).toBeNull();
    expect(presetForKey("a")).toBeUndefined();
    expect(presetForKey("10")).toBeUndefined();
  });
});

describe("deviceFrom", () => {
  test("saves a machine as a device of mine, named after it, without its fixed addresses", () => {
    const device = deviceFrom(machine("m", { name: "web2", pins: { office: 20 } }).data);
    expect(device).toMatchObject({ group: "mine", label: "web2", prefix: "web" });
    expect(device.id).toMatch(/^my-/);
    expect(device.data.pins).toBeUndefined();
    expect("name" in device.data).toBe(false);
  });

  test("prefixes a device whose name is only digits 'device'", () => {
    expect(deviceFrom(machine("m", { name: "42" }).data).prefix).toBe("device");
  });
});

describe("runAs", () => {
  test("a VM keeps its OS, Debian 12 by default", () => {
    expect(runAs(machine("m", { os: "kali@rolling" }).data, "vm")).toEqual({ kind: "vm", os: "kali@rolling" });
    expect(runAs(machine("m").data, "vm")).toEqual({ kind: "vm", os: "debian@12" });
  });

  test("a container keeps its image: FRR for a router, Alpine otherwise", () => {
    expect(runAs(machine("m", { image: "" }).data, "container")).toEqual({ kind: "container", image: "alpine:3.20" });
    expect(runAs(machine("m", { image: "", icon: "router" }).data, "container")).toEqual({ kind: "container", image: "frrouting/frr:v8.5.2" });
    expect(runAs(machine("m").data, "container")).toEqual({ kind: "container", image: "nginx:1.27-alpine" });
  });

  test("an automatic router takes only its kind, and an unknown kind changes nothing", () => {
    expect(runAs(machine("m").data, "router")).toEqual({ kind: "router" });
    expect(runAs(machine("m").data, "pod")).toBeNull();
  });
});
