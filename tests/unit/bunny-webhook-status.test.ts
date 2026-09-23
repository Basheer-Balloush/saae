import { describe, expect, it } from "vitest";
import { lessonStatusFromBunnyWebhook } from "../../src/lib/bunny-webhook-status";

describe("Bunny webhook status", () => {
  it("marks the lesson playable when encoding finishes or the first resolution is ready", () => {
    expect(lessonStatusFromBunnyWebhook(3)).toBe("ready");
    expect(lessonStatusFromBunnyWebhook(4)).toBe("ready");
  });

  it("marks failed encodes and failed uploads as failed", () => {
    expect(lessonStatusFromBunnyWebhook(5)).toBe("failed");
    expect(lessonStatusFromBunnyWebhook(8)).toBe("failed");
  });

  it("keeps queued, encoding and upload-progress events as processing", () => {
    for (const s of [0, 1, 2, 6, 7]) expect(lessonStatusFromBunnyWebhook(s)).toBe("processing");
  });

  it("ignores captions, generated titles and unknown codes", () => {
    for (const s of [9, 10, 42, undefined, "3"]) expect(lessonStatusFromBunnyWebhook(s)).toBeNull();
  });
});
