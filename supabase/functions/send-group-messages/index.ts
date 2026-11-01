import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadActiveDriver, loadDriverBySlug } from "../_shared/drivers/index.ts";
import { detectMediaType } from "../_shared/media-type.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A FZap devolve 502 "WhatsApp number lookup returned no response" quando não
// consegue resolver o destino. O texto bruto não diz o que fazer, então a
// orientação vai junto do erro salvo na fila.
const describeGroupError = (raw: string) =>
  /lookup returned no response/i.test(raw)
    ? `${raw} — o destino do grupo não foi reconhecido. Verifique se o WhatsApp está conectado ` +
      'e se a conta participa do grupo.'
    : raw;

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

    const { driver } = config.driver_slug
      ? await loadDriverBySlug(config.driver_slug)
      : await loadActiveDriver();
    const token = config.token;

    // Mensagem presa em 'sending' (função anterior encerrada à força, ex.: CPU
    // ou tempo esgotado) nunca chega ao catch. Cada chamada envia só 1 mensagem
    // (bem menos de 150s); começou há mais de 3 min ou sem horário: morreu.
    const staleBefore = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await supabase.from('group_messages')
      .update({
        status: 'failed',
        error_message: 'Envio interrompido no servidor (tempo de processamento esgotado). Use "Reenviar falhas".',
      })
      .eq('user_id', user.id).eq('status', 'sending')
      .or(`sending_started_at.is.null,sending_started_at.lt.${staleBefore}`);

    // UMA mensagem por chamada. Antes o servidor enviava o lote inteiro com as
    // esperas de 10–50s entre mensagens dentro da mesma chamada; isso passava
    // do limite de 150s da Edge Function (HTTP 504) e a tela parava de enviar.
    // Agora quem faz as esperas e a pausa de segurança é o painel, entre chamadas.
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let msg: any = null;
    for (let tries = 0; tries < 3 && !msg; tries++) {
      const { data: next } = await supabase.from('group_messages').select('*')
        .eq('user_id', user.id).eq('status', 'queued')
        .order('created_at', { ascending: true }).order('ordering_index', { ascending: true })
        .limit(1);
      if (!next?.length) break;
      // Reserva atômica: só fica com a mensagem se ela ainda estava na fila
      // (evita envio duplicado com duas abas abertas).
      const { data: claimed } = await supabase.from('group_messages')
        .update({ status: 'sending', attempts: (next[0].attempts ?? 0) + 1, sending_started_at: new Date().toISOString() })
        .eq('id', next[0].id).eq('status', 'queued')
        .select('*');
      if (claimed?.length) msg = claimed[0];
    }

    const countQueued = async () => {
      const { count } = await supabase.from('group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'queued');
      return count ?? 0;
    };

    if (!msg) return json({ success: true, processed: 0, sent: 0, failed: 0, moreRemaining: false, remaining: 0, message: 'Fila vazia' });

    let sent = 0, failed = 0, errorMessage: string | null = null;
    // Toda linha de group_messages tem grupo como destino: garante o JID completo,
    // inclusive para listas antigas salvas sem o sufixo.
    const to = msg.group_id.includes('@') ? msg.group_id : `${msg.group_id}@g.us`;
    let note: string | null = null;
    try {
      if (msg.image_url) {
        const urlParts = msg.image_url.split('/whatsapp-files/');
        const filePath = urlParts[1];
        if (!filePath) throw new Error('Endereço do arquivo inválido');
        const { data: signed } = await supabase.storage.from('whatsapp-files').createSignedUrl(filePath, 1800);
        if (!signed?.signedUrl) throw new Error('Arquivo não encontrado no storage (pode ter sido apagado)');
        const filename = msg.file_name || filePath.split('/').pop() || 'file';
        const type = detectMediaType(filename, msg.file_type);
        console.log(
          `[send-group-messages] media id=${msg.id} file_type=${msg.file_type ?? 'null'} ` +
          `filename=${filename} detectedType=${type}`,
        );
        const caption = (type === 'audio' || type === 'sticker') ? '' : (msg.caption ?? '');
        await driver.sendMedia({
          token, to, mediaUrl: signed.signedUrl, type,
          caption, fileName: filename,
        });
      } else if (msg.message_type === 'menu') {
        let rows: Array<{ title: string }> = [];
        try { rows = typeof msg.menu_choices === 'string' ? JSON.parse(msg.menu_choices) : (msg.menu_choices ?? []); } catch { rows = []; }
        rows = rows.filter((r) => r?.title);
        if (!rows.length) throw new Error('Menu sem opções');
        const text = msg.caption || 'Confira as opções abaixo:';
        const fallback = () => driver.sendText({
          token, to,
          text: `${text}\n\n${rows.map((r, i) => `${i + 1}. ${r.title}`).join('\n')}${msg.footer_text ? `\n\n_${msg.footer_text}_` : ''}`,
        });
        if (typeof driver.sendList !== 'function') {
          await fallback();
          note = 'API ativa não suporta lista: enviado como texto numerado';
        } else {
          try {
            await driver.sendList({ token, to, text, buttonText: msg.list_button || 'Ver opções', footer: msg.footer_text || undefined, rows });
          } catch (e: any) {
            if (!/sendList 403/.test(String(e?.message))) throw e;
            await fallback();
            note = 'Plano Fzap sem botões/listas (403): enviado como texto numerado';
          }
        }
      } else if (msg.caption) {
        await driver.sendText({ token, to, text: msg.caption });
      }

      await supabase.from('group_messages').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: note }).eq('id', msg.id);
      sent = 1;
    } catch (err: any) {
      const raw = String(err?.message ?? err);
      errorMessage = describeGroupError(raw).slice(0, 500);
      await supabase.from('group_messages')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', msg.id);
      failed = 1;
    }

    const remaining = await countQueued();
    return json({
      success: true, processed: 1, sent, failed, error: errorMessage,
      group: msg.group_name ?? null, moreRemaining: remaining > 0, remaining,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
