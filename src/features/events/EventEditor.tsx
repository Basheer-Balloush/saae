import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useT } from "@/components/console/ui";
import { EventField as Field } from "./EventField";
import { supabase } from "@/integrations/supabase/client";
import { saveEvent } from "./lib/events.functions";
import {
  BADGE_RULES,
  EVENT_TOOLS,
  TOOL_NAMES,
  eventImageUrl,
  eventInputSchema,
  newEvent,
  type EventInput,
  type EventRecord,
} from "./lib/events";

export function EventEditor({
  event,
  onClose,
  onSaved,
}: {
  event?: EventRecord;
  onClose: () => void;
  onSaved: (event: EventRecord) => void;
}) {
  const { t, lang } = useT();
  const [value, setValue] = useState<EventInput>(() =>
    event ? structuredClone(event) : newEvent(),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const save = useServerFn(saveEvent);
  const update = <K extends keyof EventInput>(key: K, next: EventInput[K]) =>
    setValue((v) => ({ ...v, [key]: next }));
  const updateDay = (index: number, change: Partial<EventInput["schedule"][number]>) =>
    setValue((v) => ({
      ...v,
      schedule: v.schedule.map((day, i) => (i === index ? { ...day, ...change } : day)),
    }));
  async function upload(file: File | undefined, badge: boolean) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error(
        t(
          "اختر صورة PNG أو JPG أو WebP لا تتجاوز 5 ميغابايت",
          "Choose a PNG, JPG or WebP image up to 5 MB",
        ),
      );
      return;
    }
    setUploading(true);
    try {
      // Decode before uploading: extensions and browser-provided MIME are untrusted.
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 8192 || bitmap.height > 8192) {
        bitmap.close();
        throw new Error("image_too_large");
      }
      bitmap.close();
      const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
      const key = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("event-assets")
        .upload(key, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setValue((v) =>
        badge && v.badge ? { ...v, badge: { ...v.badge, image: key } } : { ...v, image: key },
      );
    } catch {
      toast.error(
        t(
          "تعذّر رفع الصورة. تحقق من نوعها وصلاحياتك.",
          "Could not upload the image. Check its format and your access.",
        ),
      );
    } finally {
      setUploading(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const parsed = eventInputSchema.safeParse(value);
    if (!parsed.success) {
      setError(
        t(
          "تحقق من المعلومات: الاسم باللغتين، رابط فريد، تواريخ غير مكررة، أوقات مرتبة، وجلسات ضمن ساعات اليوم. الشارة تحتاج صورة واسماً باللغتين وأداة مفعلة تناسب شرطها.",
          "Check both names, the URL, unique dates, valid time ranges and activities within opening hours. A badge needs an image, both names and its required tool enabled.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const saved = await save({ data: { id: event?.id, event: parsed.data } });
      toast.success(t("حُفظت الفعالية", "Event saved"));
      onSaved(saved);
    } catch {
      setError(
        t(
          "تعذّر حفظ الفعالية. قد يكون الرابط مستخدماً. تحقق من الاتصال وحاول مجدداً.",
          "Could not save the event. Its URL may already be in use. Check your connection and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const bilingual = (
    ar: "title_ar" | "description_ar",
    en: "title_en" | "description_en",
    labelAr: string,
    labelEn: string,
    multiline = false,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${t(labelAr, labelEn)} · العربية`}>
        {multiline ? (
          <Textarea
            dir="rtl"
            value={value[ar]}
            maxLength={10000}
            onChange={(e) => update(ar, e.target.value)}
          />
        ) : (
          <Input
            dir="rtl"
            required
            minLength={2}
            maxLength={160}
            value={value[ar]}
            onChange={(e) => update(ar, e.target.value)}
          />
        )}
      </Field>
      <Field label={`${t(labelAr, labelEn)} · English`}>
        {multiline ? (
          <Textarea
            dir="ltr"
            value={value[en]}
            maxLength={10000}
            onChange={(e) => update(en, e.target.value)}
          />
        ) : (
          <Input
            dir="ltr"
            required
            minLength={2}
            maxLength={160}
            value={value[en]}
            onChange={(e) => update(en, e.target.value)}
          />
        )}
      </Field>
    </div>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !uploading) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] max-w-4xl overflow-y-auto"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle>
            {event ? t("تعديل الفعالية", "Edit event") : t("إضافة فعالية", "Add event")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "المعلومات والبرنامج بتوقيت دمشق. الصفحة المنشورة متاحة برابطها فقط.",
              "Information and schedule in Damascus time. Published pages are accessed through their direct link.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy || uploading} className="space-y-5 disabled:opacity-70">
            {bilingual("title_ar", "title_en", "اسم الفعالية", "Event name")}
            <Field label={t("رابط الصفحة", "Page URL")}>
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-sm text-muted-foreground">/events/</span>
                <Input
                  required
                  minLength={2}
                  maxLength={80}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  readOnly={!!event}
                  value={value.slug}
                  placeholder="event-name-2026"
                  onChange={(e) => update("slug", e.target.value.toLowerCase())}
                />
              </div>
            </Field>
            {bilingual("description_ar", "description_en", "وصف الفعالية", "Description", true)}
            <Field label={t("المكان", "Location")}>
              <Input
                value={value.location}
                maxLength={300}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
            <Field label={t("صورة الفعالية · حتى 5 ميغابايت", "Event image · up to 5 MB")}>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label={t("رفع صورة الفعالية", "Upload event image")}
                onChange={(e) => upload(e.target.files?.[0], false)}
              />
              {value.image && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={eventImageUrl(value.image)}
                    alt={t("معاينة الصورة", "Image preview")}
                    className="h-20 w-32 rounded-lg object-cover"
                  />
                  <Button type="button" variant="ghost" onClick={() => update("image", "")}>
                    {t("إزالة", "Remove")}
                  </Button>
                </div>
              )}
            </Field>
            <section className="space-y-3" aria-label={t("برنامج الفعالية", "Event schedule")}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {t("الأيام والجلسات والأنشطة", "Days, sessions & activities")}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  disabled={value.schedule.length >= 60}
                  onClick={() =>
                    update("schedule", [
                      ...value.schedule,
                      { date: "", start: "", end: "", sessions: [] },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t("أضف يوماً", "Add day")}
                </Button>
              </div>
              {value.schedule.map((day, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">
                      {t("اليوم", "Day")} {index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={value.schedule.length === 1}
                      aria-label={t("حذف اليوم", "Remove day")}
                      onClick={() =>
                        update(
                          "schedule",
                          value.schedule.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={t("التاريخ", "Date")}>
                      <Input
                        type="date"
                        required
                        value={day.date}
                        onChange={(e) => updateDay(index, { date: e.target.value })}
                      />
                    </Field>
                    <Field label={t("الافتتاح", "Opens")}>
                      <Input
                        type="time"
                        required={!event}
                        value={day.start}
                        onChange={(e) => updateDay(index, { start: e.target.value })}
                      />
                    </Field>
                    <Field label={t("الختام", "Closes")}>
                      <Input
                        type="time"
                        required={!event}
                        value={day.end}
                        onChange={(e) => updateDay(index, { end: e.target.value })}
                      />
                    </Field>
                  </div>
                  {day.sessions.map((session, n) => {
                    const set = (patch: Partial<typeof session>) =>
                      updateDay(index, {
                        sessions: day.sessions.map((s, i) => (i === n ? { ...s, ...patch } : s)),
                      });
                    return (
                      <div key={n} className="space-y-3 border-s-2 ps-3">
                        <div className="flex items-center justify-between">
                          <strong className="text-sm">
                            {t("جلسة / نشاط", "Session / activity")} {n + 1}
                          </strong>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("حذف النشاط", "Remove activity")}
                            onClick={() =>
                              updateDay(index, { sessions: day.sessions.filter((_, i) => i !== n) })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={t("الاسم بالعربية", "Arabic name")}>
                            <Input
                              dir="rtl"
                              required
                              minLength={2}
                              maxLength={160}
                              value={session.title_ar}
                              onChange={(e) => set({ title_ar: e.target.value })}
                            />
                          </Field>
                          <Field label={t("الاسم بالإنكليزية", "English name")}>
                            <Input
                              dir="ltr"
                              required
                              minLength={2}
                              maxLength={160}
                              value={session.title_en}
                              onChange={(e) => set({ title_en: e.target.value })}
                            />
                          </Field>
                          <Field label={t("البداية", "Starts")}>
                            <Input
                              required
                              type="time"
                              value={session.start}
                              onChange={(e) => set({ start: e.target.value })}
                            />
                          </Field>
                          <Field label={t("النهاية", "Ends")}>
                            <Input
                              required
                              type="time"
                              value={session.end}
                              onChange={(e) => set({ end: e.target.value })}
                            />
                          </Field>
                          <Field label={t("المتحدث / المسؤول", "Speaker / host")}>
                            <Input
                              maxLength={160}
                              value={session.speaker}
                              onChange={(e) => set({ speaker: e.target.value })}
                            />
                          </Field>
                          <Field label={t("مكان النشاط", "Activity location")}>
                            <Input
                              maxLength={200}
                              value={session.location}
                              onChange={(e) => set({ location: e.target.value })}
                            />
                          </Field>
                          <Field label={t("الوصف بالعربية", "Arabic description")}>
                            <Textarea
                              dir="rtl"
                              maxLength={2000}
                              value={session.description_ar}
                              onChange={(e) => set({ description_ar: e.target.value })}
                            />
                          </Field>
                          <Field label={t("الوصف بالإنكليزية", "English description")}>
                            <Textarea
                              dir="ltr"
                              maxLength={2000}
                              value={session.description_en}
                              onChange={(e) => set({ description_en: e.target.value })}
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={day.sessions.length >= 50}
                    onClick={() =>
                      updateDay(index, {
                        sessions: [
                          ...day.sessions,
                          {
                            title_ar: "",
                            title_en: "",
                            start: "",
                            end: "",
                            speaker: "",
                            location: "",
                            description_ar: "",
                            description_en: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    {t("أضف جلسة أو نشاطاً", "Add session or activity")}
                  </Button>
                </div>
              ))}
            </section>
            <fieldset className="space-y-2">
              <legend className="mb-2 font-bold">{t("أدوات الفعالية", "Event tools")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {EVENT_TOOLS.map((tool) => (
                  <label
                    key={tool}
                    className="flex min-h-11 items-center gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={value.tools.includes(tool)}
                      onChange={(e) =>
                        update(
                          "tools",
                          e.target.checked
                            ? [...value.tools, tool]
                            : value.tools.filter((x) => x !== tool),
                        )
                      }
                    />
                    {TOOL_NAMES[tool][lang]}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "تربط النماذج وسجلات الحضور والروابط بهذه الفعالية بعد حفظها.",
                  "Connect forms, attendance records and links after saving the event.",
                )}
              </p>
            </fieldset>
            <section className="space-y-3">
              <label className="flex min-h-11 items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={!!value.badge}
                  onChange={(e) =>
                    update(
                      "badge",
                      e.target.checked
                        ? {
                            image: "",
                            name_ar: "",
                            name_en: "",
                            description_ar: "",
                            description_en: "",
                            rule: "manual",
                          }
                        : null,
                    )
                  }
                />
                {t("إضافة شارة للفعالية", "Add an event badge")}
              </label>
              {value.badge && (
                <>
                  <Field label={t("صورة الشارة", "Badge image")}>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => upload(e.target.files?.[0], true)}
                    />
                    {value.badge.image && (
                      <img
                        src={eventImageUrl(value.badge.image)}
                        alt={t("معاينة الشارة", "Badge preview")}
                        className="mt-2 h-20 w-20 object-contain"
                      />
                    )}
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["name_ar", "name_en", "description_ar", "description_en"] as const).map(
                      (key) => (
                        <Field
                          key={key}
                          label={
                            key === "name_ar"
                              ? t("اسم الشارة بالعربية", "Arabic badge name")
                              : key === "name_en"
                                ? t("اسم الشارة بالإنكليزية", "English badge name")
                                : key === "description_ar"
                                  ? t("وصف الشارة بالعربية", "Arabic badge description")
                                  : t("وصف الشارة بالإنكليزية", "English badge description")
                          }
                        >
                          <Input
                            dir={key.endsWith("_ar") ? "rtl" : "ltr"}
                            required={key.startsWith("name")}
                            maxLength={key.startsWith("name") ? 160 : 1000}
                            value={value.badge![key]}
                            onChange={(e) =>
                              setValue((v) => ({
                                ...v,
                                badge: v.badge ? { ...v.badge, [key]: e.target.value } : null,
                              }))
                            }
                          />
                        </Field>
                      ),
                    )}
                  </div>
                  <Field label={t("من يستحق الشارة؟", "Who can earn this badge?")}>
                    <select
                      className="h-11 w-full rounded-md border bg-background px-3"
                      value={value.badge.rule}
                      onChange={(e) => {
                        const rule = e.target.value;
                        if (rule in BADGE_RULES)
                          setValue((v) => ({
                            ...v,
                            badge: v.badge
                              ? { ...v.badge, rule: rule as keyof typeof BADGE_RULES }
                              : null,
                          }));
                      }}
                    >
                      {Object.entries(BADGE_RULES).map(([key, labels]) => (
                        <option key={key} value={key}>
                          {labels[lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "تمنح الشارة لأعضاء بحسابات مؤكدة، بعد اختيارهم وتأكيد منحها في صفحة الفعالية.",
                      "Choose confirmed members and approve their awards on the event page.",
                    )}
                  </p>
                </>
              )}
            </section>
            <Field label={t("حالة الصفحة", "Page status")}>
              <select
                className="h-11 w-full rounded-md border bg-background px-3"
                value={value.status}
                onChange={(e) => update("status", e.target.value as EventInput["status"])}
              >
                <option value="draft">{t("مسودة", "Draft")}</option>
                <option value="published">
                  {t("منشورة بالرابط فقط", "Published · direct link")}
                </option>
                <option value="archived">{t("مؤرشفة", "Archived")}</option>
              </select>
            </Field>
          </fieldset>
          {uploading && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" />
              {t("جارٍ رفع الصورة…", "Uploading image…")}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background py-3">
            <Button type="button" variant="outline" disabled={busy || uploading} onClick={onClose}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button type="submit" disabled={busy || uploading}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {value.status === "published"
                ? t("حفظ ونشر", "Save & publish")
                : t("حفظ الفعالية", "Save event")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
