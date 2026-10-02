// Template HTML unico do e-mail. Copia identica em supabase/functions/_shared/email-template.ts
// (mantenha os dois arquivos sincronizados): o que aparece na previa e o que o cliente recebe.
export type EmailContent = {
  subject: string;
  bodyText: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  fromName?: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : null);

export function buildEmailHtml(c: EmailContent): string {
  const img = safeUrl(c.imageUrl);
  const btnUrl = safeUrl(c.buttonUrl);
  const btnText = (c.buttonText ?? "").trim();
  const body = esc(c.bodyText ?? "").replace(/\r?\n/g, "<br>");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject ?? "")}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
${img ? `<tr><td style="padding:0 0 20px 0;"><img src="${esc(img)}" alt="${esc(c.subject ?? "Imagem")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:8px;"></td></tr>` : ""}
${body ? `<tr><td style="font-size:16px;line-height:1.6;padding:0 4px 24px 4px;">${body}</td></tr>` : ""}
${btnUrl && btnText ? `<tr><td align="center" style="padding:0 0 28px 0;"><a href="${esc(btnUrl)}" target="_blank" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px;">${esc(btnText)}</a></td></tr>` : ""}
${c.fromName ? `<tr><td style="font-size:12px;color:#9ca3af;padding-top:12px;border-top:1px solid #e5e7eb;">Enviado por ${esc(c.fromName)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

export function buildEmailText(c: EmailContent): string {
  const parts = [c.bodyText ?? ""];
  const btn = safeUrl(c.buttonUrl);
  if (btn && c.buttonText) parts.push(`${c.buttonText}: ${btn}`);
  return parts.filter(Boolean).join("\n\n");
}

export const EMAIL_RE = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]{2,}$/;
