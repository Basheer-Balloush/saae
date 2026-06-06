import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AMS_ROLES = ["attendance_user", "attendance_admin"] as const satisfies readonly ("attendance_user" | "attendance_admin")[];
const LMS_ADMIN_ROLES = ["lms_admin", "admin"] as const satisfies readonly ("lms_admin" | "admin")[];

export function useAmsAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async (uid: string) => {
      // 1. AMS role OR LMS admin OR general admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", [...AMS_ROLES, ...LMS_ADMIN_ROLES]);
      if (roles && roles.length > 0) {
        setHasAccess(true);
        return;
      }
      // 2. Instructor of a course linked to AMS
      const { data: linkedCourses } = await supabase
        .from("lms_courses")
        .select("id, ams_courses!ams_courses_lms_course_id_fkey(id)")
        .eq("instructor_id", uid)
        .limit(50);
      const hasLinked = (linkedCourses ?? []).some(
        (c) => Array.isArray((c as { ams_courses?: unknown[] }).ams_courses) && ((c as { ams_courses: unknown[] }).ams_courses.length > 0),
      );
      setHasAccess(hasLinked);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => checkAccess(s.user.id), 0);
      } else {
        setHasAccess(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        checkAccess(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, hasAccess, loading };
}
