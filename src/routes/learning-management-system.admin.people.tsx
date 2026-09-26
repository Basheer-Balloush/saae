import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download,
  GraduationCap,
  KeyRound,
  Loader2,
  Pencil,
  ShieldCheck,
  Undo2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { selectInBatches } from "@/lib/select-in-batches";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { listLmsStudents } from "@/lib/crm.functions";
import { getEmailsForUsers, grantRoleByEmail } from "@/lib/lms-admin-users.functions";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { AdminInstructorEditDialog } from "@/components/lms/AdminInstructorEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsoleCounts } from "@/components/console/useConsoleCounts";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  Tabs,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { useLmsAdminActions } from "@/features/lms-console/actions";

type Tab = "instructors" | "students" | "roles";

export const Route = createFileRoute("/learning-management-system/admin/people")({
  head: () => ({ meta: [{ title: "People — Learning platform — SAAE" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["students", "roles"].includes(String(s.tab)) ? (s.tab as Tab) : undefined,
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { t } = useT();
  const { tab = "instructors" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: counts } = useConsoleCounts(true);
  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("المدرّبون والطلاب", "People")}
        description={t(
          "كل من يدرّس أو يتعلّم في المنصّة، وصلاحياتهم.",
          "Everyone who teaches or learns on the platform, and what they can do.",
        )}
      />
      <Tabs
        value={tab}
        onChange={(v) =>
          navigate({ search: { tab: v === "instructors" ? undefined : v }, replace: true })
        }
        tabs={[
          {
            value: "instructors",
            label: t("المدرّبون", "Instructors"),
            icon: GraduationCap,
            count: counts?.trainerApplications,
          },
          { value: "students", label: t("الطلاب", "Students"), icon: Users },
          { value: "roles", label: t("الفريق والصلاحيات", "Team & roles"), icon: KeyRound },
        ]}
      />
      {tab === "instructors" && <InstructorsTab />}
      {tab === "students" && <StudentsTab />}
      {tab === "roles" && <RolesTab />}
    </div>
  );
}

/* ---------- Instructors ---------- */

type Instructor = {
  user_id: string;
  full_name: string;
  specialty: string | null;
  approved: boolean;
  created_at: string;
  courses: number;
};

function InstructorsTab() {
  const { t, lang } = useT();
  const actions = useLmsAdminActions(lang);
  const [rows, setRows] = useState<Instructor[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data, error: err }, { data: cs }] = await Promise.all([
      supabase
        .from("lms_instructors")
        .select("user_id,full_name,specialty,approved,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("lms_courses").select("instructor_id"),
    ]);
    if (err) {
      setError(true);
      return;
    }
    const per: Record<string, number> = {};
    for (const c of (cs as { instructor_id: string }[]) ?? [])
      per[c.instructor_id] = (per[c.instructor_id] ?? 0) + 1;
    setRows(
      ((data as Omit<Instructor, "courses">[]) ?? []).map((i) => ({
        ...i,
        courses: per[i.user_id] ?? 0,
      })),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0 };
    for (const r of rows ?? []) {
      c.all++;
      c[r.approved ? "approved" : "pending"]++;
    }
    return c;
  }, [rows]);
  const shown = (rows ?? [])
    .filter((r) => filter === "all" || (filter === "pending" ? !r.approved : r.approved))
    .filter(
      (r) =>
        !q.trim() ||
        r.full_name.toLowerCase().includes(q.trim().toLowerCase()) ||
        (r.specialty ?? "").toLowerCase().includes(q.trim().toLowerCase()),
    )
    // Requests first, then everyone else.
    .sort((a, b) => Number(a.approved) - Number(b.approved));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("الكل", "All"), count: counts.all },
            {
              value: "pending",
              label: t("لم يُفعَّلوا بعد", "Not activated yet"),
              count: counts.pending,
            },
            { value: "approved", label: t("معتمَدون", "Approved"), count: counts.approved },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو التخصّص", "Search name or specialty")}
        />
      </div>
      <Panel flush>
        {error ? (
          <div className="p-5">
            <ErrorNote onRetry={load} />
          </div>
        ) : rows === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState
            compact
            icon={GraduationCap}
            title={t("لا يوجد مدرّبون هنا", "No instructors here")}
          />
        ) : (
          <ul>
            {shown.map((i) => (
              <li
                key={i.user_id}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--cx-line-2)] px-5 py-3.5 last:border-0"
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-extrabold ${
                    i.approved
                      ? "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"
                      : "bg-[var(--cx-orange-50)] text-[var(--cx-orange-ink)]"
                  }`}
                >
                  {i.full_name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14.5px] font-bold">{i.full_name}</span>
                    {i.approved ? (
                      <Pill tone="green">{t("معتمَد", "Approved")}</Pill>
                    ) : (
                      <Pill tone="orange">{t("لم يُفعَّل بعد", "Not activated yet")}</Pill>
                    )}
                  </div>
                  <div className="truncate text-[12.5px] text-[var(--cx-muted)]">
                    {i.specialty || t("بدون تخصّص", "No specialty")} ·{" "}
                    {t(`${fmtNum(i.courses, lang)} دورة`, `${fmtNum(i.courses, lang)} courses`)} ·{" "}
                    {fmtDate(i.created_at, lang)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {i.approved ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(i.user_id)}>
                        <Pencil className="h-4 w-4" />
                        {t("تعديل الملف", "Edit profile")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            await confirmDialog({
                              title: t(`إلغاء اعتماد ${i.full_name}؟`, `Revoke ${i.full_name}?`),
                              description: t(
                                "يفقد صلاحية التدريس، وتبقى دوراته كما هي.",
                                "They lose teaching access; their courses stay.",
                              ),
                              destructive: true,
                            })
                          ) {
                            if (await actions.setInstructorApproval(i.user_id, false)) load();
                          }
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                        {t("إلغاء الاعتماد", "Revoke")}
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/learning-management-system/admin/requests"
                        search={{ tab: "instructors" }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {t("الاعتماد", "Accreditation")}
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {editing && (
        <AdminInstructorEditDialog
          userId={editing}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={load}
          ar={lang === "ar"}
        />
      )}
    </div>
  );
}

/* ---------- Students ---------- */

type Student = Awaited<ReturnType<typeof listLmsStudents>>["students"][number];

function StudentsTab() {
  const { t, ar, lang } = useT();
  const fetchStudents = useServerFn(listLmsStudents);
  const [rows, setRows] = useState<Student[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchStudents()
      .then((r) => setRows(r.students))
      .catch((e) => {
        toast.error(toUserMessage(e));
        setError(true);
      });
  }, [fetchStudents]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        !n ||
        (r.email ?? "").toLowerCase().includes(n) ||
        r.courses.some((c) => (c.title_ar + " " + c.title_en).toLowerCase().includes(n)),
    );
  }, [rows, q]);

  const onExport = () => {
    void exportRowsToXlsx<Student>({
      filenameBase: `lms-students-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Students",
      rtl: ar,
      columns: [
        { header: "Email", get: (r) => r.email ?? "" },
        { header: "Enrollments", type: "number", get: (r) => r.enrollments_count },
        { header: "Completed", type: "number", get: (r) => r.completed_count },
        { header: "Avg Progress %", type: "number", get: (r) => r.avg_progress },
        { header: "Last enrolled", type: "date", get: (r) => new Date(r.last_enrolled_at) },
        {
          header: "Courses",
          get: (r) => r.courses.map((c) => (ar ? c.title_ar : c.title_en)).join(" | "),
        },
      ],
      rows: shown,
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالبريد أو الدورة", "Search email or course")}
        />
        <Button variant="outline" size="sm" onClick={onExport} disabled={!shown.length}>
          <Download className="h-4 w-4" />
          {t("تصدير Excel", "Export Excel")}
        </Button>
      </div>
      <Panel flush>
        {error ? (
          <div className="p-5">
            <ErrorNote />
          </div>
        ) : rows === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState compact icon={Users} title={t("لا يوجد طلاب", "No students")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table min-w-[760px]">
              <thead>
                <tr>
                  <th>{t("الطالب", "Student")}</th>
                  <th>{t("التسجيلات", "Enrollments")}</th>
                  <th>{t("مكتملة", "Completed")}</th>
                  <th>{t("متوسط التقدّم", "Avg progress")}</th>
                  <th>{t("آخر تسجيل", "Last enrolled")}</th>
                  <th>{t("الدورات", "Courses")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.student_id}>
                    <td className="font-semibold" dir="ltr">
                      {r.email ?? "—"}
                    </td>
                    <td className="tabular-nums">{fmtNum(r.enrollments_count, lang)}</td>
                    <td className="tabular-nums">{fmtNum(r.completed_count, lang)}</td>
                    <td className="tabular-nums">{Math.round(Number(r.avg_progress) || 0)}%</td>
                    <td className="text-[13px] text-[var(--cx-muted)]">
                      {fmtDate(r.last_enrolled_at, lang)}
                    </td>
                    <td
                      className="max-w-[320px] truncate text-[13px] text-[var(--cx-ink-2)]"
                      title={r.courses.map((c) => (ar ? c.title_ar : c.title_en)).join(" · ")}
                    >
                      {r.courses
                        .map((c) => (ar ? c.title_ar : c.title_en || c.title_ar))
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {rows && (
        <p className="mt-2 text-[12.5px] text-[var(--cx-muted)]">
          {t(`${fmtNum(shown.length, lang)} طالب`, `${fmtNum(shown.length, lang)} students`)}
        </p>
      )}
    </div>
  );
}

/* ---------- Team & roles ---------- */

type RoleRow = { id: string; user_id: string; role: string; created_at: string };

const MANAGEABLE = ["admin", "lms_instructor", "lms_student"] as const;
const ROLE_LABELS: Record<
  string,
  { ar: string; en: string; tone: "teal" | "green" | "gray" | "orange" }
> = {
  admin: { ar: "مدير عام", en: "Admin", tone: "orange" },
  lms_admin: { ar: "مدير منصّة التعلّم", en: "Learning admin", tone: "orange" },
  lms_instructor: { ar: "مدرّب", en: "Instructor", tone: "teal" },
  lms_student: { ar: "طالب", en: "Student", tone: "gray" },
  attendance_admin: { ar: "مدير نظام الحضور", en: "Attendance admin", tone: "gray" },
  attendance_user: { ar: "مستخدم نظام الحضور", en: "Attendance user", tone: "gray" },
  user: { ar: "مستخدم", en: "User", tone: "gray" },
};

const namesFrom = (table: "lms_instructors" | "lms_user_profiles", ids: string[]) =>
  selectInBatches<{ user_id: string; full_name: string | null }>(
    table,
    "user_id,full_name",
    "user_id",
    ids,
  );

function RolesTab() {
  const { t, ar } = useT();
  const grantFn = useServerFn(grantRoleByEmail);
  const emailsFn = useServerFn(getEmailsForUsers);
  const [roles, setRoles] = useState<RoleRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [emailsFailed, setEmailsFailed] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"staff" | "all">("staff");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<string>("lms_instructor");
  const [granting, setGranting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(toUserMessage(error));
      setRoles([]);
      return;
    }
    const list = (data as RoleRow[]) ?? [];
    setRoles(list);
    const uids = Array.from(new Set(list.map((r) => r.user_id)));
    if (!uids.length) return;
    // Names from three places, best first: instructor profile, learner
    // profile, then the account itself (returned with the emails).
    const [insRes, profRes, emailRes] = await Promise.all([
      namesFrom("lms_instructors", uids),
      namesFrom("lms_user_profiles", uids),
      Promise.all(
        Array.from({ length: Math.ceil(uids.length / 500) }, (_, i) =>
          emailsFn({ data: { userIds: uids.slice(i * 500, (i + 1) * 500) } }),
        ),
      )
        .then((results) => ({
          ok: true,
          emails: Object.assign({}, ...results.map((r) => r.emails)) as Record<string, string>,
          names: Object.assign({}, ...results.map((r) => r.names ?? {})) as Record<string, string>,
        }))
        .catch(() => ({
          ok: false,
          emails: {} as Record<string, string>,
          names: {} as Record<string, string>,
        })),
    ]);
    const n: Record<string, string> = { ...emailRes.names };
    for (const i of profRes) {
      if (i.full_name?.trim()) n[i.user_id] = i.full_name.trim();
    }
    for (const i of insRes) {
      if (i.full_name?.trim()) n[i.user_id] = i.full_name.trim();
    }
    setNames(n);
    setEmails(emailRes.emails ?? {});
    setEmailsFailed(!emailRes.ok);
  }, [emailsFn]);
  useEffect(() => {
    load();
  }, [load]);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGranting(true);
    try {
      await grantFn({ data: { email: grantEmail.trim(), role: grantRole } });
      setGrantEmail("");
      toast.success(t("تم تحديث الدور", "Role updated"));
      load();
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setGranting(false);
    }
  };

  const toStudent = async (r: RoleRow) => {
    if (
      !(await confirmDialog({
        title: t("تغيير الدور إلى طالب؟", "Change role to student?"),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.rpc("lms_set_user_role", {
      _user_id: r.user_id,
      _role: "lms_student",
    });
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    load();
  };

  const label = (role: string) => {
    const l = ROLE_LABELS[role];
    return l ? (ar ? l.ar : l.en) : role;
  };
  const shown = (roles ?? []).filter((r) => {
    if (filter === "staff" && (r.role === "lms_student" || r.role === "user")) return false;
    const s = q.trim().toLowerCase();
    return (
      !s ||
      r.user_id.includes(s) ||
      (names[r.user_id] ?? "").toLowerCase().includes(s) ||
      (emails[r.user_id] ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <Panel
        title={t("منح دور بالبريد الإلكتروني", "Give someone a role by email")}
        description={t("الحساب يجب أن يكون موجوداً مسبقاً.", "The account must already exist.")}
      >
        <form onSubmit={grant} className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
          <Input
            type="email"
            dir="ltr"
            required
            placeholder="name@example.com"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value)}
          >
            {MANAGEABLE.map((r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={granting}>
            {granting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {t("منح الدور", "Give role")}
          </Button>
        </form>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: "staff", label: t("المدراء والمدرّبون", "Admins & instructors") },
            { value: "all", label: t("كل الأدوار", "All roles") },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو البريد", "Search name or email")}
        />
      </div>

      {emailsFailed && (
        <p className="mb-3 rounded-xl bg-[var(--cx-raise)] px-4 py-2.5 text-[13px] text-[var(--cx-muted)]">
          {t(
            "تعذّر جلب البريد الإلكتروني للحسابات، فتظهر الأسماء فقط حيث وُجدت.",
            "Account emails couldn't be loaded, so only names show where they exist.",
          )}
        </p>
      )}
      <Panel flush>
        {roles === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState compact icon={KeyRound} title={t("لا توجد نتائج", "No results")} />
        ) : (
          <ul>
            {shown.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 border-b border-[var(--cx-line-2)] px-5 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[14px] font-bold ${names[r.user_id] || emails[r.user_id] ? "" : "text-[var(--cx-muted)]"}`}
                    dir="auto"
                  >
                    {names[r.user_id] ??
                      emails[r.user_id] ??
                      t("حساب بلا اسم", "Account with no name")}
                  </div>
                  <div className="truncate text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
                    {emails[r.user_id] ?? (
                      <span className="font-mono text-[11.5px]">{r.user_id.slice(0, 8)}</span>
                    )}
                  </div>
                </div>
                <Pill tone={ROLE_LABELS[r.role]?.tone ?? "gray"}>{label(r.role)}</Pill>
                {r.role === "lms_instructor" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toStudent(r)}
                    aria-label={t("تغيير إلى طالب", "Change to student")}
                  >
                    <X className="h-4 w-4 text-[var(--cx-red)]" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="text-[12.5px] text-[var(--cx-muted)]">
        {t(
          "إزالة دور المدرّب تحوّل الحساب إلى طالب.",
          "Removing the instructor role turns the account into a student.",
        )}
      </p>
    </div>
  );
}
