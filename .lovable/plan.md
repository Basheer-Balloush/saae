## Problem

On `src/routes/contact.tsx` line 420, "Chat with Abu Al-Joud" is a `<Link to="/" hash="assistant">`. That navigates away from `/contact` to the home page and, at best, scrolls to the `#assistant` section — it never opens the Abu Al-Joud chatbot.

The chatbot is actually an in-page modal opened by `AssistantFab` (mounted globally), which listens for a `window` event:

```
// src/components/site/AssistantFab.tsx
window.addEventListener("assistant:open", handler);
```

`src/routes/communities.$key.tsx` already uses this pattern:

```
window.dispatchEvent(new CustomEvent("assistant:open", { detail: { prefill } }));
```

## Fix

In `src/routes/contact.tsx`, replace the `<Link>` with a `<button type="button">` that dispatches the `assistant:open` event. The AssistantFab modal handles Arabic/English automatically via the existing `useLang` translations, so no language prefix or per-locale routing is needed.

- Keep the exact text, arrow icon, spacing, and hover classes.
- Use a `<button>` so mouse/keyboard/touch all activate it (Enter + Space work natively); no nested clickables.
- No changes to other Contact page content, links, routes, or translations.

### Change (single file, single element)

`src/routes/contact.tsx` (~line 420):

```tsx
<button
  type="button"
  onClick={() => window.dispatchEvent(new CustomEvent("assistant:open"))}
  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
>
  {isAr ? "تحدث مع أبو الجود" : "Chat with Abu Al-Joud"}
  <Arrow className="h-3.5 w-3.5" />
</button>
```

Remove the now-unused `Link` import only if it isn't used elsewhere in the file.

## Verification

- On `/contact` (English) and `/contact` (Arabic): click the link → Abu Al-Joud modal opens in the current language, URL stays on `/contact`.
- Keyboard: Tab to the control, press Enter → modal opens.
- Back button behavior unchanged (no navigation occurred).
- No other Contact page links affected.