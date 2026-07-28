import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Check, X as XIcon, Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/learning-management-system/student/requests")({
  head: () => ({ meta: [{ title: "LMS · My requests" }] }),
  component: StudentRequestsPage,
});

type Req = {
  id: string;
  course_id: string;
  payment_method: "manual" | "online";
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  course?: { title_ar: string; title_en: string | null; cover_url: string | null };
};

function StudentRequestsPage() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("lms_enrollment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data as Req[]) ?? [];
    if (list.length) {
      const ids = [...new Set(list.map((r) => r.course_id))];
      const { data: cs } = await supabase.from("lms_courses").select("id,title_ar,title_en,cover_url").in("id", ids);
      const map = new Map((cs ?? []).map((c) => [c.id, c]));
      list.forEach((r) => {
        const c = map.get(r.course_id);
        if (c) r.course = { title_ar: c.title_ar, title_en: c.title_en, cover_url: c.cover_url };
      });
    }
    setReqs(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const cancel = async (id: string) => {
    if (!(await confirmDialog({ title: ar ? "إلغاء الطلب؟" : "Cancel this request?", destructive: true }))) return;
    setBusy(id);
    const { error } = await supabase.from("lms_enrollment_requests").update({ status: "cancelled" }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الإلغاء" : "Cancelled");
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/learning-management-system/student" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "رجوع" : "Back"}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{ar ? "طلباتي" : "My requests"}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {ar ? "حالة طلبات التسجيل التي أرسلتها." : "Status of enrollment requests you've submitted."}
      </p>

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
      ) : reqs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{ar ? "لا توجد طلبات بعد" : "No requests yet"}</p>
          <Link to="/learning-management-system/catalog" className="inline-block mt-3">
            <Button size="sm" variant="outline">{ar ? "تصفح الدورات" : "Browse courses"}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reqs.map((r) => {
            const title = r.course ? (ar ? r.course.title_ar : r.course.title_en || r.course.title_ar) : r.course_id;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-4">
                {r.course?.cover_url ? (
                  <img src={r.course.cover_url} alt={title} className="h-20 w-32 rounded-lg object-cover" />
                ) : (
                  <div className="h-20 w-32 rounded-lg bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <Link to="/learning-management-system/courses/$id" params={{ id: r.course_id }} className="font-semibold text-foreground hover:text-primary">
                    {title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString(ar ? "ar" : "en")}
                    {" · "}{r.payment_method === "manual" ? (ar ? "دفع يدوي" : "Manual payment") : (ar ? "دفع إلكتروني" : "Online payment")}
                  </div>
                  {r.notes && <p className="text-sm text-muted-foreground mt-2">{r.notes}</p>}
                  {r.admin_notes && (
                    <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground">{ar ? "ملاحظات الإدارة:" : "Admin notes:"}</span> {r.admin_notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                    r.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" :
                    r.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {r.status === "pending" && <Clock className="h-3 w-3" />}
                    {r.status === "approved" && <Check className="h-3 w-3" />}
                    {r.status === "rejected" && <XIcon className="h-3 w-3" />}
                    {r.status === "cancelled" && <Ban className="h-3 w-3" />}
                    {ar ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى" }[r.status]) : r.status}
                  </span>
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => cancel(r.id)} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (ar ? "إلغاء" : "Cancel")}
                    </Button>
                  )}
                  {r.status === "approved" && (
                    <Link to="/learning-management-system/student/player/$courseId" params={{ courseId: r.course_id }}>
                      <Button size="sm">{ar ? "ابدأ التعلّم" : "Start learning"}</Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
