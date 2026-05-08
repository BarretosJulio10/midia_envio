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

    const evogoUrl = "https://evogo.pagoupix.com.br";
    const apiKey = "006763caee95f33088ebc5ac90ce975ef1c62a2622271937450fe9254635a97f";

    // Na Evolution Go, usamos /instance/logout para resetar
    try {
      await fetch(`${evogoUrl}/instance/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      });
    } catch (e) {
      console.error('Erro ao chamar logout na Evolution Go:', e);
    }

    // Limpar no banco
    await supabase.from('fzap_config').update({
      instance_created: false,
      qr_code: null,
      connection_status: 'disconnected',
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Instância desconectada. Gere um novo QR Code para reconectar.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
