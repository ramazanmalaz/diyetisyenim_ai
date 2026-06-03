-- Aşama 2 — Sohbet (grup + birebir)
-- conversations, conversation_members, messages + üyelik tabanlı RLS + Realtime.

create type public.conversation_type as enum ('group', 'direct');
create type public.message_type as enum ('user', 'ai', 'system');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  -- AI asistanı bu konuşmada kullanıcı mesajlarına otomatik yanıt versin mi?
  ai_enabled boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx
  on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- AI/sistem mesajlarında sender_id null olur.
  sender_id uuid references public.profiles (id) on delete set null,
  type public.message_type not null default 'user',
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- Yardımcı: kullanıcı bu konuşmanın üyesi mi? (SECURITY DEFINER → RLS atlar,
-- böylece policy'ler arasında özyineleme olmaz)
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_member(conv uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- conversations RLS
-- ---------------------------------------------------------------------------
create policy "conversations_select"
  on public.conversations for select
  using (
    public.is_staff(auth.uid())
    or public.is_conversation_member(id, auth.uid())
  );

create policy "conversations_insert_staff"
  on public.conversations for insert
  with check (public.is_staff(auth.uid()));

create policy "conversations_update_staff"
  on public.conversations for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy "conversations_delete_staff"
  on public.conversations for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- conversation_members RLS
-- ---------------------------------------------------------------------------
create policy "members_select"
  on public.conversation_members for select
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "members_insert_staff"
  on public.conversation_members for insert
  with check (public.is_staff(auth.uid()));

create policy "members_delete_staff"
  on public.conversation_members for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- messages RLS
-- ---------------------------------------------------------------------------
create policy "messages_select"
  on public.messages for select
  using (
    public.is_staff(auth.uid())
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- Kullanıcı yalnızca üyesi olduğu konuşmaya, kendisi adına, 'user' tipinde yazar.
-- AI/sistem mesajları sunucuda service-role ile eklenir (RLS atlanır).
create policy "messages_insert_member"
  on public.messages for insert
  with check (
    type = 'user'
    and sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "messages_delete_staff"
  on public.messages for delete
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime: messages tablosunu yayına ekle
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
