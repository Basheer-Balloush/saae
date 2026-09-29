import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/*
 * Guests are Supabase anonymous users: signed in, with no email or password
 * yet. They request courses and learn like anyone; coupons, reviews,
 * applications and certificates need an account (the database enforces it,
 * see 20260929160000_guest_accounts.sql). Creating an account or signing in
 * to one keeps everything a guest did (guest-account.functions.ts).
 */

export const isGuestUser = (user: User | null | undefined) => !!user?.is_anonymous;

/** Signs the visitor in as a guest. Supabase answers with the code
    `anonymous_provider_disabled` while guest sign-in is switched off. */
export async function continueAsGuest(lang: "ar" | "en") {
  const { error } = await supabase.auth.signInAnonymously({ options: { data: { lang } } });
  if (error) throw error;
}

/** How admins tell guests apart when a guest left no name. */
export const guestLabel = (userId: string, ar: boolean) =>
  `${ar ? "زائر" : "Guest"} · ${userId.slice(-4).toUpperCase()}`;
