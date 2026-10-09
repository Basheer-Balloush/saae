import { describe, expect, it } from "vitest";
import {
  CHAT_LIMITS,
  cleanDeviceId,
  limitMessage,
  readVerdict,
} from "@/features/chat/lib/chat-rate-limit";
import { chatErrorText } from "@/features/chat/lib/chat-format";

describe("chat limits", () => {
  it("are the numbers agreed on 9 Oct 2026", () => {
    expect(CHAT_LIMITS).toEqual({ perMinute: 8, perDay: 40, addressPerDay: 400 });
  });

  it("accept only a plain device id", () => {
    expect(cleanDeviceId("3f2a9c1e-7b4d-4c3e-9a1f-0e2d4c6b8a10")).toBe(
      "3f2a9c1e-7b4d-4c3e-9a1f-0e2d4c6b8a10",
    );
    expect(cleanDeviceId("short")).toBe(null);
    expect(cleanDeviceId("bad id; drop table")).toBe(null);
    expect(cleanDeviceId(42)).toBe(null);
  });

  it("let the message through unless the database says no", () => {
    expect(readVerdict(null)).toEqual({ ok: true });
    expect(readVerdict({ ok: true })).toEqual({ ok: true });
    expect(readVerdict({ ok: false, reason: "day", retry_after: 3600 })).toEqual({
      ok: false,
      reason: "day",
      retry_after: 3600,
    });
    expect(readVerdict({ ok: false, reason: "odd" })).toEqual({
      ok: false,
      reason: "minute",
      retry_after: 60,
    });
  });

  it("are explained to the visitor in their language", () => {
    // The chat window shows texts with an email as they are, and words "rate limit" itself.
    expect(chatErrorText(limitMessage("day", "ar"), "ar")).toContain("للحد اليومي");
    expect(chatErrorText(limitMessage("address", "en"), "en")).toContain("today's message limit");
    expect(chatErrorText(limitMessage("minute", "ar"), "ar")).toContain("انتظر دقيقة");
  });
});
