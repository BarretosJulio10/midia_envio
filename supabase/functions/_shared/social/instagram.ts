import { GRAPH, graphFetch } from "./types.ts";
import type { SocialDriver, SocialAccount, PublishInput, PublishResult } from "./types.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class InstagramDriver implements SocialDriver {
  slug = 'meta-instagram';
  platform = 'instagram' as const;

  async publish({ account, mediaUrl, mediaType, caption }: PublishInput): Promise<PublishResult> {
    const igId = account.ig_user_id;
    if (!igId) throw new Error('Conta do Instagram sem ig_user_id configurado');
    const token = account.access_token;
    if (!token) throw new Error('Conta do Instagram sem access token');
    if (!mediaUrl) throw new Error('Instagram exige imagem ou vídeo (não aceita post só de texto)');

    // 1) container
    const form = new URLSearchParams();
    form.set('access_token', token);
    if (caption) form.set('caption', caption);
    if (mediaType === 'video') {
      form.set('media_type', 'REELS');
      form.set('video_url', mediaUrl);
    } else {
      form.set('image_url', mediaUrl);
    }
    const container = await graphFetch(`${GRAPH}/${igId}/media`, { method: 'POST', body: form });
    const creationId = String(container.id);

    // 2) aguarda processamento (vídeo demora)
    const maxTries = mediaType === 'video' ? 30 : 6;
    for (let i = 0; i < maxTries; i++) {
      const st = await graphFetch(
        `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      );
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
        throw new Error(`Instagram falhou ao processar a mídia: ${st.status ?? st.status_code}`);
      }
      await sleep(3000);
    }

    // 3) publica
    const pub = new URLSearchParams();
    pub.set('access_token', token);
    pub.set('creation_id', creationId);
    const r = await graphFetch(`${GRAPH}/${igId}/media_publish`, { method: 'POST', body: pub });
    return { externalId: String(r.id) };
  }

  async checkToken(account: SocialAccount) {
    if (!account.ig_user_id || !account.access_token) {
      return { ok: false, message: 'Faltam ig_user_id ou access token' };
    }
    try {
      const r = await graphFetch(
        `${GRAPH}/${account.ig_user_id}?fields=username,id&access_token=${encodeURIComponent(account.access_token)}`,
      );
      return { ok: true, message: `Conectado ao @${r.username}` };
    } catch (e: any) {
      return { ok: false, message: String(e?.message ?? e) };
    }
  }
}
