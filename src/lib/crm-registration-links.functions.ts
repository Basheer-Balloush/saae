import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- shared types ----------

export type RegistrationLink = {
  id: string;
  label: string;
  token: string;
  is_active: boolean;
  created_at: string;
  submissions_count: number;
};

export type RegistrationSubmission = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  work_field: string | null;
  address: string | null;
  short_description: string | null;
  created_at: string;
};

export type PublicLinkState =
  | { state: "ok"; label: string }
  | { state: "inactive" };

export type RegistrationSubmitResult =
  | { result: "created" }
  | { result: "inactive" }
  | { result: "rate_limited" };

// ---------- validation (shared client/server) ----------

export const RegistrationFormSchema = z.object({
  token: z.string().trim().min(16).max(120),
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().min(4).max(40).optional().or(z.literal("")),
  specialty: z.string().trim().max(200).optional().or(z.literal("")),
  work_field: z.string().trim().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  short_description: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type RegistrationFormInput = z.infer<typeof RegistrationFormSchema>;

function sanitize(v: string | undefined | null): string | null {
  if (!v) return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s.length ? s.slice(0, 2000) : null;
}

async function assertAdmin(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- public: resolve a token ----------

export const resolveRegistrationLink = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().trim().min(8).max(120) }).parse(i))
  .handler(async ({ data }): Promise<PublicLinkState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("crm_registration_links")
      .select("label, is_active")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || !link.is_active) return { state: "inactive" };
    return { state: "ok", label: link.label };
  });

// ---------- public: submit ----------

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 10;

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => RegistrationFormSchema.parse(i))
  .handler(async ({ data }): Promise<RegistrationSubmitResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const headers = getRequest()?.headers ?? new Headers();
    const ip =
      (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      headers.get("cf-connecting-ip") ||
      "unknown";

    const bucket = `crm-reg:${data.token}:${ip}`;
    const now = Date.now();
    const { data: rl } = await supabaseAdmin
      .from("internship_signup_rate_limits")
      .select("window_start, hits")
      .eq("bucket_key", bucket)
      .maybeSingle();
    if (rl && now - new Date(rl.window_start).getTime() < WINDOW_MS) {
      if (rl.hits >= MAX_HITS) return { result: "rate_limited" };
      await supabaseAdmin
        .from("internship_signup_rate_limits")
        .update({ hits: rl.hits + 1 })
        .eq("bucket_key", bucket);
    } else {
      await supabaseAdmin
        .from("internship_signup_rate_limits")
        .upsert(
          { bucket_key: bucket, window_start: new Date(now).toISOString(), hits: 1 },
          { onConflict: "bucket_key" },
        );
    }

    const { data: link } = await supabaseAdmin
      .from("crm_registration_links")
      .select("id, label, is_active")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || !link.is_active) return { result: "inactive" };

    const { error } = await supabaseAdmin.from("individual_leads").insert({
      full_name: sanitize(data.full_name) ?? "",
      email: data.email ? data.email : null,
      phone: sanitize(data.phone),
      specialty: sanitize(data.specialty),
      work_field: sanitize(data.work_field),
      address: sanitize(data.address),
      short_description: sanitize(data.short_description),
      source: "registration_link",
      tags: [link.label],
      registration_link_id: link.id,
    });
    if (error) throw new Error("submit_failed");
    return { result: "created" };
  });

// ---------- admin ----------

export const adminListRegistrationLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegistrationLink[]> => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    await assertAdmin(supabase, userId);
    const { data: links, error } = await supabase
      .from("crm_registration_links")
      .select("id, label, token, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ids = (links ?? []).map((l) => l.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: rows, error: cErr } = await supabase
        .from("individual_leads")
        .select("registration_link_id")
        .in("registration_link_id", ids)
        .limit(10000);
      if (cErr) throw new Error(cErr.message);
      for (const r of rows ?? []) {
        const key = (r as { registration_link_id: string | null }).registration_link_id;
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return (links ?? []).map((l) => ({ ...l, submissions_count: counts.get(l.id) ?? 0 }));
  });

export const adminCreateRegistrationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ label: z.string().trim().min(2).max(120) }).parse(i))
  .handler(async ({ data, context }): Promise<RegistrationLink> => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    await assertAdmin(supabase, userId);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: link, error } = await supabase
        .from("crm_registration_links")
        .insert({ label: data.label, token: newToken(), created_by: userId })
        .select("id, label, token, is_active, created_at")
        .single();
      if (!error && link) return { ...link, submissions_count: 0 };
      if (error && (error as { code?: string }).code !== "23505") throw new Error(error.message);
    }
    throw new Error("could_not_generate_token");
  });

export const adminSetRegistrationLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("crm_registration_links")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetRegistrationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    await assertAdmin(supabase, userId);
    const { data: link, error } = await supabase
      .from("crm_registration_links")
      .select("id, label, token, is_active, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) throw new Error("not_found");

    const { data: rows, error: sErr } = await supabase
      .from("individual_leads")
      .select("id, full_name, email, phone, specialty, work_field, address, short_description, created_at")
      .eq("registration_link_id", data.id)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (sErr) throw new Error(sErr.message);

    return {
      link: { ...link, submissions_count: rows?.length ?? 0 } as RegistrationLink,
      submissions: (rows ?? []) as RegistrationSubmission[],
    };
  });
