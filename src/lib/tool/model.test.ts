import { describe, expect, test } from "vitest";
import {
  APPLIANCES,
  LAN_H,
  LAN_W,
  MACHINE_H,
  MACHINE_W,
  ROUTER_H,
  ROUTER_W,
  SWITCH_H,
  SWITCH_W,
  applianceInterface,
  centerOf,
  cleanName,
  freeName,
  idleByDefault,
  imageName,
  isAppliance,
  isRealRouter,
  nodeName,
  sizeOf,
  uid,
  unselected,
} from "./model";
import { autoRouter, lan, machine, note, realRouter, switchNode } from "@/test/lab";

describe("applianceInterface", () => {
  test("numbers IOL interfaces four to a slot", () => {
    expect([1, 3, 4, 5].map((k) => applianceInterface("cisco-iol", k))).toEqual(["Ethernet0/1", "Ethernet0/3", "Ethernet1/0", "Ethernet1/1"]);
    expect(applianceInterface("cisco-iol-l2", 4)).toBe("Ethernet1/0");
  });

  test("numbers IOSv interfaces on slot 0", () => {
    expect(applianceInterface("cisco-vios", 2)).toBe("GigabitEthernet0/2");
    expect(applianceInterface("cisco-vios-l2", 1)).toBe("GigabitEthernet0/1");
  });

  test("numbers IOS XE interfaces from 2 (GigabitEthernet1 is management)", () => {
    expect(applianceInterface("cisco-csr1000v", 1)).toBe("GigabitEthernet2");
    expect(applianceInterface("cisco-c8000v", 3)).toBe("GigabitEthernet4");
  });

  test("numbers Dynamips interfaces two to a slot, the first on slot 0", () => {
    expect([1, 2, 3, 4].map((k) => applianceInterface("cisco-dynamips", k))).toEqual(["FastEthernet0/0", "FastEthernet1/0", "FastEthernet1/1", "FastEthernet2/0"]);
  });

  test("gives every Cisco OS an image except Dynamips, which Isoloom builds", () => {
    expect(APPLIANCES.filter((a) => !a.image).map((a) => a.id)).toEqual(["cisco-dynamips"]);
  });
});

describe("images", () => {
  test("names an image by its last path segment, without tag, in lowercase", () => {
    expect(imageName(" Docker.io/Library/Nginx:1.27 ")).toBe("nginx");
  });

  test("keeps stock Linux images running idle, not service images", () => {
    expect(["alpine", "x/ubuntu:22", " Debian:12", "nicolaka/netshoot"].map(idleByDefault)).toEqual([true, true, true, true]);
    expect(["nginx", "postgres:16", ""].map(idleByDefault)).toEqual([false, false, false]);
  });
});

describe("kinds of node", () => {
  test("a router you configure is a real router; the automatic one is not", () => {
    expect(isRealRouter(realRouter("frr"))).toBe(true);
    expect(isRealRouter(autoRouter("r"))).toBe(false);
  });

  test("routers and firewalls are appliances; servers are not", () => {
    expect(isAppliance(autoRouter("r"))).toBe(true);
    expect(isAppliance(machine("fw", { icon: "shield" }))).toBe(true);
    expect(isAppliance(machine("web", { icon: "server" }))).toBe(false);
  });

  test("names a note 'note' and anything else by its name", () => {
    expect(nodeName(note("n1"))).toBe("note");
    expect(nodeName(lan("l1", { name: "office" }))).toBe("office");
  });
});

describe("sizeOf", () => {
  test("sizes a LAN by its own width and height, or the default area", () => {
    expect(sizeOf(lan("l", {}, { w: 500, h: 200 }))).toEqual({ w: 500, h: 200 });
    expect(sizeOf({ ...lan("l"), width: undefined, height: undefined })).toEqual({ w: LAN_W, h: LAN_H });
  });

  test("sizes switches, real routers and machines by their faceplate or box", () => {
    expect(sizeOf(switchNode("sw"))).toEqual({ w: SWITCH_W, h: SWITCH_H });
    expect(sizeOf(realRouter("frr"))).toEqual({ w: ROUTER_W, h: ROUTER_H });
    expect(sizeOf(autoRouter("r"))).toEqual({ w: MACHINE_W, h: MACHINE_H });
  });

  test("sizes a note by its own size, 200 by 90 when it has none", () => {
    expect(sizeOf({ ...note("n"), width: undefined, height: undefined })).toEqual({ w: 200, h: 90 });
  });
});

describe("centerOf", () => {
  test("uses the node's width, then its measured size, then the fallback", () => {
    expect(centerOf(lan("l", {}, { x: 10, y: 20, w: 100, h: 50 }))).toEqual({ x: 60, y: 45 });
    expect(centerOf({ ...machine("m"), measured: { width: 40, height: 20 } })).toEqual({ x: 20, y: 10 });
    expect(centerOf(machine("m"), { w: 10, h: 10 })).toEqual({ x: 5, y: 5 });
  });
});

describe("names", () => {
  test("cleans a name into an Isoloom key: lowercase letters, digits and dashes", () => {
    expect(cleanName("Web 1")).toBe("web1");
    expect(cleanName("ÉA_b-c")).toBe("ab-c");
  });

  test("gives the first number no machine or LAN uses", () => {
    const nodes = [machine("a", { name: "web1" }), lan("b", { name: "web2" }), machine("c", { name: "web4" })];
    expect(freeName("web", nodes)).toBe("web3");
    expect(freeName("db", nodes)).toBe("db1");
  });

  test("makes ids with their prefix, different each time", () => {
    const [a, b] = [uid("m"), uid("m")];
    expect(a).toMatch(/^m-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});

test("unselected clears the selection of every node", () => {
  const nodes = [{ ...machine("a"), selected: true }, lan("b")];
  expect(unselected(nodes).map((n) => n.selected)).toEqual([false, false]);
});
