import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUSES = [
  "new",
  "under_review",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

export const ADMIN_ASSIGNABLE_STATUSES: readonly ApplicationStatus[] = [
  "new",
  "under_review",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
];

export const SORT_OPTIONS = [
  "submitted_desc",
  "submitted_asc",
  "name_asc",
  "status",
] as const;

const ListSchema = z.object({
  opportunity_id: z.string().uuid(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(STATUSES).optional(),
  course_id: z.string().uuid().optional(),
  certificate_id: z.string().uuid().optional(),
  assigned_admin: z.string().uuid().optional(),
  submitted_from: z.string().datetime({ offset: true }).optional(),
  submitted_to: z.string().datetime({ offset: true }).optional(),
  sort: z.enum(SORT_OPTIONS).default("submitted_desc"),
  page: z.number().int().min(1).max(1000).default(1),
  page_size: z.number().int().min(5).max(100).default(25),
});

export type ApplicationListRow = {
  id: string;
  opportunity_id: string;
  user_id: string;
  status: ApplicationStatus;
  attempt_number: number;
  submitted_at: string;
  withdrawn_at: string | null;
  snapshot_full_name: string | null;
  snapshot_email: string | null;
  snapshot_phone: string | null;
  snapshot_organization: string | null;
  assigned_admin: string | null;
  assigned_admin_email: string | null;
  courses_count: number;
  certificates_count: number;
  notes_count: number;
};

export const adminListApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: rows, error } = await supabase.rpc(
      "admin_list_internship_applications",
      {
        _opportunity_id: data.opportunity_id,
        _q: data.q ?? null,
        _status: data.status ?? null,
        _course_id: data.course_id ?? null,
        _certificate_id: data.certificate_id ?? null,
        _assigned_admin: data.assigned_admin ?? null,
        _submitted_from: data.submitted_from ?? null,
        _submitted_to: data.submitted_to ?? null,
        _sort: data.sort,
        _page: data.page,
        _page_size: data.page_size,
      },
    );
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<ApplicationListRow & { total_count: number }>;
    const total = list.length > 0 ? Number(list[0].total_count) : 0;
    return {
      rows: list.map(({ total_count: _tc, ...r }) => r) as ApplicationListRow[],
      total,
      page: data.page,
      page_size: data.page_size,
    };
  });

const IdSchema = z.object({ application_id: z.string().uuid() });

const nullableText = z.string().nullable().catch(null);
const nullableDate = z.string().nullable().catch(null);

const BundleSchema = z.object({
  application: z.object({
    id: z.string(),
    opportunity_id: z.string(),
    status: z.enum(STATUSES),
    attempt_number: z.number().catch(1),
    submitted_at: z.string(),
    withdrawn_at: nullableDate,
    snapshot_full_name: nullableText,
    snapshot_email: nullableText,
    snapshot_phone: nullableText,
    snapshot_organization: nullableText,
    snapshot_biography: nullableText,
    assigned_admin: z.string().nullable().catch(null),
    assigned_admin_email: nullableText,
  }),
  opportunity: z.object({
    id: z.string(),
    slug: z.string(),
    title_ar: z.string().catch(""),
    title_en: z.string().nullable().catch(null),
  }),
  cv: z
    .object({
      id: z.string(),
      original_filename: nullableText,
      mime_type: z.string().nullable().catch(null),
      size_bytes: z.number().nullable().catch(null),
    })
    .nullable()
    .catch(null),
  courses: z
    .array(
      z.object({
        id: z.string(),
        course_title_ar: nullableText,
        course_title_en: nullableText,
        progress_percent: z.coerce.number().nullable().catch(null),
        completed: z.boolean().catch(false),
        enrolled_at: nullableDate,
        attendance_present: z.number().nullable().catch(null),
        attendance_total: z.number().nullable().catch(null),
      }),
    )
    .catch([]),
  certificates: z
    .array(
      z.object({
        id: z.string(),
        serial: nullableText,
        course_title_ar: nullableText,
        course_title_en: nullableText,
        issued_at: nullableDate,
      }),
    )
    .catch([]),
  answers: z
    .array(
      z.object({
        id: z.string(),
        question_label_ar: nullableText,
        question_label_en: nullableText,
        question_kind: nullableText,
        answer_text: nullableText,
        answer_json: z.unknown().nullable().catch(null),
      }),
    )
    .catch([]),
  notes: z
    .array(
      z.object({
        id: z.string(),
        body: z.string().catch(""),
        created_at: z.string(),
        author_email: nullableText,
      }),
    )
    .catch([]),
  history: z
    .array(
      z.object({
        id: z.string(),
        from_status: z.enum(STATUSES).nullable().catch(null),
        to_status: z.enum(STATUSES),
        reason: nullableText,
        created_at: z.string(),
        changed_by_email: nullableText,
      }),
    )
    .catch([]),
});

export type ApplicationBundle = z.infer<typeof BundleSchema>;

const GetSchema = z.object({
  application_id: z.string().uuid(),
  opportunity_id: z.string().uuid().optional(),
});

export const adminGetApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GetSchema.parse(i))
  .handler(async ({ data, context }): Promise<ApplicationBundle> => {
    const { supabase } = context as { supabase: any };
    const { data: bundle, error } = await supabase.rpc(
      "admin_get_internship_application",
      { _application_id: data.application_id },
    );
    if (error) throw new Error(error.message);
    if (!bundle || typeof bundle !== "object") {
      throw new Error("application_not_found");
    }
    const parsed = BundleSchema.safeParse(bundle);
    if (!parsed.success) throw new Error("invalid_application_bundle");
    const result = parsed.data;
    // The application must belong to the opportunity addressed in the URL.
    if (
      data.opportunity_id &&
      result.application.opportunity_id !== data.opportunity_id
    ) {
      throw new Error("application_not_found");
    }
    // Never leak private storage locations or unrelated internal identifiers.
    return result;
  });


export const adminSetApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        application_id: z.string().uuid(),
        to_status: z.enum(ADMIN_ASSIGNABLE_STATUSES as unknown as [string, ...string[]]),
        reason: z.string().trim().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { error } = await supabase.rpc("admin_set_application_status", {
      _application_id: data.application_id,
      _to_status: data.to_status,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAddApplicationNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        application_id: z.string().uuid(),
        body: z.string().trim().min(1).max(20000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: id, error } = await supabase.rpc("admin_add_application_note", {
      _application_id: data.application_id,
      _body: data.body,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const adminAssignApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        application_id: z.string().uuid(),
        admin_user_id: z.string().uuid().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { error } = await supabase.rpc("admin_assign_application_admin", {
      _application_id: data.application_id,
      _admin_user_id: data.admin_user_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListLmsAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as { supabase: any };
    const { data, error } = await supabase.rpc("admin_list_lms_admins");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ user_id: string; email: string | null }>;
  });

export const adminGetApplicationCvUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: rows, error } = await supabase.rpc("admin_get_application_cv", {
      _application_id: data.application_id,
    });
    if (error) throw new Error(error.message);
    const file = (rows ?? [])[0] as
      | { bucket: string; path: string; original_filename: string | null; mime_type: string }
      | undefined;
    if (!file) return { url: null as string | null, filename: null as string | null };
    const { data: signed, error: sErr } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 600);
    if (sErr) throw new Error(sErr.message);
    return { url: signed?.signedUrl ?? null, filename: file.original_filename };
  });

// Full export (bounded server-side)
const ExportSchema = ListSchema.omit({ page: true, page_size: true });

export const adminExportApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExportSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const LIMIT = 5000;
    const { data: rows, error } = await supabase.rpc(
      "admin_list_internship_applications",
      {
        _opportunity_id: data.opportunity_id,
        _q: data.q ?? null,
        _status: data.status ?? null,
        _course_id: data.course_id ?? null,
        _certificate_id: data.certificate_id ?? null,
        _assigned_admin: data.assigned_admin ?? null,
        _submitted_from: data.submitted_from ?? null,
        _submitted_to: data.submitted_to ?? null,
        _sort: data.sort,
        _page: 1,
        _page_size: 100,
      },
    );
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<ApplicationListRow & { total_count: number }>;
    const total = list.length > 0 ? Number(list[0].total_count) : 0;

    // Fetch remaining pages up to LIMIT
    const all: ApplicationListRow[] = list.map(({ total_count: _tc, ...r }) => r);
    let page = 2;
    while (all.length < Math.min(total, LIMIT)) {
      const { data: more, error: e2 } = await supabase.rpc(
        "admin_list_internship_applications",
        {
          _opportunity_id: data.opportunity_id,
          _q: data.q ?? null,
          _status: data.status ?? null,
          _course_id: data.course_id ?? null,
          _certificate_id: data.certificate_id ?? null,
          _assigned_admin: data.assigned_admin ?? null,
          _submitted_from: data.submitted_from ?? null,
          _submitted_to: data.submitted_to ?? null,
          _sort: data.sort,
          _page: page,
          _page_size: 100,
        },
      );
      if (e2) throw new Error(e2.message);
      const chunk = (more ?? []) as Array<ApplicationListRow & { total_count: number }>;
      if (chunk.length === 0) break;
      for (const r of chunk) {
        const { total_count: _tc, ...rest } = r;
        all.push(rest as ApplicationListRow);
        if (all.length >= LIMIT) break;
      }
      page += 1;
    }

    return {
      rows: all,
      total,
      truncated: total > LIMIT,
      limit: LIMIT,
    };
  });
