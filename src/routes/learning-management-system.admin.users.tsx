import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/users")({
  head: () => ({ meta: [{ title: "LMS · Users" }] }),
  component: UsersPage,
});

type RoleRow = { id: string; user_id: string; role: string; created_at: string };
type InstructorRow = { user_id: string; full_name: string };

const MANAGEABLE = ["lms_instructor", "lms_admin", "attendance_user", "attendance_admin"] as const;

function UsersPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [grantUid, setGrantUid] = useState("");
  const [grantRole, setGrantRole] = useState<string>("lms_instructor");

  const load = async () => {
    const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(toUserMessage(error)); return; }
    const list = (data as RoleRow[]) ?? [];
    setRoles(list);
    const uids = Array.from(new Set(list.map((r) => r.user_id)));
    if (uids.length) {
      const { data: ins } = await supabase.from("lms_instructors").select("user_id,full_name").in("user_id", uids);
      const map: Record<string, string> = {};
      (ins as InstructorRow[] ?? []).forEach((i) => { map[i.user_id] = i.full_name; });
      setNames(map);
    }
  };
  useEffect(() => { load(); }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUid) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: grantUid, role: grantRole as never });
    if (error) { toast.error(toUserMessage(error)); return; }
    setGrantUid(""); toast.success("OK"); load();
  };

  const revoke = async (id: string) => {
    if (!confirm(ar ? "إزالة الدور؟" : "Revoke role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(toUserMessage(error)); return; }
    load();
  };

  const filtered = roles.filter((r) =>
    !search || r.user_id.includes(search) || (names[r.user_id] ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/learning-management-system/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "رجوع" : "Back"}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />{ar ? "إدارة المستخدمين والأدوار" : "Users & Roles"}
      </h1>

      <form onSubmit={grant} className="mt-6 grid sm:grid-cols-[1fr_200px_120px] gap-2 rounded-xl border border-border bg-card p-4">
        <Input placeholder={ar ? "User ID (UUID)" : "User ID (UUID)"} value={grantUid} onChange={(e) => setGrantUid(e.target.value)} required />
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={grantRole} onChange={(e) => setGrantRole(e.target.value)}>
          {MANAGEABLE.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button type="submit">{ar ? "منح" : "Grant"}</Button>
      </form>

      <div className="mt-6">
        <Input placeholder={ar ? "بحث بالاسم أو UUID" : "Search by name or UUID"} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mt-4 space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">{names[r.user_id] ?? r.user_id}</div>
              <div className="text-xs text-muted-foreground">{r.user_id} · <span className="text-primary">{r.role}</span></div>
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
