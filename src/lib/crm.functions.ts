import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertAdmin(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const LeadStatus = z.enum(["new", "contacted", "qualified", "converted", "archived"]);
type LeadStatusT = z.infer<typeof LeadStatus>;
const LeadType = z.enum(["individual", "company"]);

// ============================================================
// Legacy contact-level functions (kept for /admin/crm/contacts/*)
// ============================================================

const ContactType = z.enum(["individual", "company"]);

function normalizeEmail(v?: string | null) {
  const s = (v ?? "").trim().toLowerCase();
  return s || null;
}
function normalizePhone(v?: string | null) {
  const s = (v ?? "").replace(/[^0-9+]/g, "");
  return s || null;
}

export const listContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; status?: string; type?: string; limit?: number } = {}) =>
    z
      .object({
        search: z.string().trim().max(200).optional(),
        status: LeadStatus.optional(),
        type: ContactType.optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("crm_contacts")
      .select("id, display_name, contact_type, primary_email, primary_phone, organization, status, tags, assigned_admin_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 500);
    if (data.type) q = q.eq("contact_type", data.type);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(
        `display_name.ilike.%${s}%,primary_email.ilike.%${s}%,primary_phone.ilike.%${s}%,organization.ilike.%${s}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { contacts: rows ?? [] };
  });

export const getContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string }) =>
    z.object({ contactId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: contact, error } = await sb
      .from("crm_contacts")
      .select("*")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contact) throw new Error("Contact not found");

    const [identitiesQ, indLeadsQ, compLeadsQ, notesQ, formSubsQ] = await Promise.all([
      sb.from("crm_contact_identities").select("*").eq("contact_id", data.contactId),
      sb.from("individual_leads").select("*").eq("contact_id", data.contactId).order("created_at", { ascending: false }),
      sb.from("company_leads").select("*").eq("contact_id", data.contactId).order("created_at", { ascending: false }),
      sb.from("crm_notes").select("*").eq("contact_id", data.contactId).order("created_at", { ascending: false }),
      sb
        .from("dynamic_form_submissions")
        .select("id, form_id, values, submitted_at, dynamic_forms(slug, name_en, name_ar)")
        .eq("contact_id", data.contactId)
        .order("submitted_at", { ascending: false }),
    ]);

    for (const r of [identitiesQ, indLeadsQ, compLeadsQ, notesQ, formSubsQ]) {
      if (r.error) throw new Error(r.error.message);
    }

    type Activity = {
      kind: "individual_lead" | "company_lead" | "form_submission" | "note";
      id: string;
      timestamp: string;
      title: string;
      subtitle: string | null;
      source: string | null;
      conversation_id: string | null;
      form_slug: string | null;
      values_json: string | null;
      author_id: string | null;
    };
    const activities: Activity[] = [];
    for (const l of indLeadsQ.data ?? []) {
      activities.push({
        kind: "individual_lead",
        id: l.id,
        timestamp: l.created_at,
        title: "Individual lead submitted",
        subtitle: l.short_description ?? l.source ?? null,
        source: l.source ?? null,
        conversation_id: l.conversation_id ?? null,
        form_slug: null,
        values_json: null,
        author_id: null,
      });
    }
    for (const l of compLeadsQ.data ?? []) {
      activities.push({
        kind: "company_lead",
        id: l.id,
        timestamp: l.created_at,
        title: `Company lead — ${l.company_name}`,
        subtitle: l.work_field ?? l.source ?? null,
        source: l.source ?? null,
        conversation_id: l.conversation_id ?? null,
        form_slug: null,
        values_json: null,
        author_id: null,
      });
    }
    for (const s of formSubsQ.data ?? []) {
      const form = (s as unknown as { dynamic_forms?: { slug: string; name_en: string; name_ar: string } | null }).dynamic_forms;
      activities.push({
        kind: "form_submission",
        id: s.id,
        timestamp: s.submitted_at,
        title: `Form: ${form?.name_en ?? form?.slug ?? "Unknown"}`,
        subtitle: form?.name_ar ?? null,
        source: null,
        conversation_id: null,
        form_slug: form?.slug ?? null,
        values_json: JSON.stringify(s.values ?? {}),
        author_id: null,
      });
    }
    for (const n of notesQ.data ?? []) {
      activities.push({
        kind: "note",
        id: n.id,
        timestamp: n.created_at,
        title: "Note",
        subtitle: n.body,
        source: null,
        conversation_id: null,
        form_slug: null,
        values_json: null,
        author_id: n.author_id ?? null,
      });
    }
    activities.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return {
      contact,
      identities: identitiesQ.data ?? [],
      individualLeads: indLeadsQ.data ?? [],
      companyLeads: compLeadsQ.data ?? [],
      notes: notesQ.data ?? [],
      formSubmissions: formSubsQ.data ?? [],
      activities,
    };
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    display_name: string;
    contact_type?: "individual" | "company";
    primary_email?: string;
    primary_phone?: string;
    organization?: string;
    country?: string;
    city?: string;
    tags?: string[];
    status?: LeadStatusT;
    notes?: string;
    force?: boolean;
  }) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(200),
        contact_type: ContactType.optional(),
        primary_email: z.string().trim().email().max(255).optional().or(z.literal("")),
        primary_phone: z.string().trim().max(50).optional().or(z.literal("")),
        organization: z.string().trim().max(200).optional().or(z.literal("")),
        country: z.string().trim().max(100).optional().or(z.literal("")),
        city: z.string().trim().max(100).optional().or(z.literal("")),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        status: LeadStatus.optional(),
        notes: z.string().trim().max(4000).optional(),
        force: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const email = normalizeEmail(data.primary_email);
    const phone = normalizePhone(data.primary_phone);

    if (!data.force && (email || phone)) {
      let dup: { contact_id: string } | null = null;
      if (email) {
        const { data: r } = await sb
          .from("crm_contact_identities")
          .select("contact_id")
          .eq("identity_type", "email")
          .eq("identity_value", email)
          .maybeSingle();
        if (r) dup = r;
      }
      if (!dup && phone) {
        const { data: r } = await sb
          .from("crm_contact_identities")
          .select("contact_id")
          .eq("identity_type", "phone")
          .eq("identity_value", phone)
          .maybeSingle();
        if (r) dup = r;
      }
      if (dup) return { ok: false as const, duplicateContactId: dup.contact_id, matchedOn: email ? "email" : "phone" };
    }

    const { data: inserted, error } = await sb
      .from("crm_contacts")
      .insert({
        display_name: data.display_name,
        contact_type: data.contact_type ?? "individual",
        primary_email: email,
        primary_phone: phone,
        organization: data.organization || null,
        country: data.country || null,
        city: data.city || null,
        tags: data.tags ?? [],
        status: data.status ?? "new",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "insert failed");

    if (email) {
      await sb.from("crm_contact_identities").insert({ contact_id: inserted.id, identity_type: "email", identity_value: email });
    }
    if (phone) {
      await sb.from("crm_contact_identities").insert({ contact_id: inserted.id, identity_type: "phone", identity_value: phone });
    }
    if (data.notes && data.notes.trim()) {
      await sb.from("crm_notes").insert({ contact_id: inserted.id, author_id: context.userId, body: data.notes.trim() });
    }
    return { ok: true as const, contactId: inserted.id };
  });

export const updateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    contactId: string;
    display_name?: string;
    status?: LeadStatusT;
    assigned_admin_id?: string | null;
    tags?: string[];
    organization?: string | null;
    country?: string | null;
    city?: string | null;
  }) =>
    z
      .object({
        contactId: z.string().uuid(),
        display_name: z.string().trim().min(1).max(200).optional(),
        status: LeadStatus.optional(),
        assigned_admin_id: z.string().uuid().nullable().optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        organization: z.string().trim().max(200).nullable().optional(),
        country: z.string().trim().max(100).nullable().optional(),
        city: z.string().trim().max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = {};
    for (const k of ["display_name", "status", "assigned_admin_id", "tags", "organization", "country", "city"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await context.supabase.from("crm_contacts").update(patch as never).eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string; body: string }) =>
    z.object({ contactId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: n, error } = await context.supabase
      .from("crm_notes")
      .insert({ contact_id: data.contactId, author_id: context.userId, body: data.body })
      .select("id")
      .single();
    if (error || !n) throw new Error(error?.message ?? "insert failed");
    return { ok: true, id: n.id };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { noteId: string }) => z.object({ noteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("crm_notes").delete().eq("id", data.noteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contactId: string }) => z.object({ contactId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("crm_contacts").delete().eq("id", data.contactId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLmsStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: enrollments, error } = await sb
      .from("lms_enrollments")
      .select("id, student_id, progress, enrolled_at, completed_at, lms_courses(id, title_en, title_ar, slug)")
      .order("enrolled_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const byStudent = new Map<
      string,
      {
        student_id: string;
        enrollments_count: number;
        completed_count: number;
        avg_progress: number;
        last_enrolled_at: string;
        courses: Array<{ id: string; title_en: string; title_ar: string; slug: string; progress: number; completed: boolean }>;
      }
    >();
    for (const e of enrollments ?? []) {
      const course = (e as unknown as { lms_courses?: { id: string; title_en: string; title_ar: string; slug: string } | null }).lms_courses;
      if (!course) continue;
      const existing = byStudent.get(e.student_id) ?? {
        student_id: e.student_id,
        enrollments_count: 0,
        completed_count: 0,
        avg_progress: 0,
        last_enrolled_at: e.enrolled_at,
        courses: [],
      };
      existing.enrollments_count += 1;
      if (e.completed_at) existing.completed_count += 1;
      existing.avg_progress += Number(e.progress) || 0;
      if (e.enrolled_at > existing.last_enrolled_at) existing.last_enrolled_at = e.enrolled_at;
      existing.courses.push({
        id: course.id,
        title_en: course.title_en,
        title_ar: course.title_ar,
        slug: course.slug,
        progress: Number(e.progress) || 0,
        completed: !!e.completed_at,
      });
      byStudent.set(e.student_id, existing);
    }
    const students = Array.from(byStudent.values()).map((s) => ({
      ...s,
      avg_progress: s.enrollments_count > 0 ? Math.round(s.avg_progress / s.enrollments_count) : 0,
    }));
    students.sort((a, b) => (a.last_enrolled_at < b.last_enrolled_at ? 1 : -1));

    let emailsById: Record<string, string> = {};
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const perPage = 1000;
      for (let page = 1; page <= 20; page++) {
        const { data: list, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (aErr) break;
        for (const u of list.users) emailsById[u.id] = u.email ?? "";
        if (list.users.length < perPage) break;
      }
    } catch {
      emailsById = {};
    }
    return {
      students: students.map((s) => ({ ...s, email: emailsById[s.student_id] ?? null })),
    };
  });

// ============================================================
// NEW: Lead-level server functions (thin wrappers over SECURITY DEFINER RPCs)
// ============================================================

const LeadFilters = z.object({
  search: z.string().trim().max(200).optional(),
  status: LeadStatus.optional(),
  source: z.string().trim().max(50).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
});
type LeadFiltersT = z.infer<typeof LeadFilters>;

const INDIVIDUAL_COLS =
  "id, full_name, email, phone, specialty, work_field, address, short_description, source, status, contact_id, conversation_id, created_at, updated_at";
const COMPANY_COLS =
  "id, company_name, contact_name, contact_email, contact_phone, work_field, country, office_address, source, status, contact_id, conversation_id, created_at, updated_at";

function escLike(s: string) {
  return s.replace(/[%_,()]/g, (m) => `\\${m}`);
}

function applyIndividualFilters<T extends { or: (v: string) => T; eq: (a: string, b: string) => T; gte: (a: string, b: string) => T; lte: (a: string, b: string) => T }>(
  q: T, f: LeadFiltersT,
): T {
  if (f.search) {
    const s = escLike(f.search);
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,specialty.ilike.%${s}%,work_field.ilike.%${s}%`);
  }
  if (f.status) q = q.eq("status", f.status);
  if (f.source) q = q.eq("source", f.source);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  return q;
}

function applyCompanyFilters<T extends { or: (v: string) => T; eq: (a: string, b: string) => T; gte: (a: string, b: string) => T; lte: (a: string, b: string) => T }>(
  q: T, f: LeadFiltersT,
): T {
  if (f.search) {
    const s = escLike(f.search);
    q = q.or(`company_name.ilike.%${s}%,contact_name.ilike.%${s}%,contact_email.ilike.%${s}%,contact_phone.ilike.%${s}%,work_field.ilike.%${s}%`);
  }
  if (f.status) q = q.eq("status", f.status);
  if (f.source) q = q.eq("source", f.source);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  return q;
}

export const listIndividualLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LeadFiltersT = {}) => LeadFilters.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const limit = data.limit ?? 50;
    const offset = data.offset ?? 0;
    let q = context.supabase
      .from("individual_leads")
      .select(INDIVIDUAL_COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    q = applyIndividualFilters(q, data);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const listCompanyLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LeadFiltersT = {}) => LeadFilters.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const limit = data.limit ?? 50;
    const offset = data.offset ?? 0;
    let q = context.supabase
      .from("company_leads")
      .select(COMPANY_COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    q = applyCompanyFilters(q, data);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

const EXPORT_CAP = 10000;

export const exportIndividualLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LeadFiltersT = {}) => LeadFilters.omit({ limit: true, offset: true }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("individual_leads")
      .select(INDIVIDUAL_COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, EXPORT_CAP);
    q = applyIndividualFilters(q, data);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    if ((count ?? 0) > EXPORT_CAP) {
      throw new Error(`export_too_large:${count}:${EXPORT_CAP}`);
    }
    return { rows: rows ?? [] };
  });

export const exportCompanyLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LeadFiltersT = {}) => LeadFilters.omit({ limit: true, offset: true }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("company_leads")
      .select(COMPANY_COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, EXPORT_CAP);
    q = applyCompanyFilters(q, data);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    if ((count ?? 0) > EXPORT_CAP) {
      throw new Error(`export_too_large:${count}:${EXPORT_CAP}`);
    }
    return { rows: rows ?? [] };
  });

// ---------- Detail ----------

async function loadLeadDetail(
  sb: SupabaseClient,
  variant: "individual" | "company",
  leadId: string,
) {
  const table = variant === "individual" ? "individual_leads" : "company_leads";
  const cols = variant === "individual" ? INDIVIDUAL_COLS : COMPANY_COLS;
  const { data: lead, error } = await sb.from(table).select(cols).eq("id", leadId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) throw new Error("lead_not_found");
  const leadRow = lead as unknown as { id: string; contact_id: string | null; conversation_id: string | null; created_at: string };

  let contact = null;
  let notes: Array<{ id: string; body: string; created_at: string; author_id: string | null }> = [];
  let formSubs: Array<{
    id: string;
    submitted_at: string;
    values: unknown;
    dynamic_forms: { slug: string; name_en: string; name_ar: string } | null;
  }> = [];

  if (leadRow.contact_id) {
    const [cQ, nQ, fQ] = await Promise.all([
      sb.from("crm_contacts").select("*").eq("id", leadRow.contact_id).maybeSingle(),
      sb.from("crm_notes").select("id, body, created_at, author_id").eq("contact_id", leadRow.contact_id).order("created_at", { ascending: false }),
      sb
        .from("dynamic_form_submissions")
        .select("id, submitted_at, values, dynamic_forms(slug, name_en, name_ar)")
        .eq("contact_id", leadRow.contact_id)
        .order("submitted_at", { ascending: false }),
    ]);
    if (cQ.error) throw new Error(cQ.error.message);
    if (nQ.error) throw new Error(nQ.error.message);
    if (fQ.error) throw new Error(fQ.error.message);
    contact = cQ.data;
    notes = nQ.data ?? [];
    formSubs = (fQ.data ?? []) as typeof formSubs;
  }

  // Activity timeline: notes + form submissions (contact_id only) + lead creation
  type Activity = {
    kind: "lead_created" | "note" | "form_submission";
    id: string;
    timestamp: string;
    title: string;
    subtitle: string | null;
    form_slug: string | null;
    author_id: string | null;
  };
  const activities: Activity[] = [];
  activities.push({
    kind: "lead_created",
    id: leadRow.id,
    timestamp: leadRow.created_at,
    title: variant === "individual" ? "Individual lead created" : "Company lead created",
    subtitle: null,
    form_slug: null,
    author_id: null,
  });
  for (const n of notes) {
    activities.push({
      kind: "note",
      id: n.id,
      timestamp: n.created_at,
      title: "Note",
      subtitle: n.body,
      form_slug: null,
      author_id: n.author_id,
    });
  }
  for (const s of formSubs) {
    activities.push({
      kind: "form_submission",
      id: s.id,
      timestamp: s.submitted_at,
      title: `Form: ${s.dynamic_forms?.name_en ?? s.dynamic_forms?.slug ?? "Form"}`,
      subtitle: s.dynamic_forms?.name_ar ?? null,
      form_slug: s.dynamic_forms?.slug ?? null,
      author_id: null,
    });
  }
  activities.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return { lead, contact, notes, activities };
}

export const getIndividualLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return loadLeadDetail(context.supabase, "individual", data.leadId);
  });

export const getCompanyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return loadLeadDetail(context.supabase, "company", data.leadId);
  });

// ---------- Mutations (RPC-backed) ----------

const IndividualCreate = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  specialty: z.string().trim().max(200).optional().or(z.literal("")),
  work_field: z.string().trim().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  short_description: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.string().trim().max(50).optional(),
  status: LeadStatus.optional(),
  override_conflict: z.boolean().optional(),
});
type IndividualCreateT = z.infer<typeof IndividualCreate>;

const CompanyCreate = z.object({
  company_name: z.string().trim().min(2).max(200),
  contact_name: z.string().trim().max(200).optional().or(z.literal("")),
  contact_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(50).optional().or(z.literal("")),
  work_field: z.string().trim().max(200).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  office_address: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.string().trim().max(50).optional(),
  status: LeadStatus.optional(),
  override_conflict: z.boolean().optional(),
});
type CompanyCreateT = z.infer<typeof CompanyCreate>;

function stripEmpty<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== "" && v !== undefined) out[k] = v;
  return out;
}

export const createIndividualLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: IndividualCreateT) => IndividualCreate.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc(
      "crm_create_individual_lead_tx",
      { payload: stripEmpty(data) },
    );
    if (error) throw new Error(error.message);
    return result as { lead_id: string; contact_id: string };
  });

export const createCompanyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CompanyCreateT) => CompanyCreate.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc(
      "crm_create_company_lead_tx",
      { payload: stripEmpty(data) },
    );
    if (error) throw new Error(error.message);
    return result as { lead_id: string; contact_id: string };
  });

const IndividualPatch = IndividualCreate.partial().extend({ leadId: z.string().uuid() });
const CompanyPatch = CompanyCreate.partial().extend({ leadId: z.string().uuid() });

export const updateIndividualLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IndividualPatch>) => IndividualPatch.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { leadId, ...rest } = data;
    const { data: result, error } = await context.supabase.rpc(
      "crm_update_individual_lead_tx",
      { _lead_id: leadId, payload: rest as Record<string, unknown> },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const updateCompanyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CompanyPatch>) => CompanyPatch.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { leadId, ...rest } = data;
    const { data: result, error } = await context.supabase.rpc(
      "crm_update_company_lead_tx",
      { _lead_id: leadId, payload: rest as Record<string, unknown> },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const setLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadType: "individual" | "company"; leadId: string; status: LeadStatusT }) =>
    z.object({ leadType: LeadType, leadId: z.string().uuid(), status: LeadStatus }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("crm_set_lead_status_tx", {
      _lead_type: data.leadType,
      _lead_id: data.leadId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadType: "individual" | "company"; leadId: string; body: string }) =>
    z
      .object({ leadType: LeadType, leadId: z.string().uuid(), body: z.string().trim().min(1).max(4000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("crm_add_lead_note_tx", {
      _lead_type: data.leadType,
      _lead_id: data.leadId,
      _body: data.body,
    });
    if (error) throw new Error(error.message);
    return result as { note_id: string; contact_id: string };
  });
