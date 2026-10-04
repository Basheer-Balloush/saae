import { useLmsAuth } from "@/hooks/useLmsAuth";
import type { LmsRole } from "@/features/lms/lib/roles";

/* Admins and every instructor may sign in. Which courses an instructor sees is
   decided in the database (can_access_ams_course: only courses they teach), so
   an instructor without a current course gets an empty list rather than a
   refused sign-in. */
export function canUseAms(role: LmsRole): boolean {
  return role === "admin" || role === "lms_instructor";
}

export function useAmsAuth() {
  const { user, session, role, loading } = useLmsAuth();
  return {
    user,
    session,
    role,
    loading,
    hasAccess: !loading && canUseAms(role),
  };
}
