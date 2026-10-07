import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TEXPO_GAME, type Level } from "@/features/texpo/lib/texpo-shared";
import type { EarnedBadge } from "./badges";

/* The signed-in member's badges. game_plays is closed to browser roles, so the
   read goes through the service role and is limited to the caller's own rows. */

export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EarnedBadge[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as SupabaseClient;

    // A Texpo play is tied to an account when its player signs in or signs up
    // and claims the gift (game_claim_reward); one per account.
    const { data, error } = await sb
      .from("game_plays")
      .select("claimed_at, level")
      .eq("game", TEXPO_GAME)
      .eq("user_id", context.userId)
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: true })
      .limit(1);
    if (error) throw new Error("badges_failed");

    const texpo = (data ?? [])[0] as { claimed_at: string; level: Level | null } | undefined;
    return texpo ? [{ key: "texpo-2026", earnedAt: texpo.claimed_at, level: texpo.level }] : [];
  });
