import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState, type ReactNode } from "react";
import { Star, Trash2, ArrowRight, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/learning-management-system/admin/reviews")({
  head: () => ({ meta: [{ title: "Admin · Reviews — SAAE Training and Learning Platform" }] }),
  component: AdminReviews,
});

type ReviewStatus = "pending" | "approved" | "rejected";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_id: string;
  course_id: string;
  status: ReviewStatus;
  moderated_at: string | null;
  course?: { title_ar: string; title_en: string | null } | null;
};

function AdminReviews() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("lms_reviews")
      .select("id,rating,comment,created_at,student_id,course_id,status,moderated_at, course:lms_courses(title_ar,title_en)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(toUserMessage(error));
    setReviews((data as unknown as Review[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const moderate = async (id: string, next: ReviewStatus) => {
    setBusy(id);
    const { error } = await supabase.rpc("lms_moderate_review", { _review_id: id, _status: next, _reason: undefined });
    setBusy(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(isAr ? "تم التحديث" : "Updated");
    setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, status: next, moderated_at: new Date().toISOString() } : r)));
  };

  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: isAr ? "حذف هذا التقييم؟" : "Delete this review?", destructive: true }))) return;
    const { error } = await supabase.from("lms_reviews").delete().eq("id", id);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(isAr ? "تم الحذف" : "Deleted");
    setReviews((r) => r.filter((x) => x.id !== id));
  };

  const statusBadge = (s: ReviewStatus) => {
    const map: Record<ReviewStatus, { cls: string; ar: string; en: string; icon: ReactNode }> = {
      pending:  { cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", ar: "قيد المراجعة", en: "Pending",  icon: <Clock className="h-3 w-3" /> },
      approved: { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", ar: "مُعتمد", en: "Approved", icon: <Check className="h-3 w-3" /> },
      rejected: { cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300", ar: "مرفوض", en: "Rejected", icon: <X className="h-3 w-3" /> },
    };
    const v = map[s];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.cls}`}>
        {v.icon}{isAr ? v.ar : v.en}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isAr ? "إدارة التقييمات" : "Manage Reviews"}
        </h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{isAr ? "قيد المراجعة" : "Pending"}</SelectItem>
              <SelectItem value="approved">{isAr ? "مُعتمد" : "Approved"}</SelectItem>
              <SelectItem value="rejected">{isAr ? "مرفوض" : "Rejected"}</SelectItem>
              <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/learning-management-system/admin">
            <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4 mx-1 rtl:rotate-180" />{isAr ? "رجوع" : "Back"}</Button>
          </Link>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAr
          ? "اعتمد التقييمات لتظهر علنياً، أو ارفض/احذف أي تقييم غير مناسب."
          : "Approve reviews to make them publicly visible, or reject / delete inappropriate ones."}
      </p>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">{isAr ? "جار التحميل..." : "Loading..."}</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">{isAr ? "لا توجد تقييمات." : "No reviews."}</p>
        )}
        {reviews.map((r) => {
          const courseTitle = isAr
            ? r.course?.title_ar ?? r.course?.title_en ?? "—"
            : r.course?.title_en ?? r.course?.title_ar ?? "—";
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {statusBadge(r.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(isAr ? "ar" : "en")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground truncate">{courseTitle}</div>
                  {r.comment && <p className="mt-2 text-sm text-foreground leading-relaxed" dir="auto">{r.comment}</p>}
                  <div className="mt-2 text-xs text-muted-foreground font-mono">student: {r.student_id.slice(0, 8)}…</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {r.status !== "approved" && (
                    <Button size="sm" variant="default" disabled={busy === r.id} onClick={() => moderate(r.id, "approved")}>
                      <Check className="h-4 w-4 mx-1" />{isAr ? "اعتماد" : "Approve"}
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => moderate(r.id, "rejected")}>
                      <X className="h-4 w-4 mx-1" />{isAr ? "رفض" : "Reject"}
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 mx-1" />{isAr ? "حذف" : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
