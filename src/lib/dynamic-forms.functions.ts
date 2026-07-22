import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  formInputSchema,
  formInputWithIdSchema,
  isValidSlug,
  validateSubmission,
  type DynamicForm,
  type FormField,
} from "./dynamic-forms";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("forbidden");
}

function mapForm(row: any): DynamicForm {
  return {
    id: row.id,
    slug: row.slug,
    name_ar: row.name_ar,
    name_en: row.name_en,
    description_ar: row.description_ar,
    description_en: row.description_en,
    submit_label_ar: row.submit_label_ar,
    submit_label_en: row.submit_label_en,
    status: row.status,
    fields: Array.isArray(row.fields) ? (row.fields as FormField[]) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------- Admin: list all forms ----------
export const listDynamicForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dynamic_forms")
      .select("id, slug, name_ar, name_en, status, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Admin: get by id ----------
export const getDynamicFormById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("dynamic_forms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found");
    return mapForm(row);
  });

// ---------- Admin: create ----------
export const createDynamicForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => formInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("dynamic_forms")
      .insert({
        slug: data.slug,
        name_ar: data.name_ar,
        name_en: data.name_en,
        description_ar: data.description_ar ?? null,
        description_en: data.description_en ?? null,
        submit_label_ar: data.submit_label_ar,
        submit_label_en: data.submit_label_en,
        status: data.status,
        fields: data.fields,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("slug_taken");
      throw new Error(error.message);
    }
    return mapForm(row);
  });

// ---------- Admin: update ----------
export const updateDynamicForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => formInputWithIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("dynamic_forms")
      .update({
        slug: rest.slug,
        name_ar: rest.name_ar,
        name_en: rest.name_en,
        description_ar: rest.description_ar ?? null,
        description_en: rest.description_en ?? null,
        submit_label_ar: rest.submit_label_ar,
        submit_label_en: rest.submit_label_en,
        status: rest.status,
        fields: rest.fields,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("slug_taken");
      throw new Error(error.message);
    }
    return mapForm(row);
  });

// ---------- Admin: delete ----------
export const deleteDynamicForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dynamic_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Admin: list submissions for a form ----------
export const listDynamicFormSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { formId: string }) => z.object({ formId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("dynamic_form_submissions")
      .select("id, values, field_snapshot, submitted_at")
      .eq("form_id", data.formId)
      .order("submitted_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Public: get by slug (published only) ----------
export const getPublishedFormBySlug = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().refine(isValidSlug) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row, error } = await supa
      .from("dynamic_forms")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return mapForm(row);
  });

// ---------- Public: submit ----------
export const submitDynamicForm = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; values: Record<string, unknown> }) =>
    z
      .object({
        slug: z.string().refine(isValidSlug),
        values: z.record(z.string(), z.any()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: form, error: fErr } = await supa
      .from("dynamic_forms")
      .select("id, fields, status")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!form) throw new Error("form_not_found");
    const fields = (form.fields ?? []) as FormField[];
    let cleaned: Record<string, unknown>;
    try {
      cleaned = validateSubmission(fields, data.values);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "invalid_submission");
    }
    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? null;
    const { error: iErr } = await supa.from("dynamic_form_submissions").insert({
      form_id: form.id,
      values: cleaned,
      field_snapshot: fields,
      user_agent: ua,
    });
    if (iErr) throw new Error(iErr.message);
    return { ok: true as const };
  });
