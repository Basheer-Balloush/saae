import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  Plus,
  Trash2,
  Users,
  BookOpen,
  GraduationCap,
  FolderTree,
  BarChart3,
  Ticket,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  Mail,
  Sparkles,
  Inbox,
  Pencil,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AdminInstructorEditDialog } from "@/components/lms/AdminInstructorEditDialog";

export const Route = createFileRoute("/learning-management-system/admin/")({
  head: () => ({ meta: [{ title: "LMS · Admin" }] }),
  component: AdminHome,
});

type Instructor = {
  user_id: string;
  full_name: string;
  specialty: string | null;
  approved: boolean;
  bio: string | null;
  created_at?: string;
};
type Course = {
  id: string;
  title_ar: string;
  status: string;
  instructor_id: string;
  rejection_reason: string | null;
  created_at?: string;
};
type Category = { id: string; name_ar: string; name_en: string | null; slug: string; display_order: number };

function AdminHome() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const [tab, setTab] = useState<"overview" | "instructors" | "courses" | "categories">("overview");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [editInstructorId, setEditInstructorId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: ins }, { data: cs }, { data: cats }, { count: stCount }] = await Promise.all([
      supabase.from("lms_instructors").select("user_id,full_name,specialty,approved,bio,created_at").order("created_at", { ascending: false }),
      supabase.from("lms_courses").select("id,title_ar,status,instructor_id,rejection_reason,created_at").order("created_at", { ascending: false }),
      supabase.from("lms_categories").select("*").order("display_order"),
      supabase.from("lms_enrollments").select("*", { count: "exact", head: true }),
    ]);
    setInstructors((ins as Instructor[]) ?? []);
    setCourses((cs as Course[]) ?? []);
    setCategories((cats as Category[]) ?? []);
    setStudentsCount(stCount ?? 0);
  };
  useEffect(() => {
    load();
  }, []);

  const pendingInstructors = useMemo(() => instructors.filter((i) => !i.approved), [instructors]);
  const approvedInstructors = useMemo(() => instructors.filter((i) => i.approved), [instructors]);
  const pendingCourses = useMemo(() => courses.filter((c) => c.status === "pending"), [courses]);
  const publishedCourses = useMemo(() => courses.filter((c) => c.status === "published"), [courses]);

  const approveInstructor = async (uid: string, approve: boolean) => {
    const { error } = await supabase.from("lms_instructors").update({ approved: approve }).eq("user_id", uid);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    if (approve) {
      await supabase.from("user_roles").insert({ user_id: uid, role: "lms_instructor" as never });
      toast.success(ar ? "تمت الموافقة وتفعيل صلاحيات التدريس" : "Approved and instructor role granted");
    } else {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "lms_instructor" as never);
      toast.success(ar ? "تم إلغاء الموافقة" : "Approval revoked");
    }
    load();
  };

  const rejectInstructor = async (uid: string) => {
    if (!confirm(ar ? "رفض هذا الطلب وحذفه نهائياً؟" : "Reject and remove this request?")) return;
    const { error } = await supabase.from("lms_instructors").delete().eq("user_id", uid);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(ar ? "تم رفض الطلب" : "Request rejected");
    load();
  };

  const setCourseStatus = async (cid: string, status: "draft" | "pending" | "published" | "rejected", reason?: string) => {
    const patch: { status: typeof status; rejection_reason?: string | null } = { status };
    if (status === "rejected") patch.rejection_reason = reason ?? null;
    const { error } = await supabase.from("lms_courses").update(patch).eq("id", cid);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success("OK");
    load();
  };

  const [newCat, setNewCat] = useState({ name_ar: "", name_en: "", slug: "" });
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name_ar || !newCat.slug) return;
    const { error } = await supabase.from("lms_categories").insert({
      name_ar: newCat.name_ar,
      name_en: newCat.name_en || null,
      slug: newCat.slug,
      display_order: categories.length,
    });
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    setNewCat({ name_ar: "", name_en: "", slug: "" });
    load();
  };
  const deleteCategory = async (id: string) => {
    if (!confirm(ar ? "حذف؟" : "Delete?")) return;
    await supabase.from("lms_categories").delete().eq("id", id);
    load();
  };

  // ---- Admin create course on behalf of an approved instructor ----
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ title_ar: "", title_en: "", instructor_id: "" });
  const [creatingCourse, setCreatingCourse] = useState(false);
  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title_ar.trim() || !newCourse.instructor_id) return;
    setCreatingCourse(true);
    const { data, error } = await supabase
      .from("lms_courses")
      .insert({
        instructor_id: newCourse.instructor_id,
        title_ar: newCourse.title_ar.trim(),
        title_en: newCourse.title_en.trim() || null,
      })
      .select("id")
      .maybeSingle();
    setCreatingCourse(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(ar ? "تم إنشاء الدورة" : "Course created");
    setNewCourseOpen(false);
    setNewCourse({ title_ar: "", title_en: "", instructor_id: "" });
    if (data) window.location.href = `/learning-management-system/instructor/courses/${data.id}`;
  };

  const tabs: { id: typeof tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: "overview", label: ar ? "نظرة عامة" : "Overview", icon: Sparkles },
    {
      id: "instructors",
      label: ar ? "المدرّبون" : "Instructors",
      icon: GraduationCap,
      badge: pendingInstructors.length || undefined,
    },
    {
      id: "courses",
      label: ar ? "الدورات" : "Courses",
      icon: BookOpen,
      badge: pendingCourses.length || undefined,
    },
    { id: "categories", label: ar ? "التصنيفات" : "Categories", icon: FolderTree },
  ];

  const sideLinks: { to: string; label: string; icon: typeof Users; desc: string }[] = [
    {
      to: "/learning-management-system/admin/analytics",
      label: ar ? "التحليلات" : "Analytics",
      icon: BarChart3,
      desc: ar ? "إحصاءات وأداء" : "Stats & performance",
    },
    {
      to: "/learning-management-system/admin/trainer-applications",
      label: ar ? "طلبات اعتماد المدربين" : "Trainer applications",
      icon: GraduationCap,
      desc: ar ? "نظام معادلة المدربين" : "Trainer accreditation",
    },
    {
      to: "/learning-management-system/admin/users",
      label: ar ? "المستخدمون" : "Users",
      icon: Users,
      desc: ar ? "إدارة الأدوار" : "Manage roles",
    },
    {
      to: "/learning-management-system/admin/enrollment-requests",
      label: ar ? "طلبات التسجيل" : "Enrollment requests",
      icon: Inbox,
      desc: ar ? "طلبات الدفع اليدوي" : "Manual payment requests",
    },
    {
      to: "/learning-management-system/admin/coupons",
      label: ar ? "الكوبونات" : "Coupons",
      icon: Ticket,
      desc: ar ? "أكواد الخصم" : "Discount codes",
    },
    {
      to: "/learning-management-system/admin/reviews",
      label: ar ? "التقييمات" : "Reviews",
      icon: Star,
      desc: ar ? "تقييمات الطلاب" : "Student ratings",
    },
    {
      to: "/learning-management-system/admin/attendance-link",
      label: ar ? "ربط الحضور" : "Attendance link",
      icon: CalendarDays,
      desc: ar ? "ربط الدورات بنظام الحضور" : "Link courses to attendance",
    },
    {
      to: "/learning-management-system/admin/internships",
      label: ar ? "فرص التدريب" : "Internships",
      icon: FileText,
      desc:
        internshipsOverview
          ? ar
            ? `${internshipsOverview.opportunities.published} منشورة · ${internshipsOverview.applications.pending_review} بانتظار المراجعة`
            : `${internshipsOverview.opportunities.published} published · ${internshipsOverview.applications.pending_review} pending review`
          : ar
            ? "إدارة فرص التدريب والطلبات"
            : "Manage opportunities & applications",
      badge:
        internshipsOverview && internshipsOverview.applications.pending_review > 0
          ? internshipsOverview.applications.pending_review
          : undefined,
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {ar ? "لوحة الإدارة" : "Admin Console"}
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {tr.navAdmin}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "إدارة المنصّة التعليمية ومراجعة الطلبات الواردة"
                : "Manage the learning platform and review incoming requests"}
            </p>
          </div>
          {pendingInstructors.length + pendingCourses.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              <Mail className="h-4 w-4" />
              {ar
                ? `${pendingInstructors.length + pendingCourses.length} طلب بانتظار مراجعتك`
                : `${pendingInstructors.length + pendingCourses.length} pending review`}
            </div>
          )}
        </header>

        {/* Stats */}
        <div className="mt-8 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Mail}
            label={ar ? "طلبات مدرّبين" : "Instructor requests"}
            value={pendingInstructors.length}
            tone={pendingInstructors.length ? "amber" : "neutral"}
            hint={ar ? "بانتظار الموافقة" : "Pending approval"}
          />
          <StatCard
            icon={FileText}
            label={ar ? "دورات للمراجعة" : "Courses to review"}
            value={pendingCourses.length}
            tone={pendingCourses.length ? "amber" : "neutral"}
            hint={ar ? "بانتظار النشر" : "Pending publish"}
          />
          <StatCard
            icon={GraduationCap}
            label={ar ? "مدرّبون نشطون" : "Active instructors"}
            value={approvedInstructors.length}
            tone="primary"
            hint={ar ? "موافَق عليهم" : "Approved"}
          />
          <StatCard
            icon={BookOpen}
            label={ar ? "دورات منشورة" : "Published courses"}
            value={publishedCourses.length}
            tone="primary"
            hint={`${studentsCount} ${ar ? "تسجيل طالب" : "enrollments"}`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <nav className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </span>
                    {t.badge ? (
                      <span
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-500 text-white"
                        }`}
                      >
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {ar ? "الإدارة المتقدّمة" : "Advanced"}
              </p>
              {sideLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">{l.label}</span>
                        <span className="block text-[11px] text-muted-foreground leading-tight">{l.desc}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary rtl:rotate-180 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Pending instructor requests highlight */}
                <Section
                  title={ar ? "طلبات مدرّبين بانتظار الموافقة" : "Instructor requests pending approval"}
                  count={pendingInstructors.length}
                  emptyText={ar ? "لا توجد طلبات حالياً." : "No pending requests."}
                  action={
                    pendingInstructors.length > 3 ? (
                      <button onClick={() => setTab("instructors")} className="text-xs font-bold text-primary hover:underline">
                        {ar ? "عرض الكل" : "View all"}
                      </button>
                    ) : null
                  }
                >
                  {pendingInstructors.slice(0, 3).map((i) => (
                    <InstructorRequestCard
                      key={i.user_id}
                      ins={i}
                      ar={ar}
                      onApprove={() => approveInstructor(i.user_id, true)}
                      onReject={() => rejectInstructor(i.user_id)}
                    />
                  ))}
                </Section>

                {/* Pending courses highlight */}
                <Section
                  title={ar ? "دورات بانتظار المراجعة" : "Courses pending review"}
                  count={pendingCourses.length}
                  emptyText={ar ? "لا توجد دورات بانتظار النشر." : "No courses awaiting review."}
                  action={
                    pendingCourses.length > 3 ? (
                      <button onClick={() => setTab("courses")} className="text-xs font-bold text-primary hover:underline">
                        {ar ? "عرض الكل" : "View all"}
                      </button>
                    ) : null
                  }
                >
                  {pendingCourses.slice(0, 3).map((c) => (
                    <CourseRow
                      key={c.id}
                      c={c}
                      ar={ar}
                      onPublish={() => setCourseStatus(c.id, "published")}
                      onReject={() => {
                        const r = prompt(ar ? "سبب الرفض؟" : "Rejection reason?");
                        if (r !== null) setCourseStatus(c.id, "rejected", r);
                      }}
                    />
                  ))}
                </Section>
              </div>
            )}

            {tab === "instructors" && (
              <div className="space-y-6">
                <Section
                  title={ar ? "طلبات جديدة" : "New requests"}
                  count={pendingInstructors.length}
                  emptyText={ar ? "لا توجد طلبات حالياً." : "No pending requests."}
                >
                  {pendingInstructors.map((i) => (
                    <InstructorRequestCard
                      key={i.user_id}
                      ins={i}
                      ar={ar}
                      onApprove={() => approveInstructor(i.user_id, true)}
                      onReject={() => rejectInstructor(i.user_id)}
                    />
                  ))}
                </Section>

                <Section
                  title={ar ? "المدرّبون المعتمَدون" : "Approved instructors"}
                  count={approvedInstructors.length}
                  emptyText={ar ? "لا يوجد مدرّبون معتمَدون." : "No approved instructors."}
                >
                  {approvedInstructors.map((i) => (
                    <div
                      key={i.user_id}
                      className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{i.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{i.specialty || (ar ? "بدون تخصّص" : "No specialty")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditInstructorId(i.user_id)}>
                          <Pencil className="h-3.5 w-3.5 mx-1" />
                          {ar ? "تعديل" : "Edit"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => approveInstructor(i.user_id, false)}>
                          {ar ? "إلغاء الموافقة" : "Revoke"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </Section>
              </div>
            )}

            {tab === "courses" && (
              <div className="space-y-6">
                {/* Add course (admin can pick any approved instructor) */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">
                      {ar ? "إنشاء دورة جديدة" : "Create a new course"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ar
                        ? "بصلاحيات الإدارة يمكنك إنشاء دورة وتعيينها لأحد المدرّبين المعتمَدين."
                        : "As an admin you can create a course and assign it to any approved instructor."}
                    </p>
                  </div>
                  <Dialog open={newCourseOpen} onOpenChange={setNewCourseOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={approvedInstructors.length === 0}>
                        <Plus className="h-4 w-4 mx-1" />
                        {ar ? "دورة جديدة" : "New course"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{ar ? "دورة جديدة" : "New course"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={createCourse} className="space-y-3">
                        <div>
                          <Label>{ar ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                          <Input
                            required
                            value={newCourse.title_ar}
                            onChange={(e) => setNewCourse({ ...newCourse, title_ar: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{ar ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                          <Input
                            value={newCourse.title_en}
                            onChange={(e) => setNewCourse({ ...newCourse, title_en: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{ar ? "المدرّب" : "Instructor"}</Label>
                          <Select
                            value={newCourse.instructor_id}
                            onValueChange={(v) => setNewCourse({ ...newCourse, instructor_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={ar ? "اختر مدرّباً معتمَداً" : "Pick an approved instructor"} />
                            </SelectTrigger>
                            <SelectContent>
                              {approvedInstructors.map((i) => (
                                <SelectItem key={i.user_id} value={i.user_id}>
                                  {i.full_name}
                                  {i.specialty ? ` · ${i.specialty}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={creatingCourse || !newCourse.instructor_id}>
                          {ar ? "إنشاء" : "Create"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Section
                  title={ar ? "بانتظار المراجعة" : "Pending review"}
                  count={pendingCourses.length}
                  emptyText={ar ? "لا توجد دورات بانتظار النشر." : "No courses awaiting review."}
                >
                  {pendingCourses.map((c) => (
                    <CourseRow
                      key={c.id}
                      c={c}
                      ar={ar}
                      onPublish={() => setCourseStatus(c.id, "published")}
                      onReject={() => {
                        const r = prompt(ar ? "سبب الرفض؟" : "Rejection reason?");
                        if (r !== null) setCourseStatus(c.id, "rejected", r);
                      }}
                    />
                  ))}
                </Section>

                <Section
                  title={ar ? "جميع الدورات" : "All courses"}
                  count={courses.length}
                  emptyText={ar ? "لا توجد دورات." : "No courses yet."}
                >
                  {courses
                    .filter((c) => c.status !== "pending")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{c.title_ar}</div>
                          <StatusBadge status={c.status} ar={ar} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to="/learning-management-system/instructor/courses/$id"
                            params={{ id: c.id }}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {ar ? "تعديل" : "Edit"}
                          </Link>
                          {c.status === "published" ? (
                            <Button size="sm" variant="outline" onClick={() => setCourseStatus(c.id, "draft")}>
                              {ar ? "إلغاء النشر" : "Unpublish"}
                            </Button>
                          ) : c.status === "draft" || c.status === "rejected" ? (
                            <Button size="sm" onClick={() => setCourseStatus(c.id, "published")}>
                              {ar ? "نشر" : "Publish"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </Section>
              </div>
            )}

            {tab === "categories" && (
              <Section title={ar ? "إدارة التصنيفات" : "Manage categories"} count={categories.length}>
                <form
                  onSubmit={addCategory}
                  className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <Input
                    placeholder={ar ? "الاسم (عربي)" : "Name (AR)"}
                    value={newCat.name_ar}
                    onChange={(e) => setNewCat({ ...newCat, name_ar: e.target.value })}
                    required
                  />
                  <Input
                    placeholder={ar ? "الاسم (إنجليزي)" : "Name (EN)"}
                    value={newCat.name_en}
                    onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })}
                  />
                  <Input
                    placeholder={ar ? "المعرّف" : "slug"}
                    value={newCat.slug}
                    onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                    required
                  />
                  <Button type="submit">
                    <Plus className="h-4 w-4 mx-1" />
                    {ar ? "إضافة" : "Add"}
                  </Button>
                </form>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">{c.name_ar}</span>
                      {c.name_en && <span className="text-muted-foreground"> · {c.name_en}</span>}
                      <span className="ml-2 text-xs text-muted-foreground">({c.slug})</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </Section>
            )}
          </main>
        </div>
      </div>
      {editInstructorId && (
        <AdminInstructorEditDialog
          userId={editInstructorId}
          open={!!editInstructorId}
          onOpenChange={(v) => !v && setEditInstructorId(null)}
          onSaved={load}
          ar={ar}
        />
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
  tone: "primary" | "amber" | "neutral";
}) {
  const tones = {
    primary: "from-primary/10 to-primary/5 border-primary/20 text-primary",
    amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-600",
    neutral: "from-muted to-background border-border text-muted-foreground",
  } as const;
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-4 sm:p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/70`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{value}</span>
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  count,
  emptyText,
  action,
  children,
}: {
  title: string;
  count?: number;
  emptyText?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  const isEmpty = items.length === 0 || count === 0;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          {title}
          {typeof count === "number" && count > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {count}
            </Badge>
          )}
        </h2>
        {action}
      </div>
      {isEmpty && emptyText ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </section>
  );
}

function InstructorRequestCard({
  ins,
  ar,
  onApprove,
  onReject,
}: {
  ins: Instructor;
  ar: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-50/80 to-card dark:from-amber-950/20 dark:to-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate text-base">{ins.full_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {ar ? "طلب تفعيل حساب مدرّب" : "Instructor activation request"}
            </div>
            {ins.specialty && <div className="mt-1 text-xs text-foreground">{ins.specialty}</div>}
            {ins.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ins.bio}</p>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="h-4 w-4 mx-1" />
            {ar ? "موافقة" : "Approve"}
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mx-1" />
            {ar ? "رفض" : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CourseRow({
  c,
  ar,
  onPublish,
  onReject,
}: {
  c: Course;
  ar: boolean;
  onPublish: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-bold text-foreground truncate">{c.title_ar}</div>
        <StatusBadge status={c.status} ar={ar} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Link
          to="/learning-management-system/instructor/courses/$id"
          params={{ id: c.id }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
        >
          <Pencil className="h-3.5 w-3.5" />
          {ar ? "تعديل" : "Edit"}
        </Link>
        <Button size="sm" onClick={onPublish}>
          <Check className="h-4 w-4 mx-1" />
          {ar ? "نشر" : "Publish"}
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject}>
          <X className="h-4 w-4 mx-1" />
          {ar ? "رفض" : "Reject"}
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status, ar }: { status: string; ar: boolean }) {
  const map: Record<string, { cls: string; ar: string; en: string; Icon: typeof Clock }> = {
    draft: { cls: "bg-muted text-muted-foreground", ar: "مسودّة", en: "Draft", Icon: FileText },
    pending: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", ar: "بانتظار المراجعة", en: "Pending", Icon: Clock },
    published: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ar: "منشورة", en: "Published", Icon: CheckCircle2 },
    rejected: { cls: "bg-destructive/15 text-destructive", ar: "مرفوضة", en: "Rejected", Icon: XCircle },
  };
  const m = map[status] ?? map.draft;
  const Icon = m.Icon;
  return (
    <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 ${m.cls}`}>
      <Icon className="h-3 w-3" />
      {ar ? m.ar : m.en}
    </span>
  );
}
