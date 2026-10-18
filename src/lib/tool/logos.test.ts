import { siAlpinelinux, siDocker, siKalilinux, siLinux, siNginx, siPostgresql } from "simple-icons";
import { describe, expect, test } from "vitest";
import { dockerLogo, isDark, logoFor } from "./logos";

describe("logoFor", () => {
  test("a VM takes its OS's logo, the Linux one when its distribution has none", () => {
    expect(logoFor({ kind: "vm", os: "kali@rolling", image: "" })).toBe(siKalilinux);
    expect(logoFor({ kind: "vm", os: "unknown", image: "" })).toBe(siLinux);
  });

  test("a Windows VM has no logo", () => {
    expect(logoFor({ kind: "vm", os: "windows@11", image: "" })).toBeNull();
  });

  test("a container takes its image's logo, by the image's name", () => {
    expect(logoFor({ kind: "container", os: "", image: "library/nginx:1" })).toBe(siNginx);
    expect(logoFor({ kind: "container", os: "", image: " Postgres:16 " })).toBe(siPostgresql);
    expect(logoFor({ kind: "container", os: "", image: "alpine" })).toBe(siAlpinelinux);
  });

  test("an image it doesn't know has none, and falls back to Docker's whale", () => {
    expect(logoFor({ kind: "container", os: "", image: "foo" })).toBeNull();
    expect(dockerLogo).toBe(siDocker);
  });
});

test("isDark tells the brand colors too dark for a dark background", () => {
  expect(["000000", "1C1C1C"].map(isDark)).toEqual([true, true]);
  expect(["FFFFFF", "F97316", "0D597F"].map(isDark)).toEqual([false, false, false]);
});
