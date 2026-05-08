/**
 * Edge Function: evolution-create-instance
 * Spec Fzap v1.23.0 — fluxo oficial:
 *  1. GET  /admin/users           → Authorization: <ADMIN_TOKEN>   (lookup por nome; retorna id+token)
 *  2. POST /admin/users           → cria se não existir            (resposta inclui id e token COMPLETO)
 *  3. POST /session/connect       → token: <USER_TOKEN>, body {immediate:true}
 *  4. GET  /session/qr (polling)  → token: <USER_TOKEN>, lê data.QRCode (já vem "data:image/png;base64,...")
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

    const { instance_name } = await req.json();
    if (!instance_name) throw new Error('Nome da instância é obrigatório');

    const fzapUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
    const adminToken = Deno.env.get('global_apikay');
    if (!fzapUrl || !adminToken) {
      throw new Error('EVOLUTION_API_URL ou global_apikay não configurados');
    }
    log(`Início: instance_name=${instance_name} fzapUrl=${fzapUrl} adminToken_len=${adminToken.length}`);

    // ============================================================
    // 1. RESOLVER USER → tentar achar; se não houver, criar.
    // Spec: GET /admin/users retorna data: [{ id, name, token, ... }]
    // ============================================================
    let instanceToken = "";
    let instanceId = "";

    const listRes = await fetch(`${fzapUrl}/admin/users`, {
      method: 'GET',
      headers: { 'Authorization': adminToken },
    });
    const listText = await listRes.text();
    log(`GET /admin/users → ${listRes.status} (${listText.length} bytes) sample=${listText.substring(0,200)}`);

    let listData: any = {};
    try { listData = JSON.parse(listText); } catch {}

    const users = Array.isArray(listData?.data) ? listData.data : [];
    const existing = users.find((u: any) => u?.name === instance_name);

    if (existing && existing.token && existing.token.length > 4) {
      instanceToken = existing.token;
      instanceId = existing.id ?? "";
      log(`User existente: id=${instanceId} token_len=${instanceToken.length}`);
    } else {
      // Não existe → criar conforme spec POST /admin/users
      const newToken = Math.random().toString(36).substring(2, 14).toUpperCase() +
                       Math.random().toString(36).substring(2, 8).toUpperCase();
      log(`Criando novo user: name=${instance_name}`);
      const createRes = await fetch(`${fzapUrl}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
        body: JSON.stringify({ name: instance_name, token: newToken }),
      });
      const createText = await createRes.text();
      log(`POST /admin/users → ${createRes.status}: ${createText.substring(0, 400)}`);

      if (!createRes.ok) {
        throw new Error(`Falha ao criar user na Fzap (${createRes.status}): ${createText.substring(0, 200)}`);
      }
      const createData = JSON.parse(createText);
      instanceToken = createData?.data?.token ?? newToken;
      instanceId = createData?.data?.id ?? "";
      log(`User criado: id=${instanceId} token_len=${instanceToken.length}`);
    }

    if (!instanceToken || instanceToken.length < 5) {
      throw new Error(`Token da instância inválido (len=${instanceToken.length})`);
    }

    // ============================================================
    // 2. STATUS — decidir se precisa logout e/ou connect
    // ============================================================
    const statusRes = await fetch(`${fzapUrl}/session/status`, {
      headers: { 'token': instanceToken },
    });
    const statusText = await statusRes.text();
    let statusJson: any = {}; try { statusJson = JSON.parse(statusText); } catch {}
    const alreadyLoggedIn = statusJson?.data?.loggedIn === true;
    const alreadyConnected = statusJson?.data?.connected === true;
    log(`/session/status → ${statusRes.status} loggedIn=${alreadyLoggedIn} connected=${alreadyConnected} raw=${statusText.substring(0,250)}`);

    if (alreadyLoggedIn) {
      log(`Forçando logout para regenerar QR`);
      const lo = await fetch(`${fzapUrl}/session/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      }).catch((e) => { log(`logout err: ${e.message}`); return null; });
      if (lo) log(`/session/logout → ${lo.status}`);
      await new Promise(r => setTimeout(r, 1500));
    }

    // ============================================================
    // 3. POST /session/connect — APENAS se websocket não estiver ativo.
    // Spec (linha 3714): chamar connect novamente reinicia o socket e
    // invalida o QR em geração. Por isso só chamamos quando precisamos.
    // ============================================================
    if (!alreadyConnected || alreadyLoggedIn) {
      log(`POST /session/connect (immediate:true)`);
      const connectRes = await fetch(`${fzapUrl}/session/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'token': instanceToken },
        body: JSON.stringify({ immediate: true }),
      });
      const connectText = await connectRes.text();
      log(`/session/connect → ${connectRes.status}: ${connectText.substring(0, 400)}`);

      if (!connectRes.ok) {
        throw new Error(`Falha em /session/connect (${connectRes.status}): ${connectText.substring(0, 200)}`);
      }
    } else {
      log(`Socket já conectado — pulando /session/connect (evita resetar QR)`);
    }

    // ============================================================
    // 4. POLLING /session/qr → data.QRCode (spec oficial)
    // QR é assíncrono. Polling generoso: 20 × 2s = 40s.
    // ============================================================
    let qrCode = "";
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const qrRes = await fetch(`${fzapUrl}/session/qr`, {
        headers: { 'token': instanceToken },
      });
      const qrText = await qrRes.text();
      let qrJson: any = {}; try { qrJson = JSON.parse(qrText); } catch {}
      // Spec pode usar QRCode (maiúsculo) mas alguns builds usam qrcode/QR
      const code = qrJson?.data?.QRCode ?? qrJson?.data?.qrcode ?? qrJson?.data?.QR ?? qrJson?.data?.qr ?? "";
      log(`QR ${i+1}/25 HTTP=${qrRes.status} len=${code.length} keys=${Object.keys(qrJson?.data ?? {}).join(',')} raw=${qrText.substring(0, 200)}`);
      if (code && code.length > 50) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        log(`✓ QR obtido na tentativa ${i+1}`);
        break;
      }
    }

    // ============================================================
    // 5. SALVAR NO BANCO
    // ============================================================
    await supabase.from('evolution_config').upsert({
      user_id: user.id,
      instance_id: instance_name,
      token: instanceToken,
      base_url: fzapUrl,
      connection_status: 'connecting',
      qr_code: qrCode,
      instance_created: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      success: true,
      message: qrCode ? 'QR Code gerado!' : 'Instância criada. Aguardando QR Code (polling do front)...',
      qrCode,
      instance_id: instance_name,
      token_len: instanceToken.length,
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Fzap Error]:', error.message);
    log(`ERROR: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
