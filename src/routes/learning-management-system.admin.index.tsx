import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/")({
  head: () => ({ meta: [{ title: "LMS · Admin" }] }),
  component: AdminHome,
});

type Instructor = { user_id: string; full_name: string; specialty: string | null; approved: boolean; bio: string | null };
type Course = { id: string; title_ar: string; status: string; instructor_id: string; rejection_reason: string | null };
type Category = { id: string; name_ar: string; name_en: string | null; slug: string; display_order: number };

function AdminHome() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [tab, setTab] = useState<"instructors" | "courses" | "categories">("courses");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const load = async () => {
    const [{ data: ins }, { data: cs }, { data: cats }] = await Promise.all([
      supabase.from("lms_instructors").select("user_id,full_name,specialty,approved,bio").order("created_at", { ascending: false }),
      supabase.from("lms_courses").select("id,title_ar,status,instructor_id,rejection_reason").order("created_at", { ascending: false }),
      supabase.from("lms_categories").select("*").order("display_order"),
    ]);
    setInstructors((ins as Instructor[]) ?? []);
    setCourses((cs as Course[]) ?? []);
    setCategories((cats as Category[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const approveInstructor = async (uid: string, approve: boolean) => {
    const { error } = await supabase.from("lms_instructors").update({ approved: approve }).eq("user_id", uid);
    if (error) { toast.error(error.message); return; }
    if (approve) {
      // grant lms_instructor role (admin-only insert via RLS)
      await supabase.from("user_roles").insert({ user_id: uid, role: "lms_instructor" as never });
    }
    toast.success("OK"); load();
  };

  const setCourseStatus = async (cid: string, status: "draft" | "pending" | "published" | "rejected", reason?: string) => {
    const patch: { status: typeof status; rejection_reason?: string | null } = { status };
    if (status === "rejected") patch.rejection_reason = reason ?? null;
    const { error } = await supabase.from("lms_courses").update(patch).eq("id", cid);
    if (error) { toast.error(error.message); return; }
    toast.success("OK"); load();
  };

  const [newCat, setNewCat] = useState({ name_ar: "", name_en: "", slug: "" });
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name_ar || !newCat.slug) return;
    const { error } = await supabase.from("lms_categories").insert({
      name_ar: newCat.name_ar, name_en: newCat.name_en || null, slug: newCat.slug,
      display_order: categories.length,
    });
    if (error) { toast.error(error.message); return; }
    setNewCat({ name_ar: "", name_en: "", slug: "" }); load();
  };
  const deleteCategory = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف؟" : "Delete?")) return;
    await supabase.from("lms_categories").delete().eq("id", id); load();
  };

  const sideLinks: { to: string; label: string }[] = [
    { to: "/learning-management-system/admin/analytics", label: lang === "ar" ? "تحليلات" : "Analytics" },
    { to: "/learning-management-system/admin/users", label: lang === "ar" ? "المستخدمون" : "Users" },
    { to: "/learning-management-system/admin/payouts", label: lang === "ar" ? "طلبات السحب" : "Payouts" },
    { to: "/learning-management-system/admin/coupons", label: lang === "ar" ? "الكوبونات" : "Coupons" },
    { to: "/learning-management-system/admin/wallet", label: lang === "ar" ? "المحافظ والإعدادات" : "Wallets & Settings" },
    { to: "/learning-management-system/admin/reviews", label: lang === "ar" ? "التقييمات" : "Reviews" },
  ];
  const tabLabels: Record<"courses" | "instructors" | "categories", string> = {
    courses: lang === "ar" ? "الدورات" : "Courses",
    instructors: lang === "ar" ? "المدرّسون" : "Instructors",
    categories: lang === "ar" ? "التصنيفات" : "Categories",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.navAdmin}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-3 h-fit">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
            {lang === "ar" ? "الأقسام" : "Sections"}
          </div>
          <nav className="mt-1 flex flex-col">
            {(["courses", "instructors", "categories"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-start px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                }`}
              >
                {tabLabels[t]}
              </button>
            ))}
          </nav>
          <div className="my-3 h-px bg-border" />
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
            {lang === "ar" ? "الإدارة" : "Manage"}
          </div>
          <nav className="mt-1 flex flex-col">
            {sideLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-start px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>
      {tab === "courses" && (
        <div className="mt-6 space-y-3">
          {courses.map((c) => {
            const statusLabel = lang === "ar"
              ? ({ draft: "مسودّة", pending: "بانتظار المراجعة", published: "منشورة", rejected: "مرفوضة" } as const)[c.status as "draft" | "pending" | "published" | "rejected"] ?? c.status
              : c.status;
            return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-foreground">{c.title_ar}</div>
                <div className="text-xs text-muted-foreground">{statusLabel}</div>
              </div>
              <div className="flex gap-2">
                {c.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setCourseStatus(c.id, "published")}><Check className="h-4 w-4 mx-1" />{lang === "ar" ? "نشر" : "Publish"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      const r = prompt(lang === "ar" ? "السبب؟" : "Reason?"); if (r !== null) setCourseStatus(c.id, "rejected", r);
                    }}><X className="h-4 w-4 mx-1" />{lang === "ar" ? "رفض" : "Reject"}</Button>
                  </>
                )}
                {c.status === "published" && (
                  <Button size="sm" variant="outline" onClick={() => setCourseStatus(c.id, "draft")}>{lang === "ar" ? "إلغاء النشر" : "Unpublish"}</Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {tab === "instructors" && (
        <div className="mt-6 space-y-3">
          {instructors.map((i) => (
            <div key={i.user_id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-foreground">{i.full_name}</div>
                <div className="text-xs text-muted-foreground">{i.specialty || "—"} · {i.approved ? (lang === "ar" ? "موافَق عليه" : "approved") : (lang === "ar" ? "بانتظار الموافقة" : "pending")}</div>
              </div>
              <div className="flex gap-2">
                {!i.approved ? (
                  <Button size="sm" onClick={() => approveInstructor(i.user_id, true)}><Check className="h-4 w-4 mx-1" />{lang === "ar" ? "موافقة" : "Approve"}</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => approveInstructor(i.user_id, false)}>{lang === "ar" ? "إلغاء الموافقة" : "Revoke"}</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "categories" && (
        <div className="mt-6 space-y-4">
          <form onSubmit={addCategory} className="grid sm:grid-cols-4 gap-2">
            <Input placeholder={lang === "ar" ? "الاسم (عربي)" : "Name (AR)"} value={newCat.name_ar} onChange={(e) => setNewCat({ ...newCat, name_ar: e.target.value })} required />
            <Input placeholder={lang === "ar" ? "الاسم (إنجليزي)" : "Name (EN)"} value={newCat.name_en} onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })} />
            <Input placeholder={lang === "ar" ? "المعرّف" : "slug"} value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} required />
            <Button type="submit"><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "إضافة" : "Add"}</Button>
          </form>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-sm">{c.name_ar} {c.name_en && <span className="text-muted-foreground">· {c.name_en}</span>} <span className="text-xs text-muted-foreground">({c.slug})</span></span>
                <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
