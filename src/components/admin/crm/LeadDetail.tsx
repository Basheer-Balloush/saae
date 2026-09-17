import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ArrowLeft, StickyNote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getIndividualLead, getCompanyLead,
  updateIndividualLead, updateCompanyLead,
  setLeadStatus, addLeadNote,
} from "@/lib/crm.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";

const STATUSES = ["new", "contacted", "qualified", "converted", "archived"] as const;
type StatusT = (typeof STATUSES)[number];

const T = {
  ar: {
    backToLeads: "الرجوع إلى Leads", details: "التفاصيل", status: "الحالة",
    save: "حفظ", saved: "تم الحفظ",
    contact: "جهة التواصل", relatedContact: "الاتصال المرتبط",
    activity: "سجل الأحداث", addNote: "إضافة ملاحظة", noteBody: "الملاحظة",
    email: "إيميل", phone: "هاتف", specialty: "اختصاص", workField: "المجال",
    address: "العنوان", shortDesc: "وصف قصير", companyName: "اسم الشركة",
    contactName: "اسم جهة التواصل", contactEmail: "إيميل التواصل",
    contactPhone: "هاتف التواصل", country: "البلد", officeAddress: "عنوان المكتب",
    source: "المصدر", noContact: "لا يوجد اتصال مرتبط",
    noteCreated: "ملاحظة", formSubmission: "تعبئة نموذج", leadCreated: "تم إنشاء Lead",
  },
  en: {
    backToLeads: "Back to Leads", details: "Details", status: "Status",
    save: "Save", saved: "Saved",
    contact: "Contact", relatedContact: "Linked contact",
    activity: "Activity", addNote: "Add note", noteBody: "Note body",
    email: "Email", phone: "Phone", specialty: "Specialty", workField: "Work field",
    address: "Address", shortDesc: "Short description", companyName: "Company name",
    contactName: "Contact name", contactEmail: "Contact email",
    contactPhone: "Contact phone", country: "Country", officeAddress: "Office address",
    source: "Source", noContact: "No linked contact",
    noteCreated: "Note", formSubmission: "Form submission", leadCreated: "Lead created",
  },
};

export function LeadDetail({ variant, leadId }: { variant: "individual" | "company"; leadId: string }) {
  const { lang } = useLang();
  const tr = T[lang];
  const getInd = useServerFn(getIndividualLead);
  const getComp = useServerFn(getCompanyLead);
  const updInd = useServerFn(updateIndividualLead);
  const updComp = useServerFn(updateCompanyLead);
  const setStatusFn = useServerFn(setLeadStatus);
  const addNoteFn = useServerFn(addLeadNote);

  const [data, setData] = useState<Awaited<ReturnType<typeof getIndividualLead>> | Awaited<ReturnType<typeof getCompanyLead>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const noteDraft = useFormDraft(formDraftKey(user?.id, "crm-lead-note", leadId), "");
  const noteBody = noteDraft.values;
  const setNoteBody = noteDraft.setValues;

  const load = () => {
    setLoading(true);
    const p = variant === "individual" ? getInd({ data: { leadId } }) : getComp({ data: { leadId } });
    p.then((r) => setData(r as typeof data))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [leadId, variant]);

  if (loading || !data) {
    return <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-muted-foreground" />;
  }

  const lead = data.lead as Record<string, unknown>;
  const contact = data.contact as Record<string, unknown> | null;

  const changeStatus = async (s: StatusT) => {
    setSaving(true);
    try {
      await setStatusFn({ data: { leadType: variant, leadId, status: s } });
      toast.success(tr.saved);
      load();
    } catch (e) { toast.error(toUserMessage(e)); }
    finally { setSaving(false); }
  };

  const saveField = async (patch: Record<string, string>) => {
    setSaving(true);
    try {
      const call = variant === "individual"
        ? updInd({ data: { leadId, ...patch } })
        : updComp({ data: { leadId, ...patch } });
      await call;
      toast.success(tr.saved);
      load();
    } catch (e) { toast.error(toUserMessage(e)); }
    finally { setSaving(false); }
  };

  const saveNote = async () => {
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      await addNoteFn({ data: { leadType: variant, leadId, body: noteBody.trim() } });
      noteDraft.clearDraft();
      toast.success(tr.saved);
      load();
    } catch (e) { toast.error(toUserMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Link
        to={variant === "individual" ? "/admin/crm/leads/individuals" : "/admin/crm/leads/companies"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tr.backToLeads}
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>
              {variant === "individual"
                ? String(lead.full_name ?? "—")
                : String(lead.company_name ?? "—")}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(String(lead.created_at)).toLocaleString(lang === "ar" ? "ar" : "en")}
            </p>
          </div>
          <div className="w-40">
            <Label className="text-xs">{tr.status}</Label>
            <Select value={(lead.status as StatusT) ?? "new"} onValueChange={(v) => changeStatus(v as StatusT)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {variant === "individual" ? (
            <>
              <EditableField label={tr.email} value={(lead.email as string) ?? ""} onSave={(v) => saveField({ email: v })} disabled={saving} />
              <EditableField label={tr.phone} value={(lead.phone as string) ?? ""} onSave={(v) => saveField({ phone: v })} disabled={saving} />
              <EditableField label={tr.specialty} value={(lead.specialty as string) ?? ""} onSave={(v) => saveField({ specialty: v })} disabled={saving} />
              <EditableField label={tr.workField} value={(lead.work_field as string) ?? ""} onSave={(v) => saveField({ work_field: v })} disabled={saving} />
              <EditableField label={tr.address} value={(lead.address as string) ?? ""} onSave={(v) => saveField({ address: v })} disabled={saving} />
              <EditableField
                label={tr.shortDesc}
                value={(lead.short_description as string) ?? ""}
                onSave={(v) => saveField({ short_description: v })}
                disabled={saving}
                multiline
              />
            </>
          ) : (
            <>
              <EditableField label={tr.contactName} value={(lead.contact_name as string) ?? ""} onSave={(v) => saveField({ contact_name: v })} disabled={saving} />
              <EditableField label={tr.contactEmail} value={(lead.contact_email as string) ?? ""} onSave={(v) => saveField({ contact_email: v })} disabled={saving} />
              <EditableField label={tr.contactPhone} value={(lead.contact_phone as string) ?? ""} onSave={(v) => saveField({ contact_phone: v })} disabled={saving} />
              <EditableField label={tr.workField} value={(lead.work_field as string) ?? ""} onSave={(v) => saveField({ work_field: v })} disabled={saving} />
              <EditableField label={tr.country} value={(lead.country as string) ?? ""} onSave={(v) => saveField({ country: v })} disabled={saving} />
              <EditableField label={tr.officeAddress} value={(lead.office_address as string) ?? ""} onSave={(v) => saveField({ office_address: v })} disabled={saving} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{tr.relatedContact}</CardTitle></CardHeader>
        <CardContent>
          {contact ? (
            <Link
              to="/admin/crm/contacts/$contactId"
              params={{ contactId: String(contact.id) }}
              className="text-sm text-primary hover:underline"
            >
              {String(contact.display_name)}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">{tr.noContact}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{tr.addNote}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder={tr.noteBody} />
          <Button size="sm" onClick={saveNote} disabled={saving || !noteBody.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {tr.save}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{tr.activity}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.activities.map((a) => {
              const icon = a.kind === "note" ? StickyNote : FileText;
              const Icon = icon;
              const label =
                a.kind === "note" ? tr.noteCreated
                  : a.kind === "form_submission" ? tr.formSubmission
                  : tr.leadCreated;
              return (
                <li key={`${a.kind}-${a.id}`} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    {a.subtitle && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.subtitle}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString(lang === "ar" ? "ar" : "en")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function EditableField({
  label, value, onSave, disabled, multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const dirty = v !== value;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
        ) : (
          <Input value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
        )}
        {dirty && (
          <Button size="sm" onClick={() => onSave(v)} disabled={disabled}>Save</Button>
        )}
      </div>
    </div>
  );
}
