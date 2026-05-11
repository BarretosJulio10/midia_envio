// Fzap driver — OpenAPI v1.23.0
// Auth: Authorization (admin token) for /admin/*; token header for user endpoints.
// QR endpoint returns data.QRCode already as `data:image/png;base64,...`.
import type { WhatsAppDriver, DriverCreds, DriverStatus, SendMediaInput } from "./types.ts";

export class FzapDriver implements WhatsAppDriver {
  slug = 'fzap';
  constructor(private creds: DriverCreds) {}
  private url(p: string) { return `${this.creds.baseUrl}${p}`; }
  private adminHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': this.creds.apiKey };
  }
  private userHeaders(token: string) {
    return { 'Content-Type': 'application/json', 'token': token };
  }

  async createInstance({ instanceName, userId }: { instanceName: string; userId: string }) {
    const logs: string[] = [];
    const log = (m: string) => logs.push(`[fzap] ${m}`);
    const instanceToken = `tk-${userId.substring(0, 12)}`;

    log(`POST /admin/users name=${instanceName}`);
    const cr = await fetch(this.url('/admin/users'), {
      method: 'POST',
      headers: this.adminHeaders(),
      body: JSON.stringify({ name: instanceName, token: instanceToken, expiration: 0 }),
    });
    log(`-> ${cr.status}`);
    if (cr.status >= 500) {
      log(`erro admin: ${(await cr.text()).slice(0, 200)}`);
    }

    log(`POST /session/connect immediate=true`);
    const co = await fetch(this.url('/session/connect'), {
      method: 'POST',
      headers: this.userHeaders(instanceToken),
      body: JSON.stringify({ immediate: true }),
    });
    log(`-> ${co.status}`);

    return { token: instanceToken, logs };
  }

  async getStatus({ token }: { instanceName: string; token: string }): Promise<DriverStatus & { logs: string[] }> {
    const logs: string[] = [];
    const log = (m: string) => logs.push(`[fzap] ${m}`);

    const sr = await fetch(this.url('/session/status'), { headers: this.userHeaders(token) });
    if (sr.status === 401 || sr.status === 404) {
      log(`status ${sr.status} — instância inválida`);
      return { connected: false, loggedIn: false, qrCode: null, logs };
    }
    if (!sr.ok) {
      log(`status ${sr.status}`);
      return { connected: false, loggedIn: false, qrCode: null, logs };
    }
    const sj = await sr.json();
    const d = sj?.data ?? {};
    const loggedIn = d.loggedIn === true;
    const connected = d.connected === true;
    log(`loggedIn=${loggedIn} connected=${connected}`);

    if (loggedIn) return { connected, loggedIn, qrCode: null, logs };

    // se não está conectado, força reanimação do socket antes de pedir QR
    if (!connected) {
      log(`reanimando socket via /session/connect`);
      await fetch(this.url('/session/connect'), {
        method: 'POST', headers: this.userHeaders(token), body: JSON.stringify({ immediate: true }),
      }).catch(() => {});
    }

    const qr = await fetch(this.url('/session/qr'), { headers: this.userHeaders(token) });
    let qrCode: string | null = null;
    if (qr.ok) {
      const qj = await qr.json();
      const qd = qj?.data ?? {};
      const code = qd.QRCode ?? qd.qrCode ?? qd.qr ?? '';
      if (code) {
        qrCode = code.startsWith('data:image') ? code : `data:image/png;base64,${code}`;
        log(`QR obtido (${code.length} chars)`);
      } else {
        log(`QR ainda vazio`);
      }
    } else {
      log(`qr ${qr.status}`);
    }
    return { connected, loggedIn, qrCode, logs };
  }

  async resetInstance({ token }: { instanceName: string; token: string }) {
    const r = await fetch(this.url('/session/logout'), {
      method: 'POST', headers: this.userHeaders(token),
    }).catch(() => null);
    if (!r || !r.ok) {
      await fetch(this.url('/session/disconnect'), {
        method: 'POST', headers: this.userHeaders(token),
      }).catch(() => {});
    }
    await fetch(this.url('/session/reset'), {
      method: 'POST', headers: this.userHeaders(token),
    }).catch(() => {});
  }

  async sendText({ token, to, text }: { token: string; to: string; text: string }) {
    const r = await fetch(this.url('/chat/send/text'), {
      method: 'POST',
      headers: this.userHeaders(token),
      body: JSON.stringify({ phone: to, body: text, check: true }),
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`fzap sendText ${r.status}: ${txt.slice(0, 300)}`);
    // HTTP 200 com success:false também é falha real
    try {
      const j = JSON.parse(txt);
      if (j && j.success === false) {
        throw new Error(`fzap sendText recusou: ${j.error || j.message || txt.slice(0, 200)}`);
      }
    } catch (_e) { /* body não-JSON: ignora */ }
  }

  async sendMedia(p: SendMediaInput) {
    const map: Record<string, { path: string; field: string }> = {
      image:    { path: '/chat/send/image',    field: 'image' },
      video:    { path: '/chat/send/video',    field: 'video' },
      audio:    { path: '/chat/send/audio',    field: 'audio' },
      document: { path: '/chat/send/document', field: 'document' },
      sticker:  { path: '/chat/send/sticker',  field: 'sticker' },
    };
    const m = map[p.type] ?? map.document;
    const body: Record<string, unknown> = { phone: p.to, [m.field]: p.mediaUrl, check: true };

    if (p.caption && p.type !== 'audio' && p.type !== 'sticker') {
      body.caption = p.caption;
    }
    if (p.type === 'document') {
      // Spec OpenAPI: campo oficial é `fileName`.
      body.fileName = p.fileName || 'file';
    }
    if (p.type === 'audio') {
      // PTT (voice message) com waveform automática (spec /chat/send/audio).
      body.ptt = true;
    }

    const r = await fetch(this.url(m.path), {
      method: 'POST',
      headers: this.userHeaders(p.token),
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`fzap sendMedia(${p.type}) ${r.status}: ${txt.slice(0, 200)}`);
    try {
      const j = JSON.parse(txt);
      if (j && j.success === false) {
        throw new Error(`fzap sendMedia(${p.type}) recusou: ${j.error || j.message || txt.slice(0, 200)}`);
      }
    } catch (_e) { /* body não-JSON: ignora */ }
  }

  async checkNumber({ token, phone }: { token: string; phone: string }): Promise<{ exists: boolean; jid: string | null }> {
    const r = await fetch(this.url('/user/check'), {
      method: 'POST',
      headers: this.userHeaders(token),
      body: JSON.stringify({ phone: [phone] }),
    });
    if (!r.ok) {
      // Em caso de falha do check (ex: 5xx), não bloqueia — devolve "exists" indefinido como true
      // para não derrubar todo o envio se o endpoint estiver indisponível.
      return { exists: true, jid: null };
    }
    const j = await r.json().catch(() => null) as any;
    const users = j?.data?.users;
    if (!Array.isArray(users) || users.length === 0) return { exists: false, jid: null };
    const u = users[0];
    const exists = u?.isInWhatsapp === true || u?.found === true;
    const jid = typeof u?.jid === 'string' && u.jid ? u.jid : null;
    return { exists, jid };
  }

  async fetchGroups({ token }: { token: string }) {
    const r = await fetch(this.url('/group/list'), { headers: this.userHeaders(token) });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j?.data?.groups) ? j.data.groups
      : Array.isArray(j?.data) ? j.data
      : Array.isArray(j) ? j : [];
    return arr.map((g: any) => ({
      id: g.jid || g.JID || g.id,
      name: g.name || g.subject || 'Sem nome',
      participants: Array.isArray(g.participants) ? g.participants.length
        : (g.participantsCount ?? 0),
    }));
  }

  async testConnection() {
    try {
      const r = await fetch(this.url('/admin/users'), { headers: this.adminHeaders() });
      return { ok: r.status < 500 && r.status !== 401, message: `HTTP ${r.status}` };
    } catch (e: any) { return { ok: false, message: e.message }; }
  }
}
