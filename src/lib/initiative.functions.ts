import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ---------- Public reads ----------

export const getInitiativeStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.rpc("initiative_public_stats");
  if (error) throw new Error(error.message);
  const row = (data as any)?.[0] ?? { target: 1000000, done: 0, waiting: 0, covered_unassigned: 0, total_chairs_funded: 0 };
  return {
    target: Number(row.target ?? 1000000),
    done: Number(row.done ?? 0),
    waiting: Number(row.waiting ?? 0),
    coveredUnassigned: Number(row.covered_unassigned ?? 0),
    totalFunded: Number(row.total_chairs_funded ?? 0),
  };
});

export const getInitiativeSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("initiative_settings").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export const getTopDonors = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number }) => ({ limit: Math.min(Math.max(d.limit ?? 10, 1), 100) }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("initiative_top_donors", { _limit: data.limit });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      donor_name: string;
      donor_display_name: string | null;
      logo_url: string | null;
      total_chairs: number;
      total_amount: number;
      last_donation_at: string;
    }>;
  });

export const getAllDonors = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.rpc("initiative_top_donors", { _limit: 1000 });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    donor_name: string;
    donor_display_name: string | null;
    logo_url: string | null;
    total_chairs: number;
    total_amount: number;
    last_donation_at: string;
  }>;
});

// ---------- Public submissions ----------

const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
});

export const submitWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => waitlistSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: id, error } = await sb.rpc("initiative_submit_waitlist", {
      _name: data.name,
      _email: data.email,
      _phone: data.phone,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

const donationSchema = z.object({
  donor_name: z.string().trim().min(2).max(160),
  donor_type: z.enum(["individual", "company"]),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  chairs: z.number().int().min(1).max(100000),
  currency: z.enum(["USD", "SYP"]),
});

export const submitCorporateDonation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => donationSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: id, error } = await sb.rpc("initiative_submit_donation", {
      _donor_name: data.donor_name,
      _donor_type: data.donor_type,
      _email: data.email,
      _phone: data.phone,
      _chairs: data.chairs,
      _currency: data.currency,
    });
    if (error) throw new Error(error.message);
    return { id: id as string, paymentUrl: null as string | null };
  });

const directPaymentSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
});

export const submitDirectPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => directPaymentSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin.from("initiative_settings").select("seat_price_usd").limit(1).maybeSingle();
    const amount = Number(settings?.seat_price_usd ?? 1);
    const claimToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: row, error } = await supabaseAdmin.from("initiative_direct_payments").insert({
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      amount,
      currency: "USD",
      status: "pending",
      claim_token: claimToken,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id, paymentUrl: null as string | null };
  });

// ---------- Claim seat (creates LMS account + enrollment) ----------

const claimSchema = z.object({
  token: z.string().min(8).max(200),
  password: z.string().min(8).max(120),
});

export const claimSeatAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => claimSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try waitlist token first
    const { data: wl } = await supabaseAdmin
      .from("initiative_waitlist")
      .select("id, email, full_name, status, user_id")
      .eq("claim_token", data.token)
      .maybeSingle();

    let email: string | null = null;
    let fullName: string | null = null;
    let kind: "waitlist" | "direct" | null = null;
    let existingUserId: string | null = null;

    if (wl) {
      if (wl.status === "enrolled" && wl.user_id) {
        return { ok: true, email: wl.email, alreadyEnrolled: true };
      }
      email = wl.email;
      fullName = wl.full_name;
      kind = "waitlist";
      existingUserId = wl.user_id;
    } else {
      const { data: dp } = await supabaseAdmin
        .from("initiative_direct_payments")
        .select("id, email, full_name, status, user_id")
        .eq("claim_token", data.token)
        .maybeSingle();
      if (!dp) throw new Error("invalid_token");
      if (dp.status !== "confirmed") throw new Error("payment_not_confirmed");
      if (dp.user_id) return { ok: true, email: dp.email, alreadyEnrolled: true };
      email = dp.email;
      fullName = dp.full_name;
      kind = "direct";
    }

    // Create or fetch user
    let userId = existingUserId;
    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email!,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr) {
        // User may already exist — try to look them up
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
        if (!found) throw new Error(createErr.message);
        userId = found.id;
        // update password
        await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
      } else {
        userId = created.user!.id;
      }
    }

    // Grant lms_student role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "lms_student" }).select();

    // Enroll
    const { data: settings } = await supabaseAdmin.from("initiative_settings").select("course_id").maybeSingle();
    const courseId = settings?.course_id;
    if (courseId) {
      if (kind === "waitlist") {
        await supabaseAdmin.rpc("initiative_claim_seat", { _token: data.token, _user_id: userId });
      } else {
        await supabaseAdmin.from("lms_enrollments").insert({ course_id: courseId, student_id: userId });
        await supabaseAdmin
          .from("initiative_direct_payments")
          .update({ user_id: userId, claimed_at: new Date().toISOString() })
          .eq("claim_token", data.token);
      }
    }

    return { ok: true, email, alreadyEnrolled: false };
  });

// ---------- Admin operations ----------

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "lms_admin" });
  if (!data) {
    const { data: d2 } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!d2) throw new Error("forbidden");
  }
}

export const adminListDonations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("initiative_donations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const adminListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("initiative_waitlist")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const adminConfirmDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: covered, error } = await context.supabase.rpc("initiative_confirm_donation", { _donation_id: data.id });
    if (error) throw new Error(error.message);
    return { covered };
  });

export const adminCreateDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    donor_name: string;
    donor_display_name?: string;
    donor_type: "individual" | "company";
    email?: string;
    phone?: string;
    logo_url?: string;
    chairs_count: number;
    currency: "USD" | "SYP";
    confirm: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: s } = await context.supabase.from("initiative_settings").select("seat_price_usd, usd_to_syp_rate").maybeSingle();
    const seat = Number(s?.seat_price_usd ?? 1);
    const rate = Number(s?.usd_to_syp_rate ?? 14000);
    const amount = data.currency === "USD" ? data.chairs_count * seat : data.chairs_count * seat * rate;
    const { data: row, error } = await context.supabase.from("initiative_donations").insert({
      donor_name: data.donor_name,
      donor_display_name: data.donor_display_name ?? null,
      donor_type: data.donor_type,
      email: data.email ?? null,
      phone: data.phone ?? null,
      logo_url: data.logo_url ?? null,
      chairs_count: data.chairs_count,
      amount,
      currency: data.currency,
      status: "pending",
    }).select("id").single();
    if (error) throw new Error(error.message);
    if (data.confirm) {
      await context.supabase.rpc("initiative_confirm_donation", { _donation_id: row.id });
    }
    return { id: row.id };
  });

export const adminDeleteDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("initiative_donations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, any>) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: s } = await context.supabase.from("initiative_settings").select("id").maybeSingle();
    if (!s) throw new Error("settings_missing");
    const { error } = await (context.supabase.from("initiative_settings") as any).update(data).eq("id", s.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("lms_courses").select("id, title_ar, title_en").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });
