import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, FileText, Loader2, ArrowLeft, ExternalLink, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cleanupUnapprovedInstructors, countUnapprovedInstructors } from "@/lib/instructor-cleanup.functions";

export const Route = createFileRoute("/learning-management-system/admin/trainer-applications")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "LMS · طلبات اعتماد المدربين" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTrainerApplications,
});

type App = {
  id: string;
  user_id: string;
  status: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string;
  date_of_birth: string;
  city: string;
  experience_level: string;
  specializations: string[];
  bio: string;
  linkedin_url: string;
  github_url: string | null;
  has_prev_training: boolean;
  prev_training_details: string | null;
  consent_ethics: boolean;
  consent_data: boolean;
  consent_process: boolean;
  admin_notes: string | null;
  submitted_at: string;
  decision_at: string | null;
};

type AppFile = {
  id: string;
  kind: "cv" | "work_sample" | "avatar";
  storage_path: string;
  original_name: string;
  content_type: string | null;
};

type AuditRow = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  actor_id: string | null;
};

const STATUS_OPTIONS = [
  "pending_review",
  "incomplete",
  "eligibility_check",
  "phase_1_theory",
  "phase_2_practical",
  "phase_3_training",
  "phase_4_interview",
  "scoring",
  "approved",
  "rejected",
] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending_review: "bg-amber-500/15 text-amber-600",
    incomplete: "bg-orange-500/15 text-orange-600",
    approved: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-destructive/15 text-destructive",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
}

function AdminTrainerApplications() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [rows, setRows] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<App | null>(null);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [newStatus, setNewStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trainer_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) toast.error(toUserMessage(error));
    setRows((data as App[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ---- Cleanup unapproved instructors ----
  const [unapprovedCount, setUnapprovedCount] = useState<number | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ total: number; emailed: number; deleted: number; failed: string[] } | null>(null);

  const loadUnapprovedCount = async () => {
    try {
      const res = await countUnapprovedInstructors();
      setUnapprovedCount(res.count);
    } catch (e) {
      setUnapprovedCount(null);
    }
  };
  useEffect(() => { loadUnapprovedCount(); }, []);

  const runCleanup = async () => {
    setCleanupRunning(true);
    setCleanupResult(null);
    try {
      const res = await cleanupUnapprovedInstructors();
      setCleanupResult(res);
      toast.success(ar ? `تم — أُرسل ${res.emailed} بريد، حُذف ${res.deleted}` : `Done — ${res.emailed} emailed, ${res.deleted} deleted`);
      loadUnapprovedCount();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setCleanupRunning(false);
    }
  };

  const openView = async (app: App) => {
    setSelected(app);
    setNewStatus(app.status);
    setNote("");
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.from("trainer_application_files").select("*").eq("application_id", app.id),
      supabase.from("trainer_application_audit").select("*").eq("application_id", app.id).order("created_at", { ascending: false }),
    ]);
    setFiles((f as AppFile[]) ?? []);
    setAudit((a as AuditRow[]) ?? []);
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("trainer-applications")
      .createSignedUrl(path, 60 * 10);
    if (error || !data) { toast.error(toUserMessage(error)); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const applyStatus = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.rpc("trainer_app_transition", {
      _application_id: selected.id,
      _to_status: newStatus as never,
      _note: note || undefined,
    });
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم تحديث الحالة" : "Status updated");
    setSelected(null);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/learning-management-system/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> {ar ? "لوحة الإدارة" : "Admin dashboard"}
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {ar ? "طلبات اعتماد المدربين" : "Trainer accreditation applications"}
          </h1>
        </div>
        <Button variant="outline" onClick={load}>{ar ? "تحديث" : "Refresh"}</Button>
      </div>

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">…</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">{ar ? "لا يوجد طلبات." : "No applications yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-start p-3">{ar ? "الاسم" : "Name"}</th>
                <th className="text-start p-3">{ar ? "البريد" : "Email"}</th>
                <th className="text-start p-3">{ar ? "المدينة" : "City"}</th>
                <th className="text-start p-3">{ar ? "الحالة" : "Status"}</th>
                <th className="text-start p-3">{ar ? "تاريخ التقديم" : "Submitted"}</th>
                <th className="text-end p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{ar ? r.full_name_ar : r.full_name_en}</td>
                  <td className="p-3" dir="ltr">{r.email}</td>
                  <td className="p-3">{r.city}</td>
                  <td className="p-3">
                    <Badge className={statusBadge(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</td>
                  <td className="p-3 text-end">
                    <Button size="sm" variant="outline" onClick={() => openView(r)}>
                      <Eye className="h-4 w-4 mx-1" />
                      {ar ? "عرض النموذج" : "View submission"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {ar ? "تفاصيل الطلب — " : "Application — "}
              {selected ? (ar ? selected.full_name_ar : selected.full_name_en) : ""}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 text-sm">
              <section className="grid sm:grid-cols-2 gap-3 rounded-xl border border-border p-4">
                <Field label={ar ? "الاسم (عربي)" : "Name (Arabic)"} value={selected.full_name_ar} />
                <Field label={ar ? "الاسم (إنجليزي)" : "Name (English)"} value={selected.full_name_en} />
                <Field label={ar ? "البريد" : "Email"} value={selected.email} dir="ltr" />
                <Field label={ar ? "الهاتف" : "Phone"} value={selected.phone} dir="ltr" />
                <Field label={ar ? "تاريخ الميلاد" : "Date of birth"} value={selected.date_of_birth} />
                <Field label={ar ? "المدينة" : "City"} value={selected.city} />
              </section>

              <section className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-bold">{ar ? "بيانات الأهلية" : "Eligibility"}</h3>
                <Field label={ar ? "سنوات الخبرة" : "Experience"} value={selected.experience_level} />
                <Field label={ar ? "المجالات" : "Specializations"} value={selected.specializations.join(", ")} />
                <Field label={ar ? "LinkedIn" : "LinkedIn"} value={selected.linkedin_url} dir="ltr" isLink />
                {selected.github_url && <Field label="GitHub / Portfolio" value={selected.github_url} dir="ltr" isLink />}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{ar ? "النبذة" : "Bio"}</p>
                  <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{selected.bio}</p>
                </div>
                <Field label={ar ? "خبرة تدريبية سابقة" : "Previous training"} value={selected.has_prev_training ? (ar ? "نعم" : "Yes") : (ar ? "لا" : "No")} />
                {selected.prev_training_details && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{ar ? "تفاصيل الخبرة" : "Details"}</p>
                    <p className="whitespace-pre-wrap rounded bg-muted/40 p-2">{selected.prev_training_details}</p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="font-bold">{ar ? "الملفات المرفوعة" : "Uploaded files"}</h3>
                {files.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2 rounded border border-border p-2">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs uppercase text-muted-foreground">{f.kind}</span>
                          <span className="truncate">{f.original_name}</span>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => openFile(f.storage_path)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="font-bold">{ar ? "الموافقات" : "Consents"}</h3>
                <p>✅ {selected.consent_ethics ? (ar ? "أخلاقيات الجمعية" : "Ethics policy") : "—"}</p>
                <p>✅ {selected.consent_data ? (ar ? "معالجة البيانات" : "Data processing") : "—"}</p>
                <p>✅ {selected.consent_process ? (ar ? "شروط نظام المعادلة" : "Accreditation process") : "—"}</p>
              </section>

              <section className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-bold">{ar ? "تحديث الحالة" : "Update status"}</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder={ar ? "ملاحظة (اختياري) — تُحفظ في سجل التدقيق" : "Note (optional) — saved to audit log"} value={note} onChange={(e) => setNote(e.target.value)} />
                <Button onClick={applyStatus} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                  {ar ? "حفظ" : "Save"}
                </Button>
              </section>

              <section className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="font-bold">{ar ? "سجل التدقيق" : "Audit trail"}</h3>
                {audit.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {audit.map((a) => (
                      <li key={a.id} className="rounded border border-border p-2">
                        <div className="flex items-center justify-between">
                          <span>{a.from_status ?? "—"} → <b>{a.to_status}</b></span>
                          <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        {a.note && <p className="mt-1 text-muted-foreground">{a.note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, dir, isLink }: { label: string; value: string; dir?: "ltr" | "rtl"; isLink?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" dir={dir} className="text-primary hover:underline break-all">{value}</a>
      ) : (
        <p dir={dir} className="font-medium break-all">{value}</p>
      )}
    </div>
  );
}
