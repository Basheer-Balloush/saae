import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText, embedTexts } from "@/lib/embeddings.server";

async function assertAdmin(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("chat_conversations")
      .select("id, session_id, lang, message_count, started_at, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const getConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

/* chat_visitor_profiles is newer than the generated Database types, so it is read
   through the untyped client with the row shape stated here. */
export type VisitorProfile = {
  id: string;
  created_at: string;
  lang: string | null;
  who: string | null;
  field: string | null;
  ai_level: string | null;
  intent: string | null;
  can_offer: string | null;
  weekly_hours: string | null;
  blocker: string | null;
  summary: string;
  goal: string | null;
  next_step: string | null;
  remember_note: string | null;
  recommendation: "course" | "contact" | "lead";
  recommended_course_title: string | null;
  recommended_course_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  conversation_id: string | null;
};

export const listVisitorProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (context.supabase as unknown as SupabaseClient)
      .from("chat_visitor_profiles")
      .select(
        "id, created_at, lang, who, field, ai_level, intent, can_offer, weekly_hours, blocker, summary, goal, next_step, remember_note, recommendation, recommended_course_title, recommended_course_url, contact_name, contact_email, contact_phone, conversation_id",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { profiles: (data ?? []) as VisitorProfile[] };
  });

export const deleteVisitorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string }) =>
    z.object({ profileId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase as unknown as SupabaseClient)
      .from("chat_visitor_profiles")
      .delete()
      .eq("id", data.profileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("chat_conversations")
      .delete()
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getChatStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

    const [convAll, conv7, conv30, msgAll, indLeads, compLeads] = await Promise.all([
      sb.from("chat_conversations").select("id", { count: "exact", head: true }),
      sb
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .gte("last_message_at", since(7)),
      sb
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .gte("last_message_at", since(30)),
      sb.from("chat_messages").select("id", { count: "exact", head: true }),
      sb.from("individual_leads").select("id", { count: "exact", head: true }),
      sb.from("company_leads").select("id", { count: "exact", head: true }),
    ]);

    return {
      conversationsTotal: convAll.count ?? 0,
      conversations7d: conv7.count ?? 0,
      conversations30d: conv30.count ?? 0,
      messagesTotal: msgAll.count ?? 0,
      individualLeads: indLeads.count ?? 0,
      companyLeads: compLeads.count ?? 0,
    };
  });

// listLeads moved to src/lib/crm.functions.ts as listIndividualLeads / listCompanyLeads

export const listKnowledgeDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("chat_knowledge_documents")
      .select("id, title, source_type, status, error_message, chunk_count, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { documents: data ?? [] };
  });

export const addKnowledgeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; text: string }) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        text: z.string().trim().min(10).max(200000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;

    const { data: doc, error: insErr } = await sb
      .from("chat_knowledge_documents")
      .insert({
        title: data.title,
        source_type: "text",
        original_text: data.text,
        status: "processing",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "insert failed");

    try {
      const chunks = chunkText(data.text);
      const batchSize = 64;
      const rows: Array<{
        document_id: string;
        chunk_index: number;
        content: string;
        embedding: string;
      }> = [];
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const vectors = await embedTexts(batch);
        for (let j = 0; j < batch.length; j++) {
          rows.push({
            document_id: doc.id,
            chunk_index: i + j,
            content: batch[j],
            embedding: `[${vectors[j].join(",")}]`,
          });
        }
      }
      if (rows.length > 0) {
        const { error: chunkErr } = await sb.from("chat_knowledge_chunks").insert(rows);
        if (chunkErr) throw new Error(chunkErr.message);
      }
      await sb
        .from("chat_knowledge_documents")
        .update({ status: "ready", chunk_count: rows.length, error_message: null })
        .eq("id", doc.id);
      return { ok: true, documentId: doc.id, chunkCount: rows.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb
        .from("chat_knowledge_documents")
        .update({ status: "failed", error_message: msg })
        .eq("id", doc.id);
      throw new Error(msg);
    }
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: doc } = await sb
      .from("chat_knowledge_documents")
      .select("file_path")
      .eq("id", data.documentId)
      .maybeSingle();
    if (doc?.file_path) {
      await sb.storage.from("chat-knowledge").remove([doc.file_path]);
    }
    const { error } = await sb.from("chat_knowledge_documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Chatbot feedback (also surfaced in CRM) ----

export const listChatFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string } | undefined) =>
    z.object({ category: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("chat_feedback")
      .select("id, session_id, category, name, email, message, lang, handled, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { feedback: rows ?? [] };
  });

export const setChatFeedbackHandled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; handled: boolean }) =>
    z.object({ id: z.string().uuid(), handled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("chat_feedback")
      .update({ handled: data.handled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChatFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("chat_feedback").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
