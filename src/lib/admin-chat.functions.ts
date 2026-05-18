import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chunkText, embedTexts } from "@/lib/embeddings.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
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
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
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
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("chat_conversations")
      .delete()
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getChatStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = (days: number) =>
      new Date(Date.now() - days * 86400000).toISOString();

    const [convAll, conv7, conv30, msgAll, indLeads, compLeads] = await Promise.all([
      supabaseAdmin.from("chat_conversations").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .gte("last_message_at", since(7)),
      supabaseAdmin
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .gte("last_message_at", since(30)),
      supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("individual_leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("company_leads").select("id", { count: "exact", head: true }),
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

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [ind, comp] = await Promise.all([
      supabaseAdmin
        .from("individual_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("company_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (ind.error) throw new Error(ind.error.message);
    if (comp.error) throw new Error(comp.error.message);
    return { individuals: ind.data ?? [], companies: comp.data ?? [] };
  });

export const listKnowledgeDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
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
    await assertAdmin(context.userId);

    const { data: doc, error: insErr } = await supabaseAdmin
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
      // Embed in batches of 64 to stay well under provider limits
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
            // pgvector text representation
            embedding: `[${vectors[j].join(",")}]`,
          });
        }
      }
      if (rows.length > 0) {
        const { error: chunkErr } = await supabaseAdmin
          .from("chat_knowledge_chunks")
          .insert(rows);
        if (chunkErr) throw new Error(chunkErr.message);
      }
      await supabaseAdmin
        .from("chat_knowledge_documents")
        .update({ status: "ready", chunk_count: rows.length, error_message: null })
        .eq("id", doc.id);
      return { ok: true, documentId: doc.id, chunkCount: rows.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
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
    await assertAdmin(context.userId);
    // Get file path if any to clean storage
    const { data: doc } = await supabaseAdmin
      .from("chat_knowledge_documents")
      .select("file_path")
      .eq("id", data.documentId)
      .maybeSingle();
    if (doc?.file_path) {
      await supabaseAdmin.storage.from("chat-knowledge").remove([doc.file_path]);
    }
    const { error } = await supabaseAdmin
      .from("chat_knowledge_documents")
      .delete()
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
