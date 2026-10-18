import { describe, expect, test } from "vitest";
import type { EnvironmentLive } from "./desktop";
import { liveViewOf } from "./live";
import { cable, lan, machine } from "@/test/lab";

const away = { x: 2000, y: 2000 };
const nodes = [lan("office"), machine("web", {}, away), machine("db", {}, away), machine("cache", {}, away)];
const edges = [cable("webLan", "web", "office"), cable("dbLan", "db", "office"), cable("webCache", "web", "cache")];
const live: EnvironmentLive = {
  machines: { web: { state: "running", health: "" }, db: { state: "running", health: "unhealthy" }, cache: { state: "running", health: "" } },
  ports: [
    { machine: "web", network: "office", up: true, interface: "eth0" },
    { machine: "db", network: "office", up: false, interface: null },
    { machine: "web", network: "link-0", up: null, interface: null },
  ],
  probed: true,
};
const view = liveViewOf(live, [], nodes, edges);

describe("liveViewOf", () => {
  test("shows each machine's status, and its state with its health", () => {
    expect(view.machines.db).toEqual({ status: "unhealthy", detail: "running, unhealthy" });
    expect(view.machines.web).toEqual({ status: "up", detail: "running" });
  });

  test("keys each port by machine and network", () => {
    expect(view.ports).toEqual({ "web/office": true, "db/office": false, "web/link-0": null });
  });

  test("a cable is up when its ports are, down when one is, unknown when a port isn't known", () => {
    expect(view.cables).toEqual({ webLan: "up", dbLan: "down", webCache: "unknown" });
  });

  test("a cable to a machine that is down is down", () => {
    const stopped = { ...live, machines: { ...live.machines, web: { state: "exited", health: "" } } };
    expect(liveViewOf(stopped, [], nodes, edges).cables.webLan).toBe("down");
  });

  test("a suspended link cuts its cable", () => {
    expect(liveViewOf(live, [{ network: "office", machine: "web" }], nodes, edges).cables.webLan).toBe("cut");
  });

  test("counts each network's ports up, out of all", () => {
    expect(view.lans).toEqual({ office: { up: 1, total: 2 }, "link-0": { up: 0, total: 1 } });
  });
});
