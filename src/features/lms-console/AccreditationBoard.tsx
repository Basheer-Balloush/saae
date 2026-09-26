import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import TrainerScoringPanel from "@/components/lms/TrainerScoringPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import {
  EmptyState,
  Loading,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  useT,
} from "@/components/console/ui";

type App = {
  id: string;
  user_id: string;
  status: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string;
  date_of_birth: string;
  city: string;
  experience_level: string;
  specializations: string[];
  bio: string;
  linkedin_url: string;
  github_url: string | null;
  has_prev_training: boolean;
  prev_training_details: string | null;
  consent_ethics: boolean;
  consent_data: boolean;
  consent_process: boolean;
  submitted_at: string;
  decision_at: string | null;
};
type AppFile = {
  id: string;
  kind: "cv" | "work_sample" | "avatar";
  storage_path: string;
  original_name: string;
};
type AuditRow = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
};

/* The accreditation journey, in order. */
const STAGES = [
  "pending_review",
  "eligibility_check",
  "phase_1_theory",
  "phase_2_practical",
  "phase_3_training",
  "phase_4_interview",
  "scoring",
  "approved",
] as const;

const STATUS: Record<
  string,
  { ar: string; en: string; tone: "orange" | "teal" | "green" | "red" | "gray" }
> = {
  pending_review: { ar: "بانتظار المراجعة", en: "Waiting for review", tone: "orange" },
  incomplete: { ar: "ناقص", en: "Incomplete", tone: "gray" },
  eligibility_check: { ar: "فحص الأهلية", en: "Eligibility check", tone: "teal" },
  phase_1_theory: { ar: "المرحلة 1: نظري", en: "Phase 1: theory", tone: "teal" },
  phase_2_practical: { ar: "المرحلة 2: عملي", en: "Phase 2: practical", tone: "teal" },
  phase_3_training: { ar: "المرحلة 3: تدريب", en: "Phase 3: training", tone: "teal" },
  phase_4_interview: { ar: "المرحلة 4: مقابلة", en: "Phase 4: interview", tone: "teal" },
  scoring: { ar: "التقييم النهائي", en: "Final scoring", tone: "teal" },
  approved: { ar: "معتمد", en: "Approved", tone: "green" },
  rejected: { ar: "مرفوض", en: "Rejected", tone: "red" },
};
type Group = "waiting" | "progress" | "approved" | "rejected" | "all";
const groupOf = (s: string): Group =>
  s === "pending_review"
    ? "waiting"
    : s === "approved"
      ? "approved"
      : s === "rejected"
        ? "rejected"
        : "progress";

export function AccreditationStatusPill({ status }: { status: string }) {
  const { ar } = useT();
  const s = STATUS[status] ?? { ar: status, en: status, tone: "gray" as const };
  return <Pill tone={s.tone}>{ar ? s.ar : s.en}</Pill>;
}

/* Trainer accreditation: who applied, where each person is in the four
   phases, and the decision. Stage changes only offer the stages the database
   allows next. */
export function AccreditationBoard() {
  const { t, ar, lang } = useT();
  const [rows, setRows] = useState<App[] | null>(null);
  const [group, setGroup] = useState<Group>("waiting");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("trainer_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) toast.error(toUserMessage(error));
    setRows((data as App[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = { waiting: 0, progress: 0, approved: 0, rejected: 0, all: 0 };
    for (const r of rows ?? []) {
      c[groupOf(r.status)]++;
      c.all++;
    }
    return c;
  }, [rows]);

  const shown = (rows ?? []).filter((r) => {
    if (group !== "all" && groupOf(r.status) !== group) return false;
    const n = q.trim().toLowerCase();
    return (
      !n || `${r.full_name_ar} ${r.full_name_en} ${r.email} ${r.city}`.toLowerCase().includes(n)
    );
  });
  const name = (r: App) =>
    ar ? r.full_name_ar || r.full_name_en : r.full_name_en || r.full_name_ar;
  const open = rows?.find((r) => r.id === openId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={group}
          onChange={setGroup}
          options={[
            { value: "waiting", label: t("بانتظار المراجعة", "Waiting"), count: counts.waiting },
            { value: "progress", label: t("قيد المراحل", "In progress"), count: counts.progress },
            { value: "approved", label: t("معتمدون", "Approved"), count: counts.approved },
            { value: "rejected", label: t("مرفوضون", "Rejected"), count: counts.rejected },
            { value: "all", label: t("الكل", "All"), count: counts.all },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو البريد أو المدينة", "Search name, email or city")}
        />
      </div>
      <Panel flush>
        {rows === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState
            compact
            icon={ShieldCheck}
            title={t("لا توجد طلبات هنا", "No applications here")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table min-w-[680px]">
              <thead>
                <tr>
                  <th>{t("المتقدّم", "Applicant")}</th>
                  <th>{t("المدينة", "City")}</th>
                  <th>{t("المرحلة", "Stage")}</th>
                  <th>{t("تاريخ التقديم", "Submitted")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} data-link="true" onClick={() => setOpenId(r.id)}>
                    <td>
                      <div className="font-bold">{name(r)}</div>
                      <div className="text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
                        {r.email}
                      </div>
                    </td>
                    <td className="text-[13.5px]">{r.city}</td>
                    <td>
                      <AccreditationStatusPill status={r.status} />
                    </td>
                    <td className="text-[13px] text-[var(--cx-muted)]">
                      {fmtDate(r.submitted_at, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-2xl"
          dir={ar ? "rtl" : "ltr"}
        >
          {open && (
            <ApplicationDetail
              key={open.id}
              app={open}
              onChanged={() => {
                load();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ApplicationDetail({ app, onChanged }: { app: App; onChanged: () => void }) {
  const { t, ar, lang } = useT();
  const qc = useQueryClient();
  const [files, setFiles] = useState<AppFile[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [next, setNext] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    const [{ data: f }, { data: a }, { data: allowed }] = await Promise.all([
      supabase.from("trainer_application_files").select("*").eq("application_id", app.id),
      supabase
        .from("trainer_application_audit")
        .select("*")
        .eq("application_id", app.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("trainer_app_allowed_next", { _from: app.status as never }),
    ]);
    setFiles((f as AppFile[]) ?? []);
    setAudit((a as AuditRow[]) ?? []);
    // "Approved" is reached only through "Approve & activate" in the scoring
    // panel: a bare move to approved would not give the instructor role.
    setNext(
      ((allowed as string[] | null) ?? []).filter((s) => s !== app.status && s !== "approved"),
    );
    setTarget("");
  }, [app.id, app.status]);
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("trainer-applications")
      .createSignedUrl(path, 60 * 10);
    if (error || !data) {
      toast.error(toUserMessage(error));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const move = async () => {
    if (!target) return;
    setSaving(true);
    const { error } = await supabase.rpc("trainer_app_transition", {
      _application_id: app.id,
      _to_status: target as never,
      _note: note.trim() || undefined,
    });
    setSaving(false);
    if (error) {
      const m = error.message ?? "";
      toast.error(
        m.includes("scoring_incomplete")
          ? t(
              "التقييم غير مكتمل: يلزم العدد الأدنى من المُقيّمين وكلٌّ قيّم كل المعايير.",
              "Scoring isn't complete: the minimum number of evaluators must each score every criterion.",
            )
          : m.includes("score_below_threshold")
            ? t("الدرجة أقل من حدّ النجاح.", "The score is below the pass mark.")
            : m.includes("invalid_transition")
              ? t(
                  "لا يمكن الانتقال إلى هذه المرحلة من المرحلة الحالية.",
                  "That stage can't be reached from the current one.",
                )
              : toUserMessage(error),
      );
      return;
    }
    toast.success(t("تم نقل الطلب إلى المرحلة الجديدة", "Moved to the new stage"));
    setNote("");
    qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
    onChanged();
  };

  const label = (s: string) => (STATUS[s] ? (ar ? STATUS[s].ar : STATUS[s].en) : s);
  const stageIndex = STAGES.indexOf(app.status as (typeof STAGES)[number]);
  const fileKind = (k: string) =>
    k === "cv"
      ? t("السيرة الذاتية", "CV")
      : k === "work_sample"
        ? t("نموذج عمل", "Work sample")
        : t("صورة", "Photo");

  return (
    <div className="space-y-5 pb-10">
      <SheetHeader className="text-start">
        <SheetTitle>
          {ar ? app.full_name_ar || app.full_name_en : app.full_name_en || app.full_name_ar}
        </SheetTitle>
        <SheetDescription>
          {t("قدّم في", "Applied")} {fmtDate(app.submitted_at, lang)} ·{" "}
          <AccreditationStatusPill status={app.status} />
        </SheetDescription>
      </SheetHeader>

      {/* Where the applicant is in the journey */}
      <ol className="flex flex-wrap gap-1.5">
        {STAGES.map((s, i) => {
          const done = stageIndex >= 0 && i < stageIndex;
          const now = s === app.status;
          return (
            <li
              key={s}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
                now
                  ? "bg-[var(--cx-petrol)] text-white"
                  : done
                    ? "bg-[var(--cx-green-50)] text-[var(--cx-green)]"
                    : "bg-[var(--cx-raise-2)] text-[var(--cx-muted)]"
              }`}
            >
              {done && <Check className="h-3 w-3" />}
              {label(s)}
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-2 text-[14px] font-extrabold">
          {t("نقل إلى مرحلة", "Move to a stage")}
        </div>
        {next.length === 0 ? (
          <p className="text-[13px] text-[var(--cx-muted)]">
            {t("لا توجد مراحل تالية لهذه الحالة.", "There is no next stage from here.")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {next.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTarget(s)}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] font-bold ${
                    target === s
                      ? s === "rejected"
                        ? "border-[var(--cx-red)] bg-[var(--cx-red-50)] text-[var(--cx-red)]"
                        : "border-[var(--cx-teal)] bg-[var(--cx-teal-50)] text-[var(--cx-teal-700)]"
                      : "border-[var(--cx-line)] bg-[var(--cx-field)]"
                  }`}
                >
                  {label(s)}
                </button>
              ))}
            </div>
            {target && (
              <div className="mt-3 space-y-2">
                <Textarea
                  rows={2}
                  placeholder={t(
                    "ملاحظة (اختياري) تُحفظ في السجل",
                    "Note (optional), kept in the history",
                  )}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  onClick={move}
                  disabled={saving}
                  variant={target === "rejected" ? "destructive" : "default"}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t(`نقل إلى: ${label(target)}`, `Move to: ${label(target)}`)}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-3 text-[14px] font-extrabold">{t("البيانات", "Details")}</div>
        <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
          <Row k={t("الاسم بالعربية", "Name in Arabic")} v={app.full_name_ar} />
          <Row k={t("الاسم بالإنجليزية", "Name in English")} v={app.full_name_en} />
          <Row k={t("البريد", "Email")} v={app.email} ltr />
          <Row k={t("الهاتف", "Phone")} v={app.phone} ltr />
          <Row k={t("تاريخ الميلاد", "Date of birth")} v={app.date_of_birth} />
          <Row k={t("المدينة", "City")} v={app.city} />
          <Row k={t("الخبرة", "Experience")} v={app.experience_level} />
          <Row k={t("المجالات", "Specializations")} v={app.specializations?.join("، ")} />
          <Row k="LinkedIn" v={app.linkedin_url} ltr link />
          {app.github_url && <Row k="GitHub / Portfolio" v={app.github_url} ltr link />}
          <Row
            k={t("خبرة تدريبية سابقة", "Previous training")}
            v={app.has_prev_training ? t("نعم", "Yes") : t("لا", "No")}
          />
        </dl>
        <div className="mt-3 text-[12px] font-bold text-[var(--cx-muted)]">
          {t("النبذة", "Bio")}
        </div>
        <p
          className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--cx-raise)] p-3 text-[13.5px]"
          dir="auto"
        >
          {app.bio}
        </p>
        {app.prev_training_details && (
          <>
            <div className="mt-3 text-[12px] font-bold text-[var(--cx-muted)]">
              {t("تفاصيل الخبرة التدريبية", "Training experience")}
            </div>
            <p
              className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--cx-raise)] p-3 text-[13.5px]"
              dir="auto"
            >
              {app.prev_training_details}
            </p>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          <Pill tone={app.consent_ethics ? "green" : "gray"}>
            {t("أخلاقيات الجمعية", "Ethics policy")}
          </Pill>
          <Pill tone={app.consent_data ? "green" : "gray"}>
            {t("معالجة البيانات", "Data processing")}
          </Pill>
          <Pill tone={app.consent_process ? "green" : "gray"}>
            {t("شروط نظام المعادلة", "Accreditation terms")}
          </Pill>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-2 text-[14px] font-extrabold">{t("الملفات", "Files")}</div>
        {files.length === 0 ? (
          <p className="text-[13px] text-[var(--cx-muted)]">{t("لا توجد ملفات.", "No files.")}</p>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => openFile(f.storage_path)}
                  className="flex w-full items-center gap-2 rounded-lg border border-[var(--cx-line)] px-3 py-2 text-start text-[13.5px] hover:border-[var(--cx-teal)]"
                >
                  <FileText className="h-4 w-4 text-[var(--cx-teal)]" />
                  <span className="font-bold">{fileKind(f.kind)}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--cx-muted)]">
                    {f.original_name}
                  </span>
                  <ExternalLink className="h-4 w-4 text-[var(--cx-muted)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrainerScoringPanel
        applicationId={app.id}
        applicantId={app.user_id}
        status={app.status}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
          onChanged();
        }}
      />

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-2 text-[14px] font-extrabold">{t("السجل", "History")}</div>
        {audit.length === 0 ? (
          <p className="text-[13px] text-[var(--cx-muted)]">—</p>
        ) : (
          <ol className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="border-s-2 border-[var(--cx-teal-100)] ps-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {a.from_status ? label(a.from_status) : "—"} {ar ? "←" : "→"}{" "}
                    <b>{a.to_status ? label(a.to_status) : "—"}</b>
                  </span>
                  <span className="text-[12px] text-[var(--cx-muted)]">
                    {fmtDate(a.created_at, lang, true)}
                  </span>
                </div>
                {a.note && <p className="mt-0.5 text-[var(--cx-muted)]">{a.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Row({
  k,
  v,
  ltr,
  link,
}: {
  k: string;
  v: string | null | undefined;
  ltr?: boolean;
  link?: boolean;
}) {
  return (
    <div>
      <dt className="text-[12px] text-[var(--cx-muted)]">{k}</dt>
      <dd className="break-words font-semibold" dir={ltr ? "ltr" : undefined}>
        {link && v ? (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--cx-teal)] hover:underline"
          >
            {v}
          </a>
        ) : (
          v || "—"
        )}
      </dd>
    </div>
  );
}
