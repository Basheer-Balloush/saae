import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { courseI18nWriteErrorMessage } from "@/lib/lms-course-fields";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";

export type CourseStatus = "draft" | "pending" | "published" | "rejected";

/* The admin decisions that used to live on the dashboard tabs, in one hook so
   the Overview, the Courses list and the course editor behave the same. */
export function useLmsAdminActions(lang: "ar" | "en") {
  const qc = useQueryClient();
  const ar = lang === "ar";
  const refreshCounts = () => qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });

  const setCourseStatus = async (courseId: string, status: CourseStatus, reason?: string) => {
    const patch: { status: CourseStatus; rejection_reason?: string | null } = { status };
    if (status === "rejected") patch.rejection_reason = reason?.trim() || null;
    const { error } = await supabase.from("lms_courses").update(patch).eq("id", courseId);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return false;
    }
    const done: Record<CourseStatus, [string, string]> = {
      published: ["تم نشر الدورة", "Course published"],
      rejected: [
        "تم رفض الدورة وإبلاغ المدرّب بالسبب",
        "Course rejected; the instructor sees the reason",
      ],
      draft: ["أعيدت الدورة إلى مسودّة", "Course moved back to draft"],
      pending: ["أُرسلت الدورة للمراجعة", "Course sent for review"],
    };
    toast.success(ar ? done[status][0] : done[status][1]);
    refreshCounts();
    return true;
  };

  /** Approving grants the instructor role; revoking removes it. */
  const setInstructorApproval = async (userId: string, approve: boolean) => {
    const { error } = await supabase
      .from("lms_instructors")
      .update({ approved: approve })
      .eq("user_id", userId);
    if (error) {
      toast.error(toUserMessage(error));
      return false;
    }
    if (approve) {
      const { error: grantError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "lms_instructor" });
      // 23505: the role was already there, which is fine.
      if (grantError && (grantError as { code?: string }).code !== "23505") {
        toast.error(toUserMessage(grantError));
        return false;
      }
      toast.success(
        ar ? "تمت الموافقة وتفعيل صلاحيات التدريس" : "Approved and instructor role granted",
      );
    } else {
      const { error: revokeError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "lms_instructor" as never);
      if (revokeError) {
        toast.error(toUserMessage(revokeError));
        return false;
      }
      toast.success(ar ? "تم إلغاء الموافقة" : "Approval revoked");
    }
    refreshCounts();
    return true;
  };

  /** Rejecting an instructor request removes it. */
  const rejectInstructorRequest = async (userId: string) => {
    const { error } = await supabase.from("lms_instructors").delete().eq("user_id", userId);
    if (error) {
      toast.error(toUserMessage(error));
      return false;
    }
    toast.success(ar ? "تم رفض الطلب" : "Request rejected");
    refreshCounts();
    return true;
  };

  return { setCourseStatus, setInstructorApproval, rejectInstructorRequest, refreshCounts };
}
