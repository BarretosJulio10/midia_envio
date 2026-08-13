import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GRAPH, graphFetch } from "../_shared/social/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

async function listPages(token: string) {
  const pages = await graphFetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,picture{url},instagram_business_account{id,username}` +
    `&limit=100&access_token=${encodeURIComponent(token)}`,
  );
  return (pages?.data ?? []).map((p: any) => ({
    page_id: p.id,
    page_name: p.name,
    page_token: p.access_token,
    picture: p.picture?.data?.url ?? null,
    ig_user_id: p.instagram_business_account?.id ?? null,
    ig_username: p.instagram_business_account?.username ?? null,
  }));
}

async function toLongLived(token: string) {
  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appId || !appSecret) return { token, expiresIn: null as number | null };
  try {
    const long = await graphFetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(token)}`,
    );
    if (long?.access_token) return { token: long.access_token, expiresIn: long.expires_in ?? 5184000 };
  } catch (_) { /* segue com o token curto */ }
  return { token, expiresIn: null as number | null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, init?: ResponseInit) => new Response(JSON.stringify(b),
    { ...init, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'discover';

    // 1) Monta a URL de login do Facebook (botao "Conectar com Facebook")
    if (action === 'oauth_url') {
      const appId = Deno.env.get('META_APP_ID');
      if (!appId) throw new Error('META_APP_ID nao configurado nos secrets');
      const redirectUri = String(body?.redirectUri ?? '').trim();
      if (!redirectUri) throw new Error('redirectUri obrigatorio');
      const state = crypto.randomUUID();
      const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;
      return json({ success: true, url, state });
    }

    // 2) Troca o "code" por token de longa duracao e lista paginas + IG vinculado
    if (action === 'oauth_callback') {
      const appId = Deno.env.get('META_APP_ID');
      const appSecret = Deno.env.get('META_APP_SECRET');
      if (!appId || !appSecret) throw new Error('META_APP_ID/META_APP_SECRET nao configurados');
      const code = String(body?.code ?? '').trim();
      const redirectUri = String(body?.redirectUri ?? '').trim();
      if (!code || !redirectUri) throw new Error('code e redirectUri sao obrigatorios');

      const tokenRes = await graphFetch(
        `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
      );
      if (!tokenRes?.access_token) throw new Error('Nao foi possivel obter o token da Meta');

      const { token, expiresIn } = await toLongLived(tokenRes.access_token);
      const pages = await listPages(token);
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
      return json({ success: true, pages, token_expires_at: expiresAt });
    }

    // 3) Fluxo manual antigo (colar token) - mantido como alternativa
    if (action === 'discover') {
      let token = String(body?.userToken ?? '').trim();
      if (!token) throw new Error('Informe o token de usuario da Meta');
      const long = await toLongLived(token);
      token = long.token;
      const pages = await listPages(token);
      const expiresAt = long.expiresIn ? new Date(Date.now() + long.expiresIn * 1000).toISOString() : null;
      return json({ success: true, pages, token_expires_at: expiresAt });
    }

    throw new Error(`Acao desconhecida: ${action}`);
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
});
