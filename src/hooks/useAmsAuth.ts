import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AMS_ROLES = ["attendance_user", "attendance_admin"] as const satisfies readonly ("attendance_user" | "attendance_admin")[];
const LMS_ADMIN_ROLES = ["lms_admin", "admin"] as const satisfies readonly ("lms_admin" | "admin")[];

// Tab-scoped access cache to avoid repeated DB hits on TOKEN_REFRESHED.
const accessCache = new Map<string, boolean>();

export function useAmsAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async (uid: string) => {
      if (accessCache.has(uid)) {
        setHasAccess(accessCache.get(uid)!);
        return;
      }
      // 1. AMS role OR LMS admin OR general admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", [...AMS_ROLES, ...LMS_ADMIN_ROLES]);
      if (roles && roles.length > 0) {
        accessCache.set(uid, true);
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
        (c) => (c as { ams_courses: { id: string } | { id: string }[] | null }).ams_courses != null,
      );
      accessCache.set(uid, hasLinked);
      setHasAccess(hasLinked);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_OUT") {
        accessCache.clear();
        setHasAccess(false);
      } else if (s?.user) {
        setTimeout(() => checkAccess(s.user.id), 0);
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
