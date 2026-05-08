import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { WhatsAppDriver, DriverCreds } from "./types.ts";
import { EvolutionGoDriver } from "./evolution-go.ts";
import { FzapDriver } from "./fzap.ts";
import { EvolutionApiDriver } from "./evolution-api.ts";

export async function loadActiveDriver(): Promise<{ driver: WhatsAppDriver; slug: string; creds: DriverCreds }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('api_drivers')
    .select('slug, base_url, api_key, config')
    .eq('is_active', true)
    .eq('enabled', true)
    .maybeSingle();

  if (error || !data) throw new Error('Nenhum driver ativo configurado em api_drivers');
  if (!data.base_url) throw new Error(`Driver "${data.slug}" sem base_url configurada`);

  const creds: DriverCreds = { baseUrl: data.base_url, apiKey: data.api_key, config: data.config ?? {} };
  return { driver: getDriver(data.slug, creds), slug: data.slug, creds };
}

export function getDriver(slug: string, creds: DriverCreds): WhatsAppDriver {
  switch (slug) {
    case 'evolution-go':  return new EvolutionGoDriver(creds);
    case 'fzap':          return new FzapDriver(creds);
    case 'evolution-api': return new EvolutionApiDriver(creds);
    default: throw new Error(`Driver desconhecido: ${slug}`);
  }
}
