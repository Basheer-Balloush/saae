import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContact, addNote, deleteNote, updateContact } from "@/lib/crm.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";

type Data = Awaited<ReturnType<typeof getContact>>;

export function CrmContactDetail({ contactId }: { contactId: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const fetchContact = useServerFn(getContact);
  const submitNote = useServerFn(addNote);
  const removeNote = useServerFn(deleteNote);
  const patchContact = useServerFn(updateContact);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchContact({ data: { contactId } })
      .then(setData)
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [contactId]);

  const onAddNote = async () => {
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      await submitNote({ data: { contactId, body: noteBody.trim() } });
      setNoteBody("");
      load();
    } catch (e) { toast.error(toUserMessage(e)); }
    finally { setSaving(false); }
  };

  const onDeleteNote = async (id: string) => {
    try { await removeNote({ data: { noteId: id } }); load(); }
    catch (e) { toast.error(toUserMessage(e)); }
  };

  const onStatusChange = async (status: string) => {
    try {
      await patchContact({ data: { contactId, status: status as never } });
      load();
    } catch (e) { toast.error(toUserMessage(e)); }
  };

  if (loading || !data) {
    return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  }

  const c = data.contact;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/crm/contacts"><ArrowLeft className="h-4 w-4" /> {ar ? "رجوع" : "Back"}</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{c.display_name}</span>
              <Badge variant="outline">{c.contact_type === "company" ? (ar ? "شركة" : "Company") : (ar ? "فرد" : "Individual")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label={ar ? "الإيميل" : "Email"} value={c.primary_email} />
            <Field label={ar ? "الهاتف" : "Phone"} value={c.primary_phone} />
            <Field label={ar ? "المؤسسة" : "Organization"} value={c.organization} />
            <Field label={ar ? "الدولة" : "Country"} value={c.country} />
            <Field label={ar ? "المدينة" : "City"} value={c.city} />
            <div>
              <div className="mb-1 text-xs text-muted-foreground">{ar ? "الحالة" : "Status"}</div>
              <Select value={c.status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{ar ? "جديد" : "New"}</SelectItem>
                  <SelectItem value="contacted">{ar ? "تم التواصل" : "Contacted"}</SelectItem>
                  <SelectItem value="qualified">{ar ? "مؤهل" : "Qualified"}</SelectItem>
                  <SelectItem value="converted">{ar ? "محوّل" : "Converted"}</SelectItem>
                  <SelectItem value="archived">{ar ? "مؤرشف" : "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {c.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            )}
            <div className="pt-2 text-xs text-muted-foreground">
              {ar ? "أُنشئ" : "Created"}: {new Date(c.created_at).toLocaleString(ar ? "ar" : "en")}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{ar ? "المخطط الزمني للنشاط" : "Activity timeline"}</CardTitle></CardHeader>
          <CardContent>
            {data.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ar ? "لا يوجد نشاط بعد." : "No activity yet."}</p>
            ) : (
              <ol className="relative space-y-4 border-s border-border ps-4">
                {data.activities.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="relative">
                    <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString(ar ? "ar" : "en")}</div>
                    </div>
                    {a.subtitle && <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.subtitle}</div>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{a.kind.replace("_", " ")}</Badge>
                      {a.source && <span>· {a.source}</span>}
                      {a.form_slug && <span>· /{a.form_slug}</span>}
                    </div>
                    {a.kind === "note" && (
                      <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs text-destructive" onClick={() => onDeleteNote(a.id)}>
                        <Trash2 className="h-3 w-3" /> {ar ? "حذف" : "Delete"}
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{ar ? "إضافة ملاحظة" : "Add note"}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder={ar ? "اكتب ملاحظتك هنا…" : "Write your note here…"}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={onAddNote} disabled={saving || !noteBody.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ar ? "إضافة" : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.formSubmissions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{ar ? "استجابات النماذج" : "Form submissions"}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.formSubmissions.map((s) => {
              const form = (s as unknown as { dynamic_forms?: { name_en: string; name_ar: string; slug: string } | null }).dynamic_forms;
              return (
                <div key={s.id} className="rounded border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{ar ? form?.name_ar ?? form?.slug : form?.name_en ?? form?.slug}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString(ar ? "ar" : "en")}</span>
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                    {JSON.stringify(s.values, null, 2)}
                  </pre>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

// unused Input import kept for potential inline edit; suppress lint
void Input;
