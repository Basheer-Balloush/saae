import { useMemo, useState } from "react";
import { ChevronDown, Download, FileText, MessageSquareText, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  fmtDate,
  fmtNum,
  Panel,
  Pill,
  Seg,
  StatTile,
  useT,
} from "@/components/console/ui";
import type { CourseFeedbackAdmin } from "@/lib/course-feedback-admin.functions";
import {
  feedbackCsv,
  responseLines,
  summarizeFeedback,
  type QuestionSummary,
} from "@/lib/course-feedback-report";

/* What learners answered in a course's feedback: totals per question, each
   response in full, and a CSV. Admins only; names are shown. */
export function FeedbackResults({
  data,
  fileName,
}: {
  data: CourseFeedbackAdmin;
  fileName: string;
}) {
  const { t, lang } = useT();
  const [view, setView] = useState<"summary" | "responses">("summary");
  const summary = useMemo(
    () => summarizeFeedback(data.form.definition, data.responses, data.versions),
    [data],
  );
  const nameOf = (id: string) => data.names[id] || t("الاسم غير متوفر", "Name unavailable");

  const download = () => {
    const csv = feedbackCsv(summary, data.responses, data.versions, data.names, lang);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const sent = data.responses.length;
  return (
    <Panel
      title={t("إجابات المتعلّمين", "Learner responses")}
      description={t(
        "يرى المشرفون وحدهم هذه الإجابات مع الأسماء. لا يراها المدرّبون.",
        "Only admins see these responses and names. Instructors do not.",
      )}
      actions={
        sent ? (
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" />
            {t("تنزيل CSV", "Download CSV")}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          icon={MessageSquareText}
          label={t("أرسلوا التقييم", "Sent their feedback")}
          value={fmtNum(sent, lang)}
          tone="green"
        />
        <StatTile
          icon={PencilLine}
          label={t("بدؤوا ولم يرسلوا", "Started, not sent")}
          value={fmtNum(data.drafts, lang)}
          tone="gray"
        />
      </div>

      {sent === 0 ? (
        <EmptyState
          compact
          icon={FileText}
          title={t("لا إجابات بعد", "No responses yet")}
          text={t(
            "تظهر الإجابات هنا حين يرسل المتعلّمون التقييم بعد إنهاء الدروس والاختبار.",
            "Responses show here once learners send their feedback after the lessons and the quiz.",
          )}
        />
      ) : (
        <>
          <div className="mt-5 mb-4">
            <Seg
              value={view}
              onChange={setView}
              options={[
                { value: "summary", label: t("الملخّص", "Summary") },
                { value: "responses", label: t("كل إجابة", "Each response"), count: sent },
              ]}
            />
          </div>
          {view === "summary" ? (
            <ol className="space-y-3">
              {summary.map((q, i) => (
                <QuestionCard key={q.id} q={q} n={i + 1} nameOf={nameOf} />
              ))}
            </ol>
          ) : (
            <ol className="space-y-2">
              {data.responses.map((r) => (
                <ResponseRow
                  key={r.id}
                  name={nameOf(r.studentId)}
                  date={fmtDate(r.submittedAt, lang, true)}
                  lang={r.lang}
                  lines={responseLines(r, data.versions, lang)}
                />
              ))}
            </ol>
          )}
        </>
      )}
    </Panel>
  );
}

const TEXTS_SHOWN = 5;

/** 67 → "67%", or "٦٧٪" in Arabic, matching fmtNum's digits. */
const percent = (share: number, lang: "ar" | "en") =>
  (share / 100).toLocaleString(lang === "ar" ? "ar-SY" : "en-US", { style: "percent" });

function QuestionCard({
  q,
  n,
  nameOf,
}: {
  q: QuestionSummary;
  n: number;
  nameOf: (id: string) => string;
}) {
  const { t, lang } = useT();
  const [allTexts, setAllTexts] = useState(false);
  const texts = allTexts ? q.texts : q.texts.slice(0, TEXTS_SHOWN);
  const pct = (count: number) => (q.answered ? Math.round((count / q.answered) * 100) : 0);
  return (
    <li className="rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-field)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1 text-[14px] font-bold">
          <span className="me-2 tabular-nums text-[var(--cx-muted)]">{n}</span>
          {q[lang] || q.ar}
        </h4>
        {!q.current && <Pill tone="gray">{t("لم يعد يُسأل", "No longer asked")}</Pill>}
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--cx-muted)]">
        {t(
          `أجاب ${fmtNum(q.answered, lang)} من ${fmtNum(q.asked, lang)}`,
          `${fmtNum(q.answered, lang)} of ${fmtNum(q.asked, lang)} answered`,
        )}
      </p>

      {q.kind === "choice" && (
        <ul className="mt-3 space-y-2">
          {q.choices.map((c) => {
            const share = pct(c.count);
            const label = c[lang] || c.ar;
            return (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_5.5rem]"
                title={`${label}: ${fmtNum(c.count, lang)} (${share}%)`}
              >
                <span className="truncate text-[13px] text-[var(--cx-ink-2)]">{label}</span>
                <span className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-[var(--cx-track)] sm:order-none sm:col-span-1">
                  <span
                    className="block h-full rounded-full bg-[var(--cx-teal)]"
                    style={{ inlineSize: `${share}%` }}
                  />
                </span>
                <span className="flex items-baseline justify-end gap-2 tabular-nums">
                  <span className="text-[13px] font-bold text-[var(--cx-ink)]">
                    {fmtNum(c.count, lang)}
                  </span>
                  <span className="min-w-[3ch] text-[12px] font-semibold text-[var(--cx-muted)]">
                    {percent(share, lang)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {q.texts.length > 0 && (
        <div className="mt-3 space-y-2">
          {q.kind === "choice" && (
            <div className="text-[12.5px] font-bold text-[var(--cx-muted)]">
              {t("تفاصيل «أمر آخر»", "“Other” details")}
            </div>
          )}
          <ul className="space-y-2">
            {texts.map((x) => (
              <li
                key={x.responseId}
                className="rounded-lg bg-[var(--cx-raise)] px-3 py-2 text-[13.5px] leading-relaxed"
              >
                <p className="whitespace-pre-wrap break-words" dir="auto">
                  {x.text}
                </p>
                <p className="mt-1 text-[12px] text-[var(--cx-muted)]">{nameOf(x.studentId)}</p>
              </li>
            ))}
          </ul>
          {q.texts.length > TEXTS_SHOWN && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setAllTexts((v) => !v)}>
              {allTexts
                ? t("عرض أقل", "Show fewer")
                : t(
                    `عرض الكل (${fmtNum(q.texts.length, lang)})`,
                    `Show all (${fmtNum(q.texts.length, lang)})`,
                  )}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function ResponseRow({
  name,
  date,
  lang,
  lines,
}: {
  name: string;
  date: string;
  lang: "ar" | "en";
  lines: { question: string; answer: string | null }[];
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-field)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start"
      >
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{name}</span>
        <span className="text-[12.5px] text-[var(--cx-muted)]">{date}</span>
        <Pill tone="gray">{lang === "ar" ? "العربية" : "English"}</Pill>
        <ChevronDown
          className={`h-4 w-4 text-[var(--cx-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <dl className="space-y-3 border-t border-[var(--cx-line-2)] px-4 py-3">
          {lines.map((l, i) => (
            <div key={i}>
              <dt className="text-[12.5px] font-bold text-[var(--cx-muted)]">
                {i + 1}. {l.question}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-[14px]" dir="auto">
                {l.answer ?? (
                  <span className="text-[var(--cx-muted)]">{t("لا إجابة", "No answer")}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
