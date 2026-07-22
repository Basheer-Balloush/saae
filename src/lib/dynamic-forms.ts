import { z } from "zod";

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "select",
  "radio",
  "checkbox_group",
  "single_checkbox",
  "date",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "learning-management-system", "attendance-management-system",
  "contact", "about", "news", "communities", "initiative-survey", "event-survey",
  "one-million-initiative", "one-million-initiative-home", "one-million-initiative-donors",
  "registration", "resources", "super-admin", "sitemap.xml", "forms", "assets", "static", "public",
]);

export const FIELD_TYPES_WITH_OPTIONS: FieldType[] = ["select", "radio", "checkbox_group"];

export type FieldOption = { value: string; label_ar: string; label_en: string };
export type FormField = {
  id: string;
  type: FieldType;
  label_ar: string;
  label_en: string;
  required: boolean;
  placeholder_ar?: string;
  placeholder_en?: string;
  options?: FieldOption[];
};

export type DynamicForm = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  submit_label_ar: string;
  submit_label_en: string;
  status: "draft" | "published";
  fields: FormField[];
  created_at: string;
  updated_at: string;
};

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 80) return false;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

const optionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label_ar: z.string().trim().min(1).max(200),
  label_en: z.string().trim().min(1).max(200),
});

export const fieldSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.enum(FIELD_TYPES),
    label_ar: z.string().trim().min(1).max(200),
    label_en: z.string().trim().min(1).max(200),
    required: z.boolean(),
    placeholder_ar: z.string().max(200).optional(),
    placeholder_en: z.string().max(200).optional(),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((f, ctx) => {
    if (FIELD_TYPES_WITH_OPTIONS.includes(f.type)) {
      if (!f.options || f.options.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "options_required" });
        return;
      }
      const seen = new Set<string>();
      for (const o of f.options) {
        if (seen.has(o.value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate_option_value" });
          return;
        }
        seen.add(o.value);
      }
    }
  });

export const formInputSchema = z.object({
  slug: z.string().refine(isValidSlug, "invalid_slug"),
  name_ar: z.string().trim().min(1).max(200),
  name_en: z.string().trim().min(1).max(200),
  description_ar: z.string().max(2000).optional().nullable(),
  description_en: z.string().max(2000).optional().nullable(),
  submit_label_ar: z.string().trim().min(1).max(80),
  submit_label_en: z.string().trim().min(1).max(80),
  status: z.enum(["draft", "published"]),
  fields: z.array(fieldSchema).max(80),
}).superRefine((form, ctx) => {
  const ids = new Set<string>();
  for (const f of form.fields) {
    if (ids.has(f.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate_field_id" });
      return;
    }
    ids.add(f.id);
  }
});

export type FormInput = z.infer<typeof formInputSchema>;

/** Generate a stable random field id. */
export function newFieldId(): string {
  return "f_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Validate a submission payload against a form's field spec. Returns cleaned values or throws. */
export function validateSubmission(fields: FormField[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.id];
    const empty =
      raw === undefined || raw === null || raw === "" ||
      (Array.isArray(raw) && raw.length === 0);
    if (empty) {
      if (f.required) throw new Error(`required:${f.id}`);
      out[f.id] = null;
      continue;
    }
    switch (f.type) {
      case "short_text":
      case "long_text": {
        if (typeof raw !== "string") throw new Error(`invalid:${f.id}`);
        if (raw.length > 5000) throw new Error(`too_long:${f.id}`);
        out[f.id] = raw.trim();
        break;
      }
      case "email": {
        if (typeof raw !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) || raw.length > 200) {
          throw new Error(`invalid_email:${f.id}`);
        }
        out[f.id] = raw.trim().toLowerCase();
        break;
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n)) throw new Error(`invalid_number:${f.id}`);
        out[f.id] = n;
        break;
      }
      case "date": {
        if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          throw new Error(`invalid_date:${f.id}`);
        }
        out[f.id] = raw;
        break;
      }
      case "single_checkbox": {
        if (typeof raw !== "boolean") throw new Error(`invalid:${f.id}`);
        if (f.required && !raw) throw new Error(`required:${f.id}`);
        out[f.id] = raw;
        break;
      }
      case "select":
      case "radio": {
        const opts = f.options ?? [];
        if (typeof raw !== "string" || !opts.some((o) => o.value === raw)) {
          throw new Error(`invalid_option:${f.id}`);
        }
        out[f.id] = raw;
        break;
      }
      case "checkbox_group": {
        if (!Array.isArray(raw)) throw new Error(`invalid:${f.id}`);
        const opts = new Set((f.options ?? []).map((o) => o.value));
        for (const v of raw) if (typeof v !== "string" || !opts.has(v)) throw new Error(`invalid_option:${f.id}`);
        out[f.id] = raw;
        break;
      }
    }
  }
  return out;
}
