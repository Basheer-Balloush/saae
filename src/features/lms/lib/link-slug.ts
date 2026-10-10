/* Course and internship addresses end in a slug: lowercase words joined by
   hyphens. Links shared in chats and posts often arrive with sentence
   punctuation stuck to the end ("…/generative-ai-09.") or with capitals added
   by autocorrect, so such a link is read back to the slug it meant. */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRAILING = /[\s.,;:!?،؛؟'"»)\]]+$/u;

/** The slug a pasted link meant, or null when it can't be a slug at all. */
export function cleanSlug(raw: string, maxLength: number): string | null {
  const slug = raw.trim().replace(TRAILING, "").toLowerCase();
  return slug.length >= 3 && slug.length <= maxLength && SLUG.test(slug) ? slug : null;
}
