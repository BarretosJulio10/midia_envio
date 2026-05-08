import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadActiveDriver } from "../_shared/drivers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const logs: string[] = [];
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Não autorizado');

    const { data: config } = await supabase.from('fzap_config').select('*').eq('user_id', user.id).maybeSingle();
    if (!config?.token) throw new Error('Instância não configurada');

    const { driver, slug } = await loadActiveDriver();
    logs.push(`Driver ativo: ${slug}`);

    const result = await driver.getStatus({ instanceName: config.instance_id, token: config.token });
    logs.push(...result.logs);

    const status = result.loggedIn ? 'connected' : (result.connected ? 'connecting' : 'disconnected');
    await supabase.from('fzap_config').update({
      connection_status: status,
      qr_code: result.loggedIn ? null : result.qrCode,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      connected: result.loggedIn,
      loggedIn: result.loggedIn,
      qrCode: result.loggedIn ? null : result.qrCode,
      status,
      driver: slug,
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message, logs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
