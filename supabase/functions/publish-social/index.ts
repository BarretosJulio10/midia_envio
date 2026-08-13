import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSocialDriver } from "../_shared/social/registry.ts";

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
    const action = body?.action ?? 'start';

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

    // action === 'start': publica UM post por chamada (frontend controla ritmo)
    const { data: queued } = await supabase.from('social_posts')
      .select('*').eq('user_id', user.id).eq('status', 'queued')
      .order('created_at', { ascending: true }).limit(1);

    const post = queued?.[0];
    if (!post) {
      return json({ success: true, processed: 0, published: 0, failed: 0, moreRemaining: false, message: 'Fila vazia' });
    }

    let published = 0, failed = 0;
    try {
      await supabase.from('social_posts').update({ status: 'publishing' }).eq('id', post.id);

      const { data: account } = await supabase.from('social_accounts')
        .select('*').eq('id', post.social_account_id).eq('user_id', user.id).maybeSingle();
      if (!account) throw new Error('Conta social não encontrada');
      if (!account.enabled) throw new Error('Serviço de rede social desativado para esta empresa');

      // Meta precisa baixar a mídia: gerar URL assinada de longa duração
      let mediaUrl: string | null = post.media_url;
      if (mediaUrl) {
        const parts = String(mediaUrl).split('/whatsapp-files/');
        if (parts[1]) {
          const { data: signed } = await supabase.storage
            .from('whatsapp-files').createSignedUrl(decodeURIComponent(parts[1]), 60 * 60 * 6);
          if (signed?.signedUrl) mediaUrl = signed.signedUrl;
        }
      }

      const driver = getSocialDriver(account.platform);
      const { externalId } = await driver.publish({
        account: account as any,
        mediaUrl,
        mediaType: (post.media_type ?? 'image') as 'image' | 'video' | 'text',
        caption: post.caption,
      });

      await supabase.from('social_posts').update({
        status: 'published',
        external_post_id: externalId,
        published_at: new Date().toISOString(),
        error_message: null,
      }).eq('id', post.id);
      published = 1;
    } catch (err: any) {
      const raw = String(err?.message ?? err);
      const expired = /OAuthException|expired|Session has expired|code":\s*190|Error validating access token/i.test(raw);
      await supabase.from('social_posts').update({
        status: 'failed',
        error_message: (expired
          ? 'Token expirado ou inválido: reconecte a conta em Redes Sociais. '
          : '') + raw.slice(0, 400),
      }).eq('id', post.id);
      failed = 1;
    }

    const { count: remaining } = await supabase.from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('status', 'queued');

    return json({ success: true, processed: 1, published, failed, moreRemaining: (remaining ?? 0) > 0 });
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
});
