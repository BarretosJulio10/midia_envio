import { GRAPH, graphFetch } from "./types.ts";
import type { SocialDriver, SocialAccount, PublishInput, PublishResult } from "./types.ts";

export class FacebookDriver implements SocialDriver {
  slug = 'meta-facebook';
  platform = 'facebook' as const;

  async publish({ account, mediaUrl, mediaType, caption }: PublishInput): Promise<PublishResult> {
    const pageId = account.page_id;
    if (!pageId) throw new Error('Conta do Facebook sem page_id configurado');
    const token = account.access_token;
    if (!token) throw new Error('Conta do Facebook sem access token');

    const form = new URLSearchParams();
    form.set('access_token', token);

    if (mediaType === 'text' || !mediaUrl) {
      form.set('message', caption ?? '');
      const r = await graphFetch(`${GRAPH}/${pageId}/feed`, { method: 'POST', body: form });
      return { externalId: String(r.id) };
    }

    if (mediaType === 'video') {
      form.set('file_url', mediaUrl);
      if (caption) form.set('description', caption);
      const r = await graphFetch(`${GRAPH}/${pageId}/videos`, { method: 'POST', body: form });
      return { externalId: String(r.id ?? r.post_id) };
    }

    form.set('url', mediaUrl);
    if (caption) form.set('caption', caption);
    const r = await graphFetch(`${GRAPH}/${pageId}/photos`, { method: 'POST', body: form });
    return { externalId: String(r.post_id ?? r.id) };
  }

  async checkToken(account: SocialAccount) {
    if (!account.page_id || !account.access_token) {
      return { ok: false, message: 'Faltam page_id ou access token' };
    }
    try {
      const r = await graphFetch(
        `${GRAPH}/${account.page_id}?fields=name,id&access_token=${encodeURIComponent(account.access_token)}`,
      );
      return { ok: true, message: `Conectado à página "${r.name}"` };
    } catch (e: any) {
      return { ok: false, message: String(e?.message ?? e) };
    }
  }
}
