
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

    // 1. CRIAR INSTÂNCIA (ADMIN)
    const generatedToken = Math.random().toString(36).substring(2, 14).toUpperCase();
    console.log(`[Master] Criando usuário: ${instance_name} com token: ${generatedToken}`);

    const createRes = await fetch(`${fzapUrl}/admin/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': adminToken 
      },
      body: JSON.stringify({ name: instance_name, token: generatedToken }),
    });

    const createData = await createRes.json();
    console.log(`[Master] Resposta Create:`, JSON.stringify(createData));

    if (!createRes.ok) throw new Error(`Falha ao criar usuário na Fzap: ${JSON.stringify(createData)}`);

    const instanceToken = createData.data?.token ?? generatedToken;

    // 2. INICIAR SESSÃO (CONNECT)
    // Conforme Spec Fzap v1.23.0: POST /session/connect com header token: <session_token>
    // immediate:false faz o servidor Fzap aguardar até 10s pela conexão WhatsApp,
    // dando tempo para o QR ser gerado antes mesmo do nosso polling começar.
    console.log(`[Master] Iniciando sessão para: ${instance_name}`);
    const connectRes = await fetch(`${fzapUrl}/session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken
      },
      body: JSON.stringify({ immediate: false }),
    });

    const connectData = await connectRes.json();
    console.log(`[Master] Resposta Connect:`, JSON.stringify(connectData));

    // 3. POLLING INTERNO PARA CAPTURAR PRIMEIRO QR CODE
    // Conforme Spec: Poll GET /session/qr até data.QRCode ser não-vazio.
    // Tentativa robusta para múltiplos formatos de resposta (QRCode, qrcode, qr, base64).
    let qrCode = "";
    console.log(`[Master] Buscando primeiro QR Code (polling estendido)...`);
    
    // 20 tentativas × 2s = 40s de polling. Fzap geralmente emite em 3-15s.
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); 
      
      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        method: 'GET',
        headers: {
          'token': instanceToken
        },
      });

      if (qrRes.ok) {
        const qrText = await qrRes.text();
        let qrData: any = {};
        try { qrData = JSON.parse(qrText); } catch { /* keep empty */ }

        // Fzap padrão: data.QRCode (uppercase Q,R,C). Fallbacks defensivos:
        let code = 
          qrData?.data?.QRCode ?? 
          qrData?.data?.qrcode ?? 
          qrData?.data?.qr ?? 
          qrData?.data?.base64 ??
          qrData?.QRCode ?? 
          qrData?.qrcode ?? 
          "";

        console.log(`[Master] Tentativa ${i+1}: ${code ? `QR len=${code.length}` : "vazio"} | resp=${qrText.substring(0, 120)}`);

        if (code && code.length > 50) {
          if (!code.startsWith('data:image')) {
            code = `data:image/png;base64,${code}`;
          }
          qrCode = code;
          break; 
        }
      } else {
        const errText = await qrRes.text();
        console.warn(`[Master] Tentativa ${i+1} HTTP ${qrRes.status}: ${errText.substring(0, 150)}`);
      }
    }

    // 4. SALVAR NO BANCO
    await supabase.from('evolution_config').upsert({
      user_id: user.id,
      instance_id: instance_name,
      token: instanceToken,
      base_url: fzapUrl,
      connection_status: 'connecting',
      qr_code: qrCode,
      instance_created: true,
      updated_at: new Date().toISOString()
    });

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
