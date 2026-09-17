import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createContact } from "@/lib/crm.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";

const EMPTY_CONTACT = {
  display_name: "", contact_type: "individual", primary_email: "",
  primary_phone: "", organization: "", notes: "",
};

export function CrmNewContactDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const nav = useNavigate();
  const create = useServerFn(createContact);
  const [saving, setSaving] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const { user } = useAuth();
  // Kept as a draft when the dialog is closed or the page reloads; cleared once created.
  const draft = useFormDraft(formDraftKey(user?.id, "crm-contact", "new"), EMPTY_CONTACT);
  const form = draft.values;
  const setForm = draft.setValues;

  const reset = () => { draft.clearDraft(); setDuplicateId(null); };

  const submit = async (force = false) => {
    if (!form.display_name.trim()) { toast.error(ar ? "الاسم مطلوب" : "Name is required"); return; }
    setSaving(true);
    try {
      const res = await create({
        data: {
          display_name: form.display_name,
          contact_type: form.contact_type as "individual" | "company",
          primary_email: form.primary_email || undefined,
          primary_phone: form.primary_phone || undefined,
          organization: form.organization || undefined,
          notes: form.notes || undefined,
          force,
        },
      });
      if (!res.ok && "duplicateContactId" in res) {
        setDuplicateId(res.duplicateContactId);
        return;
      }
      if (res.ok) {
        toast.success(ar ? "تم الإنشاء" : "Created");
        reset();
        onOpenChange(false);
        onCreated();
        nav({ to: "/admin/crm/contacts/$contactId", params: { contactId: res.contactId } });
      }
    } catch (e) { toast.error(toUserMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setDuplicateId(null); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ar ? "جهة اتصال جديدة" : "New contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <DraftNotice show={draft.restored} onDiscard={() => draft.clearDraft()} />
          <div>
            <Label>{ar ? "الاسم" : "Name"}</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <Label>{ar ? "النوع" : "Type"}</Label>
            <Select value={form.contact_type} onValueChange={(v) => setForm((f) => ({ ...f, contact_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">{ar ? "فرد" : "Individual"}</SelectItem>
                <SelectItem value="company">{ar ? "شركة" : "Company"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{ar ? "الإيميل" : "Email"}</Label><Input type="email" value={form.primary_email} onChange={(e) => setForm((f) => ({ ...f, primary_email: e.target.value }))} /></div>
            <div><Label>{ar ? "الهاتف" : "Phone"}</Label><Input value={form.primary_phone} onChange={(e) => setForm((f) => ({ ...f, primary_phone: e.target.value }))} /></div>
          </div>
          <div><Label>{ar ? "المؤسسة" : "Organization"}</Label><Input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} /></div>
          <div><Label>{ar ? "ملاحظة" : "Note"}</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          {duplicateId && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {ar ? "يوجد جهة اتصال مطابقة. هل تريد المتابعة على أي حال؟" : "A matching contact already exists. Continue anyway?"}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { onOpenChange(false); nav({ to: "/admin/crm/contacts/$contactId", params: { contactId: duplicateId } }); }}>
                  {ar ? "فتح الموجود" : "Open existing"}
                </Button>
                <Button size="sm" onClick={() => submit(true)} disabled={saving}>
                  {ar ? "إنشاء نسخة جديدة" : "Create anyway"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={() => submit(false)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {ar ? "إنشاء" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
