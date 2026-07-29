import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  BookOpen,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Save,
  UserCog,
} from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import {
  adminGetApplication,
  adminSetApplicationStatus,
  adminAddApplicationNote,
  adminAssignApplication,
  adminListLmsAdmins,
  adminGetApplicationCvUrl,
  ADMIN_ASSIGNABLE_STATUSES,
  type ApplicationStatus,
  type ApplicationBundle,

} from "@/lib/lms-internships-applications-admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute(
  "/learning-management-system/admin/internships/$id/applications/$appId",
)({
  head: () => ({
    meta: [
      { title: "Admin — Application Detail" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplicationDetail,
});

function statusLabel(s: ApplicationStatus, lang: "ar" | "en") {
  const t = lmsInternshipsT[lang];
  const map: Record<ApplicationStatus, string> = {
    new: t.statusNew,
    under_review: t.statusUnderReview,
    shortlisted: t.statusShortlisted,
    interview: t.statusInterview,
    accepted: t.statusAccepted,
    rejected: t.statusRejected,
    withdrawn: t.statusWithdrawn,
  };
  return map[s];
}

const RANK: Record<ApplicationStatus, number> = {
  withdrawn: 0,
  new: 1,
  under_review: 2,
  shortlisted: 3,
  interview: 4,
  accepted: 5,
  rejected: 5,
};

type Bundle = ApplicationBundle;

function notProvided(lang: "ar" | "en") {
  return lang === "ar" ? "غير متوفر" : "Not provided";
}

function Field({
  label,
  value,
  lang,
  ltr,
}: {
  label: string;
  value: string | null | undefined;
  lang: "ar" | "en";
  ltr?: boolean;
}) {
  const has = typeof value === "string" && value.trim().length > 0;
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div
        className={`text-sm break-words whitespace-pre-wrap ${has ? "" : "italic text-muted-foreground"}`}
        dir={ltr && has ? "ltr" : "auto"}
      >
        {has ? value : notProvided(lang)}
      </div>
    </div>
  );
}

/** Renders a stored answer as readable localized plain text (never raw JSON). */
function formatAnswer(
  a: Bundle["answers"][number],
  lang: "ar" | "en",
): string {
  const text = a.answer_text?.trim();
  if (text) return text;
  const v = a.answer_json;
  const yes = lang === "ar" ? "نعم" : "Yes";
  const no = lang === "ar" ? "لا" : "No";
  const render = (x: unknown): string => {
    if (x === null || x === undefined || x === "") return "";
    if (typeof x === "boolean") return x ? yes : no;
    if (typeof x === "number") return String(x);
    if (typeof x === "string") return x;
    if (Array.isArray(x)) return x.map(render).filter(Boolean).join("، ");
    if (typeof x === "object") {
      return Object.entries(x as Record<string, unknown>)
        .map(([k, val]) => {
          const rv = render(val);
          return rv ? `${k}: ${rv}` : "";
        })
        .filter(Boolean)
        .join("\n");
    }
    return "";
  };
  return render(v);
}


function mapErr(err: unknown, lang: "ar" | "en") {
  const msg = err instanceof Error ? err.message : String(err);
  const AR = lang === "ar";
  if (msg.includes("reason_required")) return AR ? "السبب مطلوب لهذا التغيير" : "A reason is required for this change";
  if (msg.includes("application_withdrawn")) return AR ? "الطلب مسحوب" : "Application is withdrawn";
  if (msg.includes("admin_cannot_withdraw")) return AR ? "لا يمكن تعيين حالة مسحوب" : "Admins cannot set the withdrawn status";
  if (msg.includes("assignee_not_admin")) return AR ? "المستخدم المحدد ليس مسؤولًا" : "Selected user is not an admin";
  if (msg.includes("unauthorized")) return AR ? "غير مصرح" : "Unauthorized";
  return msg;
}

function ApplicationDetail() {
  const { id: opportunityId, appId } = Route.useParams();
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];

  const getFn = useServerFn(adminGetApplication);
  const setStatusFn = useServerFn(adminSetApplicationStatus);
  const addNoteFn = useServerFn(adminAddApplicationNote);
  const assignFn = useServerFn(adminAssignApplication);
  const listAdminsFn = useServerFn(adminListLmsAdmins);
  const cvFn = useServerFn(adminGetApplicationCvUrl);

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ kind: "notfound" | "error"; message: string } | null>(null);
  const [admins, setAdmins] = useState<Array<{ user_id: string; email: string | null }>>([]);

  const [nextStatus, setNextStatus] = useState<ApplicationStatus | "">("");
  const [reason, setReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [savingAssign, setSavingAssign] = useState(false);
  const [assignValue, setAssignValue] = useState<string>("__none__");

  const [openingCv, setOpeningCv] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getFn({
        data: { application_id: appId, opportunity_id: opportunityId },
      });
      setBundle(res);
      setAssignValue(res.application.assigned_admin ?? "__none__");
      setNextStatus("");
      setReason("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const notFound =
        msg.includes("application_not_found") || msg.includes("P0002");
      setBundle(null);
      setLoadError({
        kind: notFound ? "notfound" : "error",
        message: mapErr(err, lang),
      });
    } finally {
      setLoading(false);
    }
  }, [getFn, appId, opportunityId, lang]);


  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const list = await listAdminsFn();
        setAdmins(list);
      } catch {
        /* ignore */
      }
    })();
  }, [listAdminsFn]);

  const openCv = async () => {
    setOpeningCv(true);
    try {
      const { url } = await cvFn({ data: { application_id: appId } });
      if (!url) {
        toast.error(lang === "ar" ? "لا يوجد ملف" : "No file");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setOpeningCv(false);
    }
  };

  const changeStatus = async () => {
    if (!bundle || !nextStatus) return;
    const from = bundle.application.status;
    const needsReason =
      nextStatus === "rejected" || RANK[nextStatus] < RANK[from];
    if (needsReason && reason.trim().length === 0) {
      toast.error(lang === "ar" ? "السبب مطلوب" : "Reason is required");
      return;
    }
    setSavingStatus(true);
    try {
      await setStatusFn({
        data: {
          application_id: appId,
          to_status: nextStatus,
          reason: reason.trim() || undefined,
        },
      });
      toast.success(t.profileSaved);
      await load();
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setSavingStatus(false);
    }
  };

  const submitNote = async () => {
    const body = note.trim();
    if (!body) return;
    setSavingNote(true);
    try {
      await addNoteFn({ data: { application_id: appId, body } });
      setNote("");
      await load();
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setSavingNote(false);
    }
  };

  const saveAssignment = async () => {
    setSavingAssign(true);
    try {
      await assignFn({
        data: {
          application_id: appId,
          admin_user_id: assignValue === "__none__" ? null : assignValue,
        },
      });
      toast.success(t.profileSaved);
      await load();
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setSavingAssign(false);
    }
  };

  if (loading || !bundle) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline text-muted-foreground" />
      </div>
    );
  }

  const app = bundle.application;
  const from = app.status;
  const needsReason =
    !!nextStatus && (nextStatus === "rejected" || RANK[nextStatus] < RANK[from]);
  const readOnly = from === "withdrawn";
  const oppTitle = lang === "ar" ? bundle.opportunity.title_ar : bundle.opportunity.title_en || bundle.opportunity.title_ar;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6" dir={dir}>
      <div>
        <Link
          to="/learning-management-system/admin/internships/$id/applications"
          params={{ id: opportunityId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {lang === "ar" ? "العودة إلى الطلبات" : "Back to applications"}
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground" dir="auto">{oppTitle}</div>
            <h1 className="text-2xl font-bold mt-1" dir="auto">
              {app.snapshot_full_name || (lang === "ar" ? "بدون اسم" : "No name")}
            </h1>
            <div className="text-sm text-muted-foreground mt-1" dir="ltr">
              {app.snapshot_email} {app.snapshot_phone ? `• ${app.snapshot_phone}` : ""}
            </div>
            {app.snapshot_organization && (
              <div className="text-sm mt-1" dir="auto">{app.snapshot_organization}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-sm">{statusLabel(app.status, lang)}</Badge>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {lang === "ar" ? "أُرسل: " : "Submitted: "}
              {new Date(app.submitted_at).toLocaleString(lang)}
            </div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {lang === "ar" ? "المحاولة #" : "Attempt #"}{app.attempt_number}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {app.snapshot_biography && (
            <Card className="p-5">
              <h2 className="font-semibold mb-2">{t.profileBiography}</h2>
              <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
                {app.snapshot_biography}
              </p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t.profileCv}
              </h2>
              {bundle.cv && (
                <Button size="sm" variant="outline" onClick={openCv} disabled={openingCv}>
                  {openingCv ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <FileText className="h-4 w-4 mx-1" />}
                  {t.profileViewCv}
                </Button>
              )}
            </div>
            {bundle.cv ? (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {bundle.cv.original_filename ?? bundle.cv.id} · {Math.round(bundle.cv.size_bytes / 1024)} KB
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا يوجد سيرة ذاتية مرفقة" : "No CV attached"}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> {t.applyCoursesSection}
            </h2>
            {bundle.courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا توجد دورات" : "No courses"}
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {bundle.courses.map((c) => (
                  <li key={c.id} className="py-2 flex flex-wrap justify-between gap-2">
                    <span dir="auto">
                      {(lang === "ar" ? c.course_title_ar : c.course_title_en) || c.course_title_ar || c.course_title_en || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.completed ? (lang === "ar" ? "مكتملة" : "Completed") : `${Math.round(Number(c.progress_percent ?? 0))}%`}
                      {c.attendance_total ? ` · ${c.attendance_present ?? 0}/${c.attendance_total}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" /> {t.applyCertificatesSection}
            </h2>
            {bundle.certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا توجد شهادات" : "No certificates"}
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {bundle.certificates.map((c) => (
                  <li key={c.id} className="py-2 flex flex-wrap justify-between gap-2">
                    <span dir="auto">
                      {(lang === "ar" ? c.course_title_ar : c.course_title_en) || c.course_title_ar || c.course_title_en || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {c.serial ?? ""} {c.issued_at ? ` · ${new Date(c.issued_at).toLocaleDateString(lang)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {bundle.answers.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">{t.applyQuestionsSection}</h2>
              <div className="space-y-4">
                {bundle.answers.map((a) => {
                  const label = (lang === "ar" ? a.question_label_ar : a.question_label_en) || a.question_label_ar || a.question_label_en || "";
                  const value =
                    a.answer_text ??
                    (a.answer_json != null ? JSON.stringify(a.answer_json) : "");
                  return (
                    <div key={a.id}>
                      <div className="text-xs text-muted-foreground mb-1" dir="auto">{label}</div>
                      <div className="text-sm whitespace-pre-wrap break-words" dir="auto">{value || "—"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> {lang === "ar" ? "الملاحظات" : "Notes"}
            </h2>
            <div className="space-y-3 mb-4">
              {bundle.notes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? "لا توجد ملاحظات بعد" : "No notes yet"}
                </p>
              )}
              {bundle.notes.map((n) => (
                <div key={n.id} className="rounded-md border border-border p-3 bg-muted/40">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span dir="ltr">{n.author_email ?? ""}</span>
                    <span dir="ltr">{new Date(n.created_at).toLocaleString(lang)}</span>
                  </div>
                  <p className="text-sm mt-2 whitespace-pre-wrap break-words" dir="auto">{n.body}</p>
                </div>
              ))}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.adminApplicationsAddNote}
              rows={3}
              maxLength={20000}
              dir="auto"
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={submitNote} disabled={savingNote || note.trim().length === 0}>
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <MessageSquare className="h-4 w-4 mx-1" />}
                {t.adminApplicationsAddNote}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <UserCog className="h-4 w-4" /> {t.adminApplicationsAssignAdmin}
            </h2>
            <Select value={assignValue} onValueChange={setAssignValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{lang === "ar" ? "بلا إسناد" : "Unassigned"}</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>{a.email ?? a.user_id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={saveAssignment} disabled={savingAssign}>
                {savingAssign ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
                {lang === "ar" ? "حفظ" : "Save"}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">{t.adminApplicationsChangeStatus}</h2>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "الطلب مسحوب — لا يمكن تعديل الحالة" : "Application is withdrawn — status is locked"}
              </p>
            ) : (
              <>
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ApplicationStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder={lang === "ar" ? "اختر حالة" : "Select status"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ASSIGNABLE_STATUSES.filter((s) => s !== from).map((s) => (
                      <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsReason && (
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t.adminApplicationsChangeReason}
                    </label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t.adminApplicationsChangeReason}
                      dir="auto"
                    />
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={changeStatus} disabled={!nextStatus || savingStatus}>
                    {savingStatus ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
                    {lang === "ar" ? "تطبيق" : "Apply"}
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" /> {t.adminApplicationsStatusHistory}
            </h2>
            {bundle.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا يوجد سجل" : "No history"}
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {bundle.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-primary/40 pl-3 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-3">
                    <div className="flex items-center gap-2">
                      {h.from_status && (
                        <>
                          <Badge variant="outline" className="text-xs">{statusLabel(h.from_status, lang)}</Badge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge variant="outline" className="text-xs">{statusLabel(h.to_status, lang)}</Badge>
                    </div>
                    {h.reason && <p className="mt-1 text-muted-foreground text-xs" dir="auto">{h.reason}</p>}
                    <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                      {h.changed_by_email ?? ""} · {new Date(h.created_at).toLocaleString(lang)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
