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
  student_id: string;
};

export function CourseReviews({ courseId, canReview }: { courseId: string; canReview: boolean }) {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasMine, setHasMine] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("lms_reviews")
      .select("id,rating,comment,created_at,student_id")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    const list = (data as Review[]) ?? [];
    setReviews(list);
    if (user) setHasMine(list.some((r) => r.student_id === user.id));
  };

  useEffect(() => {
    load();
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
      toast.success(tr.signedUp);
      setComment("");
      await load();
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

      <div className="mt-6 space-y-3">
        {reviews.length === 0 && (
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
                {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-foreground leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
