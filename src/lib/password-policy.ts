// Phase 7A — single source of truth for password policy.
// Server (createServerFn validators) and client (signup / reset forms) must
// both import PASSWORD_MIN so the rule stays consistent.

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

/** Advisory-only scoring for the UI meter. Not used for gate decisions. */
export function scorePasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score += 2;
  else if (pw.length >= 8) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length >= 16) score += 1;
  return Math.min(score, 6);
}
