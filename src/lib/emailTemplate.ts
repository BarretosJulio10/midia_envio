// Template HTML unico do e-mail. Copia identica em supabase/functions/_shared/email-template.ts
// (mantenha os dois arquivos sincronizados): o que aparece na previa e o que o cliente recebe.
export type EmailTemplateId = "promo" | "newsletter" | "launch" | "event" | "minimal";

export const EMAIL_TEMPLATES: { id: EmailTemplateId; name: string; description: string }[] = [
  { id: "promo", name: "Promoção", description: "Faixa colorida, imagem grande e botão de destaque" },
  { id: "newsletter", name: "Newsletter", description: "Cabeçalho com a empresa, título e texto" },
  { id: "launch", name: "Lançamento", description: "Fundo escuro elegante, título grande" },
  { id: "event", name: "Evento / Convite", description: "Cartão centralizado tipo convite" },
  { id: "minimal", name: "Minimalista", description: "Fundo branco, limpo e direto" },
];

export type EmailContent = {
  subject: string;
  bodyText: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  fromName?: string | null;
  template?: EmailTemplateId | string | null;
  title?: string | null;
  accentColor?: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : null);
const safeColor = (c?: string | null) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#0d9488");

const FONT = "font-family:Arial,Helvetica,sans-serif;";

export function buildEmailHtml(c: EmailContent): string {
  const tpl = (EMAIL_TEMPLATES.some((t) => t.id === c.template) ? c.template : "minimal") as EmailTemplateId;
  const accent = safeColor(c.accentColor);
  const img = safeUrl(c.imageUrl);
  const btnUrl = safeUrl(c.buttonUrl);
  const btnText = (c.buttonText ?? "").trim();
  const title = esc((c.title ?? "").trim());
  const body = esc(c.bodyText ?? "").replace(/\r?\n/g, "<br>");
  const company = esc((c.fromName ?? "").trim());
  const dark = tpl === "launch";

  const pageBg = { promo: "#f3f4f6", newsletter: "#eef2f7", launch: "#0b0f19", event: "#f5f0e8", minimal: "#ffffff" }[tpl];
  const cardBg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#e5e7eb" : "#374151";
  const head = dark ? "#ffffff" : "#111827";
  const muted = dark ? "#9ca3af" : "#9ca3af";
  const btnBg = dark ? "#ffffff" : accent;
  const btnColor = dark ? "#111827" : "#ffffff";
  const center = tpl === "event" || tpl === "launch" || tpl === "promo";
  const align = center ? "center" : "left";
  const titleSize = tpl === "launch" ? 34 : tpl === "promo" ? 30 : 26;
  const radius = tpl === "minimal" ? 0 : 12;

  const imgRow = img
    ? `<tr><td style="padding:${tpl === "promo" || tpl === "newsletter" ? "0" : "24px 24px 0 24px"};"><img src="${esc(img)}" alt="${esc(c.title || c.subject || "Imagem")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;${tpl === "promo" || tpl === "newsletter" ? "" : "border-radius:8px;"}"></td></tr>`
    : "";

  const header = tpl === "promo"
    ? `<tr><td align="center" style="background:${accent};padding:14px 24px;${FONT}color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${company || "Oferta especial"}</td></tr>`
    : tpl === "newsletter"
      ? `<tr><td style="padding:20px 24px;border-bottom:3px solid ${accent};${FONT}font-size:20px;font-weight:bold;color:${head};">${company || "Novidades"}</td></tr>`
      : tpl === "event"
        ? `<tr><td align="center" style="padding:28px 24px 0 24px;${FONT}font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${accent};font-weight:bold;">Você está convidado</td></tr>`
        : tpl === "launch"
          ? `<tr><td align="center" style="padding:28px 24px 0 24px;${FONT}font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${accent};font-weight:bold;">Lançamento</td></tr>`
          : "";

  const titleRow = title
    ? `<tr><td align="${align}" style="padding:28px 32px 8px 32px;${FONT}font-size:${titleSize}px;line-height:1.2;font-weight:bold;color:${head};">${title}</td></tr>`
    : "";
  const bodyRow = body
    ? `<tr><td align="${align}" style="padding:${title ? "8px" : "28px"} 32px 24px 32px;${FONT}font-size:16px;line-height:1.6;color:${text};">${body}</td></tr>`
    : "";
  const btnRow = btnUrl && btnText
    ? `<tr><td align="${align}" style="padding:4px 32px 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${btnBg};border-radius:${tpl === "minimal" ? 4 : 8}px;"><a href="${esc(btnUrl)}" target="_blank" style="display:inline-block;padding:${tpl === "promo" ? "16px 40px" : "14px 30px"};${FONT}font-size:16px;font-weight:bold;color:${btnColor};text-decoration:none;">${esc(btnText)}</a></td></tr></table></td></tr>`
    : "";
  const footer = `<tr><td align="center" style="padding:20px 24px;border-top:1px solid ${dark ? "#1f2937" : "#e5e7eb"};${FONT}font-size:12px;color:${muted};">${company ? `Enviado por ${company}` : ""}</td></tr>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject ?? "")}</title></head>
<body style="margin:0;padding:0;background:${pageBg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${pageBg};">
<tr><td align="center" style="padding:${tpl === "minimal" ? "16px 8px" : "28px 12px"};">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${cardBg};border-radius:${radius}px;overflow:hidden;${tpl === "event" ? `border:2px solid ${accent};` : ""}">
${header}${imgRow}${titleRow}${bodyRow}${btnRow}${footer}
</table></td></tr></table></body></html>`;
}

export function buildEmailText(c: EmailContent): string {
  const parts = [c.title ?? "", c.bodyText ?? ""];
  const btn = safeUrl(c.buttonUrl);
  if (btn && c.buttonText) parts.push(`${c.buttonText}: ${btn}`);
  return parts.filter(Boolean).join("\n\n");
}

export const EMAIL_RE = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]{2,}$/;
