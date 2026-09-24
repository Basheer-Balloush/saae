import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  adminInternshipsOverview,
  type InternshipsOverview,
} from "@/lib/lms-internships-admin.functions";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  validateCourseI18n,
  firstInvalidCourseField,
  trimCourseI18n,
  courseI18nWriteErrorMessage,
  type CourseFieldErrors,
  type RequiredCourseField,
} from "@/lib/lms-course-fields";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { AdminInstructorEditDialog } from "@/components/lms/AdminInstructorEditDialog";
import { reconcileCertificates } from "@/lib/lms-certificates.functions";
import {
  reconcileOrphanUploads,
  reconcilePartialProvisioning,
  reconcileInternshipFiles,
  getOpsHealthSummary,
  type OpsHealthSummary,
} from "@/lib/lms-ops.functions";
import { confirmDialog } from "@/hooks/useConfirm";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";

const EMPTY_CATEGORY = { name_ar: "", name_en: "", slug: "" };
const EMPTY_NEW_COURSE = { title_ar: "", title_en: "", description_ar: "", description_en: "", instructor_id: "" };

export const Route = createFileRoute("/learning-management-system/admin/")({
  head: () => ({ meta: [{ title: "Admin — SAAE Training and Learning Platform" }] }),
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
  price: number;
  sale_price: number | null;
  is_free: boolean;
};
type Category = {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  display_order: number;
};

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
  const [internshipsOverview, setInternshipsOverview] = useState<InternshipsOverview | null>(null);
  const overviewFn = useServerFn(adminInternshipsOverview);
  useEffect(() => {
    let live = true;
    overviewFn()
      .then((res) => {
        if (live) setInternshipsOverview(res);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [overviewFn]);

  const load = async () => {
    const [{ data: ins }, { data: cs }, { data: cats }, { count: stCount }] = await Promise.all([
      supabase
        .from("lms_instructors")
        .select("user_id,full_name,specialty,approved,bio,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("lms_courses")
        .select("id,title_ar,status,instructor_id,rejection_reason,created_at,price,sale_price,is_free")
        .order("created_at", { ascending: false }),
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
  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "published"),
    [courses],
  );

  const approveInstructor = async (uid: string, approve: boolean) => {
    const { error } = await supabase
      .from("lms_instructors")
      .update({ approved: approve })
      .eq("user_id", uid);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    if (approve) {
      const { error: grantError } = await supabase.from("user_roles").insert({ user_id: uid, role: "lms_instructor" });
      if (grantError) { toast.error(toUserMessage(grantError)); return; }
      toast.success(
        ar ? "تمت الموافقة وتفعيل صلاحيات التدريس" : "Approved and instructor role granted",
      );
    } else {
      const { error: revokeError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "lms_instructor" as never);
      if (revokeError) { toast.error(toUserMessage(revokeError)); return; }
      toast.success(ar ? "تم إلغاء الموافقة" : "Approval revoked");
    }
    load();
  };

  const rejectInstructor = async (uid: string) => {
    if (
      !(await confirmDialog({
        title: ar ? "رفض هذا الطلب وحذفه نهائياً؟" : "Reject and remove this request?",
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("lms_instructors").delete().eq("user_id", uid);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(ar ? "تم رفض الطلب" : "Request rejected");
    load();
  };

  const setCourseStatus = async (
    cid: string,
    status: "draft" | "pending" | "published" | "rejected",
    reason?: string,
  ) => {
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

  const { user } = useLmsAuth();
  const catDraft = useFormDraft(formDraftKey(user?.id, "lms-category", "new"), EMPTY_CATEGORY);
  const newCat = catDraft.values;
  const setNewCat = catDraft.setValues;
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
    catDraft.clearDraft();
    load();
  };
  const deleteCategory = async (id: string) => {
    if (!(await confirmDialog({ title: ar ? "حذف؟" : "Delete?", destructive: true }))) return;
    await supabase.from("lms_categories").delete().eq("id", id);
    load();
  };

  // ---- Admin create course on behalf of an approved instructor ----
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const courseDraft = useFormDraft(formDraftKey(user?.id, "lms-new-course", "new"), EMPTY_NEW_COURSE);
  const newCourse = courseDraft.values;
  const setNewCourse = courseDraft.setValues;
  // After a refresh, bring back whichever form has unsaved input.
  useEffect(() => {
    if (courseDraft.restored) {
      setTab("courses");
      setNewCourseOpen(true);
    } else if (catDraft.restored) {
      setTab("categories");
    }
  }, [courseDraft.restored, catDraft.restored]);
  const [courseErrors, setCourseErrors] = useState<CourseFieldErrors>({});
  const courseFieldRefs = useRef<
    Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});
  const [creatingCourse, setCreatingCourse] = useState(false);
  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingCourse || !newCourse.instructor_id) return;
    const nextErrors = validateCourseI18n(newCourse, lang);
    setCourseErrors(nextErrors);
    const firstBad = firstInvalidCourseField(nextErrors);
    if (firstBad) {
      courseFieldRefs.current[firstBad]?.focus();
      return;
    }
    setCreatingCourse(true);
    const { data, error } = await supabase
      .from("lms_courses")
      .insert({
        instructor_id: newCourse.instructor_id,
        ...trimCourseI18n(newCourse),
      })
      .select("id")
      .maybeSingle();
    setCreatingCourse(false);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return;
    }
    toast.success(ar ? "تم إنشاء الدورة" : "Course created");
    setNewCourseOpen(false);
    courseDraft.clearDraft();
    setCourseErrors({});
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

  const sideLinks: {
    to: string;
    label: string;
    icon: typeof Users;
    desc: string;
    badge?: number;
  }[] = [
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
    // Phase 8 (Branch A) — Coupons hidden. Enrollment is manual-approval only;
    // discount codes have no checkout to apply against. The page is preserved
    // in read-only mode for historical records at /admin/coupons.

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
      desc: internshipsOverview
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
    <div className="min-h-screen">
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
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-amber-500 text-white"
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
                        <span className="block text-[11px] text-muted-foreground leading-tight">
                          {l.desc}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {typeof l.badge === "number" && l.badge > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          {l.badge}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary rtl:rotate-180 shrink-0" />
                    </span>
                  </Link>
                );
              })}
            </div>

            <ReconcileCertificatesCard ar={ar} />
            <OpsHealthCard ar={ar} />
          </aside>

          {/* Main */}
          <main className="min-w-0">
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Pending instructor requests highlight */}
                <Section
                  title={
                    ar ? "طلبات مدرّبين بانتظار الموافقة" : "Instructor requests pending approval"
                  }
                  count={pendingInstructors.length}
                  emptyText={ar ? "لا توجد طلبات حالياً." : "No pending requests."}
                  action={
                    pendingInstructors.length > 3 ? (
                      <button
                        onClick={() => setTab("instructors")}
                        className="text-xs font-bold text-primary hover:underline"
                      >
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
                      <button
                        onClick={() => setTab("courses")}
                        className="text-xs font-bold text-primary hover:underline"
                      >
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
                          <div className="text-xs text-muted-foreground truncate">
                            {i.specialty || (ar ? "بدون تخصّص" : "No specialty")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditInstructorId(i.user_id)}
                        >
                          <Pencil className="h-3.5 w-3.5 mx-1" />
                          {ar ? "تعديل" : "Edit"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveInstructor(i.user_id, false)}
                        >
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
                      <form onSubmit={createCourse} noValidate className="space-y-3">
                        <DraftNotice show={courseDraft.restored} onDiscard={() => courseDraft.clearDraft()} />
                        <div>
                          <Label>{ar ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                          <Input
                            dir="rtl"
                            ref={(el) => {
                              courseFieldRefs.current.title_ar = el;
                            }}
                            aria-invalid={!!courseErrors.title_ar}
                            value={newCourse.title_ar}
                            onChange={(e) =>
                              setNewCourse({ ...newCourse, title_ar: e.target.value })
                            }
                          />
                          {courseErrors.title_ar && (
                            <p className="mt-1 text-xs text-destructive">{courseErrors.title_ar}</p>
                          )}
                        </div>
                        <div>
                          <Label>{ar ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                          <Input
                            dir="ltr"
                            ref={(el) => {
                              courseFieldRefs.current.title_en = el;
                            }}
                            aria-invalid={!!courseErrors.title_en}
                            value={newCourse.title_en}
                            onChange={(e) =>
                              setNewCourse({ ...newCourse, title_en: e.target.value })
                            }
                          />
                          {courseErrors.title_en && (
                            <p className="mt-1 text-xs text-destructive">{courseErrors.title_en}</p>
                          )}
                        </div>
                        <div>
                          <Label>{ar ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                          <Textarea
                            dir="rtl"
                            rows={3}
                            ref={(el) => {
                              courseFieldRefs.current.description_ar = el;
                            }}
                            aria-invalid={!!courseErrors.description_ar}
                            value={newCourse.description_ar}
                            onChange={(e) =>
                              setNewCourse({ ...newCourse, description_ar: e.target.value })
                            }
                          />
                          {courseErrors.description_ar && (
                            <p className="mt-1 text-xs text-destructive">
                              {courseErrors.description_ar}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>{ar ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                          <Textarea
                            dir="ltr"
                            rows={3}
                            ref={(el) => {
                              courseFieldRefs.current.description_en = el;
                            }}
                            aria-invalid={!!courseErrors.description_en}
                            value={newCourse.description_en}
                            onChange={(e) =>
                              setNewCourse({ ...newCourse, description_en: e.target.value })
                            }
                          />
                          {courseErrors.description_en && (
                            <p className="mt-1 text-xs text-destructive">
                              {courseErrors.description_en}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>{ar ? "المدرّب" : "Instructor"}</Label>
                          <Select
                            value={newCourse.instructor_id}
                            onValueChange={(v) => setNewCourse({ ...newCourse, instructor_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  ar ? "اختر مدرّباً معتمَداً" : "Pick an approved instructor"
                                }
                              />
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
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={creatingCourse || !newCourse.instructor_id}
                        >
                          {creatingCourse && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={c.status} ar={ar} />
                            <span className="text-xs font-semibold text-muted-foreground">
                              <CoursePrice
                                price={Number(c.price ?? 0)}
                                salePrice={c.sale_price == null ? null : Number(c.sale_price)}
                                isFree={!!c.is_free}
                                lang={lang}
                                freeLabel={tr.free}
                                size="sm"
                              />
                            </span>
                          </div>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCourseStatus(c.id, "draft")}
                            >
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
              <Section
                title={ar ? "إدارة التصنيفات" : "Manage categories"}
                count={categories.length}
              >
                <DraftNotice show={catDraft.restored} onDiscard={() => catDraft.clearDraft()} />
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
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/70`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
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
            {ins.bio && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ins.bio}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
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
    pending: {
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      ar: "بانتظار المراجعة",
      en: "Pending",
      Icon: Clock,
    },
    published: {
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      ar: "منشورة",
      en: "Published",
      Icon: CheckCircle2,
    },
    rejected: {
      cls: "bg-destructive/15 text-destructive",
      ar: "مرفوضة",
      en: "Rejected",
      Icon: XCircle,
    },
  };
  const m = map[status] ?? map.draft;
  const Icon = m.Icon;
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 ${m.cls}`}
    >
      <Icon className="h-3 w-3" />
      {ar ? m.ar : m.en}
    </span>
  );
}

function ReconcileCertificatesCard({ ar }: { ar: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = useServerFn(reconcileCertificates);
  const onClick = async () => {
    if (busy) return;
    if (
      !(await confirmDialog({
        title: ar
          ? "فحص جميع التسجيلات المؤهلة وإصدار الشهادات الناقصة؟"
          : "Scan eligible enrollments and issue any missing certificates?",
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    try {
      const res = await run({ data: { limit: 500 } });
      toast.success(
        ar
          ? `تم الفحص: ${res.scanned} — تم إصدار: ${res.issued}`
          : `Scanned: ${res.scanned} — Issued: ${res.issued}`,
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {ar ? "الصيانة" : "Maintenance"}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={onClick}
        disabled={busy}
      >
        <CheckCircle2 className="h-4 w-4" />
        {busy
          ? ar
            ? "جارٍ التدقيق..."
            : "Reconciling..."
          : ar
            ? "تدقيق الشهادات المؤهلة"
            : "Reconcile eligible certificates"}
      </Button>
    </div>
  );
}

function OpsHealthCard({ ar }: { ar: boolean }) {
  const [busy, setBusy] = useState<null | "health" | "orphans" | "provisioning" | "internships">(
    null,
  );
  const [health, setHealth] = useState<OpsHealthSummary | null>(null);
  const runHealth = useServerFn(getOpsHealthSummary);
  const runOrphans = useServerFn(reconcileOrphanUploads);
  const runProvisioning = useServerFn(reconcilePartialProvisioning);
  const runInternshipFiles = useServerFn(reconcileInternshipFiles);

  const loadHealth = async () => {
    setBusy("health");
    try {
      setHealth(await runHealth());
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const scanOrphans = async () => {
    setBusy("orphans");
    try {
      const r = await runOrphans({ data: { limit: 200 } });
      toast.success(
        ar ? `ملفات يتيمة: ${r.orphan_profile_files}` : `Orphan files: ${r.orphan_profile_files}`,
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const scanProvisioning = async () => {
    setBusy("provisioning");
    try {
      const r = await runProvisioning({ data: { limit: 200 } });
      toast.success(
        ar
          ? `تسجيلات ناقصة: ${r.missing_enrollments}`
          : `Missing enrollments: ${r.missing_enrollments}`,
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const scanInternshipFiles = async () => {
    setBusy("internships");
    try {
      const r = await runInternshipFiles({ data: { limit: 200 } });
      toast.success(
        ar
          ? `ملفات تدريب يتيمة: ${r.orphan_internship_files} · محمية بلقطة: ${r.snapshot_protected_files}`
          : `Orphan internship files: ${r.orphan_internship_files} · Snapshot-protected: ${r.snapshot_protected_files}`,
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const outbox = health?.outbox;
  const totalStuck = (outbox?.stuck ?? 0) + (outbox?.failed ?? 0);
  const authFlags = Object.values(health?.auth_rate_flags_24h ?? {}).reduce(
    (a, b) => a + (b as number),
    0,
  );
  const internStuck = health?.internships?.stuck_applications ?? 0;
  const internByStatus = health?.internships?.by_status ?? {};
  const internTotal = Object.values(internByStatus).reduce((a, b) => a + (b as number), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm mt-3 space-y-2">
      <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {ar ? "العمليات والمراقبة" : "Operations & health"}
      </p>

      {health && (
        <div className="px-2 pb-1 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {ar ? "مهام معلّقة/فاشلة" : "Stuck / failed jobs"}
            </span>
            <span
              className={`font-bold ${totalStuck > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {outbox?.stuck ?? 0} / {outbox?.failed ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {ar ? "تنبيهات حدود المصادقة (24س)" : "Auth rate flags (24h)"}
            </span>
            <span className={`font-bold ${authFlags > 0 ? "text-destructive" : "text-foreground"}`}>
              {authFlags}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {ar ? "طلبات تدريب متأخرة (>14 يوم)" : "Stuck internship apps (>14d)"}
            </span>
            <span
              className={`font-bold ${internStuck > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {internStuck}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {ar ? "إجمالي طلبات التدريب" : "Total internship apps"}
            </span>
            <span className="font-bold text-foreground">{internTotal}</span>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={loadHealth}
        disabled={busy !== null}
      >
        {busy === "health"
          ? ar
            ? "جارٍ..."
            : "Loading..."
          : ar
            ? "تحديث حالة النظام"
            : "Refresh system health"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={scanOrphans}
        disabled={busy !== null}
      >
        {busy === "orphans"
          ? ar
            ? "جارٍ..."
            : "Scanning..."
          : ar
            ? "فحص الملفات اليتيمة"
            : "Scan orphan uploads"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={scanProvisioning}
        disabled={busy !== null}
      >
        {busy === "provisioning"
          ? ar
            ? "جارٍ..."
            : "Scanning..."
          : ar
            ? "فحص التسجيلات الناقصة"
            : "Scan partial provisioning"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={scanInternshipFiles}
        disabled={busy !== null}
      >
        {busy === "internships"
          ? ar
            ? "جارٍ..."
            : "Scanning..."
          : ar
            ? "فحص ملفات التدريب"
            : "Scan internship files"}
      </Button>
    </div>
  );
}
