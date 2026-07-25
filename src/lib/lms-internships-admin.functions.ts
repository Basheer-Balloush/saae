import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IdInputSchema,
  ListInternshipsInputSchema,
  OpportunityInputSchema,
  SetStatusInputSchema,
  canTransition,
  type Lifecycle,
  type OpportunityInput,
} from "@/lib/lms-internships-admin";

async function assertLmsAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("lms_admin") && !roles.includes("admin")) {
    throw new Error("unauthorized");
  }
}

// ---------- list ----------

export type AdminInternshipRow = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  status: Lifecycle;
  deadline_at: string | null;
  starts_at: string | null;
  updated_at: string;
  applications_count: number;
};

export const adminListInternships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInternshipsInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const { q, status, page, page_size, sort } = data;

    let query = supabase
      .from("internship_opportunities")
      .select(
        "id, slug, title_ar, title_en, status, deadline_at, starts_at, updated_at",
        { count: "exact" },
      );

    if (status) query = query.eq("status", status);
    if (q && q.length) {
      const pat = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `title_ar.ilike.${pat},title_en.ilike.${pat},slug.ilike.${pat}`,
      );
    }
    switch (sort) {
      case "deadline_asc":
        query = query.order("deadline_at", { ascending: true, nullsFirst: false });
        break;
      case "title_asc":
        query = query.order("title_ar", { ascending: true });
        break;
      case "status":
        query = query.order("status", { ascending: true }).order("updated_at", { ascending: false });
        break;
      default:
        query = query.order("updated_at", { ascending: false });
    }
    const from = (page - 1) * page_size;
    query = query.range(from, from + page_size - 1);
    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: apps, error: aerr } = await supabase
        .from("internship_applications")
        .select("opportunity_id")
        .in("opportunity_id", ids);
      if (aerr) throw new Error(aerr.message);
      for (const a of (apps ?? []) as { opportunity_id: string }[]) {
        counts[a.opportunity_id] = (counts[a.opportunity_id] ?? 0) + 1;
      }
    }

    const enriched: AdminInternshipRow[] = (rows ?? []).map((r: any) => ({
      ...r,
      applications_count: counts[r.id] ?? 0,
    }));
    return { rows: enriched, total: count ?? enriched.length, page, page_size };
  });

// ---------- get ----------

export const adminGetInternship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const { data: opp, error } = await supabase
      .from("internship_opportunities")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!opp) throw new Error("not_found");
    const { data: questions } = await supabase
      .from("internship_questions")
      .select("*")
      .eq("opportunity_id", data.id)
      .order("sort_order", { ascending: true });
    const { count } = await supabase
      .from("internship_applications")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", data.id);
    return { opportunity: opp, questions: questions ?? [], applications_count: count ?? 0 };
  });

// ---------- upsert (opportunity + questions) ----------

export const adminUpsertInternship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OpportunityInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const input = data as OpportunityInput;

    // Validate date coherence
    if (input.opens_at && input.deadline_at && input.opens_at > input.deadline_at) {
      throw new Error("date_range_invalid");
    }
    if (input.starts_at && input.ends_at && input.starts_at > input.ends_at) {
      throw new Error("date_range_invalid");
    }

    const { questions, id, ...oppFields } = input;
    const oppPayload = {
      ...oppFields,
      created_by: id ? undefined : userId,
    };

    let oppId: string;
    if (id) {
      // Ensure slug uniqueness manually to give clean error
      const { data: existing } = await supabase
        .from("internship_opportunities")
        .select("id")
        .eq("slug", input.slug)
        .neq("id", id)
        .maybeSingle();
      if (existing) throw new Error("slug_taken");
      const { data: upd, error } = await supabase
        .from("internship_opportunities")
        .update(oppPayload)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw new Error(error.message.includes("duplicate") ? "slug_taken" : error.message);
      oppId = upd.id;
    } else {
      const { data: existing } = await supabase
        .from("internship_opportunities")
        .select("id")
        .eq("slug", input.slug)
        .maybeSingle();
      if (existing) throw new Error("slug_taken");
      const { data: ins, error } = await supabase
        .from("internship_opportunities")
        .insert(oppPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message.includes("duplicate") ? "slug_taken" : error.message);
      oppId = ins.id;
    }

    // Reconcile questions
    const { data: existingQs } = await supabase
      .from("internship_questions")
      .select("id")
      .eq("opportunity_id", oppId);
    const existingIds = new Set(((existingQs ?? []) as { id: string }[]).map((q) => q.id));
    const incomingIds = new Set(
      questions.filter((q) => q.id).map((q) => q.id as string),
    );
    const toDelete = [...existingIds].filter((qid) => !incomingIds.has(qid));

    if (toDelete.length) {
      const { error: dErr } = await supabase
        .from("internship_questions")
        .delete()
        .in("id", toDelete);
      if (dErr) {
        // FK RESTRICT from answers
        throw new Error(
          dErr.message.includes("violates foreign key")
            ? "question_has_answers"
            : dErr.message,
        );
      }
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const payload = {
        opportunity_id: oppId,
        label_ar: q.label_ar,
        label_en: q.label_en,
        help_ar: q.help_ar ?? null,
        help_en: q.help_en ?? null,
        kind: q.kind,
        is_required: q.is_required,
        options: q.options ?? [],
        sort_order: i,
      };
      if (q.id && existingIds.has(q.id)) {
        const { error } = await supabase
          .from("internship_questions")
          .update(payload)
          .eq("id", q.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("internship_questions")
          .insert(payload);
        if (error) throw new Error(error.message);
      }
    }

    return { id: oppId };
  });

// ---------- change status ----------

export const adminSetInternshipStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetStatusInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const { data: current, error: cErr } = await supabase
      .from("internship_opportunities")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!current) throw new Error("not_found");
    if (!canTransition(current.status as Lifecycle, data.status)) {
      throw new Error("status_transition_invalid");
    }
    const { error } = await supabase
      .from("internship_opportunities")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.status };
  });

// ---------- safe delete ----------

export const adminDeleteInternship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const { count } = await supabase
      .from("internship_applications")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", data.id);
    if ((count ?? 0) > 0) throw new Error("has_applications");
    const { error } = await supabase
      .from("internship_opportunities")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- cover image signed download ----------

export const adminGetCoverSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    IdInputSchema.extend({}).parse({ id: (input as { id: string })?.id }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertLmsAdmin(supabase, userId);
    const { data: opp, error } = await supabase
      .from("internship_opportunities")
      .select("cover_image_bucket, cover_image_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!opp || !opp.cover_image_path || !opp.cover_image_bucket) return { signed_url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(opp.cover_image_bucket)
      .createSignedUrl(opp.cover_image_path, 300);
    if (sErr || !signed) return { signed_url: null };
    return { signed_url: signed.signedUrl };
  });
