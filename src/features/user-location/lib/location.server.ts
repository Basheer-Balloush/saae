import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { UserLocation } from "./location";

/* Saves a new account's location at sign-up, before the user can sign in.
   A failure is logged, not thrown: the account matters more, and the
   sign-in prompt asks again. */
export async function saveSignupLocation(userId: string, location: UserLocation) {
  const { error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("user_locations")
    .upsert({ user_id: userId, governorate: location.governorate, city: location.city });
  if (error) console.error("Failed to save sign-up location", { error: error.message, userId });
}
