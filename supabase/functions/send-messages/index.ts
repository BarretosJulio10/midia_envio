import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { action } = await req.json();
    const evogoUrl = "https://evogo.pagoupix.com.br";
    const apiKey = "006763caee95f33088ebc5ac90ce975ef1c62a2622271937450fe9254635a97f";

    if (action === 'start') {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'queued')
        .limit(10);

      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'Nenhuma mensagem na fila' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      for (const msg of messages) {
        try {
          // Marcar como enviando
          await supabase.from('messages').update({ status: 'sending' }).eq('id', msg.id);

          let endpoint = `${evogoUrl}/send/text`;
          let body: any = {
            to: msg.phone,
            text: msg.message_text
          };

          // Se tiver arquivo, usa endpoint de mídia
          if (msg.file_url) {
            endpoint = `${evogoUrl}/send/media`;
            body = {
              to: msg.phone,
              mediaUrl: msg.file_url,
              type: 'image', // Ajustar conforme necessário
              caption: msg.message_text
            };
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(body)
          });

          if (res.ok) {
            await supabase.from('messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', msg.id);
          } else {
            const errText = await res.text();
            throw new Error(errText);
          }
        } catch (err: any) {
          await supabase.from('messages').update({ status: 'failed', error_message: err.message }).eq('id', msg.id);
        }
      }

      return new Response(JSON.stringify({ success: true, processed: messages.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
