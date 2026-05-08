import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDriver } from "../_shared/drivers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Não autorizado');

    const { driver_id } = await req.json();
    const { data: d } = await supabase.from('api_drivers').select('*').eq('id', driver_id).maybeSingle();
    if (!d) throw new Error('Driver não encontrado');

    const driver = getDriver(d.slug, { baseUrl: d.base_url, apiKey: d.api_key, config: d.config ?? {} });
    const result = driver.testConnection ? await driver.testConnection() : { ok: true, message: 'sem testConnection — assumido OK' };
    return new Response(JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
