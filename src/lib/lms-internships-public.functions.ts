import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Lifecycle } from "@/lib/lms-internships-admin";

// Fields returned to public callers — strictly the ones safe for anon.
export type PublicInternshipCard = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  location_ar: string | null;
  location_en: string | null;
  duration_ar: string | null;
  duration_en: string | null;
  status: Extract<Lifecycle, "published" | "closed">;
  opens_at: string | null;
  deadline_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_url: string | null;
};

export type PublicInternshipDetail = PublicInternshipCard & {
  description_ar: string | null;
  description_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
  stipend_ar: string | null;
  stipend_en: string | null;
  capacity: number | null;
  require_cv: boolean;
  allow_reapply: boolean;
  required_profile_fields: string[];
  updated_at: string;
  questions: {
    id: string;
    label_ar: string;
    label_en: string;
    help_ar: string | null;
    help_en: string | null;
    kind: Database["public"]["Enums"]["internship_question_kind"];
    is_required: boolean;
    options: string[];
    sort_order: number;
  }[];
};

const PUBLIC_CARD_COLUMNS =
  "id, slug, title_ar, title_en, summary_ar, summary_en, location_ar, location_en, duration_ar, duration_en, status, opens_at, deadline_at, starts_at, ends_at, cover_image_bucket, cover_image_path";

const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_CARD_COLUMNS}, description_ar, description_en, requirements_ar, requirements_en, stipend_ar, stipend_en, capacity, require_cv, allow_reapply, required_profile_fields, updated_at`;

const ListSchema = z.object({
  page: z.number().int().min(1).max(200).default(1),
  page_size: z.number().int().min(4).max(48).default(12),
  q: z.string().trim().max(200).optional(),
});

const SlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function signCover(
  bucket: string | null,
  path: string | null,
): Promise<string | null> {
  // Only called with rows returned by the anonymous published/closed queries
  // below. Never accept an arbitrary client-supplied bucket or object path.
  if (bucket !== "internship-covers" || !path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) console.error("Internship cover signing failed", { status: error.statusCode });
  return data?.signedUrl ?? null;
}

export const listPublicInternships = createServerFn({ method: "POST" })
  .inputValidator((data) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;

    let query = supabase
      .from("internship_opportunities")
      .select(PUBLIC_CARD_COLUMNS, { count: "exact" })
      .in("status", ["published", "closed"])
      .order("status", { ascending: true }) // published before closed
      .order("deadline_at", { ascending: true, nullsFirst: false })
      .range(from, to);

    if (data.q) {
      const like = `%${data.q.replace(/[%_]/g, "\\$&")}%`;
      query = query.or(
        `title_ar.ilike.${like},title_en.ilike.${like},summary_ar.ilike.${like},summary_en.ilike.${like}`,
      );
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const items: PublicInternshipCard[] = await Promise.all(
      (rows ?? []).map(async (r) => ({
        id: r.id,
        slug: r.slug,
        title_ar: r.title_ar,
        title_en: r.title_en,
        summary_ar: r.summary_ar,
        summary_en: r.summary_en,
        location_ar: r.location_ar,
        location_en: r.location_en,
        duration_ar: r.duration_ar,
        duration_en: r.duration_en,
        status: r.status as "published" | "closed",
        opens_at: r.opens_at,
        deadline_at: r.deadline_at,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        cover_url: await signCover(r.cover_image_bucket, r.cover_image_path),
      })),
    );

    return { items, total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const getPublicInternshipBySlug = createServerFn({ method: "POST" })
  .inputValidator((data) => SlugSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: row, error } = await supabase
      .from("internship_opportunities")
      .select(PUBLIC_DETAIL_COLUMNS)
      .eq("slug", data.slug)
      .in("status", ["published", "closed"])
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: qs, error: qErr } = await supabase
      .from("internship_questions")
      .select("id, label_ar, label_en, help_ar, help_en, kind, is_required, options, sort_order")
      .eq("opportunity_id", row.id)
      .order("sort_order", { ascending: true });
    if (qErr) throw new Error(qErr.message);

    const detail: PublicInternshipDetail = {
      id: row.id,
      slug: row.slug,
      title_ar: row.title_ar,
      title_en: row.title_en,
      summary_ar: row.summary_ar,
      summary_en: row.summary_en,
      location_ar: row.location_ar,
      location_en: row.location_en,
      duration_ar: row.duration_ar,
      duration_en: row.duration_en,
      status: row.status as "published" | "closed",
      opens_at: row.opens_at,
      deadline_at: row.deadline_at,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      cover_url: await signCover(row.cover_image_bucket, row.cover_image_path),
      description_ar: row.description_ar,
      description_en: row.description_en,
      requirements_ar: row.requirements_ar,
      requirements_en: row.requirements_en,
      stipend_ar: row.stipend_ar,
      stipend_en: row.stipend_en,
      capacity: row.capacity,
      require_cv: row.require_cv,
      allow_reapply: row.allow_reapply,
      required_profile_fields: row.required_profile_fields ?? [],
      updated_at: row.updated_at,
      questions: (qs ?? []).map((q) => ({
        id: q.id,
        label_ar: q.label_ar,
        label_en: q.label_en,
        help_ar: q.help_ar,
        help_en: q.help_en,
        kind: q.kind,
        is_required: q.is_required,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        sort_order: q.sort_order,
      })),
    };

    return detail;
  });

export type ApplyState = "open" | "not_open_yet" | "deadline_passed" | "closed" | "unavailable";

// Mirrors the block_reason order in lms-internships-apply.functions.ts.
export function getApplyState(o: {
  status: string;
  opens_at: string | null;
  deadline_at: string | null;
}): ApplyState {
  if (o.status === "closed") return "closed";
  if (o.status !== "published") return "unavailable";
  const now = Date.now();
  if (o.opens_at && new Date(o.opens_at).getTime() > now) return "not_open_yet";
  if (o.deadline_at && new Date(o.deadline_at).getTime() < now) return "deadline_passed";
  return "open";
}

export function isApplyOpen(o: {
  status: string;
  opens_at: string | null;
  deadline_at: string | null;
}): boolean {
  return getApplyState(o) === "open";
}
