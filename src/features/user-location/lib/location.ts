import { z } from "zod";
import { CITY_MAX, GOVERNORATE_KEYS, isValidCity, tidyCity } from "@/lib/syria-governorates";

/* Where a user lives now. The database checks the same rules
   (migration 20261001120000_user_locations.sql). */
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

/* After this many "Later" presses the prompt stops; the profile still has the field. */
export const PROMPT_MAX_DISMISSALS = 3;
/* Days between prompts after a "Later". */
export const PROMPT_PAUSE_DAYS = 3;

export type LocationStatus = {
  location: UserLocation | null;
  dismissedCount: number;
  lastDismissedAt: string | null;
};

export function shouldPrompt(status: LocationStatus, now = Date.now()): boolean {
  if (status.location) return false;
  if (status.dismissedCount >= PROMPT_MAX_DISMISSALS) return false;
  if (!status.lastDismissedAt) return true;
  return now - Date.parse(status.lastDismissedAt) >= PROMPT_PAUSE_DAYS * 86_400_000;
}

export type GovernorateStats = {
  key: string;
  name_ar: string;
  name_en: string;
  people: number;
  cities: { city: string; people: number }[];
};

export type LocationStats = {
  accounts: number;
  answered: number;
  governorates: GovernorateStats[];
};

export type LocationExportRow = {
  full_name: string | null;
  email: string | null;
  governorate_ar: string;
  governorate_en: string;
  city: string;
  updated_at: string;
};
