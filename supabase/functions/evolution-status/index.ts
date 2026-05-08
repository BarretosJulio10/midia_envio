/**
 * Edge Function: evolution-status
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
      .from('evolution_config')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (!config) throw new Error('Configuração não encontrada');

    const fzapUrl = (Deno.env.get('EVOLUTION_API_URL') ?? config.base_url ?? '').replace(/\/$/, '');
    const instanceToken = config.token;
    if (!fzapUrl || !instanceToken) {
      throw new Error('Configurações de API incompletas (URL/Token)');
    }

    // 1. Status
    const statusRes = await fetch(`${fzapUrl}/session/status`, {
      headers: { 'token': instanceToken },
    });
    const statusText = await statusRes.text();
    let statusJson: any = {}; try { statusJson = JSON.parse(statusText); } catch {}
    const isLoggedIn  = statusJson?.data?.loggedIn === true;
    const isConnected = statusJson?.data?.connected === true;
    console.log(`[Fzap Status] ${statusRes.status} loggedIn=${isLoggedIn} connected=${isConnected}`);

    let qrCode = config.qr_code ?? "";

    // 2. QR (somente se ainda não logado)
    if (!isLoggedIn) {
      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        headers: { 'token': instanceToken },
      });
      const qrText = await qrRes.text();
      let qrJson: any = {}; try { qrJson = JSON.parse(qrText); } catch {}
      const code = qrJson?.data?.QRCode ?? qrJson?.data?.qrcode ?? qrJson?.data?.QR ?? qrJson?.data?.qr ?? "";
      console.log(`[Fzap Status] /session/qr ${qrRes.status} len=${code.length} connected=${isConnected} raw=${qrText.substring(0, 200)}`);

      if (code && code.length > 50) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
      } else if (!isConnected) {
        // CRITICAL: só re-conectar se o websocket caiu.
        // Chamar /session/connect enquanto connected=true RESETA a geração do QR
        // a cada poll e o QR nunca chega a ser emitido (spec linha 3714).
        console.log(`[Fzap Status] websocket caído — disparando /session/connect`);
        await fetch(`${fzapUrl}/session/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'token': instanceToken },
          body: JSON.stringify({ immediate: true }),
        }).catch(err => console.warn('[Fzap Status] reconnect err:', err));
      } else {
        console.log(`[Fzap Status] connected=true, QR vazio — aguardando emissão (não re-conectar)`);
      }
    }

    const connection_status = isLoggedIn ? 'connected' : (isConnected ? 'connecting' : 'disconnected');

    await supabase.from('evolution_config').update({
      connection_status,
      qr_code: isLoggedIn ? null : qrCode,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      connected: isLoggedIn, // só consideramos "conectado" quando logado
      loggedIn: isLoggedIn,
      qrCode: isLoggedIn ? null : qrCode,
      status: connection_status,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Fzap Status Error]:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
