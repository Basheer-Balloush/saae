import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { clearFormDraft, formDraftKey, hasFormDraft, loadFormDraft, pruneFormDrafts, saveFormDraft } from "@/lib/form-draft";

let pruned = false;

/**
 * `useState` for a form's values that also survives refreshes and closed tabs.
 *
 * - `key` comes from `formDraftKey`; pass null until the account (and, for edit
 *   forms, the record) is loaded. When the key changes the form restarts from the
 *   saved draft for that key, or from `initial`.
 * - Values equal to `initial` are not stored, so opening a form leaves no draft.
 * - Call `clearDraft()` after a successful save or an explicit discard.
 */
export function useFormDraft<T>(key: string | null, initial: T) {
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const read = (k: string | null) => {
    const draft = k ? loadFormDraft<T>(k) : null;
    return { key: k, values: draft ?? initial, baseline: JSON.stringify(initial), restored: draft !== null };
  };
  const [state, setState] = useState(() => read(key));

  let current = state;
  if (state.key !== key) {
    // Adjust during render (not in an effect) so the old values are never saved under the new key.
    current = read(key);
    setState(current);
  }

  useEffect(() => {
    if (pruned) return;
    pruned = true;
    pruneFormDrafts();
  }, []);

  useEffect(() => {
    if (!state.key) return;
    if (JSON.stringify(state.values) === state.baseline) clearFormDraft(state.key);
    else saveFormDraft(state.key, state.values);
  }, [state]);

  const setValues = useCallback((action: SetStateAction<T>) => {
    setState((prev) => ({
      ...prev,
      values: typeof action === "function" ? (action as (p: T) => T)(prev.values) : action,
    }));
  }, []);

  /** Forget the draft and go back to `initial` (or to `resetTo`). */
  const clearDraft = useCallback((resetTo?: T) => {
    setState((prev) => {
      if (prev.key) clearFormDraft(prev.key);
      const values = resetTo ?? initialRef.current;
      return { ...prev, values, baseline: JSON.stringify(values), restored: false };
    });
  }, []);

  return {
    values: current.values,
    setValues,
    clearDraft,
    /** True when the form was filled from a saved draft rather than `initial`. */
    restored: current.restored,
  };
}

/**
 * Draft support for forms that keep their fields in separate state, or load a
 * record and then edit it in place.
 *
 * - `loaded`: the editable values as they came from the server (or the empty
 *   form). Give it a new object only when a fresh copy is loaded or saved.
 * - `current`: the same fields as currently typed (memoize it).
 * - `apply`: puts a draft's values back into the form's state.
 *
 * A draft is applied whenever `loaded` changes, so reloading the record after
 * another action keeps the unsaved edits. After a successful save, pass the saved
 * values as the new `loaded` and the draft is dropped.
 */
export function useRecordDraft<T>(opts: {
  key: string | null;
  loaded: T | null;
  current: T | null;
  apply: (values: T) => void;
}) {
  const { key, loaded, current } = opts;
  const applyRef = useRef(opts.apply);
  applyRef.current = opts.apply;
  const [restored, setRestored] = useState(false);
  // Set while a just-applied draft has not reached `current` yet (it lands next render).
  const applying = useRef(false);

  useEffect(() => {
    if (pruned) return;
    pruned = true;
    pruneFormDrafts();
  }, []);

  useEffect(() => {
    applying.current = false;
    if (!key || loaded === null) return;
    const draft = loadFormDraft<T>(key);
    if (draft === null) return;
    if (JSON.stringify(draft) === JSON.stringify(loaded)) {
      clearFormDraft(key);
      setRestored(false);
      return;
    }
    applying.current = true;
    applyRef.current(draft);
    setRestored(true);
  }, [key, loaded]);

  useEffect(() => {
    if (!key || loaded === null || current === null) return;
    if (JSON.stringify(current) !== JSON.stringify(loaded)) {
      applying.current = false;
      saveFormDraft(key, current);
    } else if (!applying.current) {
      // Edits were undone back to the loaded values: nothing unsaved any more.
      clearFormDraft(key);
      setRestored(false);
    }
  }, [key, loaded, current]);

  /** Forget the draft and put the loaded values back. */
  const discard = useCallback(() => {
    if (key) clearFormDraft(key);
    setRestored(false);
    if (loaded !== null) applyRef.current(loaded);
  }, [key, loaded]);

  /** Forget the draft without touching the form (after a save, or when closing a form on purpose). */
  const clear = useCallback(() => {
    if (key) clearFormDraft(key);
    setRestored(false);
  }, [key]);

  return { restored, discard, clear };
}

/**
 * Reopens a modal form after a refresh when it has a saved draft: the "new" form
 * first, otherwise the first listed record with a draft. Runs once per mount,
 * after the list has loaded (`rows` non-null and, for edits, non-empty).
 */
export function useReopenDraftForm<R extends { id: string }>(opts: {
  userId: string | null | undefined;
  form: string;
  rows: R[] | null;
  open: (row: R | null) => void;
}) {
  const { userId, form, rows } = opts;
  const openRef = useRef(opts.open);
  openRef.current = opts.open;
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !userId) return;
    if (hasFormDraft(formDraftKey(userId, form, "new"))) {
      done.current = true;
      openRef.current(null);
      return;
    }
    if (!rows || rows.length === 0) return;
    done.current = true;
    const row = rows.find((r) => hasFormDraft(formDraftKey(userId, form, r.id)));
    if (row) openRef.current(row);
  }, [userId, form, rows]);
}
