/**
 * Safe internal return URLs for the LMS auth flow.
 * Only same-origin paths inside /learning-management-system/ are accepted;
 * anything else (absolute URLs, protocol-relative, traversal) is rejected.
 */
const PREFIX = "/learning-management-system/";

export function safeLmsRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v.startsWith(PREFIX)) return undefined;
  if (v.startsWith("//") || v.includes("\\")) return undefined;
  if (v.includes("://") || v.includes("..")) return undefined;
  return v;
}

export const lmsRedirectSearchSchema = (raw: Record<string, unknown>): { redirect?: string } => ({
  redirect: safeLmsRedirect(raw?.redirect),
});
