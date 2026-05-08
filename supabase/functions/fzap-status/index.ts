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
    
    if (!config || !config.token) throw new Error('Instância não configurada');

    const evogoUrl = "https://evogo.pagoupix.com.br";
    const instanceToken = config.token;
    
    log(`Verificando status na Evolution Go...`);

    // 1. Status
    const statusRes = await fetch(`${evogoUrl}/instance/status`, {
      headers: { 'apikey': instanceToken, 'Cache-Control': 'no-cache' },
    });
    
    if (statusRes.status === 401 || statusRes.status === 400) {
      log(`Sessão não encontrada ou expirada (HTTP ${statusRes.status}).`);
      return new Response(JSON.stringify({
        success: true,
        connected: false,
        loggedIn: false,
        qrCode: null,
        status: 'disconnected',
        logs
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const statusJson = await statusRes.json();
    const isLoggedIn  = statusJson?.data?.loggedIn === true;
    const isConnected = statusJson?.data?.connected === true;
    log(`Status: loggedIn=${isLoggedIn} connected=${isConnected}`);

    let qrCode = config.qr_code ?? "";

    // 2. QR Code (se não logado)
    if (!isLoggedIn) {
      const qrRes = await fetch(`${evogoUrl}/instance/qr`, {
        headers: { 'apikey': instanceToken, 'Cache-Control': 'no-cache' },
      });
      const qrJson = await qrRes.json();
      const code = qrJson?.data?.Qrcode ?? ""; // Note: Qrcode com Q maiúsculo no retorno da API
      
      if (code) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        log(`✓ QR Code obtido`);
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
