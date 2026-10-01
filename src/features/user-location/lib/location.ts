import { z } from "zod";
import { CITY_MAX, GOVERNORATE_KEYS, isValidCity, tidyCity } from "@/lib/syria-governorates";

/* Where a user lives now. The database checks the same rules
   (migration 20261001121000_user_locations.sql). */
export const locationSchema = z.object({
  governorate: z.enum(GOVERNORATE_KEYS),
  city: z
    .string()
    .max(CITY_MAX * 2)
    .transform(tidyCity)
    .refine(isValidCity, { message: "INVALID_CITY" }),
});

export type LocationInput = z.input<typeof locationSchema>;
export type UserLocation = z.output<typeof locationSchema>;

/* A location being typed into a form. */
export type LocationDraft = { governorate: string; city: string };

export const EMPTY_LOCATION: LocationDraft = { governorate: "", city: "" };

export function locationErrorMessage(lang: "ar" | "en", missing: "governorate" | "city"): string {
  if (missing === "governorate")
    return lang === "ar" ? "اختر المحافظة التي تقيم فيها" : "Choose the governorate you live in";
  return lang === "ar"
    ? "اكتب اسم مدينتك أو بلدتك (حرفان على الأقل)"
    : "Enter your city or town (at least two letters)";
}

/* Form check: the cleaned location, or which field is missing. */
export function checkLocation(draft: {
  governorate: string;
  city: string;
}): { location: UserLocation } | { missing: "governorate" | "city" } {
  const parsed = locationSchema.safeParse(draft);
  if (parsed.success) return { location: parsed.data };
  const field = parsed.error.issues[0]?.path[0];
  return { missing: field === "governorate" ? "governorate" : "city" };
}

export type LocationStatus = { location: UserLocation | null };

export type CourseCategory = { id: string; name_ar: string; name_en: string };
export type GovernorateName = { key: string; name_ar: string; name_en: string };

/* One person who answered, without name or email (admin_user_location_stats). */
export type PersonRow = {
  governorate: string;
  city: string;
  city_key: string;
  instructor: boolean;
  /** Enrolled in, or asked to join, at least one course. */
  has_course: boolean;
  /** Categories of those courses. */
  categories: string[];
  answered_at: string;
};

export type LocationStats = {
  accounts: number;
  categories: CourseCategory[];
  governorates: GovernorateName[];
  people: PersonRow[];
};

export type LocationExportRow = {
  full_name: string | null;
  email: string | null;
  governorate_ar: string;
  governorate_en: string;
  city: string;
  updated_at: string;
};
