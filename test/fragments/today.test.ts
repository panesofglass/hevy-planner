import { describe, it, expect } from "vitest";
import { syncButton } from "~/fragments/today";

describe("syncButton", () => {
  describe("with callbackUrl and bearerToken", () => {
    it("shows the callback URL in a code block", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc");
      expect(html).toContain("https://example.com/api/webhooks/hevy");
      expect(html).toContain("sync-credential-value");
    });

    it("shows the bearer token in a code block", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc");
      expect(html).toContain("tok-abc");
    });

    it("shows last-synced time when lastSyncAt is provided", () => {
      const html = syncButton(
        "https://example.com/api/webhooks/hevy",
        "tok-abc",
        "2026-05-29T10:00:00Z",
        "UTC"
      );
      expect(html).toContain("Last synced");
    });

    it("shows waiting message when lastSyncAt is null", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc", null);
      expect(html).toContain("Waiting for first sync");
    });
  });

  describe("with only callbackUrl", () => {
    it("shows auto-sync enabled without credential code blocks", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", null);
      expect(html).toContain("Auto-sync enabled");
      expect(html).not.toContain("sync-credential-value");
    });
  });

  describe("with no arguments", () => {
    it("shows enable auto-sync button", () => {
      const html = syncButton();
      expect(html).toContain("Enable auto-sync");
    });
  });
});
