-- Modulo de publicacao em redes sociais (Facebook / Instagram)
-- Nao altera nenhuma tabela do fluxo de WhatsApp.

-- Contas sociais por empresa
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_ref text not null,                       -- mesmo id usado no CSV (id;whatsapp)
  name text not null,
  platform text not null check (platform in ('facebook','instagram')),
  page_id text,
  ig_user_id text,
  access_token text not null default '',
  token_expires_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_ref, platform)
);

create index if not exists social_accounts_company_idx
  on public.social_accounts (user_id, company_ref);

grant select, insert, update, delete on public.social_accounts to authenticated;
grant all on public.social_accounts to service_role;

alter table public.social_accounts enable row level security;

drop policy if exists "Users manage own social accounts" on public.social_accounts;
create policy "Users manage own social accounts" on public.social_accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fila de publicacoes
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  company_ref text not null default '',
  platform text not null check (platform in ('facebook','instagram')),
  media_url text,
  media_type text not null default 'image' check (media_type in ('image','video','text')),
  filename text,
  caption text,
  status text not null default 'queued'
    check (status in ('queued','publishing','published','failed','blocked')),
  external_post_id text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_queue_idx
  on public.social_posts (user_id, status, created_at);

grant select, insert, update, delete on public.social_posts to authenticated;
grant all on public.social_posts to service_role;

alter table public.social_posts enable row level security;

drop policy if exists "Users manage own social posts" on public.social_posts;
create policy "Users manage own social posts" on public.social_posts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_social_accounts()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_social_accounts on public.social_accounts;
create trigger trg_touch_social_accounts before update on public.social_accounts
  for each row execute function public.touch_social_accounts();

-- Drivers sociais no mesmo registry universal (nao ativos, apenas registrados)
insert into public.api_drivers (slug, name, base_url, api_key, is_active, enabled) values
  ('meta-facebook', 'Meta Facebook Pages', 'https://graph.facebook.com/v21.0', '', false, true),
  ('meta-instagram', 'Meta Instagram Graph', 'https://graph.facebook.com/v21.0', '', false, true)
on conflict (slug) do nothing;
