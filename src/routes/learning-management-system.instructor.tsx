import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";

export const Route = createFileRoute("/learning-management-system/instructor")({
  component: InstructorLayout,
});

function InstructorLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/learning-management-system/login" }); return; }
    (async () => {
      const { data } = await supabase.from("lms_instructors").select("approved").eq("user_id", user.id).maybeSingle();
      setApproved(data?.approved ?? false);
    })();
  }, [loading, user, navigate]);

  if (loading || !user || approved === null) {
    return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  }
  if (role !== "lms_admin" && !approved) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {lang === "ar" ? "حسابك كمدرّس قيد المراجعة" : "Your instructor account is pending review"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {lang === "ar" ? "سيتم تفعيله من قبل الإدارة قريباً." : "An admin will activate it shortly."}
        </p>
      </div>
    );
  }
  return <Outlet />;
}
