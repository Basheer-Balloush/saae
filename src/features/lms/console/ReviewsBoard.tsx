import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Star, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import { EmptyState, Loading, Panel, Pill, Seg, fmtDate, useT } from "@/components/console/ui";

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

export function ReviewsBoard() {
  const { t, ar, lang } = useT();
  const qc = useQueryClient();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("lms_reviews")
      .select(
        "id,rating,comment,created_at,student_id,course_id,status,moderated_at, course:lms_courses(title_ar,title_en)",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(toUserMessage(error));
    setReviews((data as unknown as Review[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const moderate = async (id: string, next: ReviewStatus) => {
    setBusy(id);
    const { error } = await supabase.rpc("lms_moderate_review", {
      _review_id: id,
      _status: next,
      _reason: undefined,
    });
    setBusy(null);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(
      next === "approved"
        ? t("تم اعتماد التقييم", "Review approved")
        : t("تم رفض التقييم", "Review rejected"),
    );
    setReviews((rs) =>
      (rs ?? []).map((r) =>
        r.id === id ? { ...r, status: next, moderated_at: new Date().toISOString() } : r,
      ),
    );
    qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
  };

  const remove = async (id: string) => {
    if (
      !(await confirmDialog({
        title: t("حذف هذا التقييم؟", "Delete this review?"),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("lms_reviews").delete().eq("id", id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(t("تم الحذف", "Deleted"));
    setReviews((r) => (r ?? []).filter((x) => x.id !== id));
    qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
  };

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews ?? []) {
      c.all++;
      c[r.status]++;
    }
    return c;
  }, [reviews]);
  const shown = (reviews ?? []).filter((r) => filter === "all" || r.status === filter);
  const courseTitle = (r: Review) =>
    r.course ? (ar ? r.course.title_ar : r.course.title_en || r.course.title_ar) : "—";

  return (
    <div>
      <div className="mb-4">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: t("بانتظار الاعتماد", "Waiting"), count: counts.pending },
            { value: "approved", label: t("معتمدة", "Approved"), count: counts.approved },
            { value: "rejected", label: t("مرفوضة", "Rejected"), count: counts.rejected },
            { value: "all", label: t("الكل", "All"), count: counts.all },
          ]}
        />
      </div>
      <Panel flush>
        {reviews === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Star}
            title={
              filter === "pending"
                ? t("لا توجد تقييمات بانتظار الاعتماد", "No reviews waiting")
                : t("لا توجد تقييمات", "No reviews")
            }
          />
        ) : (
          <ul>
            {shown.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-4 border-b border-[var(--cx-line-2)] px-5 py-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex" aria-label={`${r.rating} / 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i <= r.rating ? "fill-[var(--cx-orange)] text-[var(--cx-orange)]" : "text-[var(--cx-faint)]"}`}
                        />
                      ))}
                    </span>
                    <Pill
                      tone={
                        r.status === "approved"
                          ? "green"
                          : r.status === "rejected"
                            ? "red"
                            : "orange"
                      }
                    >
                      {r.status === "approved"
                        ? t("معتمد", "Approved")
                        : r.status === "rejected"
                          ? t("مرفوض", "Rejected")
                          : t("بانتظار الاعتماد", "Waiting")}
                    </Pill>
                    <span className="text-[12.5px] text-[var(--cx-muted)]">
                      {fmtDate(r.created_at, lang)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14.5px] text-[var(--cx-ink)]" dir="auto">
                    {r.comment || (
                      <span className="text-[var(--cx-muted)]">
                        {t("بدون تعليق", "No comment")}
                      </span>
                    )}
                  </p>
                  <Link
                    to="/learning-management-system/admin/courses/$id"
                    params={{ id: r.course_id }}
                    className="mt-1 inline-block text-[12.5px] font-bold text-[var(--cx-teal)] hover:underline"
                  >
                    {courseTitle(r)}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" && (
                    <Button
                      size="sm"
                      className="bg-[var(--cx-olive)] text-white hover:bg-[#5a7c35]"
                      disabled={busy === r.id}
                      onClick={() => moderate(r.id, "approved")}
                    >
                      <Check className="h-4 w-4" />
                      {t("اعتماد", "Approve")}
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => moderate(r.id, "rejected")}
                    >
                      <X className="h-4 w-4" />
                      {t("رفض", "Reject")}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(r.id)}
                    aria-label={t("حذف", "Delete")}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--cx-red)]" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
