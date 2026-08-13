-- Campos extras para conexao via OAuth com a Meta
alter table public.social_accounts add column if not exists page_name text;
alter table public.social_accounts add column if not exists ig_username text;
alter table public.social_accounts add column if not exists connected_via text not null default 'manual';
