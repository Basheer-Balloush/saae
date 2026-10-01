/* Course feedback results for admins: totals per question across every
   version of a course's form, and a CSV of the responses. Pure, so it can be
   tested without a database.

   A question is matched across versions by its id, and so is a choice. Its
   wording comes from the newest version that has it, so renaming a question
   keeps its totals together; a removed question stays in the results, marked
   as no longer asked. */

import {
  allQuestions,
  otherKey,
  OTHER_ID,
  type FormDefinition,
  type Lang,
  type Question,
  type Text,
} from "@/features/lms/course-feedback/lib/survey";

export type ReportResponse = {
  id: string;
  studentId: string;
  formId: string;
  formVersion: number;
  lang: Lang;
  submittedAt: string;
  answers: Record<string, string>;
  notes: Record<string, string>;
};

/** Every version the responses point to, keyed by versionKey(). */
export type VersionMap = Record<string, FormDefinition>;
export const versionKey = (formId: string, version: number) => `${formId}:${version}`;

export type ChoiceTotal = Text & { id: string; count: number };
export type WrittenAnswer = { responseId: string; studentId: string; text: string };

export type QuestionSummary = Text & {
  id: string;
  kind: Question["kind"];
  /** False when the current form no longer asks it. */
  current: boolean;
  /** Responses that answered it. */
  answered: number;
  /** Responses whose form asked it. */
  asked: number;
  choices: ChoiceTotal[];
  /** Written answers, and "other" details for a choice question. */
  texts: WrittenAnswer[];
};

type Source = { question: Question; order: number; current: boolean };

/** The wording and order to report each question with: the current form's
    first, then questions only older versions asked, newest first. */
function questionSources(current: FormDefinition, older: FormDefinition[]): Map<string, Source> {
  const sources = new Map<string, Source>();
  allQuestions(current).forEach((question, order) =>
    sources.set(question.id, { question, order, current: true }),
  );
  let order = sources.size;
  for (const form of older) {
    for (const question of allQuestions(form)) {
      if (!sources.has(question.id))
        sources.set(question.id, { question, order: order++, current: false });
    }
  }
  return sources;
}

export function summarizeFeedback(
  current: FormDefinition,
  responses: ReportResponse[],
  versions: VersionMap,
): QuestionSummary[] {
  // Newest versions first, so their wording wins.
  const byNewest = [...responses].sort((a, b) => b.formVersion - a.formVersion);
  const older = byNewest
    .map((r) => versions[versionKey(r.formId, r.formVersion)])
    .filter((f): f is FormDefinition => !!f);
  const sources = questionSources(current, older);

  const summaries = new Map<string, QuestionSummary>();
  for (const [id, { question, current: isCurrent }] of sources) {
    summaries.set(id, {
      id,
      kind: question.kind,
      ar: question.ar,
      en: question.en,
      current: isCurrent,
      answered: 0,
      asked: 0,
      choices: question.kind === "choice" ? question.choices.map((c) => ({ ...c, count: 0 })) : [],
      texts: [],
    });
  }

  for (const r of byNewest) {
    const form = versions[versionKey(r.formId, r.formVersion)];
    if (!form) continue;
    for (const q of allQuestions(form)) {
      const s = summaries.get(q.id);
      if (!s || s.kind !== q.kind) continue;
      s.asked++;
      if (q.kind === "text") {
        const text = r.notes[q.id];
        if (text) {
          s.answered++;
          s.texts.push({ responseId: r.id, studentId: r.studentId, text });
        }
        continue;
      }
      const picked = r.answers[q.id];
      if (!picked) continue;
      s.answered++;
      let total = s.choices.find((c) => c.id === picked);
      if (!total) {
        // A choice the current wording no longer has: report it under the
        // wording this response saw.
        const seen = q.choices.find((c) => c.id === picked);
        total = { id: picked, ar: seen?.ar ?? picked, en: seen?.en ?? picked, count: 0 };
        s.choices.push(total);
      }
      total.count++;
      const other = picked === OTHER_ID ? r.notes[otherKey(q.id)] : undefined;
      if (other) s.texts.push({ responseId: r.id, studentId: r.studentId, text: other });
    }
  }

  return [...summaries.values()].sort(
    (a, b) => (sources.get(a.id)?.order ?? 0) - (sources.get(b.id)?.order ?? 0),
  );
}

/** One response's answers as the learner saw them: question and answer
    wording from the version they answered. */
export function responseLines(
  r: ReportResponse,
  versions: VersionMap,
  lang: Lang,
): { question: string; answer: string | null }[] {
  const form = versions[versionKey(r.formId, r.formVersion)];
  if (!form) return [];
  return allQuestions(form).map((q) => {
    if (q.kind === "text") return { question: q[lang] || q.ar, answer: r.notes[q.id] ?? null };
    const picked = q.choices.find((c) => c.id === r.answers[q.id]);
    if (!picked) return { question: q[lang] || q.ar, answer: null };
    const other = picked.id === OTHER_ID ? r.notes[otherKey(q.id)] : undefined;
    const label = picked[lang] || picked.ar;
    return { question: q[lang] || q.ar, answer: other ? `${label}: ${other}` : label };
  });
}

/** A spreadsheet cell: quoted, and never read as a formula. */
function cell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Every response as CSV, one row each, one column per question (current
    form first). Starts with a byte-order mark so Excel reads Arabic. */
export function feedbackCsv(
  summary: QuestionSummary[],
  responses: ReportResponse[],
  versions: VersionMap,
  names: Record<string, string | null>,
  lang: Lang,
): string {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const header = [
    t("الاسم", "Name"),
    t("تاريخ الإرسال", "Submitted"),
    t("اللغة", "Language"),
    t("نسخة النموذج", "Form version"),
    ...summary.map((q) => q[lang] || q.ar),
  ];
  const rows = responses.map((r) => {
    const form = versions[versionKey(r.formId, r.formVersion)];
    const asked = new Map(form ? allQuestions(form).map((q) => [q.id, q]) : []);
    const answers = summary.map((s) => {
      const q = asked.get(s.id);
      if (!q) return "";
      if (q.kind === "text") return r.notes[q.id] ?? "";
      const picked = q.choices.find((c) => c.id === r.answers[q.id]);
      if (!picked) return "";
      const other = picked.id === OTHER_ID ? r.notes[otherKey(q.id)] : undefined;
      const label = picked[lang] || picked.ar;
      return other ? `${label}: ${other}` : label;
    });
    return [names[r.studentId] ?? "", r.submittedAt, r.lang, r.formVersion, ...answers];
  });
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
