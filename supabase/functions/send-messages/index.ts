import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadActiveDriver } from "../_shared/drivers/index.ts";
import { detectMediaType } from "../_shared/media-type.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized');

    const { action } = await req.json().catch(() => ({ action: 'start' }));
    const json = (b: unknown, init?: ResponseInit) => new Response(JSON.stringify(b),
      { ...init, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (action === 'pause') return json({ success: true });

    if (action === 'retry') {
      await supabase.from('messages')
        .update({ status: 'queued', error_message: null })
        .eq('user_id', user.id).eq('status', 'failed');
      return json({ success: true });
    }

    // action === 'start' (default): processa UMA mensagem; frontend orquestra delays/pausas.
    const { data: config } = await supabase.from('fzap_config').select('token').eq('user_id', user.id).maybeSingle();
    if (!config?.token) throw new Error('Instância não conectada');

    const { driver } = await loadActiveDriver();

    const { data: queued } = await supabase.from('messages').select('*')
      .eq('user_id', user.id).eq('status', 'queued')
      .order('created_at', { ascending: true }).limit(1);

    const msg = queued?.[0];
    if (!msg) return json({ success: true, processed: 0, sent: 0, failed: 0, moreRemaining: false, message: 'Fila vazia' });

    let sent = 0, failed = 0;
    try {
      await supabase.from('messages').update({ status: 'sending' }).eq('id', msg.id);
      if (msg.file_url) {
        let mediaUrl = msg.file_url;
        const parts = msg.file_url.split('/whatsapp-files/');
        if (parts[1]) {
          const { data: signed } = await supabase.storage
            .from('whatsapp-files').createSignedUrl(parts[1], 1800);
          if (signed?.signedUrl) mediaUrl = signed.signedUrl;
        }
        const filename = msg.filename || (parts[1] ? parts[1].split('/').pop() : '') || 'file';
        const type = detectMediaType(filename, msg.file_type);
        const caption = (type === 'audio' || type === 'sticker') ? undefined : (msg.message_text ?? undefined);
        await driver.sendMedia({
          token: config.token, to: msg.phone, mediaUrl,
          type, caption, fileName: filename,
        });
      } else {
        await driver.sendText({ token: config.token, to: msg.phone, text: msg.message_text });
      }
      await supabase.from('messages').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', msg.id);
      sent = 1;
    } catch (err: any) {
      await supabase.from('messages').update({ status: 'failed', error_message: String(err?.message ?? err).slice(0, 500) }).eq('id', msg.id);
      failed = 1;
    }

    const { count: remaining } = await supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('status', 'queued');

    return json({ success: true, processed: 1, sent, failed, moreRemaining: (remaining ?? 0) > 0 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
