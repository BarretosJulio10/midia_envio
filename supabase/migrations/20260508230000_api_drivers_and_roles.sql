-- Universal API Drivers + roles (admin)

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users order by created_at asc limit 1
on conflict (user_id, role) do nothing;

create table if not exists public.api_drivers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text not null default '',
  api_key text not null default '',
  enabled boolean not null default true,
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists api_drivers_only_one_active
  on public.api_drivers ((is_active)) where is_active = true;

alter table public.api_drivers enable row level security;

drop policy if exists "Admins manage drivers" on public.api_drivers;
create policy "Admins manage drivers" on public.api_drivers for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Authenticated read active driver" on public.api_drivers;
create policy "Authenticated read active driver" on public.api_drivers for select to authenticated
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_api_drivers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_api_drivers on public.api_drivers;
create trigger trg_touch_api_drivers before update on public.api_drivers
  for each row execute function public.touch_api_drivers();

insert into public.api_drivers (slug, name, base_url, api_key, is_active, enabled) values
  ('evolution-go', 'Evolution Go (Evogo)', 'https://evogo.pagoupix.com.br',
   '006763caee95f33088ebc5ac90ce975ef1c62a2622271937450fe9254635a97f', true, true),
  ('fzap', 'Fzap', '', '', false, true),
  ('evolution-api', 'Evolution API (oficial)', '', '', false, true)
on conflict (slug) do nothing;

alter table public.fzap_config add column if not exists driver_slug text not null default 'evolution-go';
