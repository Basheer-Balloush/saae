## الهدف
إضافة قسم "الشات بوت" داخل صفحة الأدمن `/admin` يعرض:
1. كل المحادثات والرسائل
2. الـ Leads (أفراد + شركات) الموجودة
3. إحصائيات عامة
4. واجهة لتدريب البوت عبر رفع ملفات (PDF/نصوص) واستخدامها كمرجع (RAG)

---

## 1. قاعدة البيانات (migrations)

### جداول جديدة
- **`chat_conversations`**: `id`, `session_id` (نص فريد من localStorage), `started_at`, `last_message_at`, `message_count`, `user_agent`, `lang`.
- **`chat_messages`**: `id`, `conversation_id` (FK), `role` (`user`/`assistant`/`tool`), `content` (text), `parts` (jsonb للأجزاء الكاملة من AI SDK), `created_at`.
- **`chat_knowledge_documents`**: `id`, `title`, `source_type` (`pdf`/`text`/`url`), `file_path` (داخل bucket)، `original_text` (نص كامل بعد الاستخراج)، `created_by`, `created_at`, `status` (`processing`/`ready`/`failed`).
- **`chat_knowledge_chunks`**: `id`, `document_id` (FK CASCADE), `content` (text), `embedding` (`vector(1536)` باستخدام `text-embedding-3-small`)، `chunk_index`, `created_at`.

### Extension + Index
- `create extension if not exists vector;`
- HNSW index على `chat_knowledge_chunks.embedding` لـ cosine.

### دالة بحث
- `match_chat_chunks(query_embedding vector(1536), match_count int default 5)` تُرجع أقرب المقاطع مع `similarity`.

### Storage Bucket
- `chat-knowledge` (private) لتخزين الـ PDF/الملفات.

### RLS
- `chat_conversations` + `chat_messages`:
  - INSERT: `anon` و `authenticated` (الموقع مفتوح للزوار).
  - SELECT/DELETE: فقط `admin`.
- `chat_knowledge_documents` + `chat_knowledge_chunks`: ALL فقط `admin`.
- Bucket `chat-knowledge`: قراءة/كتابة فقط للأدمن.

---

## 2. الـ Backend (Server Functions + Routes)

### تعديل `src/routes/api/chat.ts`
- يقبل `session_id` من body.
- قبل الرد:
  1. أنشئ/حدّث conversation (`upsert by session_id`).
  2. خزّن آخر رسالة من المستخدم في `chat_messages` (admin client).
  3. ولّد embedding للسؤال → `match_chat_chunks` → جلب top 5 مقاطع.
  4. أضِف المقاطع كـ context إضافي للـ system prompt (بقسم "مراجع إضافية من قاعدة المعرفة").
- في `onFinish` للستريم: خزّن رسالة المساعد كاملة (parts + text).

### Server functions جديدة (admin only, محمية بـ `requireSupabaseAuth` + فحص دور admin)
- `listConversations()` — قائمة محادثات مع آخر رسالة، paginated.
- `getConversationMessages(id)` — كل الرسائل.
- `deleteConversation(id)`.
- `getChatStats()` — عدد محادثات/رسائل آخر 7/30 يوم، عدد leads، أكثر كلمات شائعة (بسيط: split + count).
- `listKnowledgeDocuments()`.
- `uploadKnowledgeDocument({ title, fileBase64, mimeType })` — يرفع للـ bucket، يستخرج النص (PDF عبر pdfjs أو نص خام للـ .txt/.md)، يقطّع لمقاطع ~1000 حرف، يولّد embeddings بالباتش عبر Lovable AI Gateway، يخزّنها.
- `deleteKnowledgeDocument(id)` — حذف من Storage + DB.
- `reindexKnowledgeDocument(id)` — إعادة chunking + embeddings.

> ملاحظة: استخراج PDF داخل Cloudflare Worker = استخدم `pdfjs-dist` legacy build (يعمل على edge) أو نطلب من الأدمن لصق النص مباشرة كبديل آمن في الإصدار الأول.

---

## 3. الـ Frontend

### تعديل بسيط على `AssistantChatModal` / مكوّن الشات الموجود
- توليد `session_id` مرة واحدة في `localStorage` (مفتاح `saae_chat_session`).
- إرساله مع كل request للـ `/api/chat`.

### إضافة قسم Chatbot في `src/routes/admin.index.tsx`
تبويب جديد "الشات بوت" (Tab) داخل صفحة الأدمن، يحتوي 4 تبويبات فرعية:

1. **Dashboard**: كروت إحصائيات (محادثات اليوم/الأسبوع/الشهر، رسائل، leads أفراد، leads شركات، أكثر الأسئلة).
2. **المحادثات**: قائمة محادثات (session_id، تاريخ، عدد رسائل) → نقر يفتح drawer/dialog فيه كامل الرسائل بتنسيق chat. زر حذف.
3. **الـ Leads**: tabs فرعية (أفراد / شركات) — جدول مع كل الأعمدة + تصدير CSV.
4. **قاعدة المعرفة (تدريب)**:
   - زر "رفع ملف" (PDF/TXT/MD) أو "إضافة نص يدوي" (textarea + عنوان).
   - جدول الملفات: العنوان، النوع، عدد المقاطع، الحالة، تاريخ، أزرار (إعادة فهرسة، حذف).
   - شرح مختصر للأدمن: "الملفات يلي بترفعها هون رح يستخدمها البوت كمرجع إضافي للإجابة".

---

## التفاصيل التقنية

- **Embeddings**: نموذج `openai/text-embedding-3-small` (1536 بُعد، أرخص) عبر `https://ai.gateway.lovable.dev/v1/embeddings` بالـ `LOVABLE_API_KEY` الموجود.
- **Chunking**: تقطيع بـ ~1000 حرف مع overlap 100. حذف whitespace زائد.
- **Realtime (اختياري لاحقاً)**: ممكن تفعيل realtime لـ `chat_conversations` ليظهر للأدمن مباشرة.
- **الأمان**: كل server functions الإدارية تتحقق `has_role(userId, 'admin')` يدوياً بعد `requireSupabaseAuth`.
- **حقن المعرفة بالـ prompt**: بعد جلب top-K مقاطع، نضيفها قبل رسالة المستخدم بصيغة:
  ```
  مراجع إضافية من قاعدة معرفة الأدمن (استخدمها فقط إذا كانت ذات صلة):
  ---
  [مقطع 1]
  ---
  [مقطع 2]
  ```
- **الأداء**: insert المحادثات يتم عبر `supabaseAdmin` (لا يحجب الستريم — fire and forget مع log للأخطاء).

---

## ترتيب التنفيذ
1. Migration (جداول + extension + function + bucket + RLS).
2. تعديل `/api/chat` لتخزين الرسائل + RAG retrieval + قبول `session_id`.
3. تحديث مكوّن الشات في الواجهة لتمرير `session_id`.
4. Server functions الإدارية.
5. واجهة الأدمن (التبويبات الأربعة).
6. اختبار end-to-end: محادثة كاملة → ظهورها بالأدمن → رفع PDF → سؤال متعلق به → التأكد أن البوت يستخدم المرجع.
