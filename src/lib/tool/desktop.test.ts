import { describe, expect, test, vi } from "vitest";
import { type Invoke, desktop, machineStatus, runningServices, runsOnVms } from "./desktop";

describe("desktop", () => {
  test("has no commands in a browser, or without a window", () => {
    expect(desktop()).toBeNull();
    vi.stubGlobal("window", {});
    expect(desktop()).toBeNull();
  });

  test("gives the desktop app's invoke when the window has one", () => {
    const invoke: Invoke = () => Promise.reject(new Error("unused"));
    vi.stubGlobal("window", { __TAURI__: { core: { invoke } } });
    expect(desktop()).toBe(invoke);
  });
});

describe("runsOnVms", () => {
  const plan = (paths: string[]) => ({ files: paths.map((path) => ({ path })) });

  test("a lab with VM nodes that Isoloom generates for Docker runs on Docker", () => {
    expect(runsOnVms(true, plan([".isoloom/docker/compose.yml", ".isoloom/vagrant/Vagrantfile"]))).toBe(false);
  });

  test("a lab whose VMs have no container form runs on VMs", () => {
    expect(runsOnVms(true, plan([".isoloom/hybrid/Vagrantfile"]))).toBe(true);
    expect(runsOnVms(true, null)).toBe(true);
  });

  test("a lab without VM nodes never needs VMs", () => {
    expect(runsOnVms(false, plan([]))).toBe(false);
  });
});

describe("machineStatus", () => {
  test("a running machine is up, unless its check says unhealthy or starting", () => {
    expect(machineStatus({ state: "running", health: "" })).toBe("up");
    expect(machineStatus({ state: "running", health: "unhealthy" })).toBe("unhealthy");
    expect(machineStatus({ state: "running", health: "starting" })).toBe("starting");
  });

  test("a machine being created or restarting is starting", () => {
    expect([machineStatus({ state: "created", health: "" }), machineStatus({ state: "restarting", health: "" })]).toEqual(["starting", "starting"]);
  });

  test("a machine that exited, or isn't there, is down", () => {
    expect([machineStatus({ state: "exited", health: "" }), machineStatus(undefined)]).toEqual(["down", "down"]);
  });
});

describe("runningServices", () => {
  test("counts the running services of docker compose ps, one JSON object per line", () => {
    expect(runningServices('{"State":"running"}\n x \n{"State":"exited"}\n\n{"State":"running"}')).toBe(2);
  });

  test("counts none in empty output", () => {
    expect(runningServices("")).toBe(0);
  });
});
