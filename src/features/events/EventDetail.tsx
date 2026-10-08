import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  CalendarDays,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Link2,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  StatTile,
  useT,
} from "@/components/console/ui";
import { EventField as Field } from "./EventField";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  getEvent,
  getEventReport,
  getEventSources,
  attachEventSource,
  createEventLink,
  awardEventBadge,
  type EventSource,
  type EventReport,
} from "./lib/events.functions";
import {
  BADGE_RULES,
  TOOL_NAMES,
  EVENT_TIMEZONE,
  TEXPO_EVENT_ID,
  eventImageUrl,
  formatEventDate,
  orderedDays,
  type EventRecord,
  type EventTool,
} from "./lib/events";
import { EventEditor } from "./EventEditor";
import { EventSchedule } from "./EventSchedule";
import { TexpoAdmin } from "@/features/texpo/TexpoAdmin";

const RECORD_LABELS: Record<string, { ar: string; en: string }> = {
  phone: { ar: "الهاتف", en: "Phone" },
  specialty: { ar: "التخصص", en: "Specialty" },
  work_field: { ar: "مجال العمل", en: "Work field" },
  address: { ar: "العنوان", en: "Address" },
  description: { ar: "الوصف", en: "Description" },
  session_date: { ar: "تاريخ الجلسة", en: "Session date" },
};

export function EventDetail({ id }: { id: string }) {
  const { t, lang } = useT();
  const eventFn = useServerFn(getEvent),
    reportFn = useServerFn(getEventReport),
    sourcesFn = useServerFn(getEventSources);
  const attachFn = useServerFn(attachEventSource),
    linkFn = useServerFn(createEventLink),
    awardFn = useServerFn(awardEventBadge);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [report, setReport] = useState<EventReport | null>(null);
  const [sources, setSources] = useState<EventSource[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [linkKind, setLinkKind] = useState<"registration" | "game" | null>(null);
  const [email, setEmail] = useState("");
  const [record, setRecord] = useState<EventReport["records"][number] | null>(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let current = true;
    setError(false);
    setReport(null);
    Promise.all([eventFn({ data: { id } }), reportFn({ data: { id, date } }), sourcesFn()]).then(
      ([e, r, s]) => {
        if (current) {
          setEvent(e);
          setReport(r);
          setSources(s);
        }
      },
      () => {
        if (current) setError(true);
      },
    );
    return () => {
      current = false;
    };
  }, [id, date, reload, eventFn, reportFn, sourcesFn]);
  const refresh = () => setReload((n) => n + 1);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      refresh();
    } catch {
      toast.error(
        t(
          "تعذّر تنفيذ العملية. تحقق من الصلاحيات وشرط الشارة أو ارتباط الأداة.",
          "Could not complete the action. Check access, badge eligibility or the tool association.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      toast.success(t("نُسخ الرابط", "Link copied"));
    } catch {
      toast.error(t("تعذّر نسخ الرابط", "Could not copy the link"));
    }
  }
  async function exportRecords() {
    if (!report || !event) return;
    try {
      await exportRowsToXlsx({
        filenameBase: `${event.slug}-${date ?? "all"}`,
        sheetName: t("البيانات", "Records"),
        rtl: lang === "ar",
        columns: [
          { header: t("النوع", "Type"), get: (r) => r.kind },
          { header: t("الاسم", "Name"), get: (r) => r.name },
          { header: t("البريد", "Email"), get: (r) => r.email },
          { header: t("التاريخ", "Time"), get: (r) => r.at },
          { header: t("التفاصيل", "Details"), get: (r) => r.detail },
          { header: t("البيانات", "Data"), get: (r) => r.values },
        ],
        rows: report.records
          .filter((r) => filter === "all" || r.kind === filter)
          .map((r) => ({
            ...r,
            kind:
              r.kind === "badge"
                ? t("شارة", "Badge")
                : (TOOL_NAMES[r.kind as EventTool]?.[lang] ?? r.kind),
            values: JSON.stringify(r.values ?? {}),
          })),
      });
    } catch {
      toast.error(t("تعذّر تصدير البيانات", "Could not export records"));
    }
  }
  if (error) return <ErrorNote onRetry={refresh} />;
  if (!event) return <Loading />;
  const days = orderedDays(event.schedule);
  const attached = sources.filter((s) => s.event_id === id);
  const visible = report?.records.filter((r) => filter === "all" || r.kind === filter) ?? [];
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("الفعاليات", "Events")}
        title={lang === "ar" ? event.title_ar : event.title_en}
        description={event.location || t("إدارة الفعالية وبياناتها", "Event management & data")}
        back={{ to: "/admin/events", label: t("كل الفعاليات", "All events") }}
        meta={
          <Pill tone={event.status === "published" ? "green" : "gray"}>
            {event.status === "published"
              ? t("منشورة", "Published")
              : event.status === "archived"
                ? t("مؤرشفة", "Archived")
                : t("مسودة", "Draft")}
          </Pill>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit3 className="h-4 w-4" />
              {t("تعديل الفعالية", "Edit event")}
            </Button>
            <Button
              variant="outline"
              disabled={event.status !== "published"}
              onClick={() => copy(`/events/${event.slug}`)}
            >
              <Copy className="h-4 w-4" />
              {t("نسخ رابط الصفحة", "Copy page URL")}
            </Button>
            {event.status === "published" && (
              <Button variant="outline" asChild>
                <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("عرض الصفحة", "View page")}
                </a>
              </Button>
            )}
          </>
        }
      />
      <div>
        <nav
          className="flex flex-wrap gap-2"
          aria-label={t("بيانات أيام الفعالية", "Event data by day")}
        >
          <Button
            variant={date === null ? "default" : "outline"}
            aria-pressed={date === null}
            onClick={() => setDate(null)}
          >
            {t("الكل", "All")}
          </Button>
          {days.map((day, index) => (
            <Button
              key={day.date}
              variant={date === day.date ? "default" : "outline"}
              aria-pressed={date === day.date}
              onClick={() => setDate(day.date)}
            >
              <span>
                {t("اليوم", "Day")} {index + 1}
              </span>
              <span className="text-xs opacity-75">{formatEventDate(day.date, lang)}</span>
            </Button>
          ))}
        </nav>
        <p className="mt-2 text-xs text-[var(--cx-muted)]">
          {t(
            "كل عملية تُحسب في يوم حدوثها بتوقيت دمشق.",
            "Each action counts on the day it happened in Damascus time.",
          )}
        </p>
      </div>
      {!report ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={Users}
              label={t("التسجيلات والاستقطاب", "Registrations & leads")}
              value={report.registrations}
            />
            <StatTile
              icon={ClipboardList}
              label={t("إجابات الاستبيانات", "Survey responses")}
              value={report.surveys}
            />
            <StatTile
              icon={UserCheck}
              label={t("سجلات الحضور", "Attendance records")}
              value={report.attendance}
            />
            <StatTile
              icon={Award}
              label={t("الشارات الممنوحة", "Badges awarded")}
              value={report.badges}
            />
          </div>
          {attached.some((s) => s.kind === "game") && (
            <TexpoAdmin key={`${date}-${reload}`} eventId={id} date={date} />
          )}
          <Panel
            title={t("البيانات المسجلة", "Collected records")}
            description={
              report.record_count > report.records.length
                ? t(
                    `عرض أحدث ${report.records.length} من ${report.record_count} سجلاً. الإحصاءات تشمل الجميع.`,
                    `Showing the latest ${report.records.length} of ${report.record_count} records. Statistics include everyone.`,
                  )
                : t(
                    "بيانات الأدوات المرتبطة بهذه الفعالية فقط.",
                    "Records from tools connected to this event.",
                  )
            }
            actions={
              <Button variant="outline" disabled={!visible.length} onClick={exportRecords}>
                <Download className="h-4 w-4" />
                {t("تصدير المعروض", "Export displayed")}
              </Button>
            }
          >
            <Field label={t("نوع البيانات", "Record type")}>
              <select
                className="mb-4 h-11 rounded-md border bg-background px-3"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t("الكل", "All")}</option>
                {(["registration", "survey", "attendance"] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {TOOL_NAMES[kind][lang]}
                  </option>
                ))}
                <option value="badge">{t("الشارات", "Badges")}</option>
              </select>
            </Field>
            {visible.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={t("لا توجد بيانات لهذا الاختيار", "No records for this selection")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b text-[var(--cx-muted)]">
                      {[
                        t("النوع", "Type"),
                        t("الاسم", "Name"),
                        t("البريد", "Email"),
                        t("الوقت بتوقيت دمشق", "Time in Damascus"),
                        t("التفاصيل", "Details"),
                      ].map((h) => (
                        <th key={h} className="px-2 py-3 text-start">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={`${r.kind}-${r.id}`} className="border-b last:border-0">
                        <td className="p-2">
                          {r.kind === "badge"
                            ? t("شارة", "Badge")
                            : TOOL_NAMES[r.kind as EventTool]?.[lang]}
                        </td>
                        <td className="p-2 font-semibold">{r.name}</td>
                        <td className="p-2" dir="ltr">
                          {r.email ?? "—"}
                        </td>
                        <td className="whitespace-nowrap p-2">
                          {new Date(r.at).toLocaleString(lang === "ar" ? "ar-SY" : "en-GB", {
                            timeZone: EVENT_TIMEZONE,
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => setRecord(r)}>
                            {t("عرض", "View")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
      <Panel
        title={t("الأدوات المرتبطة", "Connected tools")}
        description={t(
          "اربط كل رابط أو نموذج أو سجل حضور بفعالية واحدة. بياناته السابقة تدخل ضمن تقاريرها أيضاً.",
          "Connect each link, form or attendance group to one event. Its existing records are included too.",
        )}
      >
        {event.tools.length === 0 ? (
          <p className="text-sm text-[var(--cx-muted)]">
            {t("فعّل الأدوات من تعديل الفعالية.", "Enable tools in Edit event.")}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {event.tools.map((kind) => (
              <section
                key={kind}
                className="space-y-3 rounded-lg border border-[var(--cx-line)] p-4"
              >
                <h3 className="font-bold">{TOOL_NAMES[kind][lang]}</h3>
                <ul className="space-y-2">
                  {attached
                    .filter((s) => s.kind === kind)
                    .map((s) => (
                      <li
                        key={s.source_id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold underline underline-offset-4"
                        >
                          {s.label}
                        </a>
                        <div className="flex gap-1">
                          {s.public_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copy(s.public_url ?? s.url)}
                              aria-label={t("نسخ رابط الأداة", "Copy tool link")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={
                              busy ||
                              (id === TEXPO_EVENT_ID &&
                                s.kind === "game" &&
                                s.public_url === "/texpo?l=booth")
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  t(
                                    "فصل الأداة يزيل بياناتها من تقارير هذه الفعالية دون حذفها. هل تريد المتابعة؟",
                                    "Disconnecting removes this tool’s data from the event report while keeping the records. Continue?",
                                  ),
                                )
                              )
                                mutate(() =>
                                  attachFn({
                                    data: {
                                      event_id: id,
                                      kind,
                                      source_id: s.source_id,
                                      remove: true,
                                    },
                                  }),
                                );
                            }}
                          >
                            {t("فصل", "Disconnect")}
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
                <select
                  aria-label={t("ربط أداة موجودة", "Connect an existing tool")}
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value=""
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.value)
                      mutate(() =>
                        attachFn({
                          data: { event_id: id, kind, source_id: e.target.value, remove: false },
                        }),
                      );
                  }}
                >
                  <option value="">{t("اربط أداة موجودة…", "Connect an existing tool…")}</option>
                  {sources
                    .filter((s) => s.kind === kind && !s.event_id)
                    .map((s) => (
                      <option key={s.source_id} value={s.source_id}>
                        {s.label}
                      </option>
                    ))}
                </select>
                {kind === "registration" || kind === "game" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setLinkKind(kind);
                      setLabel("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("رابط جديد لهذه الفعالية", "New link for this event")}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={
                        kind === "survey" ? "/admin/forms/new" : "/attendance-management-system"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Plus className="h-4 w-4" />
                      {kind === "survey"
                        ? t("إنشاء نموذج", "Create a form")
                        : t("إدارة الحضور", "Manage attendance")}
                    </a>
                  </Button>
                )}
                {kind === "game" && (
                  <p className="text-xs text-[var(--cx-muted)]">
                    {t(
                      "يستخدم تحدّي أبو الجود الحالي ومكافآته: هدية واحدة لكل حساب وجهاز، وقسائم الدورات التوليدية.",
                      "Uses the existing Abu Al-Joud challenge: one gift per account and device, with coupons for Generative AI courses.",
                    )}
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
        <Button variant="ghost" className="mt-3" disabled={busy} onClick={refresh}>
          {t("تحديث الأدوات", "Refresh tools")}
        </Button>
      </Panel>
      <Panel title={t("برنامج الفعالية", "Event schedule")}>
        <EventSchedule schedule={event.schedule} lang={lang} date={date} />
      </Panel>
      {event.badge && (
        <Panel title={t("شارة الفعالية", "Event badge")}>
          <div className="flex items-center gap-4">
            <img
              src={eventImageUrl(event.badge.image)}
              alt=""
              className="h-20 w-20 object-contain"
            />
            <div>
              <h3 className="font-bold">
                {lang === "ar" ? event.badge.name_ar : event.badge.name_en}
              </h3>
              <p className="text-sm text-[var(--cx-muted)]">
                {BADGE_RULES[event.badge.rule][lang]}
              </p>
            </div>
          </div>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(async () => {
                await awardFn({ data: { id, email } });
                setEmail("");
                toast.success(
                  t("مُنحت الشارة، أو كانت ممنوحة سابقاً", "Badge awarded, or already earned"),
                );
              });
            }}
          >
            <Field label={t("بريد العضو صاحب الحساب المؤكد", "Confirmed member’s email")}>
              <Input
                type="email"
                dir="ltr"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button disabled={busy} type="submit">
              <Award className="h-4 w-4" />
              {t("منح الشارة", "Award badge")}
            </Button>
          </form>
        </Panel>
      )}
      {editing && (
        <EventEditor
          event={event}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEvent(saved);
            setEditing(false);
            if (date && !saved.schedule.some((d) => d.date === date)) setDate(null);
            refresh();
          }}
        />
      )}
      {linkKind && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setLinkKind(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("رابط جديد للفعالية", "New event link")}</DialogTitle>
              <DialogDescription>
                {t(
                  "يدخل كل سجل من هذا الرابط في بيانات هذه الفعالية.",
                  "Records from this link belong to this event.",
                )}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutate(async () => {
                  await linkFn({ data: { id, kind: linkKind, label } });
                  setLinkKind(null);
                });
              }}
            >
              <Field label={t("اسم الرابط", "Link name")}>
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </Field>
              <Button disabled={busy} type="submit">
                <Link2 className="h-4 w-4" />
                {t("إنشاء الرابط", "Create link")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {record && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setRecord(null);
          }}
        >
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{record.name || t("تفاصيل السجل", "Record details")}</DialogTitle>
              <DialogDescription>{record.detail}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-3">
              {Object.entries(record.values ?? {}).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-bold">
                    {record.labels[key]?.[lang] || RECORD_LABELS[key]?.[lang] || key}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
