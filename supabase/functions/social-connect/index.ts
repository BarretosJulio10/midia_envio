import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GRAPH, GRAPH_VERSION, graphFetch } from "../_shared/social/types.ts";

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
  // A Meta exige estes dois para publicar no Instagram quando o acesso à página
  // vem por função no Gerenciador de Negócios (caso de agência, igual ao mLabs).
  'ads_read',
  'ads_management',
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

// Troca o token curto (~1h) por um de longa duração. Os tokens de PÁGINA obtidos
// a partir de um token de usuário de longa duração não expiram (só caem se a
// senha mudar ou se a empresa remover você da página).
async function toLongLived(token: string) {
  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appId || !appSecret) return { token, longLived: false };
  try {
    const long = await graphFetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(token)}`,
    );
    if (long?.access_token) return { token: long.access_token, longLived: true };
  } catch (_) { /* segue com o token curto */ }
  return { token, longLived: false };
}

// Token curto: as páginas param de publicar em ~1h. Longo: sem data de validade.
const expiresAtFor = (longLived: boolean) =>
  longLived ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString();

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
      const url = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?client_id=${encodeURIComponent(appId)}` +
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

      const { token, longLived } = await toLongLived(tokenRes.access_token);
      const pages = await listPages(token);
      return json({ success: true, pages, token_expires_at: expiresAtFor(longLived) });
    }

    // 3) Fluxo manual antigo (colar token) - mantido como alternativa
    if (action === 'discover') {
      let token = String(body?.userToken ?? '').trim();
      if (!token) throw new Error('Informe o token de usuario da Meta');
      const long = await toLongLived(token);
      token = long.token;
      const pages = await listPages(token);
      return json({ success: true, pages, token_expires_at: expiresAtFor(long.longLived) });
    }

    // 4) Vincula páginas às empresas. Feito no servidor porque o navegador não
    //    tem permissão de ler/gravar o token salvo (só o servidor usa o token).
    //    Cada token é conferido na Meta: precisa ser mesmo da página informada.
    if (action === 'link') {
      const links = Array.isArray(body?.links) ? body.links : [];
      if (links.length === 0) throw new Error('Nenhuma página para vincular');
      if (links.length > 500) throw new Error('Máximo de 500 páginas por vez');

      const results: Array<{ page_id: string; ok: boolean; error?: string }> = [];
      for (const l of links) {
        const companyRef = String(l?.company_ref ?? '').trim();
        const pageId = String(l?.page_id ?? '').trim();
        const pageToken = String(l?.page_token ?? '').trim();
        try {
          if (!companyRef || !pageId || !pageToken) throw new Error('Dados incompletos');
          const me = await graphFetch(`${GRAPH}/me?fields=id&access_token=${encodeURIComponent(pageToken)}`);
          if (String(me?.id) !== pageId) throw new Error('Token não pertence a esta página');

          const base = {
            user_id: user.id,
            company_ref: companyRef,
            page_id: pageId,
            page_name: l.page_name ?? null,
            access_token: pageToken,
            token_expires_at: l.token_expires_at ?? null,
            connected_via: 'oauth',
            enabled: true,
          };
          const rows: any[] = [{ ...base, name: l.page_name ?? pageId, platform: 'facebook', ig_user_id: null, ig_username: null }];
          if (l.ig_user_id) {
            rows.push({
              ...base,
              name: l.ig_username ? `@${l.ig_username}` : (l.page_name ?? pageId),
              platform: 'instagram',
              ig_user_id: String(l.ig_user_id),
              ig_username: l.ig_username ?? null,
            });
          }
          const { error } = await supabase.from('social_accounts')
            .upsert(rows, { onConflict: 'user_id,company_ref,platform' });
          if (error) throw new Error(error.message);
          results.push({ page_id: pageId, ok: true });
        } catch (e: any) {
          results.push({ page_id: pageId, ok: false, error: String(e?.message ?? e) });
        }
      }
      return json({ success: true, results });
    }

    // 5) Cadastro manual (colar Page ID / IG User ID / token).
    if (action === 'save_manual') {
      const m = body?.manual ?? {};
      const companyRef = String(m.company_ref ?? '').trim();
      const name = String(m.name ?? '').trim();
      const platform = m.platform === 'instagram' ? 'instagram' : 'facebook';
      const pageId = String(m.page_id ?? '').trim() || null;
      const igUserId = String(m.ig_user_id ?? '').trim() || null;
      const token = String(m.access_token ?? '').trim();
      if (!companyRef || !name) throw new Error('Informe o ID da empresa e o nome');
      if (platform === 'facebook' && !pageId) throw new Error('Facebook exige o Page ID');
      if (platform === 'instagram' && !igUserId) throw new Error('Instagram exige o IG User ID (conta Business)');
      if (!token) throw new Error('Informe o access token da página');
      const { error } = await supabase.from('social_accounts').upsert({
        user_id: user.id, company_ref: companyRef, name, platform,
        page_id: pageId, ig_user_id: igUserId, access_token: token,
        connected_via: 'manual', enabled: true,
      }, { onConflict: 'user_id,company_ref,platform' });
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    throw new Error(`Acao desconhecida: ${action}`);
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
});
