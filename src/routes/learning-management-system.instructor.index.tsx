import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit3, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/instructor/")({
  head: () => ({ meta: [{ title: "LMS · Instructor" }] }),
  component: InstructorHome,
});

type Course = { id: string; title_ar: string; title_en: string | null; status: string; students_count: number; is_free: boolean; price: number };

function InstructorHome() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("lms_courses")
      .select("id,title_ar,title_en,status,students_count,is_free,price")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !titleAr.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("lms_courses").insert({
      instructor_id: user.id,
      title_ar: titleAr.trim(),
      title_en: titleEn.trim() || null,
    }).select("id").maybeSingle();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false); setTitleAr(""); setTitleEn("");
    if (data) window.location.href = `/learning-management-system/instructor/courses/${data.id}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.navInstructor}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "كورس جديد" : "New course"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{lang === "ar" ? "كورس جديد" : "New course"}</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>{lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                <Input required value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></div>
              <div><Label>{lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {lang === "ar" ? "إنشاء" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-muted-foreground">{tr.loading}</p>
      ) : courses.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{lang === "ar" ? "ما عندك كورسات بعد. أنشئ أول كورس!" : "No courses yet. Create your first!"}</p>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link key={c.id} to="/learning-management-system/instructor/courses/$id" params={{ id: c.id }}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground line-clamp-2">{lang === "ar" ? c.title_ar : c.title_en || c.title_ar}</h3>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students_count}</span>
                <span>{c.is_free ? tr.free : `$${c.price}`}</span>
                <span className="inline-flex items-center gap-1 text-primary"><Edit3 className="h-3.5 w-3.5" />{lang === "ar" ? "تعديل" : "Edit"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending_review: "bg-amber-500/15 text-amber-600",
    published: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${map[status] ?? map.draft}`}>{status}</span>;
}
