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
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Não autorizado');

    const { data: config } = await supabase.from('fzap_config').select('*').eq('user_id', user.id).maybeSingle();
    if (config?.token) {
      const { driver } = await loadActiveDriver();
      await driver.resetInstance({ instanceName: config.instance_id, token: config.token });
    }
    await supabase.from('fzap_config').update({
      instance_created: false, qr_code: null, connection_status: 'disconnected',
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
