import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/reviews")({
  head: () => ({ meta: [{ title: "LMS · Admin · Reviews" }] }),
  component: AdminReviews,
});

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_id: string;
  course_id: string;
  course?: { title_ar: string; title_en: string | null } | null;
};

function AdminReviews() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lms_reviews")
      .select("id,rating,comment,created_at,student_id,course_id, course:lms_courses(title_ar,title_en)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setReviews((data as unknown as Review[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm(isAr ? "حذف هذا التقييم؟" : "Delete this review?")) return;
    const { error } = await supabase.from("lms_reviews").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? "تم الحذف" : "Deleted");
    setReviews((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isAr ? "إدارة التقييمات" : "Manage Reviews"}
        </h1>
        <Link to="/learning-management-system/admin">
          <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4 mx-1" />{isAr ? "رجوع" : "Back"}</Button>
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAr ? "احذف أي تقييم مسيء أو غير مناسب." : "Delete any abusive or inappropriate review."}
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    ))}
                    <span className="ms-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(isAr ? "ar" : "en")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground truncate">{courseTitle}</div>
                  {r.comment && <p className="mt-2 text-sm text-foreground leading-relaxed">{r.comment}</p>}
                  <div className="mt-2 text-xs text-muted-foreground font-mono">student: {r.student_id.slice(0, 8)}…</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 mx-1" />{isAr ? "حذف" : "Delete"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
