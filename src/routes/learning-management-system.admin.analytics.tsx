import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, BookOpen, GraduationCap, DollarSign, Award, ShoppingCart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/learning-management-system/admin/analytics")({
  head: () => ({ meta: [{ title: "LMS · Analytics" }] }),
  component: Analytics,
});

type Stat = { label: string; value: string | number; icon: React.ElementType; color: string };
type TopCourse = { id: string; title_ar: string; students_count: number; rating_avg: number };

function Analytics() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [stats, setStats] = useState<Stat[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [recentTx, setRecentTx] = useState<{ id: string; type: string; amount: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { count: usersCount },
        { count: coursesCount },
        { count: publishedCount },
        { count: instructorsCount },
        { count: enrollmentsCount },
        { count: certsCount },
        { data: txAll },
        { data: top },
        { data: recent },
      ] = await Promise.all([
        supabase.from("lms_wallets").select("*", { count: "exact", head: true }),
        supabase.from("lms_courses").select("*", { count: "exact", head: true }),
        supabase.from("lms_courses").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("lms_instructors").select("*", { count: "exact", head: true }).eq("approved", true),
        supabase.from("lms_enrollments").select("*", { count: "exact", head: true }),
        supabase.from("lms_certificates").select("*", { count: "exact", head: true }),
        supabase.from("lms_transactions").select("amount,type"),
        supabase.from("lms_courses").select("id,title_ar,students_count,rating_avg").order("students_count", { ascending: false }).limit(5),
        supabase.from("lms_transactions").select("id,type,amount,created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const gmv = (txAll ?? []).filter((t) => t.type === "purchase").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const commission = (txAll ?? []).filter((t) => t.type === "earning").reduce((s, t) => {
        return s; // not needed
      }, 0);
      void commission;

      setStats([
        { label: ar ? "المستخدمون" : "Users", value: usersCount ?? 0, icon: Users, color: "text-blue-500" },
        { label: ar ? "المدربون" : "Instructors", value: instructorsCount ?? 0, icon: GraduationCap, color: "text-purple-500" },
        { label: ar ? "إجمالي الدورات" : "Total Courses", value: coursesCount ?? 0, icon: BookOpen, color: "text-amber-500" },
        { label: ar ? "منشورة" : "Published", value: publishedCount ?? 0, icon: BookOpen, color: "text-emerald-500" },
        { label: ar ? "اشتراكات" : "Enrollments", value: enrollmentsCount ?? 0, icon: ShoppingCart, color: "text-pink-500" },
        { label: ar ? "شهادات صادرة" : "Certificates", value: certsCount ?? 0, icon: Award, color: "text-yellow-500" },
        { label: ar ? "إجمالي المبيعات" : "Gross Sales", value: gmv.toLocaleString(), icon: DollarSign, color: "text-emerald-600" },
      ]);
      setTopCourses((top as TopCourse[]) ?? []);
      setRecentTx((recent as typeof recentTx) ?? []);
      setLoading(false);
    })();
  }, [ar]);

  if (loading) return <p className="text-center py-20 text-muted-foreground">…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/learning-management-system/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" />{ar ? "رجوع" : "Back"}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{ar ? "تحليلات المنصة" : "Platform Analytics"}</h1>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-4">{ar ? "أعلى الدورات" : "Top Courses"}</h2>
          <div className="space-y-2">
            {topCourses.map((c, i) => (
              <Link to="/learning-management-system/courses/$id" params={{ id: c.id }} key={c.id}
                className="flex items-center justify-between rounded-lg hover:bg-muted/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-3">
                  <span className="font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-foreground">{c.title_ar}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  ⭐ {Number(c.rating_avg).toFixed(1)} · {c.students_count} {ar ? "طالب" : "students"}
                </span>
              </Link>
            ))}
            {topCourses.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-4">{ar ? "آخر العمليات" : "Recent Transactions"}</h2>
          <div className="space-y-2">
            {recentTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                <div>
                  <div className="font-semibold text-foreground capitalize">{t.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <span className={`font-bold ${Number(t.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}{Number(t.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {recentTx.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
