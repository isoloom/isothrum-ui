import { describe, expect, test } from "vitest";
import { lanBelow, newLan, newMachine, newNote, newSwitch, twoVlans, usedThirds } from "./create";
import { LAN_BEHAVIOR, LAN_H, LAN_W } from "./model";
import { PRESETS, type Preset } from "./presets";
import { lan, machine } from "@/test/lab";

/** The built-in device with this id. */
const preset = (id: string): Preset => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`no preset ${id}`);
  return p;
};

describe("newMachine", () => {
  test("names a machine after its device, with the first free number", () => {
    expect(newMachine(preset("web"), { x: 0, y: 0 }, [machine("a", { name: "web1" })]).data.name).toBe("web2");
  });

  test("gives a VM a provisioning script of its own: a shell script, PowerShell on Windows", () => {
    expect(newMachine(preset("linux-vm"), { x: 0, y: 0 }, []).data.provision).toBe("provision/vm1.sh");
    expect(newMachine(preset("windows-vm"), { x: 0, y: 0 }, []).data.provision).toBe("provision/win1.ps1");
  });

  test("gives the access VM and containers no provisioning", () => {
    expect(newMachine(preset("workstation"), { x: 0, y: 0 }, []).data.provision).toBe("");
    expect(newMachine(preset("container"), { x: 0, y: 0 }, []).data.provision).toBe("");
  });

  test("places the machine where it is told, under a new id", () => {
    const m = newMachine(preset("web"), { x: 5, y: 7 }, []);
    expect(m.position).toEqual({ x: 5, y: 7 });
    expect(m.id).toMatch(/^m-/);
  });
});

describe("LANs", () => {
  test("usedThirds reads the third number of each LAN's 10.10.<n>.0/24", () => {
    expect(usedThirds([lan("a", { cidr: "10.10.3.0/24" }), lan("b", { cidr: "192.168.1.0/24" }), machine("m")])).toEqual(new Set([3]));
  });

  test("a new LAN takes the next free block and name, centered where it is placed", () => {
    const l = newLan({ x: 500, y: 400 }, [lan("lan1", { cidr: "10.10.1.0/24" }), lan("x", { name: "x", cidr: "10.10.3.0/24" })]);
    expect(l.data).toEqual({ name: "lan2", cidr: "10.10.2.0/24", internet: true });
    expect(l).toMatchObject({ ...LAN_BEHAVIOR, position: { x: 500 - LAN_W / 2, y: 400 - LAN_H / 2 }, width: LAN_W, height: LAN_H });
  });

  test("a LAN below a device puts the device on its top edge, toward the right", () => {
    const l = lanBelow({ x: 1000, y: 100 }, [], { name: "vlan10" }, { w: 600, h: 300 });
    expect(l).toMatchObject({ position: { x: 1000 - 600 * 0.74, y: 100 }, width: 600, height: 300, data: { name: "vlan10", cidr: "10.10.1.0/24" } });
  });
});

describe("switches and notes", () => {
  test("a new switch has vlan10 on ports 1–4 and vlan20 on ports 5–8", () => {
    expect(twoVlans().ports).toEqual([10, 10, 10, 10, 20, 20, 20, 20]);
    expect(twoVlans().vlans.map((v) => v.cidr)).toEqual(["10.10.10.0/24", "10.10.20.0/24"]);
  });

  test("a new switch is centered on the point and takes the next free name", () => {
    const sw = newSwitch({ x: 200, y: 100 }, [machine("a", { name: "sw1" })]);
    expect(sw).toMatchObject({ type: "switch", position: { x: 30, y: 60 }, data: { name: "sw2" } });
  });

  test("a new note is empty text, selected, at the point", () => {
    expect(newNote({ x: 1, y: 2 })).toMatchObject({ type: "note", position: { x: 1, y: 2 }, selected: true, data: { text: "", shape: "text", color: "yellow" } });
  });
});
