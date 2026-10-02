import { EMAIL_RE } from "@/lib/emailTemplate";

export type EmailList = { id: string; name: string; emails: string[]; created_at: string };

/** Lê CSV/texto com uma coluna de e-mail (com ou sem cabeçalho). */
export function parseEmails(text: string) {
  const raw = text
    .split(/[\r\n;,]+/)
    .map((s) => s.trim().replace(/^"|"$/g, "").toLowerCase())
    .filter((s) => s && s !== "email" && s !== "e-mail");
  const seen = new Set<string>();
  let invalid = 0, duplicated = 0;
  for (const e of raw) {
    if (!EMAIL_RE.test(e) || e.length > 255) { invalid++; continue; }
    if (seen.has(e)) { duplicated++; continue; }
    seen.add(e);
  }
  return { emails: [...seen], invalid, duplicated };
}
