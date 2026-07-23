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

const ContactType = z.enum(["individual", "company"]);
const LeadStatus = z.enum(["new", "contacted", "qualified", "converted", "archived"]);

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

    // Build unified activity timeline
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
    status?: "new" | "contacted" | "qualified" | "converted" | "archived";
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

    // Duplicate check
    if (!data.force && (email || phone)) {
      const orParts: string[] = [];
      if (email) orParts.push(`identity_type.eq.email,identity_value.eq.${email}`);
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
      if (dup) {
        return { ok: false as const, duplicateContactId: dup.contact_id, matchedOn: email ? "email" : "phone" };
      }
      void orParts;
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
    status?: "new" | "contacted" | "qualified" | "converted" | "archived";
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
    const patch: {
      display_name?: string;
      status?: "new" | "contacted" | "qualified" | "converted" | "archived";
      assigned_admin_id?: string | null;
      tags?: string[];
      organization?: string | null;
      country?: string | null;
      city?: string | null;
    } = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.status !== undefined) patch.status = data.status;
    if (data.assigned_admin_id !== undefined) patch.assigned_admin_id = data.assigned_admin_id;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.organization !== undefined) patch.organization = data.organization;
    if (data.country !== undefined) patch.country = data.country;
    if (data.city !== undefined) patch.city = data.city;
    const { error } = await context.supabase.from("crm_contacts").update(patch).eq("id", data.contactId);
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

    // Aggregate by student
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

    // Fetch emails via admin
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
