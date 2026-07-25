import { z } from "zod";

export const LIFECYCLE = ["draft", "published", "hidden", "closed", "archived"] as const;
export type Lifecycle = (typeof LIFECYCLE)[number];

export const QUESTION_KINDS = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "number",
  "boolean",
  "date",
  "url",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "phone",
  "biography",
  "organization",
  "avatar",
] as const;
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nullableStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s.length ? s : null))
    .nullable()
    .optional();

const isoDateNullable = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const QuestionInputSchema = z.object({
  id: z.string().uuid().optional(),
  label_ar: z.string().trim().min(1).max(300),
  label_en: z.string().trim().min(1).max(300),
  help_ar: nullableStr(600),
  help_en: nullableStr(600),
  kind: z.enum(QUESTION_KINDS),
  is_required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  sort_order: z.number().int().nonnegative().max(999),
});
export type QuestionInput = z.infer<typeof QuestionInputSchema>;

export const OpportunityInputSchema = z.object({
  id: z.string().uuid().optional(),
  title_ar: z.string().trim().min(1).max(200),
  title_en: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(3).max(80).regex(slugRegex, "slug_invalid"),
  summary_ar: nullableStr(400),
  summary_en: nullableStr(400),
  description_ar: nullableStr(10000),
  description_en: nullableStr(10000),
  requirements_ar: nullableStr(4000),
  requirements_en: nullableStr(4000),
  location_ar: nullableStr(200),
  location_en: nullableStr(200),
  duration_ar: nullableStr(200),
  duration_en: nullableStr(200),
  stipend_ar: nullableStr(200),
  stipend_en: nullableStr(200),
  capacity: z.number().int().min(0).max(100000).nullable().optional(),
  starts_at: isoDateNullable,
  ends_at: isoDateNullable,
  opens_at: isoDateNullable,
  deadline_at: isoDateNullable,
  status: z.enum(LIFECYCLE).default("draft"),
  require_cv: z.boolean().default(false),
  allow_reapply: z.boolean().default(false),
  required_profile_fields: z.array(z.enum(REQUIRED_PROFILE_FIELDS)).default([]),
  cover_image_bucket: z.string().nullable().optional(),
  cover_image_path: z.string().nullable().optional(),
  questions: z.array(QuestionInputSchema).max(50).default([]),
});
export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;

export const ListInternshipsInputSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(LIFECYCLE).optional(),
  page: z.number().int().min(1).max(1000).default(1),
  page_size: z.number().int().min(5).max(100).default(20),
  sort: z
    .enum(["updated_desc", "deadline_asc", "title_asc", "status"])
    .default("updated_desc"),
});
export type ListInternshipsInput = z.infer<typeof ListInternshipsInputSchema>;

export const SetStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(LIFECYCLE),
});

export const IdInputSchema = z.object({ id: z.string().uuid() });

// Allowed lifecycle transitions
export const LIFECYCLE_TRANSITIONS: Record<Lifecycle, Lifecycle[]> = {
  draft: ["published", "hidden", "archived"],
  published: ["hidden", "closed", "archived"],
  hidden: ["published", "closed", "archived"],
  closed: ["archived", "published"],
  archived: [],
};

export function canTransition(from: Lifecycle, to: Lifecycle): boolean {
  if (from === to) return true;
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export const COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
