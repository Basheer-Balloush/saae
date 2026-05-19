import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/enrollment-requests")({
  head: () => ({ meta: [{ title: "LMS · Enrollment requests" }] }),
  component: AdminEnrollmentRequests,
});

type Req = {
  id: string;
  course_id: string;
  user_id: string;
  payment_method: "manual" | "online";
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  course?: { title_ar: string; title_en: string | null; price: number; students_count: number; max_students: number | null };
};

function AdminEnrollmentRequests() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "cancelled" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("lms_enrollment_requests").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const list = (data as Req[]) ?? [];
    if (list.length) {
      const courseIds = [...new Set(list.map((r) => r.course_id))];
      const { data: courses } = await supabase
        .from("lms_courses")
        .select("id,title_ar,title_en,price,students_count,max_students")
        .in("id", courseIds);
      const cMap = new Map((courses ?? []).map((c) => [c.id, c]));
      list.forEach((r) => {
        const c = cMap.get(r.course_id);
        r.course = c ? { title_ar: c.title_ar, title_en: c.title_en, price: Number(c.price), students_count: c.students_count, max_students: c.max_students } : undefined;
      });
    }
    setReqs(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const decide = async (req: Req, action: "approve" | "reject") => {
    setBusy(req.id);
    try {
      const fn = action === "approve" ? "lms_approve_enrollment_request" : "lms_reject_enrollment_request";
      const { error } = await supabase.rpc(fn, { _request_id: req.id, _admin_notes: noteDraft[req.id] || null });
      if (error) throw error;
      toast.success(ar ? (action === "approve" ? "تمت الموافقة" : "تم الرفض") : (action === "approve" ? "Approved" : "Rejected"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{ar ? "طلبات الاشتراك" : "Enrollment requests"}</h1>
          <p className="text-sm text-muted-foreground">{ar ? "راجع وافق أو ارفض طلبات التسجيل اليدوية." : "Review, approve, or reject manual enrollment requests."}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["pending", "approved", "rejected", "cancelled", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/70 hover:border-primary"}`}>
              {ar ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى", all: "الكل" }[f]) : f}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
      ) : reqs.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">{ar ? "لا توجد طلبات" : "No requests"}</p>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => {
            const cTitle = r.course ? (ar ? r.course.title_ar : r.course.title_en || r.course.title_ar) : r.course_id;
            const full = r.course?.max_students !== null && r.course?.max_students !== undefined && r.course.students_count >= r.course.max_students;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">{cTitle}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.student?.full_name || r.student?.email || r.user_id}
                      {r.student?.email && r.student.full_name && <span> · {r.student.email}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ar ? "السعر" : "Price"}: {r.course ? `${r.course.price.toLocaleString()} ${ar ? "ل.س" : "SYP"}` : "—"}
                      {" · "}{ar ? "العدد" : "Enrolled"}: {r.course?.students_count ?? "—"}{r.course?.max_students ? ` / ${r.course.max_students}` : ""}
                      {" · "}{new Date(r.created_at).toLocaleDateString(ar ? "ar" : "en")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                      r.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" :
                      r.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {r.status === "pending" && <Clock className="h-3 w-3" />}
                      {ar ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى" }[r.status]) : r.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-semibold">{r.payment_method}</span>
                  </div>
                </div>

                {r.notes && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{ar ? "ملاحظات الطالب:" : "Student notes:"}</span> {r.notes}
                  </div>
                )}
                {r.admin_notes && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{ar ? "ملاحظات الإدارة:" : "Admin notes:"}</span> {r.admin_notes}
                  </div>
                )}

                {r.status === "pending" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {full && <p className="text-xs text-red-600">{ar ? "تنبيه: اكتمل العدد — لا يمكن الموافقة" : "Warning: course is full — cannot approve"}</p>}
                    <Textarea
                      placeholder={ar ? "ملاحظات للإدارة (اختياري)" : "Admin notes (optional)"}
                      value={noteDraft[r.id] ?? ""}
                      onChange={(e) => setNoteDraft({ ...noteDraft, [r.id]: e.target.value })}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(r, "approve")} disabled={busy === r.id || full} className="flex-1">
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Check className="h-4 w-4 mx-1" />}
                        {ar ? "موافقة" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r, "reject")} disabled={busy === r.id} className="flex-1">
                        <X className="h-4 w-4 mx-1" />
                        {ar ? "رفض" : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
