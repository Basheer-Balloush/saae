import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LINK_SLUG_RE, TEXPO_GAME, slugFromLabel, type Level } from "./texpo-shared";

/* The Texpo page in the admin CRM: tracked links, each link's funnel, who
   played, and the players who claimed a coupon. Admins only. */

const db = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
};

async function assertAdmin(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "lms_admin"]);
  if (error) throw new Error("Could not check your role");
  if (!data?.length) throw new Error("Forbidden: admin role required");
}

export type Funnel = {
  opened: number;
  started: number;
  finished: number;
  levels: Record<Level, number>;
  claimed: number;
  newAccounts: number;
  used: number;
  chatted: number;
};

export type GameLink = {
  id: string | null;
  slug: string | null;
  label: string;
  is_active: boolean;
  created_at: string | null;
  funnel: Funnel;
};

export type Player = {
  name: string | null;
  email: string | null;
  level: Level;
  score: number;
  field: string | null;
  ai_use: string | null;
  code: string | null;
  used: boolean;
  account_new: boolean | null;
  chatted: boolean;
  link: string;
  claimed_at: string;
};

export type TexpoOverview = {
  total: Funnel;
  links: GameLink[];
  /** field -> level -> count, over finished plays. */
  byField: Record<string, Record<Level, number>>;
  aiUse: Record<string, number>;
  players: Player[];
};

type PlayRow = {
  link_id: string | null;
  field: string | null;
  ai_use: string | null;
  level: Level | null;
  score: number | null;
  finished_at: string | null;
  claimed_at: string | null;
  account_new: boolean | null;
  chat_opened_at: string | null;
  coupon_id: string | null;
  player_name: string | null;
  player_email: string | null;
  lms_coupons: { code: string } | null;
};

const emptyFunnel = (): Funnel => ({
  opened: 0,
  started: 0,
  finished: 0,
  levels: { beginner: 0, intermediate: 0, professional: 0 },
  claimed: 0,
  newAccounts: 0,
  used: 0,
  chatted: 0,
});

export const adminTexpoOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TexpoOverview> => {
    const sb = await db();
    await assertAdmin(sb, context.userId);

    const [links, opens, plays, redemptions] = await Promise.all([
      sb
        .from("game_links")
        .select("id, slug, label, is_active, created_at")
        .eq("game", TEXPO_GAME)
        .order("created_at", { ascending: true }),
      sb.from("game_link_opens").select("link_id").eq("game", TEXPO_GAME).limit(100000),
      sb
        .from("game_plays")
        .select(
          "link_id, field, ai_use, level, score, finished_at, claimed_at, account_new, chat_opened_at, coupon_id, player_name, player_email, lms_coupons(code)",
        )
        .eq("game", TEXPO_GAME)
        .order("started_at", { ascending: false })
        .limit(50000),
      sb
        .from("lms_coupon_redemptions")
        .select("coupon_id, status, lms_coupons!inner(label)")
        .like("lms_coupons.label", "Texpo 2026%")
        .in("status", ["pending", "applied"])
        .limit(10000),
    ]);
    if (links.error || opens.error || plays.error || redemptions.error) {
      throw new Error("Could not load the Texpo numbers");
    }

    const usedCoupons = new Set(
      ((redemptions.data ?? []) as { coupon_id: string }[]).map((r) => r.coupon_id),
    );
    const linkRows = (links.data ?? []) as Omit<GameLink, "funnel">[];
    const funnels = new Map<string | null, Funnel>();
    const funnel = (id: string | null) => {
      if (!funnels.has(id)) funnels.set(id, emptyFunnel());
      return funnels.get(id)!;
    };
    const total = emptyFunnel();

    for (const o of (opens.data ?? []) as { link_id: string | null }[]) {
      funnel(o.link_id).opened++;
      total.opened++;
    }

    const byField: TexpoOverview["byField"] = {};
    const aiUse: Record<string, number> = {};
    const labelOf = new Map(linkRows.map((l) => [l.id, l.label]));
    const players: Player[] = [];

    for (const p of (plays.data ?? []) as unknown as PlayRow[]) {
      for (const f of [funnel(p.link_id), total]) {
        f.started++;
        if (p.finished_at && p.level) {
          f.finished++;
          f.levels[p.level]++;
        }
        if (p.claimed_at) f.claimed++;
        if (p.claimed_at && p.account_new) f.newAccounts++;
        if (p.coupon_id && usedCoupons.has(p.coupon_id)) f.used++;
        if (p.chat_opened_at) f.chatted++;
      }
      if (p.ai_use) aiUse[p.ai_use] = (aiUse[p.ai_use] ?? 0) + 1;
      if (p.finished_at && p.level && p.field) {
        byField[p.field] ??= { beginner: 0, intermediate: 0, professional: 0 };
        byField[p.field][p.level]++;
      }
      if (p.claimed_at && p.level) {
        players.push({
          name: p.player_name,
          email: p.player_email,
          level: p.level,
          score: p.score ?? 0,
          field: p.field,
          ai_use: p.ai_use,
          code: p.lms_coupons?.code ?? null,
          used: !!p.coupon_id && usedCoupons.has(p.coupon_id),
          account_new: p.account_new,
          chatted: !!p.chat_opened_at,
          link: p.link_id ? (labelOf.get(p.link_id) ?? "—") : "direct",
          claimed_at: p.claimed_at,
        });
      }
    }
    players.sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));

    const out: GameLink[] = linkRows.map((l) => ({
      ...l,
      funnel: funnels.get(l.id) ?? emptyFunnel(),
    }));
    // Plain /texpo, and links that were later deleted.
    out.push({
      id: null,
      slug: null,
      label: "direct",
      is_active: true,
      created_at: null,
      funnel: funnels.get(null) ?? emptyFunnel(),
    });
    return { total, links: out, byField, aiUse, players };
  });

export const adminTexpoCreateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        label: z.string().trim().min(2).max(120),
        slug: z.string().trim().toLowerCase().regex(LINK_SLUG_RE).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertAdmin(sb, context.userId);
    const wanted = data.slug || slugFromLabel(data.label);
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? wanted : `${wanted.slice(0, 34)}-${attempt + 1}`;
      const { data: row, error } = await sb
        .from("game_links")
        .insert({ game: TEXPO_GAME, slug, label: data.label, created_by: context.userId })
        .select("id, slug, label, is_active, created_at")
        .single();
      if (!error && row) return row as Omit<GameLink, "funnel">;
      if ((error as { code?: string } | null)?.code !== "23505")
        throw new Error("Could not create the link");
      // A slug the admin typed is theirs to change; only generated ones get a number.
      if (data.slug) throw new Error("slug_taken");
    }
    throw new Error("Could not create the link");
  });

export const adminTexpoSetLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertAdmin(sb, context.userId);
    const { error } = await sb
      .from("game_links")
      .update({ is_active: data.active })
      .eq("id", data.id)
      .eq("game", TEXPO_GAME);
    if (error) throw new Error("Could not update the link");
    return { ok: true };
  });
