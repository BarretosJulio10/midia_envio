import { createClient } from "npm:@supabase/supabase-js@2";
import { buildEmailHtml, buildEmailText, EMAIL_RE } from "../_shared/email-template.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sendResend(from: string, to: string, c: any) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: c.subject, html: buildEmailHtml(c), text: buildEmailText(c) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `Resend ${r.status}`);
  return d.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { action, campaign } = await req.json().catch(() => ({}));
    const { data: cfg } = await admin.from("email_config").select("*").eq("user_id", user.id).maybeSingle();
    const from = cfg?.from_email ? (cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email) : null;
    const delay = {
      min: cfg?.delay_min ?? 3000, max: cfg?.delay_max ?? 8000,
      pauseAfter: cfg?.pause_after ?? 50, pauseDuration: cfg?.pause_duration ?? 60000,
    };

    if (action === "send_test") {
      if (!from) return json({ error: "Configure o remetente nas configurações de e-mail" }, 400);
      if (!campaign?.subject) return json({ error: "Assunto obrigatório" }, 400);
      const to = user.email!;
      await sendResend(from, to, { ...campaign, fromName: cfg?.from_name });
      return json({ ok: true, to });
    }

    if (action === "retry") {
      await admin.from("email_messages").update({ status: "queued", error_message: null })
        .eq("user_id", user.id).eq("status", "failed");
      return json({ ok: true });
    }

    if (action === "send_next") {
      if (!from) return json({ error: "Configure o remetente nas configurações de e-mail" }, 400);
      const { data: msg } = await admin.from("email_messages").select("*")
        .eq("user_id", user.id).eq("status", "queued").order("created_at").limit(1).maybeSingle();
      if (!msg) return json({ ok: true, moreRemaining: false, delay });

      const email = msg.to_email.trim().toLowerCase();
      const { data: bl } = await admin.from("email_blacklist").select("id")
        .eq("user_id", user.id).eq("email", email).maybeSingle();
      if (bl || !EMAIL_RE.test(email)) {
        await admin.from("email_messages").update({
          status: bl ? "blocked" : "failed", error_message: bl ? "E-mail na blacklist" : "E-mail inválido",
        }).eq("id", msg.id);
      } else {
        await admin.from("email_messages").update({ status: "sending" }).eq("id", msg.id);
        const { data: camp } = await admin.from("email_campaigns").select("*").eq("id", msg.campaign_id).single();
        try {
          const id = await sendResend(from, email, {
            subject: camp.subject, bodyText: camp.body_text, imageUrl: camp.image_url,
            buttonText: camp.button_text, buttonUrl: camp.button_url, fromName: cfg?.from_name,
            template: camp.template, title: camp.title, accentColor: camp.accent_color,
          });
          await admin.from("email_messages").update({ status: "sent", resend_id: id, sent_at: new Date().toISOString() }).eq("id", msg.id);
        } catch (e) {
          await admin.from("email_messages").update({ status: "failed", error_message: (e as Error).message }).eq("id", msg.id);
        }
      }
      const { count } = await admin.from("email_messages").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "queued");
      return json({ ok: true, moreRemaining: (count ?? 0) > 0, delay });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
