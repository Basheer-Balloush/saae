/* Unsaved admin form input is kept on the device until the form is saved, so a
   refresh, a closed tab or a crash never loses it. One draft per account, form and
   record. A restored draft is always announced (DraftNotice) with a way to discard
   it, because the record may have changed since the draft was typed.

   Student quizzes must never use this: answers are deliberately dropped when a
   quiz is left or reloaded (see commit 128004b5). */

const PREFIX = "saae-form-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Part = string | number | null | undefined;

/** Null when the account is not known yet, so nothing is read or written for "nobody". */
export function formDraftKey(userId: string | null | undefined, ...parts: Part[]): string | null {
  if (!userId) return null;
  return [PREFIX, userId, ...parts.map((p) => (p === null || p === undefined || p === "" ? "-" : String(p)))].join(":");
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; values?: unknown };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS || !("values" in parsed)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.values as T;
  } catch {
    // Storage can be unavailable (private mode, full quota, server render); the form still works.
    return null;
  }
}

export function saveFormDraft(key: string, values: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    /* ignore */
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Drops drafts past their age, so abandoned forms don't pile up on the device. */
export function pruneFormDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIX}:`)) keys.push(k);
    }
    keys.forEach((k) => loadFormDraft(k));
  } catch {
    /* ignore */
  }
}

export function hasFormDraft(key: string | null): boolean {
  return key !== null && loadFormDraft(key) !== null;
}
