import { supabase } from "@/integrations/supabase/client";

const bundledLogos = import.meta.glob("/src/assets/partner-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export type PartnerRow = {
  id: string;
  name: string;
  logo_url: string;
  logo_light_url: string | null;
  size_class: string;
};
export type Partner = {
  id: string;
  name: string;
  logo: string | null;
  lightLogo: string | null;
  height: number;
};
export type PartnerResult = { partners: Partner[]; failed: boolean };

export function resolvePartnerLogo(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/src/assets/")) return bundledLogos[value] ?? null;
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function normalisePartner(row: PartnerRow): Partner {
  const sizes: Record<string, number> = {
    "h-16": 64,
    "h-20": 80,
    "h-24": 96,
    "h-28": 112,
    "h-32": 128,
    "h-36": 144,
    "h-40": 160,
  };
  return {
    id: row.id,
    name: row.name,
    logo: resolvePartnerLogo(row.logo_url),
    lightLogo: resolvePartnerLogo(row.logo_light_url),
    height: sizes[row.size_class] ?? 96,
  };
}

/** Homepage obeys the admin toggle; the directory lists every public partner. */
export async function loadPartners(homeOnly = false): Promise<PartnerResult> {
  try {
    let query = supabase.from("partners").select("id,name,logo_url,logo_light_url,size_class");
    if (homeOnly) query = query.eq("show_on_home", true);
    const { data, error } = await query
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) return { partners: [], failed: true };
    return { partners: (data ?? []).map(normalisePartner), failed: false };
  } catch {
    return { partners: [], failed: true };
  }
}
