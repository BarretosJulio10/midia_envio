// Evolution Go (Evogo) driver — https://evogo.pagoupix.com.br
import type { WhatsAppDriver, DriverCreds, DriverStatus, SendMediaInput } from "./types.ts";

export class EvolutionGoDriver implements WhatsAppDriver {
  slug = 'evolution-go';
  constructor(private creds: DriverCreds) {}

  private url(path: string) { return `${this.creds.baseUrl}${path}`; }

  async createInstance({ instanceName, userId }: { instanceName: string; userId: string }) {
    const logs: string[] = [];
    const log = (m: string) => logs.push(`[evogo] ${m}`);
    const instanceToken = `token-${userId.substring(0, 8)}`;

    log(`create instance: ${instanceName}`);
    const cr = await fetch(this.url('/instance/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.creds.apiKey },
      body: JSON.stringify({ name: instanceName, token: instanceToken }),
    });
    log(`create -> ${cr.status}`);

    log(`connect (subscribe QRCODE/CONNECTION/MESSAGE)`);
    const co = await fetch(this.url('/instance/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': instanceToken },
      body: JSON.stringify({
        immediate: true, phone: '',
        subscribe: ['QRCODE', 'CONNECTION', 'MESSAGE'],
        webhookUrl: '',
      }),
    });
    log(`connect -> ${co.status}`);

    return { token: instanceToken, logs };
  }

  async getStatus({ token }: { instanceName: string; token: string }): Promise<DriverStatus & { logs: string[] }> {
    const logs: string[] = [];
    const log = (m: string) => logs.push(`[evogo] ${m}`);

    const sr = await fetch(this.url('/instance/status'), {
      headers: { 'apikey': token, 'Cache-Control': 'no-cache' },
    });
    if (sr.status === 401 || sr.status === 400) {
      log(`status ${sr.status} — sessão expirada`);
      return { connected: false, loggedIn: false, qrCode: null, logs };
    }
    const sj = await sr.json();
    // API oficial retorna PascalCase (data.LoggedIn / data.Connected); manter fallback
    const d = sj?.data ?? {};
    const loggedIn = d.LoggedIn === true || d.loggedIn === true;
    const connected = d.Connected === true || d.connected === true;
    log(`status loggedIn=${loggedIn} connected=${connected}`);

    let qrCode: string | null = null;
    if (!loggedIn) {
      const qr = await fetch(this.url('/instance/qr'), {
        headers: { 'apikey': token, 'Cache-Control': 'no-cache' },
      });
      const qj = await qr.json();
      const qd = qj?.data ?? {};
      const code = qd.Qrcode ?? qd.qrcode ?? qd.QRCode ?? qd.qr ?? qd.base64 ?? '';
      if (code) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        log(`QR obtido`);
      } else {
        log(`sem QR; reanimando`);
        await fetch(this.url('/instance/connect'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': token },
          body: JSON.stringify({
            immediate: true, phone: '',
            subscribe: ['QRCODE', 'CONNECTION', 'MESSAGE'], webhookUrl: '',
          }),
        });
      }
    }
    return { connected, loggedIn, qrCode, logs };
  }

  async resetInstance({ token }: { instanceName: string; token: string }) {
    await fetch(this.url('/instance/logout'), {
      method: 'POST',
      headers: { 'apikey': token },
    }).catch(() => {});
    await fetch(this.url('/instance/disconnect'), {
      method: 'POST',
      headers: { 'apikey': token },
    }).catch(() => {});
  }

  async sendText({ token, to, text }: { token: string; to: string; text: string }) {
    const r = await fetch(this.url('/send/text'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': token },
      body: JSON.stringify({ number: to, text, delay: 0 }),
    });
    if (!r.ok) throw new Error(`evogo sendText ${r.status}: ${await r.text()}`);
  }

  async sendMedia(p: SendMediaInput) {
    const isSticker = p.type === 'sticker';
    const endpoint = isSticker ? '/send/sticker' : '/send/media';
    const body: Record<string, unknown> = {
      number: p.to,
      url: p.mediaUrl,
      caption: p.caption ?? '',
      delay: 0,
    };
    if (!isSticker) body.type = p.type; // image|video|audio|document
    const r = await fetch(this.url(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': p.token },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`evogo sendMedia ${r.status}: ${await r.text()}`);
  }

  async fetchGroups({ token }: { token: string }) {
    const r = await fetch(this.url('/group/list'), { headers: { 'apikey': token } });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : Array.isArray(j.groups) ? j.groups : [];
    return arr.map((g: any) => ({
      id: g.id || g.JID || g.jid,
      name: g.name || g.subject || 'Sem nome',
      participants: g.participantsCount || g.participants?.length || 0,
    }));
  }

  async testConnection() {
    try {
      const r = await fetch(this.url('/instance/status'), { headers: { 'apikey': this.creds.apiKey } });
      return { ok: r.status < 500, message: `HTTP ${r.status}` };
    } catch (e: any) { return { ok: false, message: e.message }; }
  }
}
