import { describe, it, expect } from "vitest";
import { buildContentEvents } from "~/projections/build-events";

describe("buildContentEvents", () => {
  it("returns exactly one event for multiple fragments", () => {
    const events = buildContentEvents(["<p>A</p>", "<p>B</p>"]);
    expect(events).toHaveLength(1);
  });

  it("returns a patch event type", () => {
    const events = buildContentEvents(["<p>A</p>"]);
    expect(events[0].type).toBe("patch");
  });

  it("wraps all fragments inside #content div", () => {
    const events = buildContentEvents(["<p>A</p>", "<p>B</p>"]);
    expect(events[0]).toMatchObject({
      type: "patch",
      html: '<div id="content"><p>A</p>\n<p>B</p></div>',
    });
  });

  it("returns single patch for a single fragment", () => {
    const events = buildContentEvents(["<p>only</p>"]);
    expect(events[0]).toHaveProperty("html");
    expect((events[0] as any).html).toBe('<div id="content"><p>only</p></div>');
  });

  it("returns empty content div for no fragments", () => {
    const events = buildContentEvents([]);
    expect(events[0]).toHaveProperty("html");
    expect((events[0] as any).html).toBe('<div id="content"></div>');
  });
});
