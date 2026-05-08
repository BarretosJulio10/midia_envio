// Test connection for active driver (Evolution Go / Fzap / Evolution API)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadActiveDriver } from "../_shared/drivers/index.ts";

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

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: config } = await supabase
      .from('fzap_config')
      .select('instance_id, token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!config?.instance_id || !config?.token) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Configure e conecte sua instância primeiro.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { driver, slug } = await loadActiveDriver();
    const status = await driver.getStatus({ instanceName: config.instance_id, token: config.token });

    const ok = status.loggedIn === true;
    return new Response(JSON.stringify({
      success: true,
      connected: ok,
      driver: slug,
      message: ok
        ? `✅ Conectado via ${slug} (loggedIn=true)`
        : `⚠️ Instância existe (${slug}) mas não autenticada. Escaneie o QR.`,
      logs: status.logs ?? [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[test-connection]', error);
    return new Response(JSON.stringify({ success: false, message: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
