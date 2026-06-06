import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertLmsAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["lms_admin", "admin"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin role required");
}

const MANAGEABLE = ["lms_instructor", "lms_admin", "attendance_user", "attendance_admin"] as const;

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
    await assertLmsAdmin(context.userId);

    // Find user by email via auth admin API (paginated)
    let foundId: string | null = null;
    let page = 1;
    const perPage = 1000;
    // Cap pages to avoid runaway in huge tenants
    for (let i = 0; i < 20 && !foundId; i++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === data.email);
      if (u) { foundId = u.id; break; }
      if (list.users.length < perPage) break;
      page++;
    }
    if (!foundId) throw new Error("لم يتم العثور على مستخدم بهذا الإيميل / User not found");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: foundId, role: data.role as never });
    if (insErr) {
      if (insErr.code === "23505") throw new Error("الدور ممنوح مسبقاً / Role already granted");
      throw new Error(insErr.message);
    }
    return { ok: true, userId: foundId };
  });

export const getEmailsForUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userIds: string[] }) =>
    z.object({ userIds: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId);
    if (data.userIds.length === 0) return { emails: {} as Record<string, string> };
    const wanted = new Set(data.userIds);
    const emails: Record<string, string> = {};
    let page = 1;
    const perPage = 1000;
    for (let i = 0; i < 20 && emails && Object.keys(emails).length < wanted.size; i++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        if (wanted.has(u.id) && u.email) emails[u.id] = u.email;
      }
      if (list.users.length < perPage) break;
      page++;
    }
    return { emails };
  });
