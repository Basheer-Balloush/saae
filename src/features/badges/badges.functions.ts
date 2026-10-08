import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EarnedBadge } from "./badges";

const bi = z.object({ ar: z.string(), en: z.string() });
const earnedBadgesSchema = z.array(
  z.object({
    key: z.string(),
    earnedAt: z.string(),
    level: z.enum(["beginner", "intermediate", "professional"]).nullable(),
    definition: z.object({ image: z.string(), name: bi, about: bi }),
  }),
);

// Member identity always comes from validated auth; callers cannot request
// another account's badges. Award snapshots survive later event edits.
export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EarnedBadge[]> => {
    const { eventsDb } = await import("@/features/events/lib/events-db.server");
    const { data, error } = await eventsDb().rpc("event_my_badges", { p_user_id: context.userId });
    if (error) throw new Error("badges_failed");
    return earnedBadgesSchema.parse(data);
  });
