// Interface universal de drivers de redes sociais.
export type SocialPlatform = 'facebook' | 'instagram';

export type SocialAccount = {
  id: string;
  platform: SocialPlatform;
  name: string;
  company_ref: string;
  page_id: string | null;
  ig_user_id: string | null;
  access_token: string;
};

export type PublishInput = {
  account: SocialAccount;
  mediaUrl?: string | null;
  mediaType: 'image' | 'video' | 'text';
  caption?: string | null;
};

export type PublishResult = { externalId: string };

export interface SocialDriver {
  slug: string;
  platform: SocialPlatform;
  publish(input: PublishInput): Promise<PublishResult>;
  checkToken(account: SocialAccount): Promise<{ ok: boolean; message: string }>;
}

export const GRAPH = 'https://graph.facebook.com/v21.0';

export async function graphFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok || body?.error) {
    const msg = body?.error?.message || body?.raw || `HTTP ${res.status}`;
    throw new Error(`Meta API ${res.status}: ${msg}`);
  }
  return body;
}
