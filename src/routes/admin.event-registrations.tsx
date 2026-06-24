import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, X, Loader2, Plus, Trash2, MessageCircle, Copy, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/safe-error";
import { approveEventRegistration, rejectEventRegistration } from "@/lib/event-registrations.functions";

export const Route = createFileRoute("/admin/event-registrations")({
  head: () => ({ meta: [{ title: "Admin · AI TOT Graduation Registrations" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminEventRegistrations,
});

type Reg = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  specialization: string;
  status: "pending" | "approved" | "rejected";
  pin_code: string | null;
  created_at: string;
};

type Verifier = { id: string; username: string; created_at: string };

// Normalize phone for wa.me: digits only, drop leading 00/+, drop leading 0, default to Syria (963)
function toWaNumber(raw: string): string {
  let n = (raw || "").replace(/[^\d]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "963" + n.slice(1);
  if (!/^(?:1|2[078]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|7|8[1246]|9[0-58])/.test(n)) {
    // no obvious country code → assume Syria
    if (!n.startsWith("963")) n = "963" + n;
  }
  return n;
}

function AdminEventRegistrations() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate({ to: "/admin/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [authLoading, user, isAdmin, navigate]);
  const ar = lang === "ar";
  const [tab, setTab] = useState<"registrations" | "verifiers">("registrations");
  const [rows, setRows] = useState<Reg[]>([]);
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [loading, setLoading] = useState(true);
  const approveFn = useServerFn(approveEventRegistration);
  const rejectFn = useServerFn(rejectEventRegistration);

  const load = async () => {
    setLoading(true);
    const [{ data: regs }, { data: vs }] = await Promise.all([
      supabase.from("event_registrations" as never).select("*").order("created_at", { ascending: false }),
      supabase.rpc("list_event_verifiers" as never),
    ]);
    setRows((regs as Reg[]) ?? []);
    setVerifiers(((vs as unknown) as Verifier[] | null) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (authLoading || !user || !isAdmin) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const approve = async (r: Reg) => {
    if (!confirm(ar ? `الموافقة على تسجيل ${r.full_name}؟` : `Approve ${r.full_name}?`)) return;
    try {
      const res = await approveFn({ data: { id: r.id, lang } }) as { pin_code: string };
      const pin = res.pin_code;
      toast.success(ar ? `تمت الموافقة. الرمز: ${pin}` : `Approved. PIN: ${pin}`);
      // open WhatsApp pre-filled
      const msg = ar
        ? `مرحباً ${r.full_name}، تمت الموافقة على تسجيلك في الندوة الوطنية للذكاء الاصطناعي. رمز الدخول الخاص بك: ${pin}`
        : `Hello ${r.full_name}, your registration for the Syrian National AI Symposium is approved. Your access PIN: ${pin}`;
      window.open(`https://wa.me/${toWaNumber(r.phone)}?text=${encodeURIComponent(msg)}`, "_blank");
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const reject = async (r: Reg) => {
    if (!confirm(ar ? "رفض الطلب؟" : "Reject request?")) return;
    try {
      await rejectFn({ data: { id: r.id } });
      toast.success(ar ? "تم الرفض" : "Rejected");
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(ar ? "حذف نهائي؟" : "Delete permanently?")) return;
    const { error } = await supabase.from("event_registrations" as never).delete().eq("id", id);
    if (error) { toast.error(toUserMessage(error)); return; }
    load();
  };

  return (
    <div className="min-h-screen bg-muted/20" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {ar ? "لوحة الإدارة" : "Admin"}
        </Link>
        <h1 className="text-3xl font-extrabold mb-1">
          {ar ? "تسجيلات تخريج TOT" : "AI TOT Graduation Registrations"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ar ? "إدارة طلبات الحضور وتوليد رموز الدخول وحسابات التحقق." : "Manage attendance requests, generate access PINs, and verifier accounts."}
        </p>

        <div className="flex gap-2 mb-4 border-b border-border">
          <TabBtn active={tab === "registrations"} onClick={() => setTab("registrations")}>
            {ar ? "الطلبات" : "Requests"} <Badge variant="secondary" className="ms-2">{rows.length}</Badge>
          </TabBtn>
          <TabBtn active={tab === "verifiers"} onClick={() => setTab("verifiers")}>
            {ar ? "حسابات التحقق" : "Verifier accounts"} <Badge variant="secondary" className="ms-2">{verifiers.length}</Badge>
          </TabBtn>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></p>
        ) : tab === "registrations" ? (
          <RegistrationsTable rows={rows} ar={ar} onApprove={approve} onReject={reject} onDelete={remove} />
        ) : (
          <VerifiersPanel verifiers={verifiers} ar={ar} reload={load} />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function RegistrationsTable({ rows, ar, onApprove, onReject, onDelete }: {
  rows: Reg[]; ar: boolean;
  onApprove: (r: Reg) => void; onReject: (r: Reg) => void; onDelete: (id: string) => void;
}) {
  if (!rows.length) return <p className="text-center py-12 text-muted-foreground">{ar ? "لا توجد طلبات" : "No requests yet"}</p>;
  const statusLabel = (s: Reg["status"]) => ({
    pending: ar ? "بانتظار" : "Pending",
    approved: ar ? "مقبول" : "Approved",
    rejected: ar ? "مرفوض" : "Rejected",
  }[s]);
  const statusColor = (s: Reg["status"]) => ({
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
    rejected: "bg-rose-100 text-rose-800 border-rose-300",
  }[s]);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-start">
          <tr>
            <th className="px-3 py-2 text-start font-bold">{ar ? "الاسم" : "Name"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "الهاتف" : "Phone"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "البريد" : "Email"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "الاختصاص" : "Specialization"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "الحالة" : "Status"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "الرمز" : "PIN"}</th>
            <th className="px-3 py-2 text-start font-bold">{ar ? "إجراءات" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 font-semibold">{r.full_name}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
              <td className="px-3 py-2 text-xs">{r.email}</td>
              <td className="px-3 py-2 text-xs">{r.specialization}</td>
              <td className="px-3 py-2"><span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusColor(r.status)}`}>{statusLabel(r.status)}</span></td>
              <td className="px-3 py-2 font-mono font-bold tracking-widest">
                {r.pin_code ? (
                  <button className="inline-flex items-center gap-1 hover:text-primary" onClick={() => { navigator.clipboard.writeText(r.pin_code!); toast.success(ar ? "تم النسخ" : "Copied"); }}>
                    {r.pin_code} <Copy className="h-3 w-3" />
                  </button>
                ) : "—"}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5 flex-wrap">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => onApprove(r)} className="h-8"><Check className="h-3.5 w-3.5" />{ar ? "موافقة" : "Approve"}</Button>
                      <Button size="sm" variant="outline" onClick={() => onReject(r)} className="h-8"><X className="h-3.5 w-3.5" />{ar ? "رفض" : "Reject"}</Button>
                    </>
                  )}
                  {r.status === "approved" && r.pin_code && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const msg = ar
                        ? `مرحباً ${r.full_name}، رمز الدخول الخاص بك: ${r.pin_code}`
                        : `Hello ${r.full_name}, your access PIN: ${r.pin_code}`;
                      window.open(`https://wa.me/${toWaNumber(r.phone)}?text=${encodeURIComponent(msg)}`, "_blank");
                    }} className="h-8"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)} className="h-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerifiersPanel({ verifiers, ar, reload }: { verifiers: Verifier[]; ar: boolean; reload: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 4) {
      toast.error(ar ? "اسم المستخدم وكلمة سر (4 أحرف على الأقل) مطلوبان" : "Username and password (min 4 chars) required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("create_event_verifier" as never, { _username: username.trim(), _password: password } as never);
    setBusy(false);
    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("forbidden")) {
        toast.error(ar ? "ليس لديك صلاحية. تأكد من تسجيل الدخول كأدمن." : "Forbidden. Make sure you are signed in as an admin.");
      } else if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        toast.error(ar ? "اسم المستخدم موجود مسبقاً" : "Username already exists");
      } else {
        toast.error(msg || toUserMessage(error));
      }
      return;
    }
    toast.success(ar ? "تم الإنشاء" : "Created");
    setUsername(""); setPassword(""); reload();
  };


  const resetPassword = async (id: string) => {
    const pw = prompt(ar ? "كلمة المرور الجديدة:" : "New password:");
    if (!pw || pw.length < 4) return;
    const { error } = await supabase.rpc("update_event_verifier_password" as never, { _id: id, _password: pw } as never);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم التحديث" : "Updated");
  };

  const remove = async (id: string) => {
    if (!confirm(ar ? "حذف هذا الحساب؟" : "Delete this account?")) return;
    const { error } = await supabase.from("event_verifiers" as never).delete().eq("id", id);
    if (error) { toast.error(toUserMessage(error)); return; }
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-bold mb-3">{ar ? "إنشاء حساب تحقق" : "Create verifier account"}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {ar
            ? `هذه الحسابات تُستخدم في صفحة التحقق من الرمز.`
            : `These accounts are used on the PIN verification page.`}
          {" "}
          <a href="/ai-tot-verify" target="_blank" rel="noreferrer" className="text-primary underline">/ai-tot-verify</a>
        </p>
        <form onSubmit={create} className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>{ar ? "اسم المستخدم" : "Username"}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>{ar ? "كلمة المرور" : "Password"}</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {ar ? "إضافة" : "Add"}
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-start font-bold">{ar ? "اسم المستخدم" : "Username"}</th>
              <th className="px-3 py-2 text-start font-bold">{ar ? "تاريخ الإنشاء" : "Created"}</th>
              <th className="px-3 py-2 text-start font-bold">{ar ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {verifiers.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">{ar ? "لا توجد حسابات" : "No accounts"}</td></tr>
            ) : verifiers.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{v.username}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => resetPassword(v.id)} className="h-8"><KeyRound className="h-3.5 w-3.5" />{ar ? "كلمة المرور" : "Password"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(v.id)} className="h-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
