import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  ClipboardList,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import { addNote, deleteNote, getContact, updateContact } from "@/lib/crm.functions";
import { confirmDialog } from "@/hooks/useConfirm";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SaveBar,
  fmtDate,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/admin/crm/contacts/$contactId")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Contact — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ContactPage,
});

type Data = Awaited<ReturnType<typeof getContact>>;
type Status = "new" | "contacted" | "qualified" | "converted" | "archived";
const STAGES: { value: Status; ar: string; en: string }[] = [
  { value: "new", ar: "جديد", en: "New" },
  { value: "contacted", ar: "تواصلنا", en: "Contacted" },
  { value: "qualified", ar: "مهتم فعلاً", en: "Qualified" },
  { value: "converted", ar: "أصبح عميلاً", en: "Converted" },
  { value: "archived", ar: "مؤرشف", en: "Archived" },
];
type Edit = { display_name: string; organization: string; country: string; city: string };

/* One person or company across everything they did with us: leads, form
   answers and the team's notes, newest first. */
function ContactPage() {
  const { contactId } = Route.useParams();
  const { t, ar, lang } = useT();
  const { user } = useAuth();
  const getFn = useServerFn(getContact);
  const updateFn = useServerFn(updateContact);
  const addNoteFn = useServerFn(addNote);
  const deleteNoteFn = useServerFn(deleteNote);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const note = useFormDraft(formDraftKey(user?.id, "crm-contact-note", contactId), "");

  const load = useCallback(async () => {
    setError(false);
    try {
      const d = await getFn({ data: { contactId } });
      setData(d);
      setEdit(toEdit(d.contact));
    } catch {
      setError(true);
    }
  }, [getFn, contactId]);
  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <ErrorNote
        onRetry={load}
        text={t("تعذّر فتح جهة الاتصال.", "Could not open this contact.")}
      />
    );
  if (!data || !edit) return <Loading />;
  const c = data.contact;
  const dirty = JSON.stringify(edit) !== JSON.stringify(toEdit(c));

  const setStage = async (status: Status) => {
    try {
      await updateFn({ data: { contactId, status } });
      setData({ ...data, contact: { ...c, status } });
      toast.success(t("حُدّثت المرحلة", "Stage updated"));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const save = async () => {
    if (!edit.display_name.trim())
      return void toast.error(t("الاسم مطلوب", "The name is required"));
    setSaving(true);
    try {
      await updateFn({
        data: {
          contactId,
          display_name: edit.display_name.trim(),
          organization: edit.organization.trim() || null,
          country: edit.country.trim() || null,
          city: edit.city.trim() || null,
        },
      });
      toast.success(t("حُفظ", "Saved"));
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const post = async () => {
    const body = note.values.trim();
    if (!body) return;
    setPosting(true);
    try {
      await addNoteFn({ data: { contactId, body } });
      note.clearDraft("");
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPosting(false);
    }
  };

  const dropNote = async (id: string) => {
    const ok = await confirmDialog({
      title: t("حذف هذه الملاحظة؟", "Delete this note?"),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNoteFn({ data: { noteId: id } });
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const phone = c.primary_phone?.replace(/[^\d]/g, "");
  const isCompany = c.contact_type === "company";
  const kindLabel = (k: Data["activities"][number]["kind"]) =>
    k === "note"
      ? t("ملاحظة", "Note")
      : k === "form_submission"
        ? t("أجاب على نموذج", "Answered a form")
        : k === "company_lead"
          ? t("طلب شركة", "Company lead")
          : t("سجّل اهتمامه", "Signed up");

  return (
    <div>
      <PageHeader
        back={{ to: "/admin/leads", label: t("العملاء المحتملون", "Leads") }}
        eyebrow={t("إدارة الموقع · جهة اتصال", "Website · Contact")}
        title={c.display_name}
        meta={
          <>
            <Pill tone="teal">
              {isCompany ? <Building2 /> : <User />}
              {isCompany ? t("شركة", "Company") : t("فرد", "Individual")}
            </Pill>
            <span className="text-[13px] text-[var(--cx-muted)]">
              {t("منذ", "Since")} {fmtDate(c.created_at, lang)}
            </span>
          </>
        }
        actions={
          <>
            {c.primary_email && (
              <Button asChild variant="outline">
                <a href={`mailto:${c.primary_email}`}>
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

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={t("المرحلة", "Stage")}>
        {STAGES.map((s, i) => {
          const at = STAGES.findIndex((x) => x.value === c.status);
          const on = s.value === c.status;
          const past = s.value !== "archived" && i < at && c.status !== "archived";
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => !on && setStage(s.value)}
              className={`rounded-full border px-4 py-2 text-[13.5px] font-bold transition-colors ${
                on
                  ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white"
                  : past
                    ? "border-[var(--cx-line)] bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"
                    : "border-[var(--cx-line)] text-[var(--cx-muted)] hover:border-[var(--cx-teal)] hover:text-[var(--cx-ink)]"
              }`}
            >
              {ar ? s.ar : s.en}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title={t("ملاحظة جديدة", "New note")}>
            <Textarea
              rows={3}
              value={note.values}
              onChange={(e) => note.setValues(e.target.value)}
              placeholder={t("ماذا حدث؟ ماذا بعد؟", "What happened? What's next?")}
              dir="auto"
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={post} disabled={posting || !note.values.trim()}>
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4" />
                )}
                {t("إضافة", "Add")}
              </Button>
            </div>
          </Panel>

          <Panel title={t("كل ما حدث", "Everything so far")} flush>
            {data.activities.length === 0 ? (
              <p className="p-5 text-[14px] text-[var(--cx-muted)]">
                {t("لا شيء بعد.", "Nothing yet.")}
              </p>
            ) : (
              <ol className="relative space-y-0 px-5 py-4">
                {data.activities.map((a) => {
                  const Icon =
                    a.kind === "note"
                      ? StickyNote
                      : a.kind === "form_submission"
                        ? ClipboardList
                        : UserPlus;
                  const sub =
                    a.kind === "form_submission"
                      ? data.formSubmissions.find((s) => s.id === a.id)
                      : null;
                  const form = sub
                    ? (sub as unknown as {
                        form_id: string;
                        dynamic_forms?: { name_ar: string; name_en: string } | null;
                      })
                    : null;
                  return (
                    <li key={`${a.kind}-${a.id}`} className="relative flex gap-3 pb-5 last:pb-0">
                      <span
                        className="absolute bottom-0 top-9 w-px bg-[var(--cx-line)] start-[17px] last:hidden"
                        aria-hidden="true"
                      />
                      <span
                        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.kind === "note" ? "bg-[var(--cx-orange-50)] text-[var(--cx-orange-ink)]" : "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold">
                          {kindLabel(a.kind)}
                          {form?.dynamic_forms && (
                            <Link
                              to="/admin/forms/$formId"
                              params={{ formId: form.form_id }}
                              className="font-semibold text-[var(--cx-teal)] hover:underline"
                            >
                              {ar ? form.dynamic_forms.name_ar : form.dynamic_forms.name_en}
                            </Link>
                          )}
                          {a.source && (
                            <span className="text-[12px] font-normal text-[var(--cx-muted)]">
                              · {a.source}
                            </span>
                          )}
                          <span className="ms-auto text-[12px] font-normal text-[var(--cx-muted)]">
                            {fmtDate(a.timestamp, lang, true)}
                          </span>
                        </div>
                        {a.kind === "form_submission" && sub ? (
                          <dl className="mt-2 grid gap-1.5 rounded-xl bg-[var(--cx-raise)] p-3 text-[13px]">
                            {Object.entries((sub.values ?? {}) as Record<string, unknown>).map(
                              ([k, v]) => (
                                <div key={k} className="grid grid-cols-[minmax(0,140px)_1fr] gap-2">
                                  <dt className="truncate text-[var(--cx-muted)]">{k}</dt>
                                  <dd className="whitespace-pre-wrap" dir="auto">
                                    {Array.isArray(v)
                                      ? v.join("، ")
                                      : v == null || v === ""
                                        ? "—"
                                        : String(v)}
                                  </dd>
                                </div>
                              ),
                            )}
                          </dl>
                        ) : (
                          a.subtitle && (
                            <p
                              className="mt-1 whitespace-pre-wrap text-[14px] text-[var(--cx-ink-2)]"
                              dir="auto"
                            >
                              {a.subtitle}
                            </p>
                          )
                        )}
                        {a.kind === "note" && (
                          <button
                            type="button"
                            onClick={() => dropNote(a.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("حذف", "Delete")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title={t("البيانات", "Details")}>
            <div className="space-y-3">
              <Field label={t("الاسم", "Name")}>
                <Input
                  value={edit.display_name}
                  onChange={(e) => setEdit({ ...edit, display_name: e.target.value })}
                />
              </Field>
              <Field label={t("المؤسسة", "Organisation")}>
                <Input
                  value={edit.organization}
                  onChange={(e) => setEdit({ ...edit, organization: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("الدولة", "Country")}>
                  <Input
                    value={edit.country}
                    onChange={(e) => setEdit({ ...edit, country: e.target.value })}
                  />
                </Field>
                <Field label={t("المدينة", "City")}>
                  <Input
                    value={edit.city}
                    onChange={(e) => setEdit({ ...edit, city: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Panel>
          <Panel title={t("طرق التواصل", "Ways to reach")}>
            <ul className="space-y-2 text-[14px]">
              {c.primary_email && (
                <li className="flex items-center gap-2" dir="ltr">
                  <Mail className="h-4 w-4 text-[var(--cx-teal)]" />
                  {c.primary_email}
                </li>
              )}
              {c.primary_phone && (
                <li className="flex items-center gap-2" dir="ltr">
                  <Phone className="h-4 w-4 text-[var(--cx-teal)]" />
                  {c.primary_phone}
                </li>
              )}
              {data.identities
                .filter((i) => {
                  const v = i.identity_value.toLowerCase();
                  return (
                    v !== (c.primary_email ?? "").toLowerCase() &&
                    v.replace(/[^\d]/g, "") !== (phone ?? "-")
                  );
                })
                .map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-2 text-[var(--cx-ink-2)]"
                    dir="ltr"
                  >
                    {i.identity_type === "email" ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {i.identity_value}
                  </li>
                ))}
            </ul>
            {c.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.tags.map((tag: string) => (
                  <Pill key={tag} tone="gray">
                    {tag}
                  </Pill>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>

      <SaveBar show={dirty} saving={saving} onSave={save} onDiscard={() => setEdit(toEdit(c))} />
    </div>
  );
}

function toEdit(c: Data["contact"]): Edit {
  return {
    display_name: c.display_name ?? "",
    organization: c.organization ?? "",
    country: c.country ?? "",
    city: c.city ?? "",
  };
}
