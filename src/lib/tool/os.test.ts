import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { DEFAULT_OS, OS_CHOICES, currentMachine, currentOs } from "./os";
import { machine } from "@/test/lab";

describe("currentOs", () => {
  test("writes a stored lab's OS as Isoloom names it now", () => {
    expect(["debian-12", "ubuntu-24.04", "almalinux-9", "kali", "windows-11", "windows-server-2008r2", "centos-7"].map(currentOs)).toEqual([
      "debian@12",
      "ubuntu@24.04",
      "alma@9",
      "kali@rolling",
      "windows@11",
      "windows-server@2008r2",
      "centos@7",
    ]);
  });

  test("keeps an OS already written today's way, and what it can't read", () => {
    for (const os of [...OS_CHOICES, "", "plan9", "debian"]) expect(currentOs(os)).toBe(os);
  });

  test("never changes an OS twice", () => {
    fc.assert(
      fc.property(fc.string(), (os) => {
        expect(currentOs(currentOs(os))).toBe(currentOs(os));
      }),
    );
  });
});

describe("currentMachine", () => {
  test("renames a stored machine's OS and its Cisco OS, and nothing else", () => {
    const m = machine("sw", { os: "debian-12", appliance: "cisco-viosl2" as never, ports: "22" }).data;
    expect(currentMachine(m)).toEqual({ ...m, os: "debian@12", appliance: "cisco-vios-l2" });
  });

  test("leaves a machine without a Cisco OS without one", () => {
    expect("appliance" in currentMachine(machine("web").data)).toBe(false);
  });
});

test("a new VM is Debian 12, one of the OSes offered", () => {
  expect(OS_CHOICES).toContain(DEFAULT_OS);
});
