// Evolution API (oficial) — https://doc.evolution-api.com
// Endpoints: /instance/create, /instance/connect/{name}, /instance/connectionState/{name}
// /instance/logout/{name}, /message/sendText/{name}, /message/sendMedia/{name}
// /group/fetchAllGroups/{name}
import type { WhatsAppDriver, DriverCreds, DriverStatus, SendMediaInput } from "./types.ts";

export class EvolutionApiDriver implements WhatsAppDriver {
  slug = 'evolution-api';
  constructor(private creds: DriverCreds) {}
  private url(p: string) { return `${this.creds.baseUrl}${p}`; }
  private headers(extra: Record<string, string> = {}) {
    return { 'Content-Type': 'application/json', 'apikey': this.creds.apiKey, ...extra };
  }

  async createInstance({ instanceName }: { instanceName: string; userId: string }) {
    const logs: string[] = [];
    logs.push(`[evo-api] create ${instanceName}`);
    const r = await fetch(this.url('/instance/create'), {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
    const j = await r.json().catch(() => ({}));
    logs.push(`create -> ${r.status}`);
    // Evolution API returns instance.token as Hash apikey or similar — fallback to global
    const token = j?.hash?.apikey || j?.instance?.token || this.creds.apiKey;
    return { token, logs };
  }

  async getStatus({ instanceName, token }: { instanceName: string; token: string }): Promise<DriverStatus & { logs: string[] }> {
    const logs: string[] = [];
    const sr = await fetch(this.url(`/instance/connectionState/${instanceName}`), {
      headers: this.headers({ 'apikey': token }),
    });
    if (!sr.ok) { logs.push(`state ${sr.status}`); return { connected: false, loggedIn: false, qrCode: null, logs }; }
    const sj = await sr.json();
    const state = sj?.instance?.state || sj?.state;
    const loggedIn = state === 'open';
    const connected = state === 'open' || state === 'connecting';
    logs.push(`state=${state}`);

    let qrCode: string | null = null;
    if (!loggedIn) {
      const qr = await fetch(this.url(`/instance/connect/${instanceName}`), {
        headers: this.headers({ 'apikey': token }),
      });
      if (qr.ok) {
        const qj = await qr.json();
        const code = qj?.base64 || qj?.qrcode?.base64 || qj?.qr || '';
        if (code) qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
      }
    }
    return { connected, loggedIn, qrCode, logs };
  }

  async resetInstance({ instanceName, token }: { instanceName: string; token: string }) {
    await fetch(this.url(`/instance/logout/${instanceName}`), {
      method: 'DELETE', headers: this.headers({ 'apikey': token }),
    }).catch(() => {});
  }

  async sendText({ token, to, text }: { token: string; to: string; text: string }) {
    // For evolution-api the instance name should be in the URL but we don't have it here.
    // Use config.instanceName fallback or pass via creds.config — left as TODO; for now expect
    // callers using evolution-api to set token === instanceName for routing.
    const instance = (this.creds.config as any)?.instanceName || token;
    const r = await fetch(this.url(`/message/sendText/${instance}`), {
      method: 'POST', headers: this.headers({ 'apikey': token }),
      body: JSON.stringify({ number: to, text }),
    });
    if (!r.ok) throw new Error(`evo-api sendText ${r.status}: ${await r.text()}`);
  }

  async sendMedia(p: SendMediaInput) {
    const instance = (this.creds.config as any)?.instanceName || p.token;
    const r = await fetch(this.url(`/message/sendMedia/${instance}`), {
      method: 'POST', headers: this.headers({ 'apikey': p.token }),
      body: JSON.stringify({
        number: p.to,
        mediatype: p.type === 'sticker' ? 'image' : p.type,
        media: p.mediaUrl,
        caption: p.caption ?? '',
        fileName: p.fileName,
      }),
    });
    if (!r.ok) throw new Error(`evo-api sendMedia ${r.status}: ${await r.text()}`);
  }

  async fetchGroups({ token }: { token: string }) {
    const instance = (this.creds.config as any)?.instanceName || token;
    const r = await fetch(this.url(`/group/fetchAllGroups/${instance}?getParticipants=false`), {
      headers: this.headers({ 'apikey': token }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : Array.isArray(j.groups) ? j.groups : [];
    return arr.map((g: any) => ({
      id: g.id, name: g.subject || g.name || 'Sem nome',
      participants: g.size || 0,
    }));
  }
}
