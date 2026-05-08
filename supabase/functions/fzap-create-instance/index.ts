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

    const { instance_name } = await req.json();
    const { driver, slug, creds } = await loadActiveDriver();
    logs.push(`Driver ativo: ${slug}`);

    const { token, logs: dlogs } = await driver.createInstance({ instanceName: instance_name, userId: user.id });
    logs.push(...dlogs);

    await supabase.from('fzap_config').upsert({
      user_id: user.id,
      instance_id: instance_name,
      token,
      base_url: creds.baseUrl,
      driver_slug: slug,
      connection_status: 'connecting',
      instance_created: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ success: true, logs, driver: slug }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    logs.push(`ERROR: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
