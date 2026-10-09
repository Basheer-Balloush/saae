/**
 * Safe internal return URLs for the LMS auth flow.
 * Only same-origin paths inside /learning-management-system/, and the Texpo
 * game (/texpo, where players sign in to claim their coupon), are accepted;
 * anything else (absolute URLs, protocol-relative, traversal) is rejected.
 */
const PREFIX = "/learning-management-system/";
const TEXPO = /^\/texpo(\?|$)/;

export function safeLmsRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v.startsWith(PREFIX) && !TEXPO.test(v)) return undefined;
  if (v.startsWith("//") || v.includes("\\")) return undefined;
  if (v.includes("://") || v.includes("..")) return undefined;
  return v;
}

export const lmsRedirectSearchSchema = (raw: Record<string, unknown>): { redirect?: string } => ({
  redirect: safeLmsRedirect(raw?.redirect),
});

const AUTH_PAGE =
  /^\/learning-management-system\/(login|signup|forgot-password|reset-password)\/?$/;

/**
 * The current LMS page as a login return target, so sign-in lands back here.
 * A guard can fire again after the URL has already become /login; then keep
 * the return target that is already there instead of nesting /login in it.
 */
export function currentLmsReturn(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const { pathname, search } = window.location;
  if (AUTH_PAGE.test(pathname)) {
    return safeLmsRedirect(new URLSearchParams(search).get("redirect") ?? undefined);
  }
  return safeLmsRedirect(`${pathname}${search}`);
}

/** Supabase puts `error_code` in the URL when an email link expired or was used already. */
export function emailLinkError(): boolean {
  if (typeof window === "undefined") return false;
  const { search, hash } = window.location;
  const code =
    new URLSearchParams(hash.slice(1)).get("error_code") ??
    new URLSearchParams(search).get("error_code");
  return Boolean(code);
}

/**
 * Whether a guard sending someone to login should say their email link
 * failed: the error is in the URL, or (when the guard fires again after the
 * URL has already become /login) the login URL says so already.
 */
export function emailLinkFailed(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname, search } = window.location;
  if (AUTH_PAGE.test(pathname)) return new URLSearchParams(search).get("link") === "expired";
  return emailLinkError();
}
