import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  total_count?: number;
};

const PAGE_SIZE = 20;

export function CourseReviews({ courseId, canReview }: { courseId: string; canReview: boolean }) {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const isAr = lang === "ar";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasMine, setHasMine] = useState(false);
  const [myPending, setMyPending] = useState(false);

  const loadPage = async (nextOffset: number, replace: boolean) => {
    setLoading(true);
    const { data } = await supabase.rpc("lms_list_course_reviews_public", {
      _course_id: courseId,
      _limit: PAGE_SIZE,
      _offset: nextOffset,
    });
    const list = (data as Review[]) ?? [];
    setTotal(Number(list[0]?.total_count ?? (replace ? 0 : total)));
    setReviews((prev) => (replace ? list : [...prev, ...list]));
    setOffset(nextOffset + list.length);
    setLoading(false);
  };

  const loadMine = async () => {
    if (!user) { setHasMine(false); setMyPending(false); return; }
    const { data } = await supabase
      .from("lms_reviews")
      .select("id,status")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .maybeSingle();
    const mine = data as { id: string; status: string } | null;
    setHasMine(!!mine);
    setMyPending(mine?.status === "pending");
  };

  useEffect(() => {
    setReviews([]); setOffset(0); setTotal(0);
    loadPage(0, true);
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lms_reviews").insert({
        course_id: courseId,
        student_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success(isAr ? "تم إرسال تقييمك للمراجعة" : "Your review was submitted for moderation");
      setComment("");
      await loadMine();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tr.authFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-foreground">{tr.reviews}</h2>

      {canReview && !hasMine && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="font-semibold text-foreground">{tr.writeReview}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr
              ? "سيظهر تقييمك للجميع بعد مراجعة الإدارة."
              : "Your review will be publicly visible after admin approval."}
          </p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} type="button" aria-label={`${n}`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            className="mt-3"
            placeholder={tr.yourComment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button className="mt-3" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {tr.submitReview}
          </Button>
        </div>
      )}

      {canReview && hasMine && myPending && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
          {isAr ? "تقييمك قيد المراجعة." : "Your review is awaiting moderation."}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {reviews.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">{tr.noReviews}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                />
              ))}
              <span className="ms-3 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString(isAr ? "ar" : "en")}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-foreground leading-relaxed">{r.comment}</p>}
          </div>
        ))}
        {offset < total && (
          <div className="pt-2">
            <Button variant="outline" size="sm" disabled={loading} onClick={() => loadPage(offset, false)}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {isAr ? "عرض المزيد" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
