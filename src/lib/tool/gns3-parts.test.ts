import { describe, expect, test } from "vitest";
import { drawingNote, guessOs } from "./gns3-parts";

describe("guessOs", () => {
  test("reads a Linux distribution and its version from the image's name", () => {
    const names = ["kali linux", "Rocky", "alma", "centos", "fedora", "ubuntu 20.04", "ubuntu 24", "ubuntu", "debian 11", "debian 13", "debian"];
    expect(names.map(guessOs)).toEqual([
      "kali@rolling",
      "rocky@9",
      "alma@9",
      "centos@7",
      "fedora@42",
      "ubuntu@20.04",
      "ubuntu@24.04",
      "ubuntu@22.04",
      "debian@11",
      "debian@13",
      "debian@12",
    ]);
  });

  test("reads Windows desktops and servers, Server 2022 by default", () => {
    const names = ["windows-11.img", "Win10", "Windows Server 2016", "win 2019", "win 2025", "windows"];
    expect(names.map(guessOs)).toEqual(["windows@11", "windows@10", "windows-server@2016", "windows-server@2019", "windows-server@2025", "windows-server@2022"]);
  });

  test("guesses Debian 12 when nothing says otherwise", () => {
    expect(guessOs("my appliance")).toBe("debian@12");
  });
});

describe("drawingNote", () => {
  test("takes an SVG drawing's text, without markup and with entities decoded, one line per text element", () => {
    const svg = '<svg width="100" height="40"><text font="x">Hello &amp; <b>bye</b></text><text>a &lt;b&gt;</text></svg>';
    expect(drawingNote({ svg }, 2)).toEqual({ text: "Hello & bye\na <b>", shape: "text", w: 200, h: 80 });
  });

  test("keeps an ellipse or a box, sized by the drawing within bounds", () => {
    expect(drawingNote({ svg: '<svg width="300" height="300"><ellipse/></svg>' }, 2)).toEqual({ text: "", shape: "ellipse", w: 600, h: 400 });
    expect(drawingNote({ svg: "<svg><rect/></svg>" }, 2)).toEqual({ text: "", shape: "rect", w: 120, h: 50 });
  });

  test("is nothing for a drawing with no text and no shape", () => {
    expect(drawingNote({ svg: "<svg></svg>" }, 2)).toBeNull();
    expect(drawingNote({}, 2)).toBeNull();
  });
});
