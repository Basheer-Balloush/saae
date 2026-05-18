
-- Vector extension
create extension if not exists vector;

-- Conversations
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  lang text,
  user_agent text,
  message_count integer not null default 0,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index chat_conversations_last_idx on public.chat_conversations(last_message_at desc);
alter table public.chat_conversations enable row level security;

create policy "Anyone can insert conversations"
  on public.chat_conversations for insert
  to anon, authenticated with check (true);

create policy "Anyone can update own conversation by session"
  on public.chat_conversations for update
  to anon, authenticated using (true) with check (true);

create policy "Admins view conversations"
  on public.chat_conversations for select
  to authenticated using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete conversations"
  on public.chat_conversations for delete
  to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- Messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null default '',
  parts jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_conv_idx on public.chat_messages(conversation_id, created_at);
alter table public.chat_messages enable row level security;

create policy "Anyone can insert messages"
  on public.chat_messages for insert
  to anon, authenticated with check (true);

create policy "Admins view messages"
  on public.chat_messages for select
  to authenticated using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete messages"
  on public.chat_messages for delete
  to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- Knowledge documents
create table public.chat_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('pdf','text','markdown','url')),
  file_path text,
  original_text text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  error_message text,
  chunk_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_knowledge_documents enable row level security;

create policy "Admins manage knowledge documents"
  on public.chat_knowledge_documents for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Knowledge chunks with embeddings (1536 dims = text-embedding-3-small)
create table public.chat_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.chat_knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
create index chat_knowledge_chunks_doc_idx on public.chat_knowledge_chunks(document_id);
create index chat_knowledge_chunks_embedding_idx
  on public.chat_knowledge_chunks using hnsw (embedding vector_cosine_ops);
alter table public.chat_knowledge_chunks enable row level security;

create policy "Admins manage knowledge chunks"
  on public.chat_knowledge_chunks for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Similarity search function (service role bypasses RLS so chat route can use it)
create or replace function public.match_chat_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
security definer
set search_path = public
as $$
  select c.id, c.document_id, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chat_knowledge_chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- updated_at trigger for documents
create trigger chat_knowledge_documents_updated_at
  before update on public.chat_knowledge_documents
  for each row execute function public.set_updated_at();

-- Storage bucket for uploaded knowledge files (admin-only)
insert into storage.buckets (id, name, public)
values ('chat-knowledge', 'chat-knowledge', false)
on conflict (id) do nothing;

create policy "Admins read chat-knowledge"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-knowledge' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins write chat-knowledge"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-knowledge' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete chat-knowledge"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-knowledge' and has_role(auth.uid(), 'admin'::app_role));
