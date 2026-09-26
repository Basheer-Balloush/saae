import { CalendarCheck, Loader2, MapPin, MonitorPlay } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, Panel } from "@/components/console/ui";
import type { EditorCtx } from "./types";

const DAYS = [
  ["sat", "السبت", "Sat"],
  ["sun", "الأحد", "Sun"],
  ["mon", "الإثنين", "Mon"],
  ["tue", "الثلاثاء", "Tue"],
  ["wed", "الأربعاء", "Wed"],
  ["thu", "الخميس", "Thu"],
  ["fri", "الجمعة", "Fri"],
] as const;

export function ScheduleTab({
  ctx,
  switching,
  onDeliveryChange,
}: {
  ctx: EditorCtx;
  switching: boolean;
  onDeliveryChange: (mode: "onsite" | "online") => void;
}) {
  const { course, update, t, ar } = ctx;
  const mode = course.delivery_mode ?? "onsite";
  const days = course.schedule_days ?? [];

  const choice = (value: "online" | "onsite", Icon: typeof MapPin, title: string, text: string) => (
    <button
      type="button"
      className="cx-choice w-full"
      data-active={mode === value}
      disabled={switching}
      onClick={() => onDeliveryChange(value)}
      aria-pressed={mode === value}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${mode === value ? "bg-[var(--cx-petrol)] text-white" : "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"}`}
      >
        {switching && mode !== value ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </span>
      <span>
        <span className="block text-[15px] font-extrabold text-[var(--cx-ink)]">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--cx-muted)]">
          {text}
        </span>
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      <Panel
        title={t("كيف تُقدَّم الدورة؟", "How is the course delivered?")}
        description={t(
          "يحدّد هذا الاختيار كيف يُحتسب تقدّم الطالب. يُحفظ فوراً بعد التأكيد.",
          "This decides how student progress is counted. It saves right away after you confirm.",
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {choice(
            "online",
            MonitorPlay,
            t("أونلاين", "Online"),
            t(
              "فيديوهات ودروس واختبار. يكتمل التقدّم بإنهاء الدروس.",
              "Videos, lessons and a quiz. Progress completes when the lessons are done.",
            ),
          )}
          {choice(
            "onsite",
            MapPin,
            t("حضوري", "In person"),
            t(
              "جلسات في مكان وموعد. يكتمل التقدّم بالحضور، ويُسجَّل من تبويب الحضور.",
              "Sessions at a place and time. Progress completes through attendance, taken in the Attendance tab.",
            ),
          )}
        </div>
        {mode === "onsite" && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--cx-teal-700)]">
            <CalendarCheck className="h-4 w-4" />
            {t(
              "كل قسم في المحتوى = جلسة حضور واحدة.",
              "Each content section is one attendance session.",
            )}
          </p>
        )}
      </Panel>

      <Panel
        title={t("المواعيد", "Dates and times")}
        description={t(
          "تاريخا البداية والنهاية مطلوبان للشهادة.",
          "Start and end dates are needed for the certificate.",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("تاريخ البداية", "Start date")}>
            <Input
              type="date"
              value={
                course.start_date ? new Date(course.start_date).toISOString().slice(0, 10) : ""
              }
              onChange={(e) =>
                update({
                  start_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </Field>
          <Field label={t("تاريخ النهاية", "End date")}>
            <Input
              type="date"
              value={course.end_date ? new Date(course.end_date).toISOString().slice(0, 10) : ""}
              onChange={(e) =>
                update({ end_date: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
            />
          </Field>
          <Field label={t("من الساعة", "From")}>
            <Input
              type="time"
              value={course.schedule_time_from ?? ""}
              onChange={(e) => update({ schedule_time_from: e.target.value || null })}
            />
          </Field>
          <Field label={t("إلى الساعة", "To")}>
            <Input
              type="time"
              value={course.schedule_time_to ?? ""}
              onChange={(e) => update({ schedule_time_to: e.target.value || null })}
            />
          </Field>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 text-[13px] font-bold text-[var(--cx-ink-2)]">
            {t("أيام الأسبوع", "Days of the week")}
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([d, arName, enName]) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update({ schedule_days: on ? days.filter((x) => x !== d) : [...days, d] })
                  }
                  className={`h-9 min-w-[64px] rounded-full border px-3 text-[13px] font-bold transition-colors ${
                    on
                      ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white"
                      : "border-[var(--cx-line)] bg-[var(--cx-field)] text-[var(--cx-ink-2)] hover:border-[var(--cx-teal)]"
                  }`}
                >
                  {ar ? arName : enName}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 max-w-[220px]">
          <Field label={t("المدة الكلية (ساعات)", "Total length (hours)")}>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={course.duration_hours ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update({ duration_hours: v === "" ? null : Math.max(0, parseFloat(v) || 0) });
              }}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title={t("المكان", "Location")}
        description={t(
          "يظهر في صفحة الدورة. للدورات الأونلاين اكتب المنصّة، مثل Zoom.",
          "Shown on the course page. For online courses write the platform, e.g. Zoom.",
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("المكان بالعربية", "Location in Arabic")}>
            <Input
              dir="rtl"
              value={course.location_ar ?? ""}
              placeholder="مثال: دمشق - مقر الجمعية"
              onChange={(e) => update({ location_ar: e.target.value || null })}
            />
          </Field>
          <Field label={t("المكان بالإنجليزية", "Location in English")}>
            <Input
              dir="ltr"
              value={course.location_en ?? ""}
              placeholder="e.g. Damascus / Online via Zoom"
              onChange={(e) => update({ location_en: e.target.value || null })}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}
