import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildResult,
  deckFromStored,
  drawDeck,
  gradeAnswer,
  limitMs,
  serveQuestion,
  storeDeck,
  type StoredAnswer,
} from "./engine";
import {
  COUPON_CATEGORY_SLUG,
  DEVICE_ID_RE,
  LINK_SLUG_RE,
  MAIN_LINK_SLUG,
  PLAYER_EMAIL_MAX,
  PLAYER_NAME_MAX,
  PLAYER_PHONE_MAX,
  QUESTION_COUNT,
  STATUSES,
  TEXPO_GAME,
  levelFor,
  profileCode,
  type AnswerOutcome,
  type Bi,
  type ClaimOutcome,
  type Level,
  type PlayResult,
  type PlayState,
  type Reward,
  answersFor,
} from "./texpo-shared";

/* The Texpo game's server side. Every rule is decided here: which questions a
   play gets, which comes next, whether an answer is right and in time, the
   score, and the claim. The tables are closed to browser roles, so all reads
   and writes go through the service role (see 20261005120000_texpo_game.sql). */

const db = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
};
const questions = async () => await import("./questions.server");

/** The play's own questions and option orders. A row that fits no deck is broken. */
async function deckOf(row: { option_orders: unknown }) {
  const { TEXPO_BANK, LEGACY_QUESTIONS } = await questions();
  const found = deckFromStored(row.option_orders, TEXPO_BANK, LEGACY_QUESTIONS);
  if (!found) throw new Error("bad_play");
  return found;
}

type PlayRow = {
  id: string;
  device_id: string;
  option_orders: unknown;
  answers: StoredAnswer[] | null;
  current_q: number;
  question_shown_at: string | null;
  hint_q: number | null;
  score: number | null;
  level: Level | null;
  finished_at: string | null;
  claimed_at: string | null;
};
const PLAY_COLUMNS =
  "id, device_id, option_orders, answers, current_q, question_shown_at, hint_q, score, level, finished_at, claimed_at";

const device = z.string().regex(DEVICE_ID_RE);
const playId = z.string().uuid();
const questionIndex = z
  .number()
  .int()
  .min(0)
  .max(QUESTION_COUNT - 1);
const linkSlug = z
  .string()
  .trim()
  .toLowerCase()
  .max(40)
  .optional()
  .nullable()
  .transform((v) => (v && LINK_SLUG_RE.test(v) ? v : null));

function clientIp(): string {
  const headers = getRequest()?.headers ?? new Headers();
  return (
    headers.get("cf-connecting-ip") ||
    (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Fixed-window limit on the shared rate-limit table; true when over. */
async function overLimit(sb: SupabaseClient, bucket: string, windowMs: number, max: number) {
  const now = Date.now();
  const { data: rl } = await sb
    .from("internship_signup_rate_limits")
    .select("window_start, hits")
    .eq("bucket_key", bucket)
    .maybeSingle();
  const row = rl as { window_start: string; hits: number } | null;
  if (row && now - new Date(row.window_start).getTime() < windowMs) {
    if (row.hits >= max) return true;
    await sb
      .from("internship_signup_rate_limits")
      .update({ hits: row.hits + 1 })
      .eq("bucket_key", bucket);
    return false;
  }
  await sb
    .from("internship_signup_rate_limits")
    .upsert(
      { bucket_key: bucket, window_start: new Date(now).toISOString(), hits: 1 },
      { onConflict: "bucket_key" },
    );
  return false;
}

/** The link a visit counts under: the active link in ?l=, otherwise the main
    (booth QR) link, so plain /texpo and stopped links have no row of their own. */
async function resolveLink(sb: SupabaseClient, slug: string | null) {
  const { data } = await sb
    .from("game_links")
    .select("id, slug, label, is_active")
    .eq("game", TEXPO_GAME)
    .in("slug", slug && slug !== MAIN_LINK_SLUG ? [slug, MAIN_LINK_SLUG] : [MAIN_LINK_SLUG]);
  const rows = (data ?? []) as { id: string; slug: string; label: string; is_active: boolean }[];
  const hit =
    rows.find((r) => r.slug === slug && r.is_active) ?? rows.find((r) => r.slug === MAIN_LINK_SLUG);
  return hit ? { id: hit.id, label: hit.label } : null;
}

/** One gift per phone: whether a play on this device was already claimed. */
async function deviceClaimed(sb: SupabaseClient, dev: string) {
  const { count } = await sb
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("game", TEXPO_GAME)
    .eq("device_id", dev)
    .not("claimed_at", "is", null);
  return (count ?? 0) > 0;
}

async function loadPlay(sb: SupabaseClient, id: string, dev: string): Promise<PlayRow> {
  const { data, error } = await sb
    .from("game_plays")
    .select(PLAY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("load_failed");
  const row = data as PlayRow | null;
  // Another device's play is treated as missing: its id alone answers nothing.
  if (!row || row.device_id !== dev) throw new Error("not_found");
  return row;
}

/** Starts the current question's clock if it has not started yet. */
async function shownAt(sb: SupabaseClient, row: PlayRow, now: number): Promise<number> {
  if (row.question_shown_at) return new Date(row.question_shown_at).getTime();
  const iso = new Date(now).toISOString();
  const { data } = await sb
    .from("game_plays")
    .update({ question_shown_at: iso })
    .eq("id", row.id)
    .eq("current_q", row.current_q)
    .is("question_shown_at", null)
    .select("question_shown_at");
  const set = (data as { question_shown_at: string }[] | null)?.[0]?.question_shown_at;
  if (set) return new Date(set).getTime();
  // Another request started it first.
  const { data: again } = await sb
    .from("game_plays")
    .select("question_shown_at")
    .eq("id", row.id)
    .single();
  const at = (again as { question_shown_at: string | null } | null)?.question_shown_at;
  return at ? new Date(at).getTime() : now;
}

async function stateOf(sb: SupabaseClient, row: PlayRow, now = Date.now()): Promise<PlayState> {
  const { deck, orders } = await deckOf(row);
  const answers = row.answers ?? [];
  if (row.finished_at) {
    return {
      phase: "result",
      playId: row.id,
      result: buildResult(deck, answers),
      claimed: !!row.claimed_at,
    };
  }
  return {
    phase: "question",
    playId: row.id,
    score: answers.filter((a) => a.correct).length,
    question: serveQuestion(
      deck,
      row.current_q,
      orders,
      await shownAt(sb, row, now),
      now,
      row.hint_q,
    ),
  };
}

/* ---------- the page opens ---------- */

export const texpoOpen = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ device, link: linkSlug }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const link = await resolveLink(sb, data.link);
    // Counted once per device and link; a repeat insert hits the unique index.
    await sb
      .from("game_link_opens")
      .insert({ game: TEXPO_GAME, link_id: link?.id ?? null, device_id: data.device });
    return { link: link?.label ?? null, deviceClaimed: await deviceClaimed(sb, data.device) };
  });

/* ---------- the first screen: who is playing ---------- */

/** The CRM lead source for players; the Leads page shows it as-is. */
const TEXPO_LEAD_SOURCE = "texpo";

const playerName = z
  .string()
  .max(PLAYER_NAME_MAX * 2)
  .transform((v) =>
    v
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, PLAYER_NAME_MAX),
  )
  .refine((v) => v.length >= 2);
const playerEmail = z.string().trim().toLowerCase().email().max(PLAYER_EMAIL_MAX);
/** Digits only (Arabic-Indic too), or null when it could not be a phone. */
const playerPhone = z
  .string()
  .max(PLAYER_PHONE_MAX)
  .optional()
  .nullable()
  .transform((v) => {
    const d = (v ?? "")
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
      .replace(/[^\d]/g, "");
    return d.length >= 7 && d.length <= 15 && !/^(\d)\1+$/.test(d) ? d : null;
  });

/** "أدرس · هندسة": the two answers before the game, for the lead's work field. */
function profileLabel(status: string, answer: string): string | null {
  const st = STATUSES.find((x) => x.id === status);
  const a = st && answersFor(st.id).find((x) => x.id === answer);
  return st && a ? `${st.ar} · ${a.ar}` : null;
}

/** The sign-up link of the event this game link belongs to (Admin → Events),
    so the player counts in that event's "Registrations & leads" and its export,
    like someone registered at the booth. Null when the link is in no event. */
async function eventSignupLink(sb: SupabaseClient, gameLinkId: string | null) {
  if (!gameLinkId) return null;
  const { data: game } = await sb
    .from("event_sources")
    .select("event_id")
    .eq("kind", "game")
    .eq("source_id", gameLinkId)
    .maybeSingle();
  const eventId = (game as { event_id: string } | null)?.event_id;
  if (!eventId) return null;
  const { data: signup } = await sb
    .from("event_sources")
    .select("source_id")
    .eq("event_id", eventId)
    .eq("kind", "registration")
    .limit(1)
    .maybeSingle();
  return (signup as { source_id: string } | null)?.source_id ?? null;
}

/* The player as a CRM lead from the first screen on, filed under the event's
   sign-up link, so the team can follow up even when they stop before the end
   or never make the account. One lead per email; the database links it to the
   CRM contact. Typing someone else's email only fills that lead's blanks,
   never overwrites it. A CRM failure never stops the game. */
async function saveLead(
  sb: SupabaseClient,
  player: { name: string; email: string; phone: string | null },
  extra: {
    device: string;
    link: string | null;
    linkId: string | null;
    lang: string;
    profile?: string | null;
  },
) {
  const signupLink = await eventSignupLink(sb, extra.linkId);
  const { data: found, error: findError } = await sb
    .from("individual_leads")
    .select("id, phone, work_field, registration_link_id")
    .eq("source", TEXPO_LEAD_SOURCE)
    .eq("email", player.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) {
    console.error("[texpo] lead lookup failed", findError.message);
    return;
  }
  const lead = found as {
    id: string;
    phone: string | null;
    work_field: string | null;
    registration_link_id: string | null;
  } | null;
  if (lead) {
    const blanks = {
      ...(player.phone && !lead.phone ? { phone: player.phone } : {}),
      ...(extra.profile && !lead.work_field ? { work_field: extra.profile } : {}),
      ...(signupLink && !lead.registration_link_id ? { registration_link_id: signupLink } : {}),
    };
    if (Object.keys(blanks).length === 0) return;
    const { error } = await sb.from("individual_leads").update(blanks).eq("id", lead.id);
    if (error) console.error("[texpo] lead update failed", error.message);
    return;
  }
  const { error } = await sb.from("individual_leads").insert({
    full_name: player.name,
    email: player.email,
    phone: player.phone,
    work_field: extra.profile ?? null,
    short_description: "Texpo 2026 · تحدّي أبو الجود",
    source: TEXPO_LEAD_SOURCE,
    tags: ["Texpo"],
    registration_link_id: signupLink,
    raw: { event: "Texpo 2026", device: extra.device, link: extra.link, lang: extra.lang },
  });
  if (error) console.error("[texpo] lead insert failed", error.message);
}

export const texpoRegister = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        device,
        link: linkSlug,
        lang: z.enum(["ar", "en"]),
        name: playerName,
        email: playerEmail,
        phone: playerPhone,
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    if (
      (await overLimit(sb, `texpo:reg:${data.device}`, 10 * 60_000, 12)) ||
      (await overLimit(sb, `texpo:regip:${clientIp()}`, 10 * 60_000, 400))
    ) {
      throw new Error("rate_limited");
    }
    const link = await resolveLink(sb, data.link);
    await saveLead(
      sb,
      { name: data.name, email: data.email, phone: data.phone },
      { device: data.device, link: data.link, linkId: link?.id ?? null, lang: data.lang },
    );
    return { ok: true as const };
  });

/* ---------- start: after the two steps about the player ---------- */

export const texpoStart = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        device,
        link: linkSlug,
        lang: z.enum(["ar", "en"]),
        status: z.enum(STATUSES.map((st) => st.id) as [string, ...string[]]),
        answer: z.string().max(20),
        // Optional, and never a reason to refuse the start: a page opened before
        // the first screen asked for them, or a value the server reads
        // differently, simply plays without them.
        name: playerName.optional().catch(undefined),
        email: playerEmail.optional().catch(undefined),
        phone: playerPhone.catch(null),
      })
      .refine((d) => profileCode(d.status, d.answer) !== null, { path: ["answer"] })
      .parse(i),
  )
  .handler(async ({ data }): Promise<PlayState> => {
    const sb = await db();
    // Venue Wi-Fi puts many players behind one address, so the per-address
    // limit is generous and the per-device one is tight.
    if (
      (await overLimit(sb, `texpo:dev:${data.device}`, 10 * 60_000, 12)) ||
      (await overLimit(sb, `texpo:ip:${clientIp()}`, 10 * 60_000, 400))
    ) {
      throw new Error("rate_limited");
    }
    if (await deviceClaimed(sb, data.device)) throw new Error("device_claimed");
    // A second start from this phone seconds after the first (a repeated tap,
    // a retry) gets that play back instead of a twin that is never answered.
    const { data: recent } = await sb
      .from("game_plays")
      .select(PLAY_COLUMNS)
      .eq("game", TEXPO_GAME)
      .eq("device_id", data.device)
      .is("finished_at", null)
      .eq("current_q", 0)
      .gte("started_at", new Date(Date.now() - 15_000).toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) return stateOf(sb, recent as PlayRow);
    const { TEXPO_BANK } = await questions();
    const link = await resolveLink(sb, data.link);
    const now = new Date();
    const ua = getRequest()?.headers.get("user-agent")?.slice(0, 300) ?? null;
    const { data: row, error } = await sb
      .from("game_plays")
      .insert({
        game: TEXPO_GAME,
        link_id: link?.id ?? null,
        device_id: data.device,
        lang: data.lang,
        field: profileCode(data.status, data.answer),
        // This player's 7 questions, each with its own option order.
        option_orders: storeDeck(drawDeck(TEXPO_BANK)),
        question_shown_at: now.toISOString(),
        user_agent: ua,
        // Who played, from the first screen; the claim replaces them with the account's.
        player_name: data.name ?? null,
        player_email: data.email ?? null,
      })
      .select(PLAY_COLUMNS)
      .single();
    if (error || !row) throw new Error("start_failed");
    if (data.name && data.email) {
      await saveLead(
        sb,
        { name: data.name, email: data.email, phone: data.phone },
        {
          device: data.device,
          link: data.link,
          linkId: link?.id ?? null,
          lang: data.lang,
          profile: profileLabel(data.status, data.answer),
        },
      );
    }
    return stateOf(sb, row as PlayRow, now.getTime());
  });

/* ---------- where a play stands (reload, coming back after sign-in) ---------- */

export const texpoState = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ device, playId }).parse(i))
  .handler(async ({ data }): Promise<PlayState> => {
    const sb = await db();
    return stateOf(sb, await loadPlay(sb, data.playId, data.device));
  });

/* ---------- the next question appears when the player taps Next ---------- */

export const texpoShow = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ device, playId, q: questionIndex }).parse(i))
  .handler(async ({ data }): Promise<PlayState> => {
    const sb = await db();
    // Whatever was asked for, the answer is where the play stands now.
    return stateOf(sb, await loadPlay(sb, data.playId, data.device));
  });

/* ---------- answer ---------- */

export const texpoAnswer = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        device,
        playId,
        q: questionIndex,
        shown: z.number().int().min(0).max(3).nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<AnswerOutcome | { stale: PlayState }> => {
    const sb = await db();
    const row = await loadPlay(sb, data.playId, data.device);
    // A double tap or a retry after a lost reply: send where the play is now.
    if (row.finished_at || row.current_q !== data.q || !row.question_shown_at) {
      return { stale: await stateOf(sb, row) };
    }
    const { deck, orders } = await deckOf(row);

    const now = Date.now();
    const graded = gradeAnswer(
      deck,
      data.q,
      orders,
      data.shown,
      new Date(row.question_shown_at).getTime(),
      now,
      row.hint_q,
    );
    const { timedOut, correctShown, ...stored } = graded;
    const answers = [...(row.answers ?? []), stored];
    const last = data.q + 1 >= deck.length;
    const score = answers.filter((a) => a.correct).length;
    const patch: Record<string, unknown> = { answers, current_q: data.q + 1 };
    if (last) {
      patch.finished_at = new Date(now).toISOString();
      patch.score = score;
      patch.level = levelFor(score);
    } else {
      // The next clock starts when the player taps Next (texpoShow).
      patch.question_shown_at = null;
    }
    // Only the request that moves the play from this question wins.
    const { data: moved, error } = await sb
      .from("game_plays")
      .update(patch)
      .eq("id", row.id)
      .eq("current_q", data.q)
      .is("finished_at", null)
      .select("id");
    if (error) throw new Error("save_failed");
    if (!moved?.length)
      return { stale: await stateOf(sb, await loadPlay(sb, data.playId, data.device)) };

    return {
      correct: stored.correct,
      timedOut,
      correctShown,
      explanation: deck[data.q].explanation,
      score,
      nextIndex: last ? null : data.q + 1,
      result: last ? buildResult(deck, answers) : null,
    };
  });

/* ---------- one hint per game: a clue and ten more seconds ---------- */

export const texpoHint = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ device, playId, q: questionIndex }).parse(i))
  .handler(async ({ data }): Promise<{ hint: Bi; limitMs: number; remainingMs: number }> => {
    const sb = await db();
    const row = await loadPlay(sb, data.playId, data.device);
    if (row.finished_at || row.current_q !== data.q || !row.question_shown_at)
      throw new Error("not_current");
    const { deck } = await deckOf(row);
    if (row.hint_q !== null && row.hint_q !== data.q) throw new Error("hint_used");
    if (row.hint_q === null) {
      const { data: set } = await sb
        .from("game_plays")
        .update({ hint_q: data.q })
        .eq("id", row.id)
        .is("hint_q", null)
        .eq("current_q", data.q)
        .select("id");
      if (!set?.length) throw new Error("hint_used");
    }
    const limit = limitMs(data.q, data.q);
    const elapsed = Date.now() - new Date(row.question_shown_at).getTime();
    return { hint: deck[data.q].hint, limitMs: limit, remainingMs: Math.max(0, limit - elapsed) };
  });

/* ---------- the chat opened from the game (CRM numbers) ---------- */

export const texpoChatOpened = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({ device, playId, sessionId: z.string().min(6).max(128).nullable().optional() })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    await sb
      .from("game_plays")
      .update({ chat_opened_at: new Date().toISOString(), chat_session_id: data.sessionId ?? null })
      .eq("id", data.playId)
      .eq("device_id", data.device)
      .is("chat_opened_at", null);
    return { ok: true };
  });

/* ---------- claim: signed in, one coupon per account ---------- */

type ClaimRow = {
  status: string;
  code: string | null;
  percent_off: number | string | null;
  expires_at: string | null;
  level: Level | null;
  score: number | null;
};

/* Signing in proves who played: the account's own name replaces whatever was
   typed on the first screen, on this play and on the Texpo lead, when they
   carry the account's email. It runs whatever the claim answers, because an
   account that already has its gift (already_claimed) leaves the play as it
   was. Best effort: it never changes the claim's answer. */
async function applyAccountName(sb: SupabaseClient, userId: string, playId: string) {
  try {
    const { data } = await sb.auth.admin.getUserById(userId);
    const user = data?.user;
    if (!user || user.is_anonymous) return;
    const email = user.email?.trim().toLowerCase();
    const meta = (user.user_metadata ?? {}) as { full_name?: unknown; fullName?: unknown };
    const name = String(meta.full_name ?? meta.fullName ?? "")
      .trim()
      .slice(0, PLAYER_NAME_MAX);
    if (!email || name.length < 2) return;
    const { error: playError } = await sb
      .from("game_plays")
      .update({ player_name: name })
      .eq("id", playId)
      .eq("game", TEXPO_GAME)
      .eq("player_email", email);
    if (playError) console.error("[texpo] play name not updated", playError.message);
    const { error: leadError } = await sb
      .from("individual_leads")
      .update({ full_name: name })
      .eq("source", TEXPO_LEAD_SOURCE)
      .eq("email", email);
    if (leadError) console.error("[texpo] lead name not updated", leadError.message);
  } catch (e) {
    console.error("[texpo] account name not applied", e instanceof Error ? e.message : e);
  }
}

export const texpoClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ playId, lang: z.enum(["ar", "en"]) }).parse(i))
  .handler(async ({ data, context }): Promise<ClaimOutcome> => {
    const sb = await db();
    const { data: rows, error } = await sb.rpc("game_claim_reward", {
      _play: data.playId,
      _user: context.userId,
    });
    if (error) throw new Error("claim_failed");
    const row = (Array.isArray(rows) ? rows[0] : rows) as ClaimRow | undefined;
    if (!row) throw new Error("claim_failed");
    await applyAccountName(sb, context.userId, data.playId);
    if (row.status !== "claimed" && row.status !== "already_claimed") {
      return {
        status: row.status as Exclude<ClaimOutcome["status"], "claimed" | "already_claimed">,
      };
    }
    const reward: Reward = {
      code: row.code ?? "",
      percent: Number(row.percent_off ?? 0),
      expiresAt: row.expires_at ?? "",
      level: (row.level ?? "beginner") as Level,
      score: row.score ?? 0,
    };
    let emailed = false;
    if (row.status === "claimed") {
      const claims = context.claims as { email?: string; user_metadata?: { full_name?: string } };
      emailed = await emailReward(
        claims.email ?? null,
        claims.user_metadata?.full_name ?? null,
        reward,
        data.lang,
      );
    }
    return { status: row.status, reward, emailed };
  });

/** The coupon email, best effort: the code is already on screen. */
async function emailReward(
  email: string | null,
  name: string | null,
  reward: Reward,
  lang: "ar" | "en",
) {
  if (!email) return false;
  try {
    const ar = lang === "ar";
    const { getSiteUrl, sendTransactionalEmail } =
      await import("@/lib/email/email-delivery.server");
    const React = await import("react");
    const { render } = await import("@react-email/components");
    const { PersonalCouponEmail } = await import("@/lib/email/templates/personal-coupon");
    const { couponOffer } = await import("@/features/lms/lib/coupons");
    const { offer, limits } = couponOffer(
      {
        percent_off: reward.percent,
        min_discount: null,
        max_discount: null,
        max_uses: 1,
        expires_at: reward.expiresAt,
      },
      ar,
    );
    const element = React.createElement(PersonalCouponEmail, {
      siteName: ar
        ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
        : "Syrian Association for AI & Entrepreneurship",
      catalogUrl: `${getSiteUrl()}/learning-management-system/catalog?category=${COUPON_CATEGORY_SLUG}`,
      fullName: name || email.split("@")[0],
      code: reward.code,
      offer,
      limits,
      lang,
    });
    await sendTransactionalEmail({
      to: email,
      subject: ar ? `جائزتك من تكسبو: ${offer}` : `Your Texpo reward: ${offer}`,
      html: await render(element),
      text: await render(element, { plainText: true }),
    });
    return true;
  } catch (e) {
    console.error("[texpo] reward email failed", e instanceof Error ? e.message : e);
    return false;
  }
}

/* ---------- the signed-in player's coupon, if they claimed one ---------- */

export const texpoMyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<(Reward & { used: boolean }) | null> => {
    const sb = await db();
    const { data } = await sb
      .from("game_plays")
      .select("level, score, coupon_id, lms_coupons(code, percent_off, expires_at)")
      .eq("game", TEXPO_GAME)
      .eq("user_id", context.userId)
      .not("claimed_at", "is", null)
      .maybeSingle();
    const row = data as {
      level: Level;
      score: number;
      coupon_id: string | null;
      lms_coupons: { code: string; percent_off: number | string; expires_at: string } | null;
    } | null;
    if (!row?.lms_coupons || !row.coupon_id) return null;
    const { count } = await sb
      .from("lms_coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", row.coupon_id)
      .in("status", ["pending", "applied"]);
    return {
      code: row.lms_coupons.code,
      percent: Number(row.lms_coupons.percent_off),
      expiresAt: row.lms_coupons.expires_at,
      level: row.level,
      score: row.score,
      used: (count ?? 0) > 0,
    };
  });

/* ---------- a result waiting for this account, from any device ---------- */

/** The newest finished, unclaimed play started with this account's email, so
    a player who comes back on another phone, or signs up later through the
    normal pages, can still claim. Null once the account has its gift. */
export const texpoFindMine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ playId: string; result: PlayResult } | null> => {
    const claims = context.claims as { email?: string; is_anonymous?: boolean };
    const email = claims.email?.trim().toLowerCase();
    if (!email || claims.is_anonymous) return null;
    const sb = await db();
    const { count } = await sb
      .from("game_plays")
      .select("id", { count: "exact", head: true })
      .eq("game", TEXPO_GAME)
      .eq("user_id", context.userId)
      .not("claimed_at", "is", null);
    if (count) return null;
    const { data } = await sb
      .from("game_plays")
      .select(PLAY_COLUMNS)
      .eq("game", TEXPO_GAME)
      .eq("player_email", email)
      .not("finished_at", "is", null)
      .is("claimed_at", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as PlayRow;
    const { deck } = await deckOf(row);
    return { playId: row.id, result: buildResult(deck, row.answers ?? []) };
  });
