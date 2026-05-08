import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadActiveDriver } from "../_shared/drivers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Não autorizado');

    const { data: config } = await supabase.from('fzap_config').select('*').eq('user_id', user.id).maybeSingle();
    if (!config?.token) throw new Error('Instância não conectada');

    const { driver } = await loadActiveDriver();
    const token = config.token;

    const { data: allMessages } = await supabase.from('group_messages').select('*')
      .eq('user_id', user.id).eq('status', 'queued')
      .order('created_at', { ascending: true }).order('ordering_index', { ascending: true });

    if (!allMessages?.length) return new Response(JSON.stringify({ success: true, message: 'Fila vazia' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const delayMin = config.delay_min || 10000;
    const delayMax = config.delay_max || 30000;
    const safeBatch = Math.max(1, Math.min(config.pause_after || 5, 10));
    const batch = allMessages.slice(0, safeBatch);
    let sent = 0, failed = 0;

    for (let i = 0; i < batch.length; i++) {
      const msg = batch[i];
      try {
        await supabase.from('group_messages').update({ status: 'sending', attempts: msg.attempts + 1 }).eq('id', msg.id);

        if (msg.image_url) {
          const urlParts = msg.image_url.split('/whatsapp-files/');
          const filePath = urlParts[1];
          const { data: signed } = await supabase.storage.from('whatsapp-files').createSignedUrl(filePath, 1800);
          const filename = msg.file_name || filePath.split('/').pop() || 'file';
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          let type: any = 'document';
          if (msg.file_type === 'sticker') type = 'sticker';
          else if (['jpg','jpeg','png','webp','gif'].includes(ext)) type = 'image';
          else if (['mp4','mov','webm','m4v'].includes(ext)) type = 'video';
          else if (['mp3','m4a','wav','ogg','aac','opus'].includes(ext)) type = 'audio';
          await driver.sendMedia({
            token, to: msg.group_id, mediaUrl: signed!.signedUrl, type,
            caption: msg.caption ?? '', fileName: filename,
          });
        } else if (msg.caption) {
          await driver.sendText({ token, to: msg.group_id, text: msg.caption });
        }

        await supabase.from('group_messages').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', msg.id);
        sent++;
      } catch (err: any) {
        await supabase.from('group_messages').update({ status: 'failed', error_message: err.message }).eq('id', msg.id);
        failed++;
      }
      if (i < batch.length - 1) {
        await new Promise(r => setTimeout(r, Math.random() * (delayMax - delayMin) + delayMin));
      }
    }

    return new Response(JSON.stringify({
      success: true, processed: batch.length, sent, failed,
      moreRemaining: allMessages.length > batch.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
