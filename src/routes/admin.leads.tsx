import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  UserRound,
  UsersRound,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import {
  listIndividualLeads,
  listCompanyLeads,
  exportIndividualLeads,
  exportCompanyLeads,
  setLeadStatus,
  addLeadNote,
  createIndividualLead,
  createCompanyLead,
  listLatestNotesForContacts,
  getIndividualLead,
  getCompanyLead,
  updateIndividualLead,
  updateCompanyLead,
} from "@/lib/crm.functions";
import { getConversationMessages } from "@/lib/admin-chat.functions";
import { toUserMessage } from "@/lib/safe-error";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import {
  EmptyState,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

type Kind = "people" | "companies";
type Status = "new" | "contacted" | "qualified" | "converted" | "archived";
const STATUSES: Status[] = ["new", "contacted", "qualified", "converted", "archived"];
const PAGE_SIZE = 25;

type Search = {
  kind?: Kind;
  q?: string;
  status?: Status;
  from?: string;
  to?: string;
  page?: number;
  id?: string;
};

export const Route = createFileRoute("/admin/leads")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Leads — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    kind: s.kind === "companies" ? "companies" : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    status: STATUSES.includes(s.status as Status) ? (s.status as Status) : undefined,
    from: typeof s.from === "string" && s.from ? s.from : undefined,
    to: typeof s.to === "string" && s.to ? s.to : undefined,
    page: Number(s.page) > 1 ? Number(s.page) : undefined,
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: LeadsPage,
});

const STATUS_UI: Record<
  Status,
  { ar: string; en: string; tone: "orange" | "teal" | "green" | "gray" }
> = {
  new: { ar: "جديد", en: "New", tone: "orange" },
  contacted: { ar: "تم التواصل", en: "Contacted", tone: "teal" },
  qualified: { ar: "مؤهَّل", en: "Qualified", tone: "teal" },
  converted: { ar: "تحوّل لعميل", en: "Converted", tone: "green" },
  archived: { ar: "مؤرشف", en: "Archived", tone: "gray" },
};

function useStatusLabel() {
  const { ar } = useT();
  return (s: string) =>
    STATUS_UI[s as Status] ? (ar ? STATUS_UI[s as Status].ar : STATUS_UI[s as Status].en) : s;
}

type Row = Record<string, unknown>;
type Note = {
  id: string;
  contact_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

/* People and companies who showed interest (chatbot, forms, added by hand),
   moved through a simple pipeline: new → contacted → qualified → converted. */
function LeadsPage() {
  const { t, lang } = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const kind: Kind = search.kind ?? "people";
  const page = search.page ?? 1;
  const statusLabel = useStatusLabel();

  const listInd = useServerFn(listIndividualLeads);
  const listComp = useServerFn(listCompanyLeads);
  const expInd = useServerFn(exportIndividualLeads);
  const expComp = useServerFn(exportCompanyLeads);
  const fetchNotes = useServerFn(listLatestNotesForContacts);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [qInput, setQInput] = useState(search.q ?? "");
  const [newOpen, setNewOpen] = useState(false);

  const go = useCallback(
    (patch: Partial<Search>) =>
      navigate({ search: (prev: Search) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  );

  useEffect(() => setQInput(search.q ?? ""), [search.q]);
  useEffect(() => {
    const h = setTimeout(() => {
      if ((qInput || undefined) !== search.q) go({ q: qInput || undefined, page: undefined });
    }, 300);
    return () => clearTimeout(h);
  }, [qInput, search.q, go]);

  const filters = useMemo(
    () => ({
      search: search.q || undefined,
      status: search.status || undefined,
      from: search.from ? new Date(search.from).toISOString() : undefined,
      to: search.to ? new Date(search.to + "T23:59:59").toISOString() : undefined,
    }),
    [search.q, search.status, search.from, search.to],
  );

  const load = useCallback(() => {
    setRows(null);
    const args = { data: { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE } };
    (kind === "people" ? listInd(args) : listComp(args))
      .then((r) => {
        const list = r.rows as Row[];
        setRows(list);
        setTotal(r.total);
        const ids = [...new Set(list.map((x) => String(x.contact_id ?? "")).filter(Boolean))];
        if (ids.length)
          fetchNotes({ data: { contactIds: ids } })
            .then((n) => setNotes(n.notes as Record<string, Note>))
            .catch(() => {});
        else setNotes({});
      })
      .catch((e) => {
        toast.error(toUserMessage(e));
        setRows([]);
      });
  }, [filters, page, kind, listInd, listComp, fetchNotes]);
  useEffect(() => load(), [load]);

  const doExport = async () => {
    try {
      const r =
        kind === "people" ? await expInd({ data: filters }) : await expComp({ data: filters });
      const list = r.rows as Row[];
      await exportRowsToXlsx({
        filenameBase: kind === "people" ? "individual-leads" : "company-leads",
        sheetName: kind === "people" ? "Individual Leads" : "Company Leads",
        rtl: lang === "ar",
        rows: list,
        columns:
          kind === "people"
            ? [
                { header: t("الاسم", "Name"), get: (x) => x.full_name },
                { header: t("البريد", "Email"), get: (x) => x.email },
                { header: t("الهاتف", "Phone"), get: (x) => x.phone },
                { header: t("الاختصاص", "Specialty"), get: (x) => x.specialty },
                { header: t("المجال", "Work field"), get: (x) => x.work_field },
                { header: t("العنوان", "Address"), get: (x) => x.address },
                { header: t("وصف", "Description"), get: (x) => x.short_description },
                { header: t("المصدر", "Source"), get: (x) => x.source },
                { header: t("الحالة", "Status"), get: (x) => x.status },
                { header: t("التاريخ", "Date"), type: "date", get: (x) => x.created_at },
              ]
            : [
                { header: t("الشركة", "Company"), get: (x) => x.company_name },
                { header: t("جهة التواصل", "Contact"), get: (x) => x.contact_name },
                { header: t("البريد", "Email"), get: (x) => x.contact_email },
                { header: t("الهاتف", "Phone"), get: (x) => x.contact_phone },
                { header: t("المجال", "Work field"), get: (x) => x.work_field },
                { header: t("البلد", "Country"), get: (x) => x.country },
                { header: t("العنوان", "Office address"), get: (x) => x.office_address },
                { header: t("المصدر", "Source"), get: (x) => x.source },
                { header: t("الحالة", "Status"), get: (x) => x.status },
                { header: t("التاريخ", "Date"), type: "date", get: (x) => x.created_at },
              ],
      });
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      toast.error(
        msg.startsWith("export_too_large")
          ? t("التصدير كبير جداً — ضيّق الفلاتر.", "Export too large — narrow the filters.")
          : toUserMessage(e),
      );
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const name = (r: Row) => String((kind === "people" ? r.full_name : r.company_name) ?? "—");
  const email = (r: Row) => (kind === "people" ? r.email : r.contact_email) as string | null;
  const phone = (r: Row) => (kind === "people" ? r.phone : r.contact_phone) as string | null;
  const sub = (r: Row) =>
    kind === "people"
      ? (r.specialty as string) || (r.work_field as string)
      : [r.contact_name, r.work_field].filter(Boolean).join(" · ");

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("العملاء المحتملون", "Leads")}
        description={t(
          "من أبدى اهتماماً عبر المساعد الذكي أو النماذج أو أضافه الفريق. حرّكهم عبر المراحل حتى يصبحوا عملاء.",
          "People who showed interest through the chatbot, forms, or were added by the team. Move them through the stages until they convert.",
        )}
        actions={
          <>
            <Button variant="outline" onClick={doExport}>
              <Download className="h-4 w-4" />
              {t("تصدير Excel", "Export Excel")}
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              {kind === "people" ? t("شخص جديد", "New person") : t("شركة جديدة", "New company")}
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={kind}
          onChange={(k) =>
            go({ kind: k === "people" ? undefined : k, page: undefined, id: undefined })
          }
          options={[
            { value: "people", label: t("أفراد", "People") },
            { value: "companies", label: t("شركات", "Companies") },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="date"
            value={search.from ?? ""}
            onChange={(e) => go({ from: e.target.value || undefined, page: undefined })}
            className="h-10 w-[150px]"
            aria-label={t("من", "From")}
          />
          <Input
            type="date"
            value={search.to ?? ""}
            onChange={(e) => go({ to: e.target.value || undefined, page: undefined })}
            className="h-10 w-[150px]"
            aria-label={t("إلى", "To")}
          />
          <SearchInput
            value={qInput}
            onChange={setQInput}
            placeholder={t("اسم، بريد أو هاتف", "Name, email or phone")}
          />
        </div>
      </div>
      <div className="mb-4">
        <Seg
          value={(search.status ?? "all") as Status | "all"}
          onChange={(s) => go({ status: s === "all" ? undefined : s, page: undefined })}
          options={[
            { value: "all" as const, label: t("كل المراحل", "All stages") },
            ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
          ]}
        />
      </div>

      <Panel flush>
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={UsersRound} title={t("لا توجد نتائج", "No leads found")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table min-w-[820px]">
              <thead>
                <tr>
                  <th>{kind === "people" ? t("الشخص", "Person") : t("الشركة", "Company")}</th>
                  <th>{t("التواصل", "Contact")}</th>
                  <th>{t("المرحلة", "Stage")}</th>
                  <th>{t("آخر ملاحظة", "Latest note")}</th>
                  <th>{t("التاريخ", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const note = r.contact_id ? notes[String(r.contact_id)] : undefined;
                  const st = (r.status as Status) ?? "new";
                  return (
                    <tr
                      key={String(r.id)}
                      data-link="true"
                      onClick={() => go({ id: String(r.id) })}
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                            {kind === "people" ? (
                              <UserRound className="h-4 w-4" />
                            ) : (
                              <Building2 className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-bold">{name(r)}</div>
                            {sub(r) && (
                              <div className="max-w-[240px] truncate text-[12.5px] text-[var(--cx-muted)]">
                                {sub(r)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-[13px]" dir="ltr">
                        <div className="truncate">{email(r) ?? "—"}</div>
                        <div className="text-[var(--cx-muted)]">{phone(r) ?? ""}</div>
                      </td>
                      <td>
                        <Pill tone={STATUS_UI[st]?.tone ?? "gray"}>{statusLabel(st)}</Pill>
                      </td>
                      <td className="max-w-[260px]">
                        {note ? (
                          <p
                            className="line-clamp-2 text-[12.5px] text-[var(--cx-ink-2)]"
                            dir="auto"
                          >
                            {note.body}
                          </p>
                        ) : (
                          <span className="text-[var(--cx-muted)]">—</span>
                        )}
                      </td>
                      <td className="text-[13px] text-[var(--cx-muted)]">
                        {fmtDate(String(r.created_at), lang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-3 flex items-center justify-between text-[13px] text-[var(--cx-muted)]">
        <span>{t(`${fmtNum(total, lang)} نتيجة`, `${fmtNum(total, lang)} results`)}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 > 1 ? page - 1 : undefined })}
            aria-label={t("السابق", "Previous")}
          >
            <ChevronRight className="h-4 w-4 ltr:rotate-180" />
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages}
            onClick={() => go({ page: page + 1 })}
            aria-label={t("التالي", "Next")}
          >
            <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
          </Button>
        </div>
      </div>

      <LeadSheet
        kind={kind}
        leadId={search.id}
        onClose={() => go({ id: undefined })}
        onChanged={load}
      />
      <NewLeadDialog open={newOpen} onOpenChange={setNewOpen} kind={kind} onCreated={load} />
    </div>
  );
}

/* ---------- One lead ---------- */

function LeadSheet({
  kind,
  leadId,
  onClose,
  onChanged,
}: {
  kind: Kind;
  leadId?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { ar } = useT();
  return (
    <Sheet open={!!leadId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={ar ? "left" : "right"}
        className="w-full overflow-y-auto sm:max-w-xl"
        dir={ar ? "rtl" : "ltr"}
      >
        {leadId && <LeadDetail key={leadId} kind={kind} leadId={leadId} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  );
}

const PEOPLE_FIELDS = [
  ["email", "البريد", "Email", true],
  ["phone", "الهاتف", "Phone", true],
  ["specialty", "الاختصاص", "Specialty", false],
  ["work_field", "المجال", "Work field", false],
  ["address", "العنوان", "Address", false],
  ["short_description", "وصف قصير", "Short description", false],
] as const;
const COMPANY_FIELDS = [
  ["contact_name", "اسم جهة التواصل", "Contact name", false],
  ["contact_email", "بريد التواصل", "Contact email", true],
  ["contact_phone", "هاتف التواصل", "Contact phone", true],
  ["work_field", "المجال", "Work field", false],
  ["country", "البلد", "Country", false],
  ["office_address", "عنوان المكتب", "Office address", false],
] as const;

function LeadDetail({
  kind,
  leadId,
  onChanged,
}: {
  kind: Kind;
  leadId: string;
  onChanged: () => void;
}) {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const statusLabel = useStatusLabel();
  const { user } = useAuth();
  const type = kind === "people" ? "individual" : "company";
  const getInd = useServerFn(getIndividualLead);
  const getComp = useServerFn(getCompanyLead);
  const updInd = useServerFn(updateIndividualLead);
  const updComp = useServerFn(updateCompanyLead);
  const setStatusFn = useServerFn(setLeadStatus);
  const addNoteFn = useServerFn(addLeadNote);
  const fetchMsgs = useServerFn(getConversationMessages);

  const [data, setData] = useState<Awaited<ReturnType<typeof getIndividualLead>> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ id: string; role: string; content: string }[] | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const note = useFormDraft(formDraftKey(user?.id, "crm-lead-note", leadId), "");

  const fields = kind === "people" ? PEOPLE_FIELDS : COMPANY_FIELDS;
  const load = useCallback(async () => {
    try {
      const r = (
        kind === "people" ? await getInd({ data: { leadId } }) : await getComp({ data: { leadId } })
      ) as Awaited<ReturnType<typeof getIndividualLead>>;
      setData(r);
      const lead = r.lead as Record<string, unknown>;
      setForm(Object.fromEntries(fields.map(([k]) => [k, (lead[k] as string) ?? ""])));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, leadId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Loading />;
  const lead = data.lead as Record<string, unknown>;
  const contact = data.contact as Record<string, unknown> | null;
  const status = (lead.status as Status) ?? "new";
  const changed = fields.some(([k]) => (form[k] ?? "") !== ((lead[k] as string) ?? ""));

  const setStatus = async (s: Status) => {
    setBusy(true);
    try {
      await setStatusFn({ data: { leadType: type, leadId, status: s } });
      toast.success(t(`نُقل إلى: ${statusLabel(s)}`, `Moved to: ${statusLabel(s)}`));
      qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
      await load();
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveFields = async () => {
    setBusy(true);
    try {
      const patch = Object.fromEntries(
        fields
          .filter(([k]) => (form[k] ?? "") !== ((lead[k] as string) ?? ""))
          .map(([k]) => [k, form[k]]),
      );
      if (kind === "people") await updInd({ data: { leadId, ...patch } });
      else await updComp({ data: { leadId, ...patch } });
      toast.success(t("تم الحفظ", "Saved"));
      await load();
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.values.trim()) return;
    setBusy(true);
    try {
      await addNoteFn({ data: { leadType: type, leadId, body: note.values.trim() } });
      note.clearDraft("");
      toast.success(t("أُضيفت الملاحظة", "Note added"));
      await load();
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    const convId = lead.conversation_id as string | null;
    if (!convId) return;
    setChatOpen(true);
    setChat(null);
    try {
      const r = await fetchMsgs({ data: { conversationId: convId } });
      setChat(r.messages as { id: string; role: string; content: string }[]);
    } catch (e) {
      toast.error(toUserMessage(e));
      setChatOpen(false);
    }
  };

  const title = String((kind === "people" ? lead.full_name : lead.company_name) ?? "—");
  const mail = (kind === "people" ? lead.email : lead.contact_email) as string | null;
  const tel = (kind === "people" ? lead.phone : lead.contact_phone) as string | null;

  return (
    <div className="space-y-5 pb-10">
      <SheetHeader className="text-start">
        <SheetTitle>{title}</SheetTitle>
        <p className="text-[13px] text-[var(--cx-muted)]">
          {t("أُضيف في", "Added")} {fmtDate(String(lead.created_at), lang, true)}
          {lead.source ? ` · ${String(lead.source)}` : ""}
        </p>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        {mail && (
          <Button asChild size="sm" variant="outline">
            <a href={`mailto:${mail}`}>
              <Mail className="h-4 w-4" />
              {t("بريد", "Email")}
            </a>
          </Button>
        )}
        {tel && (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${tel}`}>
              <Phone className="h-4 w-4" />
              {t("اتصال", "Call")}
            </a>
          </Button>
        )}
        {!!lead.conversation_id && (
          <Button size="sm" variant="outline" onClick={openChat}>
            <MessageSquare className="h-4 w-4" />
            {t("المحادثة مع المساعد", "Chatbot conversation")}
          </Button>
        )}
      </div>

      <section>
        <div className="mb-2 text-[13px] font-bold text-[var(--cx-ink-2)]">
          {t("المرحلة", "Stage")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => s !== status && setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-bold ${s === status ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white" : "border-[var(--cx-line)] bg-[var(--cx-field)] hover:border-[var(--cx-teal)]"}`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-3 text-[14px] font-extrabold">{t("البيانات", "Details")}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, a, e, ltr]) => (
            <Field
              key={k}
              label={t(a, e)}
              className={k === "short_description" ? "sm:col-span-2" : ""}
            >
              {k === "short_description" ? (
                <Textarea
                  rows={3}
                  value={form[k] ?? ""}
                  onChange={(ev) => setForm({ ...form, [k]: ev.target.value })}
                />
              ) : (
                <Input
                  dir={ltr ? "ltr" : undefined}
                  value={form[k] ?? ""}
                  onChange={(ev) => setForm({ ...form, [k]: ev.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        {changed && (
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setForm(Object.fromEntries(fields.map(([k]) => [k, (lead[k] as string) ?? ""])))
              }
            >
              {t("تجاهل", "Discard")}
            </Button>
            <Button size="sm" onClick={saveFields} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("حفظ البيانات", "Save details")}
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--cx-line)] p-4">
        <div className="mb-2 text-[14px] font-extrabold">{t("إضافة ملاحظة", "Add a note")}</div>
        <Textarea
          rows={3}
          dir="auto"
          value={note.values}
          onChange={(e) => note.setValues(e.target.value)}
          placeholder={t("ماذا حدث؟ ما الخطوة التالية؟", "What happened? What's next?")}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={addNote} disabled={busy || !note.values.trim()}>
            <StickyNote className="h-4 w-4" />
            {t("إضافة", "Add")}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-2 text-[14px] font-extrabold">{t("السجل", "Activity")}</div>
        <ol className="space-y-2">
          {data.activities.map((a) => (
            <li
              key={`${a.kind}-${a.id}`}
              className="rounded-xl border border-[var(--cx-line)] bg-[var(--cx-field)] p-3"
            >
              <div className="flex items-center gap-2 text-[13px] font-bold">
                {a.kind === "note" ? (
                  <StickyNote className="h-4 w-4 text-[var(--cx-orange-ink)]" />
                ) : (
                  <FileText className="h-4 w-4 text-[var(--cx-teal)]" />
                )}
                {a.kind === "note"
                  ? t("ملاحظة", "Note")
                  : a.kind === "form_submission"
                    ? t("تعبئة نموذج", "Form submission")
                    : t("إنشاء", "Created")}
                <span className="ms-auto text-[12px] font-normal text-[var(--cx-muted)]">
                  {fmtDate(a.timestamp, lang, true)}
                </span>
              </div>
              {a.subtitle && (
                <p
                  className="mt-1 whitespace-pre-wrap text-[13.5px] text-[var(--cx-ink-2)]"
                  dir="auto"
                >
                  {a.subtitle}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {contact && (
        <Link
          to="/admin/crm/contacts/$contactId"
          params={{ contactId: String(contact.id) }}
          className="flex items-center gap-2 rounded-xl border border-[var(--cx-line)] p-3 text-[13.5px] font-bold text-[var(--cx-teal)] hover:border-[var(--cx-teal)]"
        >
          <ExternalLink className="h-4 w-4" />
          {t("سجل جهة الاتصال الكامل:", "Full contact record:")} {String(contact.display_name)}
        </Link>
      )}

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("المحادثة مع المساعد الذكي", "Chatbot conversation")}</DialogTitle>
            <DialogDescription className="sr-only">{title}</DialogDescription>
          </DialogHeader>
          {chat === null ? (
            <Loading />
          ) : (
            <div className="space-y-2.5">
              {chat.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] ${m.role === "user" ? "bg-[var(--cx-petrol)] text-white" : "bg-[var(--cx-raise-2)]"}`}
                    dir="auto"
                  >
                    {m.content || <em className="opacity-60">[{m.role}]</em>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- New lead ---------- */

function NewLeadDialog({
  open,
  onOpenChange,
  kind,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: Kind;
  onCreated: () => void;
}) {
  const { t } = useT();
  const createInd = useServerFn(createIndividualLead);
  const createComp = useServerFn(createCompanyLead);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (!open) {
      setForm({});
      setConflict(false);
    }
  }, [open]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (override = false) => {
    const nameKey = kind === "people" ? "full_name" : "company_name";
    if (!(form[nameKey] ?? "").trim()) {
      toast.error(
        kind === "people"
          ? t("الاسم مطلوب", "The name is required")
          : t("اسم الشركة مطلوب", "The company name is required"),
      );
      return;
    }
    setSaving(true);
    try {
      if (kind === "people") {
        await createInd({
          data: {
            full_name: form.full_name ?? "",
            email: form.email,
            phone: form.phone,
            specialty: form.specialty,
            work_field: form.work_field,
            address: form.address,
            short_description: form.short_description,
            override_conflict: override,
          },
        });
      } else {
        await createComp({
          data: {
            company_name: form.company_name ?? "",
            contact_name: form.contact_name,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone,
            work_field: form.work_field,
            country: form.country,
            office_address: form.office_address,
            override_conflict: override,
          },
        });
      }
      toast.success(t("تمت الإضافة", "Added"));
      onOpenChange(false);
      onCreated();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("identity_conflict")) setConflict(true);
      else toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const fields =
    kind === "people"
      ? ([
          ["full_name", "الاسم الكامل *", "Full name *"],
          ...PEOPLE_FIELDS.map(([k, a, e]) => [k, a, e]),
        ] as [string, string, string][])
      : ([
          ["company_name", "اسم الشركة *", "Company name *"],
          ...COMPANY_FIELDS.map(([k, a, e]) => [k, a, e]),
        ] as [string, string, string][]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {kind === "people" ? t("إضافة شخص", "Add a person") : t("إضافة شركة", "Add a company")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "يُربط تلقائياً بجهة اتصال موجودة إن وُجد نفس البريد أو الهاتف.",
              "Links to an existing contact automatically when the email or phone matches.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, a, e]) => (
            <Field
              key={k}
              label={t(a, e)}
              className={k === "short_description" ? "sm:col-span-2" : ""}
            >
              {k === "short_description" ? (
                <Textarea rows={3} value={form[k] ?? ""} onChange={set(k)} />
              ) : (
                <Input value={form[k] ?? ""} onChange={set(k)} />
              )}
            </Field>
          ))}
        </div>
        {conflict && (
          <div className="rounded-xl bg-[var(--cx-orange-50)] p-3 text-[13.5px] text-[var(--cx-orange-ink)]">
            {t(
              "يوجد عميل بنفس البريد أو الهاتف.",
              "A lead with the same email or phone already exists.",
            )}
            <Button size="sm" className="ms-2" onClick={() => submit(true)} disabled={saving}>
              {t("أضف على أي حال", "Add anyway")}
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={() => submit(false)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إضافة", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
