import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GRAPH, graphFetch } from "../_shared/social/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Recebe um user access token (ou token de longa duração) e lista as páginas
    // + contas Instagram Business vinculadas, para o usuário escolher no painel.
    if (action === 'discover') {
      let token = String(body?.userToken ?? '').trim();
      if (!token) throw new Error('Informe o token de usuário da Meta');

      const appId = Deno.env.get('META_APP_ID');
      const appSecret = Deno.env.get('META_APP_SECRET');
      if (appId && appSecret) {
        try {
          const long = await graphFetch(
            `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
            `&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}` +
            `&fb_exchange_token=${encodeURIComponent(token)}`,
          );
          if (long?.access_token) token = long.access_token;
        } catch (_) { /* segue com o token curto */ }
      }

      const pages = await graphFetch(
        `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}` +
        `&limit=100&access_token=${encodeURIComponent(token)}`,
      );

      const list = (pages?.data ?? []).map((p: any) => ({
        page_id: p.id,
        page_name: p.name,
        page_token: p.access_token,
        ig_user_id: p.instagram_business_account?.id ?? null,
        ig_username: p.instagram_business_account?.username ?? null,
      }));

      return json({ success: true, pages: list });
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
});
