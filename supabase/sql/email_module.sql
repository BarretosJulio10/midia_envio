create table if not exists public.email_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, emails text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  from_email text not null default '', from_name text not null default '',
  delay_min integer not null default 3000, delay_max integer not null default 8000,
  pause_after integer not null default 50, pause_duration integer not null default 60000,
  updated_at timestamptz not null default now());
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '', subject text not null, body_text text not null default '',
  image_url text, button_text text, button_url text,
  list_id uuid references public.email_lists(id) on delete set null,
  total integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete cascade,
  to_email text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','blocked')),
  resend_id text, error_message text, sent_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists email_messages_queue_idx on public.email_messages (user_id, status, created_at);
create table if not exists public.email_blacklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null, created_at timestamptz not null default now(), unique (user_id, email));
do $$ declare t text; begin
  foreach t in array array['email_lists','email_config','email_campaigns','email_messages','email_blacklist'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
do $$ begin alter publication supabase_realtime add table public.email_messages; exception when others then null; end $$;
