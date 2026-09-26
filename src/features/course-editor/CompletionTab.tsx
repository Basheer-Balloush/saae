import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, BarChart3, ClipboardCheck, FileText, Info, Loader2 } from "lucide-react";
import { toUserMessage } from "@/lib/safe-error";
import { previewCourseCertificate } from "@/lib/certificates/certificate-pdf.functions";
import { Button } from "@/components/ui/button";
import { Panel, ToggleRow } from "@/components/console/ui";
import type { EditorCtx } from "./types";

export function CompletionTab({
  ctx,
  onOpenGrading,
}: {
  ctx: EditorCtx;
  onOpenGrading: () => void;
}) {
  const { course, update, t, isAdmin } = ctx;
  const onsite = course.delivery_mode === "onsite";
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--cx-teal-100)] bg-[var(--cx-teal-50)] px-5 py-4 text-[14px] text-[var(--cx-teal-700)]">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {onsite
            ? t(
                "دورة حضورية: يكتمل الطالب بحضور الجلسات، وتصدر شهادته تلقائياً ويصله بريد بها.",
                "In-person course: a student completes it by attending the sessions; the certificate is issued automatically and emailed.",
              )
            : t(
                "دورة أونلاين: يكتمل الطالب بإنهاء الدروس والاختبار، وتصدر شهادته تلقائياً.",
                "Online course: a student completes it by finishing the lessons and the quiz; the certificate is issued automatically.",
              )}
        </p>
      </div>

      {/* Admins only while the PDF certificate is being tested; instructors get it once it is signed off. */}
      {isAdmin && (
        <CertificateSettings
          ctx={ctx}
          enabled={course.certificate_pdf_enabled}
          datesReady={Boolean(course.start_date && course.end_date)}
          onToggle={(v) => update({ certificate_pdf_enabled: v })}
        />
      )}

      <button
        type="button"
        onClick={onOpenGrading}
        className="cx-card flex w-full items-start gap-3 p-5 text-start transition-colors hover:border-[var(--cx-teal-100)]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[15px] font-extrabold">
            {t("التصحيح والنتائج", "Grading")}
          </span>
          <span className="text-[13px] text-[var(--cx-muted)]">
            {t(
              "الواجبات وتسليمات الطلاب ونتائج الاختبارات في مكان واحد.",
              "Assignments, student hand-ins and quiz results in one place.",
            )}
          </span>
        </span>
      </button>
    </div>
  );
}

/* The PDF certificate for this course: preview it, then switch it on for students. */
function CertificateSettings({
  ctx,
  enabled,
  datesReady,
  onToggle,
}: {
  ctx: EditorCtx;
  enabled: boolean;
  datesReady: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { course, t } = ctx;
  const preview = useServerFn(previewCourseCertificate);
  const [busy, setBusy] = useState<"male" | "female" | null>(null);

  const download = async (gender: "male" | "female") => {
    setBusy(gender);
    /* Browsers (Safari above all) only let a page open a tab during the click
       itself, and the PDF takes seconds; so the tab opens now, waiting, and
       gets the PDF when it is ready. If no tab could open, it downloads. */
    const tab = window.open("", "_blank");
    tab?.document.write(
      `<p style="font-family:sans-serif;padding:24px">${t("جارٍ تجهيز نموذج الشهادة…", "Preparing the certificate preview…")}</p>`,
    );
    const fail = (message: string) => {
      tab?.close();
      toast.error(message, { duration: 20_000 });
    };
    try {
      const res = await preview({ data: { courseId: course.id, gender } });
      if (res.status === "course_dates_missing") {
        fail(
          t("أضف تاريخ بداية الدورة ونهايتها أولاً.", "Add the course start and end dates first."),
        );
        return;
      }
      if (res.status === "error") {
        fail(`${t("تعذّر إنشاء الشهادة", "Certificate failed")}: ${res.message}`);
        return;
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-preview-${gender}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (e) {
      fail(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--cx-green)]" />
          {t("الشهادة (PDF)", "Certificate (PDF)")}
        </span>
      }
      description={t(
        "جرّب نموذج الشهادة لهذه الدورة، ثم فعّلها ليحمّل الطلاب شهاداتهم بصيغة PDF وتصلهم مرفقة بالبريد. ما دامت غير مفعّلة لا يرى الطلاب شيئاً جديداً.",
        "Preview this course's certificate, then turn it on so students can download it as a PDF and get it attached to their email. While it is off, students see nothing new.",
      )}
    >
      {!datesReady && (
        <p className="mb-3 rounded-lg bg-[var(--cx-orange-50)] px-3 py-2 text-[13px] font-semibold text-[var(--cx-orange-ink)]">
          {t(
            "الشهادة تحتاج تاريخ بداية الدورة ونهايتها (تبويب الموعد والمكان).",
            "The certificate needs the course start and end dates (Schedule tab).",
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!datesReady || busy !== null}
          onClick={() => download("male")}
        >
          {busy === "male" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {t("نموذج (طالب)", "Preview (male)")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!datesReady || busy !== null}
          onClick={() => download("female")}
        >
          {busy === "female" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {t("نموذج (طالبة)", "Preview (female)")}
        </Button>
      </div>
      <div className="mt-4 border-t border-[var(--cx-line-2)] pt-3">
        <ToggleRow
          id="cert-pdf-enabled"
          label={t("تفعيل الشهادة للطلاب", "Certificate on for students")}
          checked={enabled}
          disabled={!datesReady && !enabled}
          onChange={onToggle}
        />
      </div>
    </Panel>
  );
}
