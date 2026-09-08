export type LmsRole = "admin" | "lms_instructor" | "lms_student" | null;
export function resolveLmsRole(roles: string[]): LmsRole {
  if (roles.includes("admin") || roles.includes("lms_admin")) return "admin";
  if (roles.includes("lms_instructor")) return "lms_instructor";
  if (roles.includes("lms_student")) return "lms_student";
  return null;
}
