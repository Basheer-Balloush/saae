import type { PmRole } from "./model";

export const PM_AUTH_STORAGE_KEY = "saae-project-management-session-v1";
export const PM_DEMO_PASSWORD = "SAAE2026!";

export type PmDemoAccount = {
  userId: string;
  role: PmRole;
  email: string;
  name: string;
};

export type PmSession = PmDemoAccount & { signedInAt: string };

export const PM_DEMO_ACCOUNTS: readonly PmDemoAccount[] = [
  { userId: "admin-1", role: "admin", email: "admin@saae.org", name: "Administrator" },
  { userId: "mentor-2", role: "mentor", email: "mentor@saae.org", name: "Mentor" },
  { userId: "intern-1", role: "intern", email: "intern@saae.org", name: "Intern" },
] as const;

export function pmRolePath(role: PmRole) {
  return `/project-management/${role}` as const;
}

export function authenticatePmDemo(email: string, password: string): PmSession | null {
  if (password !== PM_DEMO_PASSWORD) return null;
  const normalized = email.trim().toLowerCase();
  const account = PM_DEMO_ACCOUNTS.find((candidate) => candidate.email === normalized);
  if (!account) return null;
  return { ...account, signedInAt: new Date().toISOString() };
}

export function loadPmSession(): PmSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PM_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PmSession>;
    const account = PM_DEMO_ACCOUNTS.find(
      (candidate) =>
        candidate.userId === parsed.userId &&
        candidate.role === parsed.role &&
        candidate.email === parsed.email,
    );
    if (!account || typeof parsed.signedInAt !== "string") return null;
    return { ...account, signedInAt: parsed.signedInAt };
  } catch {
    return null;
  }
}

export function savePmSession(session: PmSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PM_AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearPmSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PM_AUTH_STORAGE_KEY);
}
