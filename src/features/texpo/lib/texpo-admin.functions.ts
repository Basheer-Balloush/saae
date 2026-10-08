import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LINK_SLUG_RE, MAIN_LINK_SLUG, TEXPO_GAME, slugFromLabel } from "./texpo-shared";
import { TEXPO_EVENT_ID, eventDateSchema } from "@/features/events/lib/events";

const levels = z.object({
  beginner: z.number(),
  intermediate: z.number(),
  professional: z.number(),
});
const funnelSchema = z.object({
  opened: z.number(),
  started: z.number(),
  finished: z.number(),
  levels,
  claimed: z.number(),
  newAccounts: z.number(),
  used: z.number(),
  chatted: z.number(),
});
const gameLinkSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});
const playerSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  level: z.enum(["beginner", "intermediate", "professional"]).nullable(),
  score: z.number().nullable(),
  answered: z.number(),
  field: z.string().nullable(),
  code: z.string().nullable(),
  used: z.boolean(),
  account_new: z.boolean().nullable(),
  chatted: z.boolean(),
  link: z.string(),
  played_at: z.string(),
  claimed_at: z.string().nullable(),
});
export const texpoOverviewSchema = z.object({
  total: funnelSchema,
  links: z.array(gameLinkSchema.extend({ funnel: funnelSchema })),
  byStatus: z.record(levels),
  byField: z.record(z.number()),
  byInterest: z.record(z.number()),
  player_count: z.number(),
  players: z.array(playerSchema),
});
export type Funnel = z.infer<typeof funnelSchema>;
export type GameLink = z.infer<typeof gameLinkSchema> & { funnel: Funnel };
export type Player = z.infer<typeof playerSchema>;
export type TexpoOverview = z.infer<typeof texpoOverviewSchema>;

async function adminDb(userId: string) {
  const { eventsAdminDb } = await import("@/features/events/lib/events-db.server");
  return eventsAdminDb(userId);
}

export const adminTexpoOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ eventId: z.string().uuid(), date: eventDateSchema.nullable() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<TexpoOverview> => {
    const sb = await adminDb(context.userId);
    const { data: result, error } = await sb.rpc("event_texpo_report", {
      p_event_id: data.eventId,
      p_date: data.date,
    });
    if (error) throw new Error("Could not load the game numbers");
    return texpoOverviewSchema.parse(result);
  });

export const adminTexpoCreateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        eventId: z.string().uuid().default(TEXPO_EVENT_ID),
        label: z.string().trim().min(2).max(120),
        slug: z.string().trim().toLowerCase().regex(LINK_SLUG_RE).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const wanted = data.slug || slugFromLabel(data.label);
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? wanted : `${wanted.slice(0, 34)}-${attempt + 1}`;
      const { data: row, error } = await sb.rpc("event_create_link", {
        p_event_id: data.eventId,
        p_kind: "game",
        p_label: data.label,
        p_slug: slug,
        p_user_id: context.userId,
      });
      if (!error) return gameLinkSchema.parse(row);
      if (error.code !== "23505") throw new Error("Could not create the link");
      if (data.slug) throw new Error("slug_taken");
    }
    throw new Error("Could not create the link");
  });

export const adminTexpoSetLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const { data: row, error } = await sb
      .from("game_links")
      .update({ is_active: data.active })
      .eq("id", data.id)
      .eq("game", TEXPO_GAME)
      .neq("slug", MAIN_LINK_SLUG)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Could not update the link");
    if (!row) throw new Error("main_link");
    return { ok: true };
  });
