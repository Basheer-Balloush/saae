import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ban, Copy, KeyRound, Loader2, Pencil, Plus } from "lucide-react";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  Panel,
  Pill,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { keyState } from "@/features/chat/hooks/useApiKeys";
import {
  createChatApiKey,
  revokeChatApiKey,
  updateChatApiKey,
  type ChatApiKey,
} from "@/features/chat/lib/chat-api-keys.functions";

/* Chatbot page → API keys: a key per outside system (a WhatsApp bot, an app,
   a partner's server) that talks to Abu Al-Joud, with its own limits. */

const ENDPOINT_PATH = "/api/v1/abu-al-joud/chat";
const DEFAULT_LIMITS = { per_minute: 50, per_day: 1000, per_user_minute: 6, per_user_day: 100 };
type Limits = typeof DEFAULT_LIMITS;
type Expiry = "never" | "30" | "90" | "365";

const endpoint = () =>
  `${typeof window === "undefined" ? "https://www.aisyria.org" : window.location.origin}${ENDPOINT_PATH}`;

export function ApiKeysPanel({
  rows,
  failed,
  reload,
}: {
  rows: ChatApiKey[] | null;
  failed: boolean;
  reload: () => void;
}) {
  const { t, lang } = useT();
  const revokeFn = useServerFn(revokeChatApiKey);
  const [editing, setEditing] = useState<ChatApiKey | "new" | null>(null);
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);

  const revoke = async (k: ChatApiKey) => {
    const ok = await confirmDialog({
      title: t(`إيقاف مفتاح «${k.name}»؟`, `Revoke the “${k.name}” key?`),
      description: t(
        "يتوقف النظام الذي يستخدمه عن الوصول إلى أبو الجود فوراً، ولا يمكن إعادة تشغيل المفتاح. لإعادة الوصول أنشئ مفتاحاً جديداً.",
        "The system using it loses access to Abu Al-Joud at once, and the key cannot be turned back on. To restore access, make a new key.",
      ),
      confirmLabel: t("إيقاف المفتاح", "Revoke key"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeFn({ data: { id: k.id } });
      toast.success(t("أُوقف المفتاح", "Key revoked"));
      reload();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <div>
      <Panel
        title={t("مفاتيح API لأبو الجود", "Abu Al-Joud API keys")}
        description={t(
          "مفتاح لكل نظام خارجي (بوت واتساب، تطبيق، خادم شريك) يحادث أبو الجود ويجيب كما يجيب على الموقع، ضمن حدود تحددها هنا. يبقى المفتاح على خادم ذلك النظام، ولا يوضع في صفحة ويب أو تطبيق جوال.",
          "One key per outside system (a WhatsApp bot, an app, a partner's server). It talks to Abu Al-Joud and gets the same answers as the website, within the limits you set here. The key stays on that system's server, never in a web page or a phone app.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            {t("مفتاح جديد", "New key")}
          </Button>
        }
        flush
      >
        {rows === null ? (
          <Loading />
        ) : failed ? (
          <div className="p-5">
            <ErrorNote onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={t("لا توجد مفاتيح بعد", "No keys yet")}
            text={
              <>
                {t("العنوان:", "Endpoint:")} <code dir="ltr">POST {ENDPOINT_PATH}</code>.{" "}
                {t(
                  "أنشئ مفتاحاً لكل نظام يحتاج الوصول.",
                  "Make one key for each system that needs access.",
                )}
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--cx-line-2)]">
            {rows.map((k) => {
              const state = keyState(k);
              return (
                <li key={k.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold" dir="auto">
                        {k.name}
                      </span>
                      <Pill
                        tone={state === "active" ? "green" : state === "revoked" ? "red" : "gray"}
                      >
                        {state === "active"
                          ? t("فعّال", "Active")
                          : state === "revoked"
                            ? t("موقوف", "Revoked")
                            : t("منتهي", "Expired")}
                      </Pill>
                    </div>
                    {k.note && (
                      <div className="text-[13px] text-[var(--cx-ink-2)]" dir="auto">
                        {k.note}
                      </div>
                    )}
                    <div className="text-[12.5px] text-[var(--cx-muted)]">
                      <code dir="ltr">{k.key_prefix}…</code> · {t("أُنشئ", "made")}{" "}
                      {fmtDate(k.created_at, lang)}
                      {k.expires_at && ` · ${t("ينتهي", "expires")} ${fmtDate(k.expires_at, lang)}`}
                      {` · ${t("آخر استخدام", "last used")} ${k.last_used_at ? fmtDate(k.last_used_at, lang, true) : t("لم يُستخدم", "never")}`}
                    </div>
                    <div className="text-[12.5px] text-[var(--cx-ink-2)]">
                      {t(
                        `اليوم ${fmtNum(k.used_today, lang)} من ${fmtNum(k.per_day, lang)} طلب مسموح · ${fmtNum(k.request_count, lang)} طلب مقبول منذ إنشائه`,
                        `Today ${fmtNum(k.used_today, lang)} of ${fmtNum(k.per_day, lang)} allowed requests · ${fmtNum(k.request_count, lang)} let through since it was made`,
                      )}
                    </div>
                    <div className="text-[12.5px] text-[var(--cx-muted)]">
                      {t(
                        `الحدود: ${fmtNum(k.per_minute, lang)} في الدقيقة للمفتاح · لكل مستخدم ${fmtNum(k.per_user_minute, lang)} في الدقيقة و${fmtNum(k.per_user_day, lang)} في اليوم`,
                        `Limits: ${k.per_minute} a minute for the key · per user ${k.per_user_minute} a minute and ${k.per_user_day} a day`,
                      )}
                    </div>
                    {k.blocked_count > 0 && (
                      <div className="text-[12.5px] font-semibold text-[var(--cx-red)]">
                        {t(
                          `حُجبت ${fmtNum(k.blocked_count, lang)} إجابة كانت ستكشف تعليمات البوت`,
                          `${k.blocked_count} answers held back that would have revealed the bot's instructions`,
                        )}
                      </div>
                    )}
                  </div>
                  {state === "active" && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(k)}
                        aria-label={t("تعديل", "Edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                        onClick={() => revoke(k)}
                        aria-label={t("إيقاف المفتاح", "Revoke key")}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <KeyForm
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(made) => {
          setEditing(null);
          if (made) setCreated(made);
          reload();
        }}
      />
      <CreatedKey created={created} onClose={() => setCreated(null)} />
    </div>
  );
}

function KeyForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: ChatApiKey | "new" | null;
  onClose: () => void;
  onSaved: (created: { name: string; key: string } | null) => void;
}) {
  const { t, ar } = useT();
  const createFn = useServerFn(createChatApiKey);
  const updateFn = useServerFn(updateChatApiKey);
  const isNew = editing === "new";
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);
  const [expiry, setExpiry] = useState<Expiry>("never");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    if (editing === "new") {
      setName("");
      setNote("");
      setLimits(DEFAULT_LIMITS);
      setExpiry("never");
    } else {
      setName(editing.name);
      setNote(editing.note ?? "");
      setLimits({
        per_minute: editing.per_minute,
        per_day: editing.per_day,
        per_user_minute: editing.per_user_minute,
        per_user_day: editing.per_user_day,
      });
    }
  }, [editing]);

  const limitFields: { key: keyof Limits; label: string; max: number }[] = [
    {
      key: "per_minute",
      label: t("طلبات في الدقيقة للمفتاح", "Requests a minute, whole key"),
      max: 600,
    },
    {
      key: "per_day",
      label: t("طلبات في اليوم للمفتاح", "Requests a day, whole key"),
      max: 100000,
    },
    {
      key: "per_user_minute",
      label: t("لكل مستخدم في الدقيقة", "Per end user, a minute"),
      max: 120,
    },
    { key: "per_user_day", label: t("لكل مستخدم في اليوم", "Per end user, a day"), max: 10000 },
  ];
  const valid =
    name.trim().length >= 2 &&
    limitFields.every(
      (f) => Number.isInteger(limits[f.key]) && limits[f.key] >= 1 && limits[f.key] <= f.max,
    );

  const submit = async () => {
    setSaving(true);
    try {
      const fields = { name: name.trim(), note: note.trim() || null, ...limits };
      if (isNew) {
        const res = await createFn({
          data: { ...fields, expires_in_days: expiry === "never" ? null : Number(expiry) },
        });
        onSaved({ name: fields.name, key: res.key });
      } else if (editing) {
        await updateFn({ data: { id: editing.id, ...fields } });
        toast.success(t("حُفظ", "Saved"));
        onSaved(null);
      }
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!editing} onOpenChange={(v) => !v && !saving && onClose()}>
      <SheetContent
        side={ar ? "left" : "right"}
        className="w-full overflow-y-auto sm:max-w-lg"
        dir={ar ? "rtl" : "ltr"}
      >
        <div className="space-y-4 pb-8">
          <SheetHeader className="text-start">
            <SheetTitle>
              {isNew ? t("مفتاح API جديد", "New API key") : t("تعديل المفتاح", "Edit key")}
            </SheetTitle>
          </SheetHeader>
          <Field
            htmlFor="api-key-name"
            label={t("لمن المفتاح", "Who it is for")}
            hint={t("مثلاً: بوت واتساب الجمعية", "For example: SAAE WhatsApp bot")}
          >
            <Input
              id="api-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              dir="auto"
            />
          </Field>
          <Field htmlFor="api-key-note" label={t("ملاحظة (اختياري)", "Note (optional)")}>
            <Textarea
              id="api-key-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              dir="auto"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {limitFields.map((f) => (
              <Field key={f.key} htmlFor={`api-key-${f.key}`} label={f.label}>
                <Input
                  id={`api-key-${f.key}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={f.max}
                  value={Number.isFinite(limits[f.key]) ? limits[f.key] : ""}
                  onChange={(e) => setLimits((l) => ({ ...l, [f.key]: e.target.valueAsNumber }))}
                  dir="ltr"
                />
              </Field>
            ))}
          </div>
          <p className="text-[12.5px] text-[var(--cx-muted)]">
            {t(
              "«المستخدم» هو الشخص الذي يحادث أبو الجود عبر ذلك النظام، إذا أرسل النظام معرّفه مع كل رسالة. تبدأ الأيام عند منتصف الليل بتوقيت UTC (الثالثة فجراً بدمشق). ولكل المفاتيح معاً سقف يحمي الموقع: 50 طلباً في الدقيقة و2000 في اليوم.",
              "An “end user” is the person talking to Abu Al-Joud through that system, when it sends their id with each message. Days start at midnight UTC (3 am in Damascus). All keys together are also capped at 50 requests a minute and 2,000 a day, so the website always keeps its share.",
            )}
          </p>
          {isNew && (
            <Field label={t("مدة صلاحية المفتاح", "Key expires")}>
              <Seg<Expiry>
                value={expiry}
                onChange={setExpiry}
                options={[
                  { value: "never", label: t("لا ينتهي", "Never") },
                  { value: "30", label: t("30 يوماً", "30 days") },
                  { value: "90", label: t("90 يوماً", "90 days") },
                  { value: "365", label: t("سنة", "1 year") },
                ]}
              />
            </Field>
          )}
          <Button className="w-full" size="lg" onClick={submit} disabled={saving || !valid}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? t("إنشاء المفتاح", "Make the key") : t("حفظ", "Save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreatedKey({
  created,
  onClose,
}: {
  created: { name: string; key: string } | null;
  onClose: () => void;
}) {
  const { t, ar } = useT();
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("نُسخ", "Copied"));
    } catch {
      toast.error(t("تعذّر النسخ، انسخه يدوياً", "Could not copy; copy it by hand"));
    }
  };
  const example = created
    ? `curl -X POST ${endpoint()} \\\n  -H "Authorization: Bearer ${created.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "شو الدورات المتاحة؟"}'`
    : "";

  return (
    <Sheet open={!!created} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={ar ? "left" : "right"}
        className="w-full overflow-y-auto sm:max-w-lg"
        dir={ar ? "rtl" : "ltr"}
      >
        {created && (
          <div className="space-y-4 pb-8">
            <SheetHeader className="text-start">
              <SheetTitle>{t(`مفتاح «${created.name}»`, `The “${created.name}” key`)}</SheetTitle>
              <p className="text-[13px] font-semibold text-[var(--cx-red)]">
                {t(
                  "انسخه الآن واحفظه في مكان آمن. لن يظهر مرة أخرى، فإن ضاع فأوقفه وأنشئ غيره.",
                  "Copy it now and keep it somewhere safe. It will not be shown again; if it is lost, revoke it and make another.",
                )}
              </p>
            </SheetHeader>
            <div className="flex gap-2">
              <Input
                readOnly
                value={created.key}
                dir="ltr"
                className="font-mono text-[13px]"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                onClick={() => copy(created.key)}
                aria-label={t("نسخ", "Copy")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Field label={t("تجربة سريعة", "Quick test")}>
              <pre
                dir="ltr"
                className="overflow-x-auto whitespace-pre rounded-lg bg-[var(--cx-field)] p-3 text-start text-[12px] leading-relaxed"
              >
                {example}
              </pre>
            </Field>
            <p className="text-[12.5px] text-[var(--cx-muted)]">
              {t(
                "الجواب JSON فيه conversation_id: أرسله مع الرسالة التالية لتكمل نفس المحادثة. التفاصيل في docs/chatbot/api.md.",
                "The answer is JSON with a conversation_id: send it with the next message to continue the same conversation. Details in docs/chatbot/api.md.",
              )}
            </p>
            <Button className="w-full" onClick={onClose}>
              {t("نسخته، أغلق", "I've copied it, close")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
