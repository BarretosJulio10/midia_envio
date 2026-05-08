/**
 * Edge Function: fzap-status
 * Spec Fzap v1.23.0:
 *   GET /session/status → data.loggedIn / data.connected
 *   GET /session/qr     → data.QRCode (string completa "data:image/png;base64,...")
 * Se loggedIn=false e QRCode vazio, dispara POST /session/connect para reabrir o socket.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const logs: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString().substring(11, 23)}] ${msg}`;
    console.log(line);
    logs.push(line);
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Sem header de autorização');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) throw new Error('Não autorizado');

    const { data: config } = await supabase
      .from('fzap_config')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (!config) throw new Error('Configuração não encontrada');

    const fzapUrl = (Deno.env.get('FZAP_API_URL') ?? config.base_url ?? '').replace(/\/$/, '');
    const instanceToken = config.token;
    if (!fzapUrl || !instanceToken) {
      throw new Error('Configurações de API incompletas (URL/Token)');
    }
    log(`token_len=${instanceToken.length} fzapUrl=${fzapUrl}`);

    // 1. Status
    const statusRes = await fetch(`${fzapUrl}/session/status`, {
      headers: { 'token': instanceToken, 'Cache-Control': 'no-cache' },
    });
    const statusText = await statusRes.text();
    let statusJson: any = {}; try { statusJson = JSON.parse(statusText); } catch {}
    const isLoggedIn  = statusJson?.data?.loggedIn === true;
    const isConnected = statusJson?.data?.connected === true;
    log(`/session/status ${statusRes.status} ct=${statusRes.headers.get('content-type') ?? '-'} loggedIn=${isLoggedIn} connected=${isConnected} body=${statusText.substring(0, 250)}`);

    let qrCode = config.qr_code ?? "";

    // 2. QR (somente se ainda não logado)
    if (!isLoggedIn) {
      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        headers: { 'token': instanceToken, 'Cache-Control': 'no-cache' },
      });
      const qrText = await qrRes.text();
      let qrJson: any = {}; try { qrJson = JSON.parse(qrText); } catch {}
      // Spec linha 4122: campo é estritamente `data.QRCode` (case-sensitive). Sem fallbacks.
      const code = qrJson?.data?.QRCode ?? "";
      log(`/session/qr ${qrRes.status} ct=${qrRes.headers.get('content-type') ?? '-'} QRCode_len=${code.length} body=${qrText.substring(0, 200)}`);

      if (code && code.length > 50) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        log(`✓ QR pronto (len=${qrCode.length})`);
      } else if (!isConnected || qrRes.status >= 500) {
       // Spec: se connected=true mas QRCode está vazio, a sessão está em "starting".
       // Se connected=false, chamamos connect.
       if (!isConnected) {
         log(`WebSocket desconectado (connected=false) — chamando /session/connect`);
         const reconnect = await fetch(`${fzapUrl}/session/connect`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'token': instanceToken },
           body: JSON.stringify({ immediate: true }),
         }).catch(err => { log(`reconnect err: ${err.message}`); return null; });
         if (reconnect) log(`/session/connect → ${reconnect.status}`);
       } else {
         log(`Aguardando QR ser gerado (connected=true, QRCode="")`);
       }
     }
    }

    const connection_status = isLoggedIn ? 'connected' : (isConnected ? 'connecting' : 'disconnected');

    await supabase.from('fzap_config').update({
      connection_status,
      qr_code: isLoggedIn ? null : qrCode,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      connected: isLoggedIn,
      loggedIn: isLoggedIn,
      qrCode: isLoggedIn ? null : qrCode,
      status: connection_status,
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
