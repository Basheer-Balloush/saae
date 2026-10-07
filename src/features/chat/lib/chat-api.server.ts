// The API's two database calls (migration 20261007160000_chat_api_keys.sql),
// both through the service role: browser roles cannot reach either function.
import type { SupabaseClient } from "@supabase/supabase-js";
import { API_LIMITS } from "@/features/chat/lib/chat-api";
import type { ApiAuthorization } from "@/features/chat/lib/chat-api-handler";

// The functions are newer than the generated Database types.
const db = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
};

export async function authorizeApiCall(input: {
  keyHash: string;
  userHash: string | null;
  conversationId: string;
}): Promise<ApiAuthorization> {
  const { data, error } = await (
    await db()
  ).rpc("chat_api_authorize", {
    _key_hash: input.keyHash,
    _user_hash: input.userHash,
    _conversation: input.conversationId,
    _max_messages: API_LIMITS.maxConversationMessages,
    _global_per_minute: API_LIMITS.globalPerMinute,
    _global_per_day: API_LIMITS.globalPerDay,
  });
  if (error) throw new Error(error.message);
  return data as ApiAuthorization;
}

export async function noteBlockedAnswer(keyId: string): Promise<void> {
  const { error } = await (await db()).rpc("chat_api_note_blocked", { _key_id: keyId });
  if (error) console.error("[chat-api] blocked answer not counted", error.message);
}
