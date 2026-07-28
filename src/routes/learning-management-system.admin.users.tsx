import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { grantRoleByEmail, getEmailsForUsers } from "@/lib/lms-admin-users.functions";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/learning-management-system/admin/users")({
  head: () => ({ meta: [{ title: "LMS · Users" }] }),
  component: UsersPage,
});

type RoleRow = { id: string; user_id: string; role: string; created_at: string };
type InstructorRow = { user_id: string; full_name: string };

const MANAGEABLE = ["lms_instructor", "lms_admin", "attendance_user", "attendance_admin"] as const;

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  admin: { ar: "مدير عام", en: "Super Admin" },
  lms_admin: { ar: "مدير منصّة التدريب والتعلّم", en: "Training & Learning Platform Admin" },
  lms_instructor: { ar: "مدرّب", en: "Instructor" },
  attendance_admin: { ar: "مدير نظام الحضور", en: "Attendance Admin" },
  attendance_user: { ar: "مستخدم نظام الحضور", en: "Attendance User" },
};

function roleLabel(role: string, ar: boolean) {
  const l = ROLE_LABELS[role];
  if (!l) return role;
  return ar ? l.ar : l.en;
}

function UsersPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<string>("lms_instructor");
  const [granting, setGranting] = useState(false);

  const grantFn = useServerFn(grantRoleByEmail);
  const emailsFn = useServerFn(getEmailsForUsers);

  const load = async () => {
    const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(toUserMessage(error)); return; }
    const list = (data as RoleRow[]) ?? [];
    setRoles(list);
    const uids = Array.from(new Set(list.map((r) => r.user_id)));
    if (uids.length) {
      const [insRes, emailRes] = await Promise.all([
        supabase.from("lms_instructors").select("user_id,full_name").in("user_id", uids),
        emailsFn({ data: { userIds: uids } }).catch(() => ({ emails: {} as Record<string, string> })),
      ]);
      const nMap: Record<string, string> = {};
      (insRes.data as InstructorRow[] ?? []).forEach((i) => { nMap[i.user_id] = i.full_name; });
      setNames(nMap);
      setEmails(emailRes.emails ?? {});
    }
  };
  useEffect(() => { load(); }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail) return;
    setGranting(true);
    try {
      await grantFn({ data: { email: grantEmail.trim(), role: grantRole } });
      setGrantEmail("");
      toast.success(ar ? "تم منح الدور" : "Role granted");
      load();
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (id: string) => {
    if (!(await confirmDialog({ title: ar ? "إزالة الدور؟" : "Revoke role?", destructive: true }))) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(toUserMessage(error)); return; }
    load();
  };

  const filtered = roles.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.user_id.includes(search) ||
      (names[r.user_id] ?? "").toLowerCase().includes(s) ||
      (emails[r.user_id] ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/learning-management-system/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "رجوع" : "Back"}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />{ar ? "إدارة المستخدمين والأدوار" : "Users & Roles"}
      </h1>

      <form onSubmit={grant} className="mt-6 grid sm:grid-cols-[1fr_220px_120px] gap-2 rounded-xl border border-border bg-card p-4">
        <Input
          type="email"
          placeholder={ar ? "إيميل المستخدم" : "User email"}
          value={grantEmail}
          onChange={(e) => setGrantEmail(e.target.value)}
          required
        />
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={grantRole} onChange={(e) => setGrantRole(e.target.value)}>
          {MANAGEABLE.map((r) => <option key={r} value={r}>{roleLabel(r, ar)}</option>)}
        </select>
        <Button type="submit" disabled={granting}>
          {granting ? (ar ? "..." : "...") : (ar ? "منح" : "Grant")}
        </Button>
      </form>

      <div className="mt-6">
        <Input placeholder={ar ? "بحث بالاسم أو الإيميل" : "Search by name or email"} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mt-4 space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">
                {names[r.user_id] ?? emails[r.user_id] ?? r.user_id}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {emails[r.user_id] ?? r.user_id} · <span className="text-primary">{roleLabel(r.role, ar)}</span>
              </div>
            </div>
            {r.role !== "admin" && (
              <Button size="sm" variant="ghost" onClick={() => revoke(r.id)}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">—</p>}
      </div>
    </div>
  );
}
