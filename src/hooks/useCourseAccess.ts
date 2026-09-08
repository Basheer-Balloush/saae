import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NO_ACCESS, type LmsCourseAccess } from "@/lib/lms-permissions";

/**
 * Phase 5A — single source of truth for instructor-screen gating.
 * Reads the authoritative matrix from `lms_course_instructors` +
 * `lms_courses.instructor_id` + `is_lms_admin`. The server enforces
 * the same rules via `has_lms_course_capability`; this is UI-only.
 */
export function useCourseAccess(courseId: string | null | undefined): {
  access: LmsCourseAccess;
  loading: boolean;
} {
  const [access, setAccess] = useState<LmsCourseAccess>(NO_ACCESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) {
      setAccess(NO_ACCESS);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        if (!cancelled) {
          setAccess(NO_ACCESS);
          setLoading(false);
        }
        return;
      }
      const [
        { data: isAdmin },
        { data: course },
        { data: coRow },
      ] = await Promise.all([
        supabase.rpc("is_lms_admin", { _user_id: uid }),
        supabase
          .from("lms_courses")
          .select("instructor_id")
          .eq("id", courseId)
          .maybeSingle(),
        supabase.rpc("lms_get_course_assignments", { _course_id: courseId }),
      ]);

      if (cancelled) return;

      const admin = !!isAdmin;
      const primary = course?.instructor_id === uid;
      const co = coRow?.find(r => r.instructor_user_id === uid) ?? null;
      const canView = admin || primary || !!co;
      setAccess({
        canView,
        canEdit: admin || primary || !!co?.can_edit,
        canGrade: admin || primary || !!co?.can_grade,
        canManageEnrollments: admin || primary || !!co?.can_manage_enrollments,
        isPrimary: primary,
        isAdmin: admin,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { access, loading };
}
