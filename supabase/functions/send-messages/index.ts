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

    const { action } = await req.json();
    if (action !== 'start') return new Response(JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: config } = await supabase.from('fzap_config').select('token').eq('user_id', user.id).maybeSingle();
    if (!config?.token) throw new Error('Instância não conectada');

    const { driver } = await loadActiveDriver();

    const { data: messages } = await supabase.from('messages').select('*')
      .eq('user_id', user.id).eq('status', 'queued').limit(10);

    if (!messages?.length) return new Response(JSON.stringify({ success: true, message: 'Fila vazia' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    for (const msg of messages) {
      try {
        await supabase.from('messages').update({ status: 'sending' }).eq('id', msg.id);
        if (msg.file_url) {
          // Gera signed URL para o arquivo no bucket privado (igual ao group sender)
          let mediaUrl = msg.file_url;
          const parts = msg.file_url.split('/whatsapp-files/');
          if (parts[1]) {
            const { data: signed } = await supabase.storage
              .from('whatsapp-files').createSignedUrl(parts[1], 1800);
            if (signed?.signedUrl) mediaUrl = signed.signedUrl;
          }
          const filename = msg.filename || (parts[1] ? parts[1].split('/').pop() : '') || 'file';
          const type = detectMediaType(filename);
          const caption = (type === 'audio' || type === 'sticker') ? undefined : (msg.message_text ?? undefined);
          await driver.sendMedia({
            token: config.token, to: msg.phone, mediaUrl,
            type, caption, fileName: filename,
          });
        } else {
          await driver.sendText({ token: config.token, to: msg.phone, text: msg.message_text });
        }
        await supabase.from('messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', msg.id);
      } catch (err: any) {
        await supabase.from('messages').update({ status: 'failed', error_message: err.message }).eq('id', msg.id);
      }
    }
    return new Response(JSON.stringify({ success: true, processed: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
