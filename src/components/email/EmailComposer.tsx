import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, FlaskConical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import EmailPreview from "./EmailPreview";
import { EMAIL_TEMPLATES, buildEmailHtml, type EmailTemplateId } from "@/lib/emailTemplate";
import { parseEmails, type EmailList } from "./emailLists";
import { loadEmailCfg, type EmailCfg, defaultCfg } from "./EmailConfig";

const db = supabase as any;

const schema = z.object({
  subject: z.string().trim().min(1, "Informe o assunto").max(200, "Assunto até 200 caracteres"),
  bodyText: z.string().max(5000, "Texto até 5000 caracteres"),
  buttonText: z.string().trim().max(60, "Texto do botão até 60 caracteres").optional(),
  buttonUrl: z.string().trim().regex(/^https:\/\/\S+$/, "O link do botão deve começar com https://").optional(),
});

export default function EmailComposer({ listsVersion, onQueued }: { listsVersion: number; onQueued?: () => void }) {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [cfg, setCfg] = useState<EmailCfg>(defaultCfg);
  const [mode, setMode] = useState<"saved" | "new">("saved");
  const [listId, setListId] = useState("");
  const [newEmails, setNewEmails] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [template, setTemplate] = useState<EmailTemplateId>("promo");
  const [title, setTitle] = useState("");
  const [accentColor, setAccentColor] = useState("#0d9488");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [useButton, setUseButton] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [blInput, setBlInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.from("email_lists").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setLists(data ?? []));
  }, [listsVersion]);
  useEffect(() => {
    loadEmailCfg().then(setCfg);
    db.from("email_blacklist").select("email").then(({ data }: any) => setBlacklist((data ?? []).map((d: any) => d.email)));
  }, []);

  const content = {
    subject, bodyText, imageUrl,
    buttonText: useButton ? buttonText : null,
    buttonUrl: useButton ? buttonUrl : null,
    fromName: cfg.from_name,
    template, title, accentColor,
  };

  const onImage = async (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Escolha uma imagem");
    if (f.size > 5 * 1024 * 1024) return toast.error("Imagem até 5MB");
    setUploadingImg(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const path = `${user.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("email-assets").upload(path, f);
      if (error) throw error;
      setImageUrl(supabase.storage.from("email-assets").getPublicUrl(path).data.publicUrl);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const onCsv = async (f?: File | null) => {
    if (!f) return;
    const { emails, invalid, duplicated } = parseEmails(await f.text());
    setNewEmails(emails);
    toast.info(`${emails.length} e-mail(s) válido(s)` + (invalid || duplicated ? ` · ${invalid} inválido(s), ${duplicated} repetido(s)` : ""));
  };

  const addBlacklist = async () => {
    const { emails } = parseEmails(blInput);
    if (emails.length === 0) return toast.error("Nenhum e-mail válido");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await db.from("email_blacklist").upsert(
      emails.map((email) => ({ user_id: user.id, email })), { onConflict: "user_id,email", ignoreDuplicates: true });
    if (error) return toast.error(error.message);
    setBlacklist((b) => [...new Set([...b, ...emails])]);
    setBlInput("");
    toast.success("Adicionado à blacklist de e-mail");
  };

  const removeBlacklist = async (email: string) => {
    await db.from("email_blacklist").delete().eq("email", email);
    setBlacklist((b) => b.filter((x) => x !== email));
  };

  const validate = () => {
    const r = schema.safeParse({
      subject, bodyText,
      buttonText: useButton ? buttonText : undefined,
      buttonUrl: useButton ? buttonUrl : undefined,
    });
    if (!r.success) { toast.error(r.error.errors[0].message); return false; }
    if (useButton && !buttonText.trim()) { toast.error("Informe o texto do botão"); return false; }
    if (title.length > 150) { toast.error("Título até 150 caracteres"); return false; }
    if (!bodyText.trim() && !imageUrl && !title.trim()) { toast.error("Adicione um texto ou uma imagem"); return false; }
    return true;
  };

  const invokeErr = async (error: any) =>
    error instanceof FunctionsHttpError ? await error.context.text() : error?.message;

  const sendTest = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-emails", {
        body: { action: "send_test", campaign: { ...content, buttonText: content.buttonText || null, buttonUrl: content.buttonUrl || null } },
      });
      if (error) throw new Error(await invokeErr(error));
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      toast.success(`Teste enviado para ${data.to}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const enqueue = async () => {
    if (!validate()) return;
    let emails: string[] = [];
    let useListId: string | null = null;
    if (mode === "saved") {
      const l = lists.find((x) => x.id === listId);
      if (!l) return toast.error("Escolha uma lista salva");
      emails = l.emails; useListId = l.id;
    } else {
      emails = newEmails;
      if (emails.length === 0) return toast.error("Suba o CSV com os e-mails");
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (mode === "new" && newName.trim()) {
        const { data: saved, error } = await db.from("email_lists")
          .insert({ user_id: user.id, name: newName.trim().slice(0, 100), emails }).select().single();
        if (error) throw error;
        useListId = saved.id;
      }

      const bl = new Set(blacklist);
      const { data: camp, error: ce } = await db.from("email_campaigns").insert({
        user_id: user.id,
        name: `Campanha ${new Date().toLocaleString("pt-BR")}`,
        subject: subject.trim(), body_text: bodyText, image_url: imageUrl,
        button_text: useButton ? buttonText.trim() : null,
        button_url: useButton ? buttonUrl.trim() : null,
        list_id: useListId, total: emails.length,
        template, title: title.trim() || null, accent_color: accentColor,
      }).select().single();
      if (ce) throw ce;

      const rows = emails.map((to_email) => ({
        user_id: user.id, campaign_id: camp.id, to_email,
        status: bl.has(to_email) ? "blocked" : "queued",
        error_message: bl.has(to_email) ? "E-mail na blacklist" : null,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("email_messages").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      const blocked = rows.filter((r) => r.status === "blocked").length;
      toast.success(`${rows.length - blocked} e-mail(s) na fila` + (blocked ? ` · ${blocked} bloqueado(s)` : ""));
      onQueued?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/50 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Novo disparo de e-mail</CardTitle>
          <CardDescription>Escolha a lista, monte a mensagem e confira a prévia ao lado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lista de destinatários</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="saved" id="m-saved" /><Label htmlFor="m-saved">Usar lista salva</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="new" id="m-new" /><Label htmlFor="m-new">Nova lista</Label></div>
            </RadioGroup>
            {mode === "saved" ? (
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger><SelectValue placeholder={lists.length ? "Escolha uma lista" : "Nenhuma lista salva"} /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.emails.length})</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input type="file" accept=".csv,.txt" onChange={(e) => onCsv(e.target.files?.[0])} />
                {newEmails.length > 0 && <p className="text-xs text-muted-foreground">{newEmails.length} e-mail(s) carregado(s)</p>}
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome para salvar esta lista (opcional)" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modelo do e-mail</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EMAIL_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                  className={`overflow-hidden rounded-md border text-left transition ${template === t.id ? "border-primary ring-2 ring-primary" : "border-border/50 hover:border-primary/60"}`}>
                  <iframe title={t.name} sandbox="" tabIndex={-1} className="pointer-events-none h-28 w-[400%] origin-top-left scale-25 border-0"
                    style={{ transform: "scale(0.25)", height: 448 }}
                    srcDoc={buildEmailHtml({ ...content, template: t.id, title: title || "Seu título aqui", bodyText: bodyText || "Texto da mensagem", buttonText: "Ver oferta", buttonUrl: "https://exemplo.com" })} />
                  <div className="-mt-[336px] border-t border-border/50 bg-card px-2 py-1">
                    <p className="text-xs font-semibold">{t.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{EMAIL_TEMPLATES.find((t) => t.id === template)?.description}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label>Título (destaque)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Ex: 30% OFF só esta semana" />
            </div>
            <div className="space-y-1">
              <Label>Cor principal</Label>
              <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-16 p-1" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Ex: Oferta especial para você" />
          </div>

          <div className="space-y-1">
            <Label>Imagem</Label>
            <div className="flex gap-2">
              <Input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} disabled={uploadingImg} />
              {imageUrl && <Button variant="ghost" size="icon" onClick={() => setImageUrl(null)} title="Remover imagem"><X className="h-4 w-4" /></Button>}
            </div>
            {uploadingImg && <p className="text-xs text-muted-foreground">Enviando imagem...</p>}
          </div>

          <div className="space-y-1">
            <Label>Texto da mensagem</Label>
            <Textarea rows={6} value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={5000} placeholder="Olá! Temos uma novidade..." />
          </div>

          <div className="space-y-2 rounded-md border border-border/50 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-btn">Botão de ação com link</Label>
              <Switch id="use-btn" checked={useButton} onCheckedChange={setUseButton} />
            </div>
            {useButton && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={60} placeholder="Texto do botão (ex: Ver oferta)" />
                <Input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Blacklist de e-mail</Label>
            <div className="flex gap-2">
              <Input value={blInput} onChange={(e) => setBlInput(e.target.value)} placeholder="e-mails separados por vírgula" />
              <Button type="button" variant="outline" size="icon" onClick={addBlacklist} title="Adicionar"><Plus className="h-4 w-4" /></Button>
            </div>
            {blacklist.length > 0 && (
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {blacklist.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                    {e}<button onClick={() => removeBlacklist(e)} aria-label={`Remover ${e}`}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={sendTest} disabled={busy}><FlaskConical className="h-4 w-4" /> Enviar teste para mim</Button>
            <Button className="flex-1 gap-2" onClick={enqueue} disabled={busy}><Send className="h-4 w-4" /> {busy ? "Processando..." : "Adicionar à fila"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Prévia — como o cliente vai receber</p>
        <EmailPreview content={content} fromEmail={cfg.from_email} />
      </div>
    </div>
  );
}
