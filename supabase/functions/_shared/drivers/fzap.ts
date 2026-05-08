// Fzap driver (legacy — uses /session, /chat/send, header "token")
import type { WhatsAppDriver, DriverCreds, DriverStatus, SendMediaInput } from "./types.ts";

export class FzapDriver implements WhatsAppDriver {
  slug = 'fzap';
  constructor(private creds: DriverCreds) {}
  private url(p: string) { return `${this.creds.baseUrl}${p}`; }

  async createInstance({ instanceName, userId }: { instanceName: string; userId: string }) {
    const logs: string[] = [];
    const instanceToken = `token-${userId.substring(0, 8)}`;
    logs.push(`[fzap] create ${instanceName}`);
    await fetch(this.url('/instance/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.creds.apiKey },
      body: JSON.stringify({ name: instanceName, token: instanceToken }),
    }).catch(() => {});
    await fetch(this.url('/session/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      body: JSON.stringify({ immediate: true }),
    }).catch(() => {});
    return { token: instanceToken, logs };
  }

  async getStatus({ token }: { instanceName: string; token: string }): Promise<DriverStatus & { logs: string[] }> {
    const logs: string[] = [];
    const sr = await fetch(this.url('/session/status'), { headers: { 'token': token } });
    if (!sr.ok) return { connected: false, loggedIn: false, qrCode: null, logs };
    const sj = await sr.json();
    const loggedIn = sj?.data?.loggedIn === true;
    const connected = sj?.data?.connected === true;
    let qrCode: string | null = null;
    if (!loggedIn) {
      const qr = await fetch(this.url('/session/qr'), { headers: { 'token': token } });
      if (qr.ok) {
        const qj = await qr.json();
        const code = qj?.data?.qr ?? qj?.data?.Qrcode ?? qj?.data?.QRCode ?? '';
        if (code) qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
      }
    }
    return { connected, loggedIn, qrCode, logs };
  }

  async resetInstance({ token }: { instanceName: string; token: string }) {
    await fetch(this.url('/session/logout'), { method: 'POST', headers: { 'token': token } }).catch(() => {});
  }

  async sendText({ token, to, text }: { token: string; to: string; text: string }) {
    const r = await fetch(this.url('/chat/send/text'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': token },
      body: JSON.stringify({ phone: to, body: text }),
    });
    if (!r.ok) throw new Error(`fzap sendText ${r.status}: ${await r.text()}`);
  }

  async sendMedia(p: SendMediaInput) {
    const path = p.type === 'sticker' ? '/chat/send/sticker'
      : p.type === 'image' ? '/chat/send/image'
      : p.type === 'video' ? '/chat/send/video'
      : p.type === 'audio' ? '/chat/send/audio'
      : '/chat/send/document';
    const body: any = { phone: p.to, caption: p.caption ?? '', fileName: p.fileName };
    if (p.type === 'sticker') body.sticker = p.mediaUrl;
    else if (p.type === 'image') body.image = p.mediaUrl;
    else if (p.type === 'video') body.video = p.mediaUrl;
    else if (p.type === 'audio') body.audio = p.mediaUrl;
    else body.document = p.mediaUrl;
    const r = await fetch(this.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': p.token },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`fzap sendMedia ${r.status}: ${await r.text()}`);
  }

  async fetchGroups({ token }: { token: string }) {
    const r = await fetch(this.url('/group/list'), { headers: { 'token': token } });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : [];
    return arr.map((g: any) => ({
      id: g.id || g.JID || g.jid,
      name: g.name || g.subject || 'Sem nome',
      participants: g.participantsCount || g.participants?.length || 0,
    }));
  }
}
