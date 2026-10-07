import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { keyPrefix, newApiKey, sha256Hex } from "@/features/chat/lib/chat-api";

/* API keys for Abu Al-Joud (chatbot page → API keys). Admins only. A key is
   made here, shown once, and only its SHA-256 is kept; a lost key is revoked
   and replaced, never shown again. The tables have no browser policies, so
   every read and write goes through the service role after the role check. */

const db = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
};

async function assertAdmin(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Could not check your role");
  if (!data) throw new Error("Forbidden: admin role required");
}

export type ChatApiKey = {
  id: string;
  name: string;
  note: string | null;
  key_prefix: string;
  per_minute: number;
  per_day: number;
  per_user_minute: number;
  per_user_day: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  blocked_count: number;
  used_today: number;
};

const Limits = z.object({
  per_minute: z.number().int().min(1).max(600),
  per_day: z.number().int().min(1).max(100000),
  per_user_minute: z.number().int().min(1).max(120),
  per_user_day: z.number().int().min(1).max(10000),
});

const Details = z.object({
  name: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).nullish(),
});

const startOfUtcDay = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
};

export const listChatApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await db();
    const { data, error } = await sb
      .from("chat_api_keys")
      .select(
        "id,name,note,key_prefix,per_minute,per_day,per_user_minute,per_user_day,expires_at,revoked_at,created_at,last_used_at,request_count,blocked_count",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const keys = (data ?? []) as Omit<ChatApiKey, "used_today">[];
    const today = new Map<string, number>();
    if (keys.length) {
      const { data: counts } = await sb
        .from("chat_api_counters")
        .select("bucket,count")
        .eq("window_start", startOfUtcDay())
        .in(
          "bucket",
          keys.map((k) => `key:${k.id}:d`),
        );
      for (const row of (counts ?? []) as { bucket: string; count: number }[])
        today.set(row.bucket.slice(4, -2), row.count);
    }
    return {
      keys: keys.map((k) => ({
        ...k,
        request_count: Number(k.request_count),
        used_today: Math.min(today.get(k.id) ?? 0, k.per_day),
      })) as ChatApiKey[],
    };
  });

export const createChatApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    Details.merge(Limits)
      .extend({ expires_in_days: z.number().int().min(1).max(730).nullish() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const key = newApiKey();
    const { data: row, error } = await (
      await db()
    )
      .from("chat_api_keys")
      .insert({
        name: data.name,
        note: data.note || null,
        key_prefix: keyPrefix(key),
        key_hash: await sha256Hex(key),
        per_minute: data.per_minute,
        per_day: data.per_day,
        per_user_minute: data.per_user_minute,
        per_user_day: data.per_user_day,
        expires_at: data.expires_in_days
          ? new Date(Date.now() + data.expires_in_days * 86_400_000).toISOString()
          : null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // The only time the key leaves the server.
    return { id: (row as { id: string }).id, key };
  });

export const updateChatApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Details.merge(Limits).extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...fields } = data;
    const { error } = await (
      await db()
    )
      .from("chat_api_keys")
      .update({ ...fields, note: fields.note || null })
      .eq("id", id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeChatApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (await db())
      .from("chat_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
