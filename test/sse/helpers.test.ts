import { describe, it, expect } from "vitest";
import { patchElements, sseResponse, mergeFragments } from "~/sse/helpers";

describe("patchElements", () => {
  it("formats a single fragment as SSE data lines", () => {
    const result = patchElements('<div id="hero">Hello</div>');
    expect(result).toBe(
      "event: datastar-patch-elements\ndata: elements <div id=\"hero\">Hello</div>\n\n"
    );
  });

  it("supports custom selector", () => {
    const result = patchElements("<span>Hi</span>", { selector: "#target" });
    expect(result).toContain("data: selector #target");
  });

  it("supports merge mode", () => {
    const result = patchElements("<li>Item</li>", { mode: "append" });
    expect(result).toContain("data: mode append");
  });

  it("prefixes each line of multi-line HTML with data:", () => {
    const result = patchElements("<div>\n  <span>Hi</span>\n</div>");
    const lines = result.split("\n");
    // Every non-empty line after "event:" should start with "data: "
    const dataLines = lines.filter((l) => l.startsWith("data: "));
    expect(dataLines.length).toBeGreaterThanOrEqual(3);
  });
});

describe("mergeFragments", () => {
  it("concatenates multiple SSE events", () => {
    const result = mergeFragments([
      patchElements('<div id="a">A</div>'),
      patchElements('<div id="b">B</div>'),
    ]);
    expect(result).toContain("A</div>");
    expect(result).toContain("B</div>");
    expect(result.split("event: datastar-patch-elements").length - 1).toBe(2);
  });
});

describe("sseResponse", () => {
  it("returns a Response with correct content-type and cache headers", () => {
    const res = sseResponse("event: test\ndata: hi\n\n");
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("vary")).toBe("Accept");
  });
});
