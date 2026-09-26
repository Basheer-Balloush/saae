import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, ChevronLeft, Download, MessageSquare, Users } from "lucide-react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  adminExportApplications,
  adminListLmsAdmins,
  type ApplicationListRow,
  type ApplicationStatus,
} from "@/lib/lms-internships-applications-admin.functions";
import { adminGetInternship } from "@/lib/lms-internships-admin.functions";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { APP_STATUS_UI, PIPELINE } from "@/features/internships/shared";

export const Route = createFileRoute(
  "/learning-management-system/admin/internships/$id/applications/",
)({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Applications — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { stage?: ApplicationStatus } => ({
    stage:
      typeof s.stage === "string" && s.stage in APP_STATUS_UI
        ? (s.stage as ApplicationStatus)
        : undefined,
  }),
  component: ApplicationsPage,
});

/* Everyone who applied to one internship, laid out as a pipeline. Pick a
   stage to see who is in it; open a person to move them along. */
function ApplicationsPage() {
  const { id } = Route.useParams();
  const { stage } = Route.useSearch();
  const nav = Route.useNavigate();
  const { t, ar, lang } = useT();
  const { user } = useLmsAuth();
  const allFn = useServerFn(adminExportApplications);
  const adminsFn = useServerFn(adminListLmsAdmins);
  const oppFn = useServerFn(adminGetInternship);
  const [rows, setRows] = useState<ApplicationListRow[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [admins, setAdmins] = useState<{ user_id: string; email: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string>("all");

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await allFn({ data: { opportunity_id: id, sort: "submitted_desc" } });
      setRows(r.rows);
      setTruncated(r.truncated);
    } catch {
      setError(true);
    }
  }, [allFn, id]);
  useEffect(() => {
    load();
    adminsFn()
      .then(setAdmins)
      .catch(() => {});
    oppFn({ data: { id } })
      .then((r) =>
        setTitle(ar ? r.opportunity.title_ar : r.opportunity.title_en || r.opportunity.title_ar),
      )
      .catch(() => {});
  }, [load, adminsFn, oppFn, id, ar]);

  const counts = useMemo(() => {
    const c = {} as Record<ApplicationStatus, number>;
    for (const s of Object.keys(APP_STATUS_UI) as ApplicationStatus[]) c[s] = 0;
    for (const r of rows ?? []) c[r.status]++;
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (stage && r.status !== stage) return false;
      if (who === "none" && r.assigned_admin) return false;
      if (who === "me" && r.assigned_admin !== user?.id) return false;
      if (who !== "all" && who !== "none" && who !== "me" && r.assigned_admin !== who) return false;
      return (
        !s ||
        [r.snapshot_full_name, r.snapshot_email, r.snapshot_phone, r.snapshot_organization].some(
          (x) => x?.toLowerCase().includes(s),
        )
      );
    });
  }, [rows, stage, who, q, user?.id]);

  const setStage = (s?: ApplicationStatus) => nav({ search: { stage: s }, replace: true });
  const label = (s: ApplicationStatus) => (ar ? APP_STATUS_UI[s].ar : APP_STATUS_UI[s].en);

  const exportXlsx = () =>
    exportRowsToXlsx<ApplicationListRow>({
      filenameBase: `internship-applications-${id.slice(0, 8)}`,
      sheetName: "Applications",
      rtl: ar,
      rows: shown,
      columns: [
        { header: t("الحالة", "Status"), get: (r) => label(r.status), width: 16 },
        { header: t("الاسم", "Full name"), get: (r) => r.snapshot_full_name, width: 28 },
        { header: t("البريد", "Email"), get: (r) => r.snapshot_email, width: 28 },
        { header: t("الهاتف", "Phone"), get: (r) => r.snapshot_phone, width: 18 },
        { header: t("الجهة", "Organisation"), get: (r) => r.snapshot_organization, width: 24 },
        { header: t("المسؤول", "Assigned admin"), get: (r) => r.assigned_admin_email, width: 28 },
        { header: t("الدورات", "Courses"), type: "number", get: (r) => r.courses_count, width: 12 },
        {
          header: t("الشهادات", "Certificates"),
          type: "number",
          get: (r) => r.certificates_count,
          width: 14,
        },
        { header: t("الملاحظات", "Notes"), type: "number", get: (r) => r.notes_count, width: 12 },
        {
          header: t("أُرسل في", "Submitted at"),
          type: "date",
          get: (r) => r.submitted_at,
          width: 20,
        },
        {
          header: t("المحاولة", "Attempt"),
          type: "number",
          get: (r) => r.attempt_number,
          width: 10,
        },
      ],
    });

  return (
    <div>
      <PageHeader
        back={{
          to: "/learning-management-system/admin/internships/$id/edit",
          params: { id },
          label: title || t("الفرصة", "Internship"),
        }}
        eyebrow={t("منصّة التعلّم · فرصة تدريب", "Learning · Internship")}
        title={t("الطلبات", "Applications")}
        description={title || undefined}
        actions={
          <Button variant="outline" onClick={exportXlsx} disabled={!shown.length}>
            <Download className="h-4 w-4" />
            {t("تصدير Excel", "Export Excel")}
          </Button>
        }
      />

      {error ? (
        <ErrorNote onRetry={load} />
      ) : rows === null ? (
        <Loading />
      ) : (
        <>
          {truncated && (
            <p className="mb-3 rounded-xl bg-[var(--cx-orange-50)] px-4 py-2 text-[13px] text-[var(--cx-orange-ink)]">
              {t("تُعرض أول 5000 طلب فقط.", "Only the first 5,000 applications are shown.")}
            </p>
          )}

          <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
            {PIPELINE.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(stage === s ? undefined : s)}
                data-active={stage === s}
                className="cx-card relative p-3.5 text-start transition-all hover:border-[var(--cx-teal-100)] data-[active=true]:border-[var(--cx-teal)] data-[active=true]:shadow-[0_0_0_3px_var(--cx-teal-50)]"
              >
                <div className="text-[26px] font-extrabold leading-none tabular-nums">
                  {fmtNum(counts[s], lang)}
                </div>
                <div className="mt-1.5 text-[13px] font-bold text-[var(--cx-ink-2)]">
                  {label(s)}
                </div>
                {i < PIPELINE.length - 1 && (
                  <ChevronLeft
                    className="absolute -end-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[var(--cx-faint)] lg:block ltr:rotate-180"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
            <div className="flex gap-2 sm:col-span-3 lg:col-span-1 lg:flex-col">
              {(["rejected", "withdrawn"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(stage === s ? undefined : s)}
                  data-active={stage === s}
                  className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-[var(--cx-line)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--cx-muted)] hover:border-[var(--cx-teal-100)] data-[active=true]:border-[var(--cx-teal)] data-[active=true]:text-[var(--cx-ink)]"
                >
                  {label(s)}
                  <span className="tabular-nums">{fmtNum(counts[s], lang)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-extrabold">
                {stage ? label(stage) : t("كل الطلبات", "All applications")}
              </span>
              <span className="text-[13px] text-[var(--cx-muted)]">
                · {fmtNum(shown.length, lang)}
              </span>
              {stage && (
                <button
                  type="button"
                  onClick={() => setStage(undefined)}
                  className="text-[12.5px] font-bold text-[var(--cx-teal)] hover:underline"
                >
                  {t("عرض الكل", "Show all")}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                aria-label={t("المسؤول", "Assigned to")}
              >
                <option value="all">{t("كل المسؤولين", "Anyone")}</option>
                <option value="me">{t("المُسندة لي", "Assigned to me")}</option>
                <option value="none">{t("غير مُسندة", "Unassigned")}</option>
                {admins.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.email ?? a.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder={t("اسم، بريد، هاتف أو جهة", "Name, email, phone or organisation")}
              />
            </div>
          </div>

          <Panel flush>
            {shown.length === 0 ? (
              <EmptyState
                icon={Users}
                title={
                  rows.length
                    ? t("لا أحد هنا", "Nobody here")
                    : t("لم يتقدّم أحد بعد", "No one has applied yet")
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--cx-line-2)]">
                {shown.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/learning-management-system/admin/internships/$id/applications/$appId"
                      params={{ id, appId: r.id }}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--cx-hover)]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[15px] font-extrabold text-[var(--cx-teal)]">
                        {(r.snapshot_full_name || "?").trim().slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-[180px] flex-1">
                        <span className="block font-bold" dir="auto">
                          {r.snapshot_full_name || "—"}
                          {r.attempt_number > 1 && (
                            <span className="ms-2 text-[11.5px] font-semibold text-[var(--cx-muted)]">
                              #{r.attempt_number}
                            </span>
                          )}
                        </span>
                        <span
                          className="block truncate text-[12.5px] text-[var(--cx-muted)]"
                          dir="auto"
                        >
                          {[r.snapshot_organization, r.snapshot_email]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-[12.5px] text-[var(--cx-muted)]">
                        <span
                          className="inline-flex items-center gap-1"
                          title={t("دورات", "Courses")}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          {fmtNum(r.courses_count, lang)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1"
                          title={t("شهادات", "Certificates")}
                        >
                          <Award className="h-3.5 w-3.5" />
                          {fmtNum(r.certificates_count, lang)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1"
                          title={t("ملاحظات", "Notes")}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {fmtNum(r.notes_count, lang)}
                        </span>
                      </span>
                      <span
                        className="w-[150px] truncate text-[12.5px] text-[var(--cx-muted)]"
                        dir="ltr"
                      >
                        {r.assigned_admin_email ?? t("غير مُسند", "Unassigned")}
                      </span>
                      <span className="flex w-[160px] items-center justify-end gap-2">
                        <span className="text-[12px] text-[var(--cx-muted)]">
                          {fmtDate(r.submitted_at, lang)}
                        </span>
                        <Pill tone={APP_STATUS_UI[r.status].tone}>{label(r.status)}</Pill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
