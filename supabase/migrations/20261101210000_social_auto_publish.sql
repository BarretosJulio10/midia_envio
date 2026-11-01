-- Publicação automática nas redes sociais (Facebook / Instagram)
--
-- 1) Agendamento: social_posts.scheduled_at (NULL = publicar assim que possível).
-- 2) Publicação pelo servidor: pg_cron chama a Edge Function publish-social a
--    cada minuto, SÓ quando existe post vencido na fila. Funciona com o painel fechado.
-- 3) claim_social_posts(): reserva posts de forma atômica (FOR UPDATE SKIP LOCKED)
--    para o cron e o botão "Publicar agora" nunca publicarem o mesmo post 2 vezes.
-- 4) Tokens das páginas: o navegador não consegue mais LER access_token
--    (privilégio por coluna). Só o servidor (service_role) lê o token.
--
-- O segredo que autentica o cron fica no Vault com o nome 'social_cron_secret'.
-- Ele é criado fora desta migration (o repositório é público):
--   select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'social_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------- Colunas novas ----------
alter table public.social_posts add column if not exists scheduled_at timestamptz;
alter table public.social_posts add column if not exists publishing_started_at timestamptz;
alter table public.social_posts add column if not exists attempts integer not null default 0;

comment on column public.social_posts.scheduled_at is
  'Quando publicar. NULL = assim que possível. O cron publica posts com scheduled_at <= now().';
comment on column public.social_posts.publishing_started_at is
  'Início da publicação no servidor; usado para detectar publicação interrompida.';

create index if not exists social_posts_due_idx
  on public.social_posts (status, scheduled_at)
  where status = 'queued';

-- ---------- Token da página: navegador não lê ----------
revoke select on public.social_accounts from anon, authenticated;
grant select (
  id, user_id, company_ref, name, platform, page_id, ig_user_id,
  token_expires_at, enabled, created_at, updated_at, page_name, ig_username, connected_via
) on public.social_accounts to authenticated;

-- ---------- Reserva atômica de posts vencidos ----------
create or replace function public.claim_social_posts(p_limit integer default 1, p_user uuid default null)
returns setof public.social_posts
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Publicação que começou há mais de 10 min morreu (função encerrada): vira falha.
  update public.social_posts
     set status = 'failed',
         error_message = 'Publicação interrompida no servidor. Use "Reenviar falhas".'
   where status = 'publishing'
     and (publishing_started_at is null or publishing_started_at < now() - interval '10 minutes')
     and (p_user is null or user_id = p_user);

  return query
  update public.social_posts p
     set status = 'publishing',
         publishing_started_at = now(),
         attempts = p.attempts + 1
   where p.id in (
     select q.id from public.social_posts q
      where q.status = 'queued'
        and (q.scheduled_at is null or q.scheduled_at <= now())
        and (p_user is null or q.user_id = p_user)
      order by coalesce(q.scheduled_at, q.created_at), q.created_at
      limit greatest(1, least(p_limit, 10))
      for update skip locked
   )
  returning p.*;
end;
$$;

revoke all on function public.claim_social_posts(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_social_posts(integer, uuid) to service_role;

-- ---------- Segredo do cron (lido só pelo servidor) ----------
create or replace function public.get_social_cron_secret()
returns text
language sql
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'social_cron_secret' limit 1;
$$;

revoke all on function public.get_social_cron_secret() from public, anon, authenticated;
grant execute on function public.get_social_cron_secret() to service_role;

-- ---------- Tick do cron: chama a Edge Function só se houver trabalho ----------
create or replace function public.social_cron_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if not exists (
    select 1 from public.social_posts
     where status = 'queued' and (scheduled_at is null or scheduled_at <= now())
  ) and not exists (
    select 1 from public.social_posts
     where status = 'publishing' and publishing_started_at < now() - interval '10 minutes'
  ) then
    return;
  end if;

  v_secret := public.get_social_cron_secret();
  if v_secret is null then
    raise warning 'social_cron_tick: segredo social_cron_secret ausente no Vault';
    return;
  end if;

  perform net.http_post(
    url := 'https://uvvaxwtumuabfklccjgd.supabase.co/functions/v1/publish-social',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('action', 'cron'),
    -- pg_net é assíncrono: o tempo alto só evita cortar a função no meio
    -- (Reels pode levar ~1–2 min processando na Meta).
    timeout_milliseconds := 150000
  );
end;
$$;

revoke all on function public.social_cron_tick() from public, anon, authenticated;

-- Agenda (idempotente): a cada minuto.
select cron.unschedule(jobid) from cron.job where jobname = 'social-publish-tick';
select cron.schedule('social-publish-tick', '* * * * *', $$select public.social_cron_tick();$$);
