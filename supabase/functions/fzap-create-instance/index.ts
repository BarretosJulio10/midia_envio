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
    const evogoUrl = "https://evogo.pagoupix.com.br";
    const apiKey = "006763caee95f33088ebc5ac90ce975ef1c62a2622271937450fe9254635a97f";
    const instanceToken = `token-${user.id.substring(0, 8)}`; // Token único por usuário

    log(`Iniciando conexão Evolution Go para: ${instance_name}`);

    // 1. Garantir que a instância existe (tentar criar)
    log(`Tentando criar instância: ${instance_name}`);
    const createRes = await fetch(`${evogoUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({ name: instance_name, token: instanceToken }),
    });
    
    const createData = await createRes.json();
    log(`Resposta create: ${JSON.stringify(createData)}`);

    // 2. Iniciar conexão (gerar QR)
    log(`Chamando /instance/connect...`);
    const connectRes = await fetch(`${evogoUrl}/instance/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': instanceToken },
      body: JSON.stringify({ immediate: true }),
    });

    const connectData = await connectRes.json();
    log(`Resposta connect: ${JSON.stringify(connectData)}`);

    // 3. Salvar no banco
    await supabase.from('fzap_config').upsert({
      user_id: user.id,
      instance_id: instance_name,
      token: instanceToken,
      base_url: evogoUrl,
      connection_status: 'connecting',
      instance_created: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão iniciada. O QR Code será exibido em instantes.',
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
