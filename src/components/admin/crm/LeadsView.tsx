import { useEffect, useMemo, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, MessageSquare, Plus, Download, Search, StickyNote, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  listIndividualLeads, listCompanyLeads,
  exportIndividualLeads, exportCompanyLeads,
  setLeadStatus, addLeadNote,
  createIndividualLead, createCompanyLead,
  listLatestNotesForContacts,
} from "@/lib/crm.functions";
import { getConversationMessages } from "@/lib/admin-chat.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";

type Message = { id: string; role: string; content: string; created_at: string };
type LeadStatusT = "new" | "contacted" | "qualified" | "converted" | "archived";

const STATUSES: LeadStatusT[] = ["new", "contacted", "qualified", "converted", "archived"];
const PAGE_SIZE = 25;

const STATUS_LABELS = {
  ar: { new: "جديد", contacted: "تم التواصل", qualified: "مؤهل", converted: "تم التحويل", archived: "مؤرشف" },
  en: { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", archived: "Archived" },
} as const;
const statusLabel = (s: LeadStatusT, lang: "ar" | "en") => STATUS_LABELS[lang][s];

const T = {
  ar: {
    heading: "الـ Leads", newLead: "Lead جديد", export: "تصدير Excel", reset: "إعادة تعيين",
    searchPh: "بحث بالاسم، إيميل، هاتف...",
    status: "الحالة", allStatuses: "كل الحالات", source: "المصدر",
    from: "من", to: "إلى",
    total: "الإجمالي", noLeads: "لا توجد نتائج", actions: "إجراءات",
    viewChat: "عرض المحادثة", noChatLinked: "لا توجد محادثة مرتبطة",
    conversations: "المحادثات", addNote: "إضافة ملاحظة", details: "تفاصيل",
    name: "الاسم", email: "إيميل", phone: "هاتف", specialty: "اختصاص",
    description: "وصف", date: "التاريخ", company: "الشركة", field: "المجال",
    contact: "جهة التواصل", noteBody: "الملاحظة", save: "حفظ", cancel: "إلغاء",
    prev: "السابق", next: "التالي", page: "صفحة",
    saving: "جاري الحفظ...", saved: "تم الحفظ",
    exportTooLarge: "التصدير كبير جداً — استخدم فلاتر لتقليل النتائج.",
    createInd: "إضافة فرد جديد", createComp: "إضافة شركة جديدة",
    fullName: "الاسم الكامل", workField: "المجال", address: "العنوان",
    shortDesc: "وصف قصير", companyName: "اسم الشركة", contactName: "اسم جهة التواصل",
    contactEmail: "إيميل التواصل", contactPhone: "هاتف التواصل",
    country: "البلد", officeAddress: "عنوان المكتب",
    duplicateFound: "يوجد Lead مرتبط بنفس البريد أو الهاتف. أنشئ على أي حال؟",
    createAnyway: "أنشئ على أي حال",
    notes: "الملاحظات", more: "عرض المزيد", noteTitle: "الملاحظة",
  },
  en: {
    heading: "Leads", newLead: "New Lead", export: "Export Excel", reset: "Reset",
    searchPh: "Search by name, email, phone...",
    status: "Status", allStatuses: "All statuses", source: "Source",
    from: "From", to: "To",
    total: "Total", noLeads: "No results", actions: "Actions",
    viewChat: "View chat", noChatLinked: "No linked chat",
    conversations: "Conversation", addNote: "Add note", details: "Details",
    name: "Name", email: "Email", phone: "Phone", specialty: "Specialty",
    description: "Description", date: "Date", company: "Company", field: "Field",
    contact: "Contact", noteBody: "Note body", save: "Save", cancel: "Cancel",
    prev: "Prev", next: "Next", page: "Page",
    saving: "Saving...", saved: "Saved",
    exportTooLarge: "Export too large — narrow the filters.",
    createInd: "New individual lead", createComp: "New company lead",
    fullName: "Full name", workField: "Work field", address: "Address",
    shortDesc: "Short description", companyName: "Company name", contactName: "Contact name",
    contactEmail: "Contact email", contactPhone: "Contact phone",
    country: "Country", officeAddress: "Office address",
    duplicateFound: "A lead with the same email/phone already exists. Create anyway?",
    createAnyway: "Create anyway",
    notes: "Notes", more: "More", noteTitle: "Note",
  },
};

type Variant = "individuals" | "companies";
type SearchParams = {
  q?: string;
  status?: LeadStatusT | "";
  source?: string; // legacy — accepted for URL cleanup only
  from?: string;
  to?: string;
  page?: number;
};

export function LeadsView({ variant }: { variant: Variant }) {
  const { lang } = useLang();
  const tr = T[lang];
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as SearchParams;

  const q = search.q ?? "";
  const status = (search.status ?? "") as LeadStatusT | "";
  const from = search.from ?? "";
  const to = search.to ?? "";
  const page = Math.max(1, Number(search.page ?? 1));

  const routeTo = variant === "individuals" ? "/admin/crm/leads/individuals" : "/admin/crm/leads/companies";

  const updateSearch = useCallback(
    (patch: Partial<SearchParams>) => {
      nav({
        to: routeTo,
        search: (prev: SearchParams) => {
          const merged = { ...prev, ...patch };
          // Strip legacy source key entirely.
          delete (merged as SearchParams).source;
          for (const k of Object.keys(merged) as (keyof SearchParams)[]) {
            if (merged[k] === "" || merged[k] === undefined || merged[k] === null) delete merged[k];
          }
          return merged;
        },
        replace: true,
      });
    },
    [nav, routeTo],
  );

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) updateSearch({ q: qInput || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, q, updateSearch]);

  const listInd = useServerFn(listIndividualLeads);
  const listComp = useServerFn(listCompanyLeads);
  const expInd = useServerFn(exportIndividualLeads);
  const expComp = useServerFn(exportCompanyLeads);
  const setStatusFn = useServerFn(setLeadStatus);
  const addNoteFn = useServerFn(addLeadNote);
  const createIndFn = useServerFn(createIndividualLead);
  const createCompFn = useServerFn(createCompanyLead);
  const fetchMsgs = useServerFn(getConversationMessages);
  const fetchNotes = useServerFn(listLatestNotesForContacts);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [latestNotes, setLatestNotes] = useState<Record<string, { body: string; created_at: string }>>({});

  const filters = useMemo(
    () => ({
      search: q || undefined,
      status: status || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    }),
    [q, status, from, to],
  );

  const loadNotesFor = useCallback(
    (contactIds: string[]) => {
      const ids = Array.from(new Set(contactIds.filter(Boolean)));
      if (ids.length === 0) { setLatestNotes({}); return; }
      fetchNotes({ data: { contactIds: ids } })
        .then((r) => setLatestNotes(r.notes))
        .catch(() => { /* non-fatal */ });
    },
    [fetchNotes],
  );

  const reload = useCallback(() => {
    setLoading(true);
    const args = { data: { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE } };
    const p = variant === "individuals" ? listInd(args) : listComp(args);
    p.then((r) => {
      const nextRows = r.rows as Record<string, unknown>[];
      setRows(nextRows);
      setTotal(r.total);
      loadNotesFor(nextRows.map((row) => String(row.contact_id ?? "")).filter(Boolean));
    })
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, [filters, page, variant, listInd, listComp, loadNotesFor]);

  useEffect(() => reload(), [reload]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // --- inline status ---
  const [savingId, setSavingId] = useState<string | null>(null);
  const handleStatusChange = async (leadId: string, newStatus: LeadStatusT) => {
    setSavingId(leadId);
    try {
      await setStatusFn({
        data: { leadType: variant === "individuals" ? "individual" : "company", leadId, status: newStatus },
      });
      setRows((prev) => prev.map((r) => (r.id === leadId ? { ...r, status: newStatus } : r)));
      toast.success(tr.saved);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSavingId(null);
    }
  };

  // --- chat modal ---
  const [openConvId, setOpenConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const openChat = (conversationId: string | null | undefined) => {
    if (!conversationId) { toast.error(tr.noChatLinked); return; }
    setOpenConvId(conversationId);
    setMsgsLoading(true);
    fetchMsgs({ data: { conversationId } })
      .then((r) => setMsgs(r.messages as Message[]))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setMsgsLoading(false));
  };

  // --- note modal ---
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const saveNote = async () => {
    if (!noteFor || !noteBody.trim()) return;
    setSavingNote(true);
    try {
      await addNoteFn({
        data: { leadType: variant === "individuals" ? "individual" : "company", leadId: noteFor, body: noteBody.trim() },
      });
      // Refresh notes preview for the current page without full reload.
      loadNotesFor(rows.map((row) => String(row.contact_id ?? "")).filter(Boolean));
      toast.success(tr.saved);
      setNoteFor(null);
      setNoteBody("");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSavingNote(false);
    }
  };

  // --- view note modal ---
  const [viewNoteBody, setViewNoteBody] = useState<string | null>(null);

  // --- reset ---
  const hasActiveFilters = !!(qInput || q || status || from || to) || page !== 1;
  const resetFilters = () => {
    setQInput("");
    nav({ to: routeTo, search: {}, replace: true });
  };

  // --- new lead modal ---
  const [newOpen, setNewOpen] = useState(false);

  // --- export ---
  const doExport = async () => {
    try {
      const args = { data: filters };
      const result = variant === "individuals" ? await expInd(args) : await expComp(args);
      const exportRows = result.rows as Record<string, unknown>[];
      if (variant === "individuals") {
        await exportRowsToXlsx({
          filenameBase: "individual-leads",
          sheetName: "Individual Leads",
          rtl: lang === "ar",
          rows: exportRows,
          columns: [
            { header: tr.name, get: (r) => r.full_name },
            { header: tr.email, get: (r) => r.email },
            { header: tr.phone, get: (r) => r.phone },
            { header: tr.specialty, get: (r) => r.specialty },
            { header: tr.workField, get: (r) => r.work_field },
            { header: tr.address, get: (r) => r.address },
            { header: tr.shortDesc, get: (r) => r.short_description },
            { header: tr.source, get: (r) => r.source },
            { header: tr.status, get: (r) => r.status },
            { header: tr.date, type: "date", get: (r) => r.created_at },
          ],
        });
      } else {
        await exportRowsToXlsx({
          filenameBase: "company-leads",
          sheetName: "Company Leads",
          rtl: lang === "ar",
          rows: exportRows,
          columns: [
            { header: tr.companyName, get: (r) => r.company_name },
            { header: tr.contactName, get: (r) => r.contact_name },
            { header: tr.contactEmail, get: (r) => r.contact_email },
            { header: tr.contactPhone, get: (r) => r.contact_phone },
            { header: tr.workField, get: (r) => r.work_field },
            { header: tr.country, get: (r) => r.country },
            { header: tr.officeAddress, get: (r) => r.office_address },
            { header: tr.source, get: (r) => r.source },
            { header: tr.status, get: (r) => r.status },
            { header: tr.date, type: "date", get: (r) => r.created_at },
          ],
        });
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.startsWith("export_too_large")) toast.error(tr.exportTooLarge);
      else toast.error(toUserMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={tr.searchPh}
            className="ps-9"
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">{tr.status}</Label>
          <Select
            value={status || "__all__"}
            onValueChange={(v) => updateSearch({ status: v === "__all__" ? undefined : (v as LeadStatusT), page: 1 })}
          >
            <SelectTrigger><SelectValue placeholder={tr.allStatuses} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{tr.allStatuses}</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{tr.from}</Label>
          <Input type="date" value={from} onChange={(e) => updateSearch({ from: e.target.value || undefined, page: 1 })} />
        </div>
        <div>
          <Label className="text-xs">{tr.to}</Label>
          <Input type="date" value={to} onChange={(e) => updateSearch({ to: e.target.value || undefined, page: 1 })} />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
            <RotateCcw className="h-4 w-4" /> {tr.reset}
          </Button>
          <Button variant="outline" size="sm" onClick={doExport}>
            <Download className="h-4 w-4" /> {tr.export}
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> {tr.newLead}
          </Button>
        </div>
      </div>


      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tr.total}: <span className="font-bold text-foreground">{total}</span>
        </p>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : variant === "individuals" ? (
        <IndividualsTable
          rows={rows}
          lang={lang}
          tr={tr}
          savingId={savingId}
          onStatus={handleStatusChange}
          onNote={(id) => { setNoteFor(id); setNoteBody(""); }}
          onChat={openChat}
          latestNotes={latestNotes}
          onViewNote={setViewNoteBody}
        />
      ) : (
        <CompaniesTable
          rows={rows}
          lang={lang}
          tr={tr}
          savingId={savingId}
          onStatus={handleStatusChange}
          onNote={(id) => { setNoteFor(id); setNoteBody(""); }}
          onChat={openChat}
          latestNotes={latestNotes}
          onViewNote={setViewNoteBody}
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateSearch({ page: page - 1 })}>
          <ChevronLeft className="h-4 w-4" /> {tr.prev}
        </Button>
        <span className="text-sm text-muted-foreground">{tr.page} {page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateSearch({ page: page + 1 })}>
          {tr.next} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat modal */}
      <Dialog open={!!openConvId} onOpenChange={(o) => !o && setOpenConvId(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{tr.conversations}</DialogTitle></DialogHeader>
          {msgsLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-3">
              {msgs.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {m.content || <em className="opacity-60">[{m.role}]</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note modal */}
      <Dialog open={!!noteFor} onOpenChange={(o) => { if (!o && !savingNote) { setNoteFor(null); setNoteBody(""); } }}>
        <DialogContent className="max-w-xl flex max-h-[90vh] flex-col">
          <DialogHeader><DialogTitle>{tr.addNote}</DialogTitle></DialogHeader>
          <Textarea
            value={noteBody}
            onChange={(e) => {
              setNoteBody(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.6)) + "px";
            }}
            placeholder={tr.noteBody}
            className="min-h-[220px] max-h-[60vh] resize-y overflow-y-auto whitespace-pre-wrap"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)} disabled={savingNote}>{tr.cancel}</Button>
            <Button onClick={saveNote} disabled={savingNote || !noteBody.trim()}>
              {savingNote && <Loader2 className="h-4 w-4 animate-spin" />} {tr.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* View note modal */}
      <Dialog open={viewNoteBody !== null} onOpenChange={(o) => !o && setViewNoteBody(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tr.noteTitle}</DialogTitle>
            <DialogDescription className="sr-only">{tr.noteTitle}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-foreground">
            {viewNoteBody}
          </div>
        </DialogContent>
      </Dialog>

      {/* New lead modal */}
      <NewLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        variant={variant}
        onCreated={reload}
        createInd={createIndFn}
        createComp={createCompFn}
        tr={tr}
      />
    </div>
  );
}

function StatusSelect({
  value, onChange, disabled, tr, lang,
}: { value: LeadStatusT; onChange: (v: LeadStatusT) => void; disabled?: boolean; tr: typeof T.ar; lang: "ar" | "en" }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LeadStatusT)} disabled={disabled}>
      <SelectTrigger className="h-8 w-32 text-xs" aria-label={tr.status}>
        <SelectValue>{statusLabel(value, lang)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function NotesCell({
  contactId, latestNotes, onView, tr,
}: {
  contactId: string | null;
  latestNotes: Record<string, { body: string; created_at: string }>;
  onView: (body: string) => void;
  tr: typeof T.ar;
}) {
  const note = contactId ? latestNotes[contactId] : undefined;
  if (!note) return <span className="text-muted-foreground">—</span>;
  const isLong = note.body.length > 80 || note.body.includes("\n");
  return (
    <div className="max-w-[240px] space-y-1">
      <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{note.body}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => onView(note.body)}
          className="text-xs text-primary hover:underline focus:underline focus:outline-none"
        >
          {tr.more}
        </button>
      )}
    </div>
  );
}

type TableProps = {
  rows: Record<string, unknown>[];
  lang: "ar" | "en";
  tr: typeof T.ar;
  savingId: string | null;
  onStatus: (id: string, s: LeadStatusT) => void;
  onNote: (id: string) => void;
  onChat: (convId: string | null | undefined) => void;
  latestNotes: Record<string, { body: string; created_at: string }>;
  onViewNote: (body: string) => void;
};

function IndividualsTable({
  rows, lang, tr, savingId, onStatus, onNote, onChat, latestNotes, onViewNote,
}: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start">{tr.name}</th>
            <th className="px-3 py-2 text-start">{tr.email}</th>
            <th className="px-3 py-2 text-start">{tr.phone}</th>
            <th className="px-3 py-2 text-start">{tr.specialty}</th>
            <th className="px-3 py-2 text-start">{tr.status}</th>
            <th className="px-3 py-2 text-start">{tr.date}</th>
            <th className="px-3 py-2 text-start">{tr.notes}</th>
            <th className="px-3 py-2 text-end">{tr.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tr.noLeads}</td></tr>
          )}
          {rows.map((r) => {
            const id = String(r.id);
            const convId = (r.conversation_id as string | null) ?? null;
            const contactId = (r.contact_id as string | null) ?? null;
            return (
              <tr key={id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">
                  <Link to="/admin/crm/leads/individuals/$leadId" params={{ leadId: id }} className="hover:underline">
                    {String(r.full_name ?? "—")}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{(r.email as string) ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{(r.phone as string) ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{(r.specialty as string) ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusSelect
                    value={(r.status as LeadStatusT) ?? "new"}
                    disabled={savingId === id}
                    onChange={(s) => onStatus(id, s)}
                    tr={tr}
                    lang={lang}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(String(r.created_at)).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </td>
                <td className="px-3 py-2">
                  <NotesCell contactId={contactId} latestNotes={latestNotes} onView={onViewNote} tr={tr} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onNote(id)} title={tr.addNote}>
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={!convId} onClick={() => onChat(convId)} title={tr.viewChat}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompaniesTable({
  rows, lang, tr, savingId, onStatus, onNote, onChat, latestNotes, onViewNote,
}: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start">{tr.company}</th>
            <th className="px-3 py-2 text-start">{tr.field}</th>
            <th className="px-3 py-2 text-start">{tr.contact}</th>
            <th className="px-3 py-2 text-start">{tr.email}</th>
            <th className="px-3 py-2 text-start">{tr.status}</th>
            <th className="px-3 py-2 text-start">{tr.date}</th>
            <th className="px-3 py-2 text-start">{tr.notes}</th>
            <th className="px-3 py-2 text-end">{tr.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tr.noLeads}</td></tr>
          )}
          {rows.map((r) => {
            const id = String(r.id);
            const convId = (r.conversation_id as string | null) ?? null;
            const contactId = (r.contact_id as string | null) ?? null;
            return (
              <tr key={id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">
                  <Link to="/admin/crm/leads/companies/$leadId" params={{ leadId: id }} className="hover:underline">
                    {String(r.company_name ?? "—")}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{(r.work_field as string) ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{(r.contact_name as string) ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{(r.contact_email as string) ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusSelect
                    value={(r.status as LeadStatusT) ?? "new"}
                    disabled={savingId === id}
                    onChange={(s) => onStatus(id, s)}
                    tr={tr}
                    lang={lang}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(String(r.created_at)).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </td>
                <td className="px-3 py-2">
                  <NotesCell contactId={contactId} latestNotes={latestNotes} onView={onViewNote} tr={tr} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onNote(id)} title={tr.addNote}>
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={!convId} onClick={() => onChat(convId)} title={tr.viewChat}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function NewLeadDialog({
  open, onOpenChange, variant, onCreated, createInd, createComp, tr,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  variant: Variant;
  onCreated: () => void;
  createInd: ReturnType<typeof useServerFn<typeof createIndividualLead>>;
  createComp: ReturnType<typeof useServerFn<typeof createCompanyLead>>;
  tr: typeof T.ar;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (!open) { setForm({}); setConflict(false); }
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (override = false) => {
    setSaving(true);
    try {
      if (variant === "individuals") {
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
      toast.success(tr.saved);
      onOpenChange(false);
      onCreated();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("identity_conflict")) {
        setConflict(true);
      } else {
        toast.error(toUserMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{variant === "individuals" ? tr.createInd : tr.createComp}</DialogTitle>
          <DialogDescription className="sr-only">{tr.newLead}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {variant === "individuals" ? (
            <>
              <FieldRow label={tr.fullName} required>
                <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.email}>
                <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.phone}>
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.specialty}>
                <Input value={form.specialty ?? ""} onChange={(e) => set("specialty", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.workField}>
                <Input value={form.work_field ?? ""} onChange={(e) => set("work_field", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.address}>
                <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.shortDesc}>
                <Textarea rows={3} value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
              </FieldRow>
            </>
          ) : (
            <>
              <FieldRow label={tr.companyName} required>
                <Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.contactName}>
                <Input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.contactEmail}>
                <Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.contactPhone}>
                <Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.workField}>
                <Input value={form.work_field ?? ""} onChange={(e) => set("work_field", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.country}>
                <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
              </FieldRow>
              <FieldRow label={tr.officeAddress}>
                <Input value={form.office_address ?? ""} onChange={(e) => set("office_address", e.target.value)} />
              </FieldRow>
            </>
          )}
          {conflict && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              <span className="flex-1">{tr.duplicateFound}</span>
              <Button size="sm" onClick={() => submit(true)} disabled={saving}>{tr.createAnyway}</Button>
              <Button size="icon" variant="ghost" onClick={() => setConflict(false)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tr.cancel}</Button>
          <Button onClick={() => submit(false)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {tr.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
