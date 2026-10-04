import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: super-admin role required");
}

async function assertLmsAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["lms_admin", "admin"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin role required");
}

const MANAGEABLE = ["admin", "lms_instructor", "lms_student", "lms_payment_admin"] as const;

export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: string }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        role: z.enum(MANAGEABLE),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Find user by email via auth admin API (paginated)
    let foundId: string | null = null;
    let page = 1;
    const perPage = 1000;
    // Cap pages to avoid runaway in huge tenants
    for (let i = 0; i < 20 && !foundId; i++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === data.email);
      if (u) {
        foundId = u.id;
        break;
      }
      if (list.users.length < perPage) break;
      page++;
    }
    if (!foundId) throw new Error("لم يتم العثور على مستخدم بهذا الإيميل / User not found");

    // The payment reviewer is added next to the account's other roles, not
    // instead of them (migration 20261004120000_course_payments_sham_cash.sql).
    const { error: roleError } =
      data.role === "lms_payment_admin"
        ? await context.supabase.rpc(
            "lms_set_payment_reviewer" as never,
            { _user_id: foundId, _enabled: true } as never,
          )
        : await context.supabase.rpc("lms_set_user_role", {
            _user_id: foundId,
            _role: data.role,
          });
    if (roleError) throw new Error(roleError.message);
    return { ok: true, userId: foundId };
  });

export const getEmailsForUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userIds: string[] }) =>
    z.object({ userIds: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId);
    if (data.userIds.length === 0)
      return {
        emails: {} as Record<string, string>,
        names: {} as Record<string, string>,
        guests: [] as string[],
      };
    const wanted = new Set(data.userIds);
    const emails: Record<string, string> = {};
    const names: Record<string, string> = {};
    const guests: string[] = [];
    let seen = 0;
    let page = 1;
    const perPage = 1000;
    for (let i = 0; i < 20 && seen < wanted.size; i++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        if (!wanted.has(u.id)) continue;
        seen++;
        if (u.is_anonymous) guests.push(u.id);
        if (u.email) emails[u.id] = u.email;
        const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
        const name = meta.full_name ?? meta.name;
        if (name) names[u.id] = name;
      }
      if (list.users.length < perPage) break;
      page++;
    }
    return { emails, names, guests };
  });
