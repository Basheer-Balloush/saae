import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  locationSchema,
  type LocationExportRow,
  type LocationStats,
  type LocationStatus,
} from "./location";

/* The tables are newer than the generated Supabase types, so these use the
   untyped client. Row-level security limits each user to their own row; the
   admin functions check the admin role in the database. */

export const getMyLocationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocationStatus> => {
    const { supabase, userId } = context as unknown as { supabase: SupabaseClient; userId: string };
    const { data, error } = await supabase
      .from("user_locations")
      .select("governorate, city")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { location: data ? { governorate: data.governorate, city: data.city } : null };
  });

export const saveMyLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => locationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as { supabase: SupabaseClient; userId: string };
    const { error } = await supabase
      .from("user_locations")
      .upsert({ user_id: userId, governorate: data.governorate, city: data.city });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getLocationStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocationStats> => {
    const { supabase } = context as unknown as { supabase: SupabaseClient };
    const { data, error } = await supabase.rpc("admin_user_location_stats");
    if (error) throw new Error(error.message);
    return data as LocationStats;
  });

export const listLocationsForExport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocationExportRow[]> => {
    const { supabase } = context as unknown as { supabase: SupabaseClient };
    const { data, error } = await supabase.rpc("admin_list_user_locations");
    if (error) throw new Error(error.message);
    return (data ?? []) as LocationExportRow[];
  });
