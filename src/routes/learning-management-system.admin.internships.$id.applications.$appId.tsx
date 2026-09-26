import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Undo2,
  X,
} from "lucide-react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import {
  adminAddApplicationNote,
  adminAssignApplication,
  adminGetApplication,
  adminGetApplicationCvUrl,
  adminListLmsAdmins,
  adminSetApplicationStatus,
  type ApplicationBundle,
  type ApplicationStatus,
} from "@/lib/lms-internships-applications-admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  ReasonDialog,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import {
  APP_STATUS_UI,
  PIPELINE,
  internshipError,
  needsReason,
} from "@/features/internships/shared";

export const Route = createFileRoute(
  "/learning-management-system/admin/internships/$id/applications/$appId",
)({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Application — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplicationPage,
});

type Bundle = ApplicationBundle;
type Cv = { preview: string; download: string; filename: string | null; mime: string | null };

/** A stored answer as plain text (never raw JSON). */
function answerText(a: Bundle["answers"][number], ar: boolean): string {
  if (a.answer_text?.trim()) return a.answer_text.trim();
  const render = (x: unknown): string => {
    if (x === null || x === undefined || x === "") return "";
    if (typeof x === "boolean") return x ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No";
    if (typeof x === "number" || typeof x === "string") return String(x);
    if (Array.isArray(x)) return x.map(render).filter(Boolean).join("، ");
    if (typeof x === "object")
      return Object.entries(x as Record<string, unknown>)
        .map(([k, v]) => (render(v) ? `${k}: ${render(v)}` : ""))
        .filter(Boolean)
        .join("\n");
    return "";
  };
  return render(a.answer_json);
}

/* One applicant: who they are, what they answered, and where they are in
   the pipeline, with the next move one click away. */
function ApplicationPage() {
  const { id, appId } = Route.useParams();
  const { t, ar, lang } = useT();
  const { user } = useLmsAuth();
  const getFn = useServerFn(adminGetApplication);
  const statusFn = useServerFn(adminSetApplicationStatus);
  const noteFn = useServerFn(adminAddApplicationNote);
  const assignFn = useServerFn(adminAssignApplication);
  const adminsFn = useServerFn(adminListLmsAdmins);
  const cvFn = useServerFn(adminGetApplicationCvUrl);

  const [b, setB] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<{ user_id: string; email: string | null }[]>([]);
  const [cv, setCv] = useState<Cv | null | "error">(null);
  const [moving, setMoving] = useState<ApplicationStatus | null>(null);
  const [asking, setAsking] = useState<ApplicationStatus | null>(null);
  const [posting, setPosting] = useState(false);
  const note = useFormDraft(formDraftKey(user?.id, "internship-application-note", appId), "");

  const load = useCallback(async () => {
    setError(null);
    try {
      setB(await getFn({ data: { application_id: appId, opportunity_id: id } }));
    } catch (e) {
      setError(internshipError(e, ar));
    }
  }, [getFn, appId, id, ar]);
  useEffect(() => {
    load();
    adminsFn()
      .then(setAdmins)
      .catch(() => {});
  }, [load, adminsFn]);

  const hasCv = !!b?.cv;
  const loadCv = useCallback(() => {
    setCv(null);
    cvFn({ data: { application_id: appId } })
      .then((r) =>
        r.url && r.download_url
          ? setCv({
              preview: r.url,
              download: r.download_url,
              filename: r.filename,
              mime: r.mime_type,
            })
          : setCv("error"),
      )
      .catch(() => setCv("error"));
  }, [cvFn, appId]);
  useEffect(() => {
    if (hasCv) loadCv();
  }, [hasCv, loadCv]);

  if (error) return <ErrorNote text={error} onRetry={load} />;
  if (!b) return <Loading />;
  const app = b.application;
  const label = (s: ApplicationStatus) => (ar ? APP_STATUS_UI[s].ar : APP_STATUS_UI[s].en);
  const locked = app.status === "withdrawn";
  const at = PIPELINE.indexOf(app.status);
  const next = at >= 0 && at < PIPELINE.length - 1 ? PIPELINE[at + 1] : null;
  const phone = app.snapshot_phone?.replace(/[^\d]/g, "");

  const move = async (to: ApplicationStatus, reason?: string) => {
    setMoving(to);
    try {
      await statusFn({
        data: { application_id: appId, to_status: to, reason: reason || undefined },
      });
      toast.success(t(`نُقل إلى «${label(to)}»`, `Moved to “${label(to)}”`));
      await load();
    } catch (e) {
      toast.error(internshipError(e, ar));
    } finally {
      setMoving(null);
    }
  };
  const ask = (to: ApplicationStatus) => (needsReason(app.status, to) ? setAsking(to) : move(to));

  const post = async () => {
    const body = note.values.trim();
    if (!body) return;
    setPosting(true);
    try {
      await noteFn({ data: { application_id: appId, body } });
      note.clearDraft("");
      await load();
    } catch (e) {
      toast.error(internshipError(e, ar));
    } finally {
      setPosting(false);
    }
  };
  const assign = async (v: string) => {
    try {
      await assignFn({ data: { application_id: appId, admin_user_id: v || null } });
      toast.success(v ? t("أُسند الطلب", "Assigned") : t("أُزيل الإسناد", "Unassigned"));
      await load();
    } catch (e) {
      toast.error(internshipError(e, ar));
    }
  };

  return (
    <div>
      <PageHeader
        back={{
          to: "/learning-management-system/admin/internships/$id/applications",
          params: { id },
          label: t("كل الطلبات", "All applications"),
        }}
        eyebrow={
          (ar ? b.opportunity.title_ar : b.opportunity.title_en || b.opportunity.title_ar) ||
          t("فرصة تدريب", "Internship")
        }
        title={app.snapshot_full_name?.trim() || t("متقدّم", "Applicant")}
        meta={
          <>
            <Pill tone={APP_STATUS_UI[app.status].tone}>{label(app.status)}</Pill>
            <span className="text-[13px] text-[var(--cx-muted)]">
              {t("تقدّم", "Applied")} {fmtDate(app.submitted_at, lang, true)}
              {app.attempt_number > 1 &&
                ` · ${t("المحاولة", "attempt")} ${fmtNum(app.attempt_number, lang)}`}
            </span>
          </>
        }
        actions={
          <>
            {app.snapshot_email && (
              <Button asChild variant="outline">
                <a href={`mailto:${app.snapshot_email}`}>
                  <Mail className="h-4 w-4" />
                  {t("بريد", "Email")}
                </a>
              </Button>
            )}
            {phone && (
              <Button asChild variant="outline">
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            )}
          </>
        }
      />

      {/* Where they are, and the next move. */}
      <section className="cx-card mb-6 p-5">
        <ol className="flex flex-wrap items-center gap-y-2">
          {PIPELINE.map((s, i) => {
            const done = at > i;
            const now = app.status === s;
            return (
              <li key={s} className="flex items-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${now ? "bg-[var(--cx-petrol)] text-white" : done ? "bg-[var(--cx-green-50)] text-[var(--cx-green)]" : "bg-[var(--cx-raise-2)] text-[var(--cx-muted)]"}`}
                >
                  {done && <Check className="h-3.5 w-3.5" />}
                  {label(s)}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span className="mx-1.5 h-px w-5 bg-[var(--cx-line)]" aria-hidden="true" />
                )}
              </li>
            );
          })}
          {(app.status === "rejected" || app.status === "withdrawn") && (
            <li className="ms-3">
              <Pill tone={APP_STATUS_UI[app.status].tone}>{label(app.status)}</Pill>
            </li>
          )}
        </ol>
        {locked ? (
          <p className="mt-4 text-[13.5px] text-[var(--cx-muted)]">
            {t(
              "سحب المتقدّم طلبه، لذلك لا يمكن تغيير حالته.",
              "The applicant withdrew, so the status can't change.",
            )}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--cx-line-2)] pt-4">
            {next && (
              <Button onClick={() => ask(next)} disabled={!!moving}>
                {moving === next ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                )}
                {t(`نقل إلى «${label(next)}»`, `Move to “${label(next)}”`)}
              </Button>
            )}
            {app.status !== "accepted" && app.status !== "rejected" && next !== "accepted" && (
              <Button
                variant="outline"
                className="border-[var(--cx-green)] text-[var(--cx-green)]"
                onClick={() => ask("accepted")}
                disabled={!!moving}
              >
                <Check className="h-4 w-4" />
                {t("قبول مباشرة", "Accept now")}
              </Button>
            )}
            {app.status !== "rejected" && (
              <Button
                variant="outline"
                className="border-[var(--cx-red-line)] text-[var(--cx-red)]"
                onClick={() => ask("rejected")}
                disabled={!!moving}
              >
                <X className="h-4 w-4" />
                {t("رفض", "Reject")}
              </Button>
            )}
            {(at > 0 || app.status === "rejected") && (
              <select
                className="ms-auto h-9 rounded-md border border-[var(--cx-line)] bg-[var(--cx-field)] px-2 text-[13px]"
                value=""
                onChange={(e) => e.target.value && ask(e.target.value as ApplicationStatus)}
                aria-label={t("إرجاع إلى مرحلة سابقة", "Move back to an earlier stage")}
              >
                <option value="">{t("↩ إرجاع إلى…", "↩ Move back to…")}</option>
                {PIPELINE.filter(
                  (s) =>
                    s !== app.status && (app.status === "rejected" || PIPELINE.indexOf(s) < at),
                ).map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title={t("عن المتقدّم", "About")}>
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  [t("البريد", "Email"), app.snapshot_email, true],
                  [t("الهاتف", "Phone"), app.snapshot_phone, true],
                  [t("الجهة", "Organisation"), app.snapshot_organization, false],
                ] as const
              ).map(([k, v, ltr]) => (
                <div key={k}>
                  <dt className="text-[12px] font-bold text-[var(--cx-muted)]">{k}</dt>
                  <dd
                    className={`mt-0.5 break-words text-[14px] ${v ? "" : "text-[var(--cx-faint)]"}`}
                    dir={ltr && v ? "ltr" : "auto"}
                  >
                    {v || t("غير متوفر", "Not given")}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-[var(--cx-line-2)] pt-4">
              <div className="text-[12px] font-bold text-[var(--cx-muted)]">
                {t("نبذة", "Biography")}
              </div>
              <p
                className={`mt-1 whitespace-pre-wrap text-[14px] leading-relaxed ${app.snapshot_biography?.trim() ? "" : "text-[var(--cx-faint)]"}`}
                dir="auto"
              >
                {app.snapshot_biography?.trim() || t("غير متوفرة", "Not given")}
              </p>
            </div>
          </Panel>

          {b.answers.length > 0 && (
            <Panel title={t("إجاباته", "Their answers")}>
              <div className="space-y-4">
                {b.answers.map((a) => {
                  const v = answerText(a, ar);
                  return (
                    <div key={a.id}>
                      <div className="text-[13px] font-bold text-[var(--cx-ink-2)]" dir="auto">
                        {(ar ? a.question_label_ar : a.question_label_en) ||
                          a.question_label_ar ||
                          a.question_label_en ||
                          t("سؤال", "Question")}
                      </div>
                      <p
                        className={`mt-1 whitespace-pre-wrap rounded-xl bg-[var(--cx-raise)] px-3 py-2 text-[14px] ${v ? "" : "text-[var(--cx-faint)]"}`}
                        dir="auto"
                      >
                        {v || t("لم يُجب", "No answer")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          <Panel
            title={t("السيرة الذاتية", "CV")}
            description={
              b.cv
                ? `${b.cv.original_filename?.trim() || "CV"}${b.cv.size_bytes ? ` · ${Math.max(1, Math.round(b.cv.size_bytes / 1024))} KB` : ""}`
                : undefined
            }
            actions={
              cv && cv !== "error" ? (
                <>
                  <Button asChild size="sm" variant="outline">
                    <a href={cv.preview} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t("فتح", "Open")}
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <a href={cv.download} download={cv.filename ?? undefined}>
                      <Download className="h-4 w-4" />
                      {t("تنزيل", "Download")}
                    </a>
                  </Button>
                </>
              ) : undefined
            }
          >
            {!b.cv ? (
              <p className="text-[14px] text-[var(--cx-muted)]">
                {t("لم يرفع سيرة ذاتية.", "No CV uploaded.")}
              </p>
            ) : cv === null ? (
              <Loading />
            ) : cv === "error" ? (
              <div className="flex flex-wrap items-center gap-3 text-[14px] text-[var(--cx-red)]">
                {t("تعذّر فتح الملف.", "Could not open the file.")}
                <Button size="sm" variant="outline" onClick={loadCv}>
                  {t("إعادة المحاولة", "Retry")}
                </Button>
              </div>
            ) : (cv.mime ?? b.cv.mime_type) === "application/pdf" ? (
              <iframe
                src={cv.preview}
                title={t("السيرة الذاتية", "CV")}
                className="h-[560px] w-full rounded-xl border border-[var(--cx-line)] bg-white"
              />
            ) : (
              <p className="flex items-center gap-2 text-[14px] text-[var(--cx-muted)]">
                <FileText className="h-4 w-4" />
                {t(
                  "لا يمكن عرض هذا النوع هنا. نزّله لفتحه.",
                  "This file type can't be shown here. Download it to open it.",
                )}
              </p>
            )}
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title={t("دوراته على المنصّة", "Courses on the platform")} flush>
              {b.courses.length === 0 ? (
                <p className="px-5 py-4 text-[13.5px] text-[var(--cx-muted)]">
                  {t("لا دورات.", "No courses.")}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--cx-line-2)]">
                  {b.courses.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                      <BookOpen className="h-4 w-4 shrink-0 text-[var(--cx-teal)]" />
                      <span className="min-w-0 flex-1 truncate" dir="auto">
                        {(ar ? c.course_title_ar : c.course_title_en) ||
                          c.course_title_ar ||
                          c.course_title_en ||
                          "—"}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--cx-muted)]">
                        {c.completed
                          ? t("مكتملة", "Done")
                          : `${Math.round(Number(c.progress_percent ?? 0))}%`}
                        {c.attendance_total
                          ? ` · ${c.attendance_present ?? 0}/${c.attendance_total}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t("شهاداته", "Certificates")} flush>
              {b.certificates.length === 0 ? (
                <p className="px-5 py-4 text-[13.5px] text-[var(--cx-muted)]">
                  {t("لا شهادات.", "No certificates.")}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--cx-line-2)]">
                  {b.certificates.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                      <Award className="h-4 w-4 shrink-0 text-[var(--cx-orange-ink)]" />
                      <span className="min-w-0 flex-1 truncate" dir="auto">
                        {(ar ? c.course_title_ar : c.course_title_en) ||
                          c.course_title_ar ||
                          c.course_title_en ||
                          "—"}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--cx-muted)]">
                        {fmtDate(c.issued_at, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <aside className="space-y-6">
          <Panel title={t("المسؤول عن الطلب", "Owner")}>
            <select
              className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
              value={app.assigned_admin ?? ""}
              onChange={(e) => assign(e.target.value)}
            >
              <option value="">{t("بلا مسؤول", "No one")}</option>
              {admins.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.user_id === user?.id
                    ? `${a.email ?? ""} (${t("أنا", "me")})`
                    : (a.email ?? a.user_id.slice(0, 8))}
                </option>
              ))}
            </select>
          </Panel>

          <Panel title={t("ملاحظات الفريق", "Team notes")}>
            <Textarea
              rows={3}
              value={note.values}
              onChange={(e) => note.setValues(e.target.value)}
              maxLength={20000}
              dir="auto"
              placeholder={t("اكتب ملاحظة…", "Write a note…")}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={post} disabled={posting || !note.values.trim()}>
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                {t("إضافة", "Add")}
              </Button>
            </div>
            {b.notes.length > 0 && (
              <ul className="mt-4 space-y-2">
                {b.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-3"
                  >
                    <p className="whitespace-pre-wrap text-[13.5px]" dir="auto">
                      {n.body}
                    </p>
                    <div className="mt-1.5 flex justify-between gap-2 text-[11.5px] text-[var(--cx-muted)]">
                      <span className="truncate" dir="ltr">
                        {n.author_email ?? ""}
                      </span>
                      <span>{fmtDate(n.created_at, lang, true)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("السجل", "History")}>
            {b.history.length === 0 ? (
              <EmptyState compact icon={Undo2} title={t("لا تغييرات بعد", "No changes yet")} />
            ) : (
              <ol className="space-y-3">
                {b.history.map((h) => (
                  <li
                    key={h.id}
                    className="border-s-2 border-[var(--cx-teal-100)] ps-3 text-[13px]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {h.from_status && (
                        <>
                          <span className="text-[var(--cx-muted)]">{label(h.from_status)}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[var(--cx-faint)] rtl:rotate-180" />
                        </>
                      )}
                      <b>{label(h.to_status)}</b>
                    </div>
                    {h.reason && (
                      <p className="mt-0.5 text-[12.5px] text-[var(--cx-ink-2)]" dir="auto">
                        «{h.reason}»
                      </p>
                    )}
                    <div className="mt-0.5 text-[11.5px] text-[var(--cx-muted)]">
                      <span dir="ltr">{h.changed_by_email ?? ""}</span> ·{" "}
                      {fmtDate(h.created_at, lang, true)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>

      <ReasonDialog
        open={!!asking}
        onOpenChange={(v) => !v && setAsking(null)}
        title={
          asking === "rejected"
            ? t("رفض الطلب", "Reject the application")
            : t(
                `إرجاع إلى «${asking ? label(asking) : ""}»`,
                `Move back to “${asking ? label(asking) : ""}”`,
              )
        }
        description={t(
          "السبب يُحفظ في سجل الطلب.",
          "The reason is kept in the application's history.",
        )}
        confirmLabel={asking === "rejected" ? t("رفض", "Reject") : t("تأكيد", "Confirm")}
        destructive={asking === "rejected"}
        required
        onConfirm={async (reason) => {
          if (asking) await move(asking, reason);
        }}
      />
    </div>
  );
}
