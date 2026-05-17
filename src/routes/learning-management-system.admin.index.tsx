import { createFileRoute } from "@tanstack/react-router";
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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.navAdmin}</h1>

      <div className="mt-6 flex gap-2 border-b border-border">
        {(["courses", "instructors", "categories"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "courses" && (
        <div className="mt-6 space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-foreground">{c.title_ar}</div>
                <div className="text-xs text-muted-foreground">{c.status}</div>
              </div>
              <div className="flex gap-2">
                {c.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setCourseStatus(c.id, "published")}><Check className="h-4 w-4 mx-1" />Publish</Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      const r = prompt("Reason?"); if (r !== null) setCourseStatus(c.id, "rejected", r);
                    }}><X className="h-4 w-4 mx-1" />Reject</Button>
                  </>
                )}
                {c.status === "published" && (
                  <Button size="sm" variant="outline" onClick={() => setCourseStatus(c.id, "draft")}>Unpublish</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "instructors" && (
        <div className="mt-6 space-y-3">
          {instructors.map((i) => (
            <div key={i.user_id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-foreground">{i.full_name}</div>
                <div className="text-xs text-muted-foreground">{i.specialty || "—"} · {i.approved ? "approved" : "pending"}</div>
              </div>
              <div className="flex gap-2">
                {!i.approved ? (
                  <Button size="sm" onClick={() => approveInstructor(i.user_id, true)}><Check className="h-4 w-4 mx-1" />Approve</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => approveInstructor(i.user_id, false)}>Revoke</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "categories" && (
        <div className="mt-6 space-y-4">
          <form onSubmit={addCategory} className="grid sm:grid-cols-4 gap-2">
            <Input placeholder="Name (AR)" value={newCat.name_ar} onChange={(e) => setNewCat({ ...newCat, name_ar: e.target.value })} required />
            <Input placeholder="Name (EN)" value={newCat.name_en} onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })} />
            <Input placeholder="slug" value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} required />
            <Button type="submit"><Plus className="h-4 w-4 mx-1" />Add</Button>
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
  );
}
