
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
    // Conforme Spec: POST /session/connect com header token: <session_token>
    console.log(`[Master] Iniciando sessão para: ${instance_name}`);
    const connectRes = await fetch(`${fzapUrl}/session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken
      },
      body: JSON.stringify({ immediate: true }), // immediate: true para não travar o worker enquanto aguarda conexao
    });

    const connectData = await connectRes.json();
    console.log(`[Master] Resposta Connect:`, JSON.stringify(connectData));

    // 3. POLLING INTERNO PARA CAPTURAR PRIMEIRO QR CODE
    // Conforme Spec: Poll GET /session/qr até data.QRCode ser não-vazio
    let qrCode = "";
    console.log(`[Master] Buscando primeiro QR Code (polling estendido)...`);
    
    // Aumentado para 15 tentativas (30 segundos total) pois o QR pode demorar para ser gerado pela Fzap
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); 
      
      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        method: 'GET',
        headers: {
          'token': instanceToken
        },
      });

      if (qrRes.ok) {
        const qrData = await qrRes.json();
        console.log(`[Master] Tentativa ${i+1} de buscar QR:`, qrData.data?.QRCode ? "Encontrado" : "Vazio");
        
        let code = qrData.data?.QRCode ?? "";
        if (code && code.length > 50) {
          if (!code.startsWith('data:image')) {
            code = `data:image/png;base64,${code}`;
          }
          qrCode = code;
          break; 
        }
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
