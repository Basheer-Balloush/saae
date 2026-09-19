import { describe, expect, it } from "vitest";
import { CHAT_IDLE_MS, resolveChatSession } from "../../src/lib/chat-session";

const now = 1_800_000_000_000;
const stored = (s: object) => JSON.stringify(s);

describe("chat session lifetime", () => {
  it("keeps the conversation across a reload within the idle window", () => {
    const raw = stored({ id: "abc123-session", lastActivity: now - 60_000, messages: [{ id: "m1" }] });
    const { session, isNew } = resolveChatSession(raw, now);
    expect(isNew).toBe(false);
    expect(session.id).toBe("abc123-session");
    expect(session.messages).toEqual([{ id: "m1" }]);
  });

  it("starts a new conversation once the idle window passes", () => {
    const raw = stored({ id: "abc123-session", lastActivity: now - CHAT_IDLE_MS - 1, messages: [{ id: "m1" }] });
    const { session, isNew } = resolveChatSession(raw, now);
    expect(isNew).toBe(true);
    expect(session.id).not.toBe("abc123-session");
    expect(session.messages).toEqual([]);
  });

  it("treats the boundary as expired, so 30 minutes idle ends the conversation", () => {
    const justInside = resolveChatSession(stored({ id: "abc123-session", lastActivity: now - CHAT_IDLE_MS + 1, messages: [] }), now);
    const atBoundary = resolveChatSession(stored({ id: "abc123-session", lastActivity: now - CHAT_IDLE_MS, messages: [] }), now);
    expect(justInside.isNew).toBe(false);
    expect(atBoundary.isNew).toBe(true);
  });

  it("starts fresh with no stored session, junk, or a clock that moved backwards", () => {
    expect(resolveChatSession(null, now).isNew).toBe(true);
    expect(resolveChatSession("{not json", now).isNew).toBe(true);
    expect(resolveChatSession(stored({ id: "x", lastActivity: now }), now).isNew).toBe(true);
    expect(resolveChatSession(stored({ id: "abc123-session" }), now).isNew).toBe(true);
    expect(resolveChatSession(stored({ id: "abc123-session", lastActivity: now + 60_000, messages: [] }), now).isNew).toBe(true);
  });

  it("gives every new conversation its own id", () => {
    const a = resolveChatSession(null, now).session.id;
    const b = resolveChatSession(null, now).session.id;
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps only the most recent messages, matching the server's replay limit", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `m${i}` }));
    const { session } = resolveChatSession(stored({ id: "abc123-session", lastActivity: now, messages: many }), now);
    expect(session.messages).toHaveLength(50);
    expect(session.messages[49]).toEqual({ id: "m79" });
  });
});
