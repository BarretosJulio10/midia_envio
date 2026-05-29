// Fzap driver — OpenAPI v1.23.0
// Auth: Authorization (admin token) for /admin/*; token header for user endpoints.
// QR endpoint returns data.QRCode already as `data:image/png;base64,...`.
import type { WhatsAppDriver, DriverCreds, DriverStatus, SendMediaInput } from "./types.ts";
import { convertToStickerWebp, isWebpBytes, bytesToBase64 } from "../sticker-convert.ts";

export class FzapDriver implements WhatsAppDriver {
  slug = 'fzap';
  constructor(private creds: DriverCreds) {}
  private url(p: string) { return `${this.creds.baseUrl}${p}`; }
  private isWebp(bytes: Uint8Array) {
    return (
      bytes.length > 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  }
  private bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  private detectStickerMime(bytes: Uint8Array, headerMime?: string | null) {
    if (this.isWebp(bytes)) return 'image/webp';
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes.length > 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
    const normalized = (headerMime || '').split(';')[0].trim().toLowerCase();
    if (normalized.startsWith('image/') || normalized.startsWith('video/')) return normalized;
    return null;
  }
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
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { /* body não-JSON */ }
    if (parsed && parsed.success === false) {
      throw new Error(`fzap sendText recusou: ${parsed.error || parsed.message || txt.slice(0, 200)}`);
    }
  }

  async sendMedia(p: SendMediaInput) {
    if (p.type === 'sticker') {
      console.log(`[fzap-sticker] start to=${p.to} mediaUrl=${p.mediaUrl.slice(0, 80)}...`);

      // 1) Baixa o arquivo original do storage
      const fileRes = await fetch(p.mediaUrl);
      if (!fileRes.ok) {
        throw new Error(`fzap sendMedia(sticker) download ${fileRes.status}`);
      }
      const original = new Uint8Array(await fileRes.arrayBuffer());
      const originalCT = fileRes.headers.get('content-type') || 'unknown';
      console.log(`[fzap-sticker] downloaded bytes=${original.length} content-type=${originalCT}`);

      // 2) Converte SEMPRE para WEBP 512x512 transparente (server-side, magick-wasm)
      let webp: Uint8Array;
      try {
        const conv = await convertToStickerWebp(original);
        webp = conv.bytes;
        console.log(
          `[fzap-sticker] converted inputMime=${conv.log.inputDetected} ` +
          `inputSize=${conv.log.inputSize} outputSize=${conv.log.outputSize} ` +
          `${conv.log.width}x${conv.log.height}`,
        );
      } catch (e: any) {
        console.error(`[fzap-sticker] conversion failed: ${e?.message || e}`);
        throw new Error(`fzap sendMedia(sticker) conversão falhou: ${e?.message || e}`);
      }

      // 3) Validação dos magic bytes WEBP
      if (!isWebpBytes(webp)) {
        console.error(`[fzap-sticker] post-conversion buffer is NOT a valid WEBP`);
        throw new Error('fzap sendMedia(sticker): conversão produziu buffer não-WEBP');
      }

      // 4) Monta payload conforme MessageSticker da FZAP v1.23.0
      const dataUrl = `data:image/webp;base64,${bytesToBase64(webp)}`;
      const body = {
        phone: p.to,
        sticker: dataUrl,
        mimeType: 'image/webp',
        check: true,
      };
      console.log(
        `[fzap-sticker] POST /chat/send/sticker mimeType=image/webp ` +
        `payloadBytes=${dataUrl.length} kind=sticker`,
      );

      const r = await fetch(this.url('/chat/send/sticker'), {
        method: 'POST',
        headers: this.userHeaders(p.token),
        body: JSON.stringify(body),
      });
      const txt = await r.text();
      console.log(`[fzap-sticker] FZAP response status=${r.status} body=${txt.slice(0, 400)}`);

      if (!r.ok) {
        throw new Error(`fzap sendMedia(sticker) ${r.status}: ${txt.slice(0, 300)}`);
      }
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch { /* body não-JSON */ }
      if (parsed && parsed.success === false) {
        throw new Error(
          `fzap sendMedia(sticker) recusou: ${parsed.error || parsed.message || txt.slice(0, 200)}`,
        );
      }
      return;
    }

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
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { /* body não-JSON */ }
    if (parsed && parsed.success === false) {
      throw new Error(`fzap sendMedia(${p.type}) recusou: ${parsed.error || parsed.message || txt.slice(0, 200)}`);
    }
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
