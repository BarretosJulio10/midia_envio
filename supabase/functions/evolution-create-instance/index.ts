
/**
 * Edge Function: evolution-create-instance (Master Fullstack Edition)
 * Fluxo: Admin Create -> Session Connect -> QR Polling -> DB Upsert
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { instance_name } = await req.json();
    if (!instance_name) throw new Error('Nome da instância é obrigatório');

    const fzapUrl = Deno.env.get('EVOLUTION_API_URL');
    const adminToken = Deno.env.get('global_apikay');

    if (!fzapUrl || !adminToken) {
      throw new Error('EVOLUTION_API_URL ou global_apikay não configurados');
    }

    // 1. CRIAR INSTÂNCIA (ADMIN) — reaproveita user existente se já houver
    let instanceToken = "";
    const generatedToken = Math.random().toString(36).substring(2, 14).toUpperCase();

    // Verifica se o user já existe pelo nome
    const listRes = await fetch(`${fzapUrl}/admin/users`, {
      method: 'GET',
      headers: { 'Authorization': adminToken },
    });
    // Para garantir que temos um token válido e completo, vamos deletar o user se existir e criar um novo.
    // O endpoint /admin/users da Fzap muitas vezes retorna tokens mascarados (e.g. "abc***").
    console.log(`[Master] Forçando recriação de usuário para garantir token íntegro: ${instance_name}`);
    
    // Tenta deletar se existir (ignora erro se não existir)
    await fetch(`${fzapUrl}/admin/users/${instance_name}`, {
      method: 'DELETE',
      headers: { 'Authorization': adminToken },
    }).catch(() => {});

    // Criar novo usuário com o token gerado
    const createRes = await fetch(`${fzapUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
      body: JSON.stringify({ name: instance_name, token: generatedToken }),
    });
    
    const createData = await createRes.json().catch(() => ({}));
    console.log(`[Master] Resposta Create:`, JSON.stringify(createData));
    
    if (!createRes.ok) {
      // Se falhar o create (ex: user ainda existe), tentamos usar o generatedToken como fallback
      console.warn(`[Master] Falha ao criar user, usando token gerado como fallback`);
      instanceToken = generatedToken;
    } else {
      instanceToken = createData.data?.token ?? generatedToken;
    }
    
    console.log(`[Master] Token definido (len=${instanceToken.length})`);

    // 2. CHECAR STATUS — se já logado, força LOGOUT para gerar novo QR
    const preStatusRes = await fetch(`${fzapUrl}/session/status`, {
      method: 'GET', headers: { 'token': instanceToken }
    });
    if (preStatusRes.ok) {
      const pre = await preStatusRes.json().catch(() => ({}));
      console.log(`[Master] Pre-status:`, JSON.stringify(pre?.data || pre));
      if (pre?.data?.loggedIn === true) {
        console.log('[Master] Instância já logada — forçando LOGOUT para gerar novo QR');
        await fetch(`${fzapUrl}/session/logout`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'token': instanceToken },
        }).catch(() => {});
      }
    }

    // 3. INICIAR SESSÃO (CONNECT) — immediate:true retorna rápido; QR é assíncrono
    console.log(`[Master] Iniciando sessão para: ${instance_name}`);
    const connectRes = await fetch(`${fzapUrl}/session/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      body: JSON.stringify({}),
    });
    const connectData = await connectRes.json().catch(() => ({}));
    console.log(`[Master] Resposta Connect (${connectRes.status}):`, JSON.stringify(connectData));

    // Se já logado pelo connect (sessão antiga reusada), força logout + novo connect
    if (connectData?.data?.loggedIn === true) {
      console.log('[Master] Connect retornou loggedIn — logout + reconnect');
      await fetch(`${fzapUrl}/session/logout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      await fetch(`${fzapUrl}/session/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': instanceToken },
        body: JSON.stringify({}),
      }).catch(() => {});
    }

    // 4. POLLING DO QR CODE conforme spec oficial Fzap v1.23.0
    // Spec: GET /session/qr → data.QRCode (uppercase Q,R,C) já vem como
    // string completa "data:image/png;base64,..." pronta para <img src=...>.
    // Polling: 15 tentativas × 2s = 30s. QR é assíncrono após /connect.
    let qrCode = "";
    console.log(`[Master] Iniciando polling QR (token=${instanceToken.substring(0,4)}***, url=${fzapUrl}/session/qr)`);

    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        method: 'GET',
        headers: { 'token': instanceToken },
      });

      const qrText = await qrRes.text().catch(() => "");
      let qrData: any = {};
      try { qrData = JSON.parse(qrText); } catch { /* ignore parse */ }

      // Spec oficial: data.QRCode. Fallbacks defensivos para variações.
      let code =
        qrData?.data?.QRCode ??
        qrData?.data?.qrCode ??
        qrData?.data?.qrcode ??
        qrData?.data?.qr ??
        qrData?.QRCode ??
        qrData?.qrCode ??
        "";

      const sessionStatus = qrData?.data?.sessionStatus ?? qrData?.data?.status ?? "?";
      // SEMPRE logar o raw (primeiros 300 chars) — sem isso é impossível
      // diagnosticar quando o QR vem vazio com HTTP 200.
      console.log(`[Master] QR ${i+1}/15 HTTP=${qrRes.status} status=${sessionStatus} len=${code?.length || 0} raw=${qrText.substring(0, 300)}`);

      if (code && code.length > 50) {
        if (!code.startsWith('data:image')) {
          code = `data:image/png;base64,${code}`;
        }
        qrCode = code;
        console.log(`[Master] QR Code obtido na tentativa ${i+1}`);
        break;
      }
    }

    if (!qrCode) {
      console.error('[Master] QR Code não obtido após 15 tentativas (30s)');
    }

    // 5. SALVAR NO BANCO — onConflict obrigatório para evitar duplicatas
    await supabase.from('evolution_config').upsert({
      user_id: user.id,
      instance_id: instance_name,
      token: instanceToken,
      base_url: fzapUrl,
      connection_status: 'connecting',
      qr_code: qrCode,
      instance_created: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return new Response(
      JSON.stringify({
        success: true,
        message: qrCode ? 'Instância pronta!' : 'Instância criada. Aguardando QR Code...',
        qrCode: qrCode,
        instance_id: instance_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Master Error]:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
