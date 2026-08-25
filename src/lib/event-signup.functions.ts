import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- shared validation ----------

export const SignupFormSchema = z.object({
  token: z.string().trim().min(16).max(120),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(6).max(40),
  organization: z.string().trim().max(200).optional().or(z.literal("")),
  biography: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type SignupFormInput = z.infer<typeof SignupFormSchema>;

export type PublicSignupState =
  | { state: "ok"; title_ar: string; title_en: string | null }
  | { state: "inactive" }
  | { state: "unknown" };

export type SubmitResult =
  | { result: "created" }
  | { result: "duplicate" }
  | { result: "inactive" }
  | { result: "rate_limited" };

function sanitize(v: string | undefined | null): string | null {
  if (!v) return null;
  // Strip control characters; the DB stores plain text only.
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s.length ? s.slice(0, 2000) : null;
}

// ---------- public: resolve a token ----------

export const resolveSignupLink = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().trim().min(8).max(120) }).parse(i))
  .handler(async ({ data }): Promise<PublicSignupState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("internship_signup_links")
      .select("is_active, opportunity_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) return { state: "unknown" };
    if (!link.is_active) return { state: "inactive" };
    const { data: opp } = await supabaseAdmin
      .from("internship_opportunities")
      .select("title_ar, title_en")
      .eq("id", link.opportunity_id)
      .maybeSingle();
    return {
      state: "ok",
      title_ar: opp?.title_ar ?? "",
      title_en: opp?.title_en ?? null,
    };
  });

// ---------- public: submit ----------

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;

export const submitEventSignup = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SignupFormSchema.parse(i))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const headers = getRequest()?.headers ?? new Headers();
    const ip =
      (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      headers.get("cf-connecting-ip") ||
      "unknown";

    // Rate limit per token + client address.
    const bucket = `${data.token}:${ip}`;
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
      .from("internship_signup_links")
      .select("id, is_active, opportunity_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link || !link.is_active) return { result: "inactive" };

    const { error } = await supabaseAdmin.from("internship_signup_submissions").insert({
      opportunity_id: link.opportunity_id,
      link_id: link.id,
      full_name: sanitize(data.full_name) ?? "",
      email: data.email,
      phone: sanitize(data.phone) ?? "",
      organization: sanitize(data.organization),
      biography: sanitize(data.biography),
    });
    if (error) {
      // 23505 = unique violation on email or phone for this opportunity.
      if ((error as { code?: string }).code === "23505") return { result: "duplicate" };
      throw new Error("submit_failed");
    }
    return { result: "created" };
  });

// ---------- admin: link management ----------

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type SignupLink = {
  id: string;
  opportunity_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  submissions_count: number;
};

const OppSchema = z.object({ opportunity_id: z.string().uuid() });

export const adminGetSignupLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OppSchema.parse(i))
  .handler(async ({ data, context }): Promise<SignupLink | null> => {
    const { supabase } = context as { supabase: any };
    const { data: link, error } = await supabase
      .from("internship_signup_links")
      .select("id, opportunity_id, token, is_active, created_at")
      .eq("opportunity_id", data.opportunity_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) return null;
    const { count } = await supabase
      .from("internship_signup_submissions")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", data.opportunity_id);
    return { ...link, submissions_count: count ?? 0 } as SignupLink;
  });

export const adminCreateSignupLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OppSchema.parse(i))
  .handler(async ({ data, context }): Promise<SignupLink> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: link, error } = await supabase
      .from("internship_signup_links")
      .upsert(
        {
          opportunity_id: data.opportunity_id,
          token: newToken(),
          is_active: true,
          created_by: userId,
        },
        { onConflict: "opportunity_id" },
      )
      .select("id, opportunity_id, token, is_active, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...link, submissions_count: 0 } as SignupLink;
  });

export const adminSetSignupLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ opportunity_id: z.string().uuid(), is_active: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { error } = await supabase
      .from("internship_signup_links")
      .update({ is_active: data.is_active })
      .eq("opportunity_id", data.opportunity_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SignupSubmission = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string | null;
  biography: string | null;
  created_at: string;
};

export const adminListSignupSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OppSchema.parse(i))
  .handler(async ({ data, context }): Promise<SignupSubmission[]> => {
    const { supabase } = context as { supabase: any };
    const { data: rows, error } = await supabase
      .from("internship_signup_submissions")
      .select("id, full_name, email, phone, organization, biography, created_at")
      .eq("opportunity_id", data.opportunity_id)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SignupSubmission[];
  });

export const adminDeleteSignupSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { error } = await supabase
      .from("internship_signup_submissions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
