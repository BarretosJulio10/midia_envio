import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSocialDriver } from "../_shared/social/registry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (b: unknown, init?: ResponseInit) => new Response(JSON.stringify(b),
  { ...init, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Cada chamada do cron publica no máximo isto, para caber no tempo da função
// (Reels pode levar ~1–2 min processando na Meta).
const CRON_MAX_POSTS = 6;
const CRON_MAX_MS = 50_000;

/** Troca as variáveis da legenda: {empresa} = nome da conta/página, {id} = ID da empresa. */
function applyCaptionVars(caption: string | null, account: any, post: any): string | null {
  if (!caption) return caption;
  const empresa = account?.page_name || account?.name || '';
  return caption
    .replace(/\{empresa\}/gi, empresa)
    .replace(/\{id\}/gi, String(post.company_ref ?? ''));
}

/** Publica UM post já reservado (status 'publishing'). Nunca lança erro. */
async function publishOne(supabase: SupabaseClient, post: any): Promise<boolean> {
  try {
    const { data: account } = await supabase.from('social_accounts')
      .select('*').eq('id', post.social_account_id).eq('user_id', post.user_id).maybeSingle();
    if (!account) throw new Error('Conta social não encontrada (foi removida?)');
    if (!account.enabled) throw new Error('Serviço de rede social desativado para esta empresa');

    // Meta precisa baixar a mídia: URL assinada de longa duração do bucket privado
    let mediaUrl: string | null = post.media_url;
    if (mediaUrl) {
      const parts = String(mediaUrl).split('/whatsapp-files/');
      if (parts[1]) {
        const { data: signed } = await supabase.storage
          .from('whatsapp-files').createSignedUrl(decodeURIComponent(parts[1].split('?')[0]), 60 * 60 * 6);
        if (!signed?.signedUrl) throw new Error('Arquivo não encontrado no storage (pode ter sido apagado)');
        mediaUrl = signed.signedUrl;
      }
    }

    const driver = getSocialDriver(account.platform);
    const { externalId } = await driver.publish({
      account,
      mediaUrl,
      mediaType: (post.media_type ?? 'image') as 'image' | 'video' | 'text',
      caption: applyCaptionVars(post.caption, account, post),
    });

    await supabase.from('social_posts').update({
      status: 'published',
      external_post_id: externalId,
      published_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', post.id);
    return true;
  } catch (err: any) {
    const raw = String(err?.message ?? err);
    const expired = /OAuthException|expired|Session has expired|code":\s*190|Error validating access token/i.test(raw);
    const ppa = /publishing authorization|Page Publishing Authorization/i.test(raw);
    await supabase.from('social_posts').update({
      status: 'failed',
      error_message: (
        expired ? 'Acesso à página expirou ou foi removido: reconecte o Facebook em Redes Sociais. '
        : ppa ? 'A página exige a Autorização de Publicação (PPA) da Meta antes de publicar. '
        : ''
      ) + raw.slice(0, 400),
    }).eq('id', post.id);
    return false;
  }
}

async function claim(supabase: SupabaseClient, userId: string | null) {
  const { data, error } = await supabase.rpc('claim_social_posts', { p_limit: 1, p_user: userId });
  if (error) throw new Error(`claim_social_posts: ${error.message}`);
  return (data ?? [])[0] ?? null;
}

async function dueCount(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase.from('social_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'queued')
    .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'start';

    // ---------- Chamada do agendador (pg_cron) — sem usuário logado ----------
    if (action === 'cron') {
      const given = req.headers.get('x-cron-secret') ?? '';
      const { data: expected } = await supabase.rpc('get_social_cron_secret');
      if (!expected || given !== expected) return json({ error: 'Unauthorized' }, { status: 401 });

      const started = Date.now();
      let published = 0, failed = 0;
      while (published + failed < CRON_MAX_POSTS && Date.now() - started < CRON_MAX_MS) {
        const post = await claim(supabase, null);
        if (!post) break;
        (await publishOne(supabase, post)) ? published++ : failed++;
      }
      return json({ success: true, published, failed });
    }

    // ---------- Chamadas do painel (usuário logado) ----------
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized');

    if (action === 'retry') {
      await supabase.from('social_posts')
        .update({ status: 'queued', error_message: null })
        .eq('user_id', user.id).eq('status', 'failed');
      return json({ success: true });
    }

    if (action === 'test') {
      const accountId = String(body?.accountId ?? '');
      const { data: acc } = await supabase.from('social_accounts')
        .select('*').eq('user_id', user.id).eq('id', accountId).maybeSingle();
      if (!acc) throw new Error('Conta não encontrada');
      const result = await getSocialDriver(acc.platform).checkToken(acc as any);
      return json({ success: result.ok, message: result.message });
    }

    // action === 'start' ("Publicar agora"): publica UM post vencido por chamada.
    // A reserva é atômica, então não colide com o cron publicando ao mesmo tempo.
    const post = await claim(supabase, user.id);
    if (!post) {
      return json({ success: true, processed: 0, published: 0, failed: 0, moreRemaining: false, message: 'Nada para publicar agora' });
    }
    const ok = await publishOne(supabase, post);
    const remaining = await dueCount(supabase, user.id);
    return json({ success: true, processed: 1, published: ok ? 1 : 0, failed: ok ? 0 : 1, moreRemaining: remaining > 0 });
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
});
