import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFormDraft,
  formDraftKey,
  loadFormDraft,
  pruneFormDrafts,
  saveFormDraft,
} from "../../src/lib/form-draft";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe("form drafts", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("has no key until the account is known", () => {
    expect(formDraftKey(null, "news", "new")).toBeNull();
    expect(formDraftKey("", "news", "new")).toBeNull();
  });

  it("separates accounts, forms and record versions", () => {
    const keys = new Set([
      formDraftKey("u1", "internship", "new"),
      formDraftKey("u2", "internship", "new"),
      formDraftKey("u1", "news", "new"),
      formDraftKey("u1", "internship", "abc", "2026-09-01T00:00:00Z"),
      formDraftKey("u1", "internship", "abc", "2026-09-02T00:00:00Z"),
    ]);
    expect(keys.size).toBe(5);
    expect(formDraftKey("u1", "news", null)).toBe(formDraftKey("u1", "news", undefined));
  });

  it("restores what was saved and forgets it once cleared", () => {
    const key = formDraftKey("u1", "news", "new")!;
    saveFormDraft(key, { title: "مسودة", tags: ["a"] });
    expect(loadFormDraft(key)).toEqual({ title: "مسودة", tags: ["a"] });
    clearFormDraft(key);
    expect(loadFormDraft(key)).toBeNull();
  });

  it("drops drafts older than a week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
    const old = formDraftKey("u1", "news", "old")!;
    const fresh = formDraftKey("u1", "news", "fresh")!;
    saveFormDraft(old, { title: "old" });
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
    saveFormDraft(fresh, { title: "fresh" });
    vi.setSystemTime(new Date("2026-09-09T00:00:01Z"));
    pruneFormDrafts();
    expect(localStorage.getItem(old)).toBeNull();
    expect(loadFormDraft(fresh)).toEqual({ title: "fresh" });
  });

  it("ignores corrupt entries and missing storage", () => {
    const key = formDraftKey("u1", "news", "new")!;
    localStorage.setItem(key, "{not json");
    expect(loadFormDraft(key)).toBeNull();
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveFormDraft(key, { a: 1 })).not.toThrow();
    expect(loadFormDraft(key)).toBeNull();
  });
});
