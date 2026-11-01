import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, Facebook, Instagram, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { companyIdFromFileName, socialKindOf, toSocialImage, type SocialMediaKind } from "@/lib/socialImage";

const db = supabase as any;

type Account = {
  id: string;
  company_ref: string;
  name: string;
  page_name: string | null;
  platform: "facebook" | "instagram";
  enabled: boolean;
};

type PlanItem = {
  file: File;
  companyRef: string;
  kind: SocialMediaKind | null;
  targets: Account[];
  companyName: string | null;
  blocked: boolean;
  problem: string | null;
};

// Valor inicial do campo de agendamento: daqui a 1 hora, no fuso do navegador.
const defaultWhen = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SocialComposer({ onQueued }: { onQueued?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [useFacebook, setUseFacebook] = useState(true);
  const [useInstagram, setUseInstagram] = useState(true);
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(defaultWhen());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const load = async () => {
    const [{ data: accs }, { data: bl }] = await Promise.all([
      db.from("social_accounts")
        .select("id,company_ref,name,page_name,platform,enabled")
        .eq("enabled", true),
      supabase.from("blacklist").select("number_ids"),
    ]);
    setAccounts((accs ?? []) as Account[]);
    const ids = new Set<string>();
    (bl ?? []).forEach((b: any) => String(b.number_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => ids.add(s)));
    setBlockedIds(ids);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("social-composer-accounts")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_accounts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Arquivo 1.jpg → empresa 1, igual ao envio de WhatsApp.
  const plan: PlanItem[] = useMemo(() => files.map((file) => {
    const companyRef = companyIdFromFileName(file.name);
    const kind = socialKindOf(file);
    const all = accounts.filter((a) => a.company_ref === companyRef);
    let targets = all.filter((a) =>
      (a.platform === "facebook" && useFacebook) || (a.platform === "instagram" && useInstagram));
    const companyName = all[0]?.page_name || all[0]?.name || null;
    const blocked = blockedIds.has(companyRef);
    let problem: string | null = null;
    if (!kind) problem = "Formato não suportado (use imagem ou vídeo)";
    else if (all.length === 0) problem = "Empresa sem rede social cadastrada";
    else if (targets.length === 0) problem = "Nenhuma das redes marcadas está cadastrada para esta empresa";
    if (problem) targets = [];
    return { file, companyRef, kind, targets, companyName, blocked, problem };
  }), [files, accounts, useFacebook, useInstagram, blockedIds]);

  const ready = plan.filter((p) => p.targets.length > 0 && !p.blocked);
  const totalPosts = ready.reduce((n, p) => n + p.targets.length, 0);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...Array.from(list).filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const submit = async () => {
    if (!useFacebook && !useInstagram) return toast.error("Marque pelo menos uma rede");
    if (files.length === 0) return toast.error("Adicione os arquivos (o nome é o ID da empresa: 1.jpg, 2.mp4...)");
    if (ready.length === 0) return toast.error("Nenhum arquivo tem empresa com rede social cadastrada");

    let scheduledAt: string | null = null;
    if (schedule) {
      const d = new Date(when);
      if (isNaN(d.getTime())) return toast.error("Data/hora do agendamento inválida");
      if (d.getTime() < Date.now() + 60_000) return toast.error("Agende para pelo menos 1 minuto no futuro");
      scheduledAt = d.toISOString();
    }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const rows: any[] = [];
      // Empresas na blacklist entram como "bloqueado" (visível na fila, nunca publica).
      plan.filter((p) => p.blocked && !p.problem).forEach((p) => {
        accounts.filter((a) => a.company_ref === p.companyRef).forEach((a) => rows.push({
          user_id: user.id, social_account_id: a.id, company_ref: p.companyRef, platform: a.platform,
          media_type: p.kind ?? "image", filename: p.file.name, caption: caption || null,
          status: "blocked", error_message: "Empresa na blacklist", scheduled_at: scheduledAt,
        }));
      });

      let i = 0;
      for (const item of ready) {
        i++;
        setProgress(`Preparando ${i}/${ready.length}: ${item.file.name}`);
        const upload = item.kind === "image" ? (await toSocialImage(item.file)).file : item.file;
        const safeName = upload.name.replace(/[^\w.-]+/g, "_");
        const path = `${user.id}/social/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("whatsapp-files").upload(path, upload, {
          contentType: upload.type || undefined,
        });
        if (upErr) throw new Error(`Falha ao subir ${item.file.name}: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from("whatsapp-files").getPublicUrl(path);

        item.targets.forEach((a) => rows.push({
          user_id: user.id, social_account_id: a.id, company_ref: item.companyRef, platform: a.platform,
          media_url: publicUrl, media_type: item.kind, filename: item.file.name,
          caption: caption || null, status: "queued", scheduled_at: scheduledAt,
        }));
      }

      setProgress("Criando a fila...");
      const { error } = await db.from("social_posts").insert(rows);
      if (error) throw error;

      const queued = rows.filter((r) => r.status === "queued").length;
      toast.success(scheduledAt
        ? `${queued} publicação(ões) agendada(s) para ${new Date(scheduledAt).toLocaleString("pt-BR")}`
        : `${queued} publicação(ões) na fila — saem automaticamente em até 1 minuto`);
      setFiles([]);
      setCaption("");
      onQueued?.();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar publicações");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Postar nas redes
        </CardTitle>
        <CardDescription>
          O nome do arquivo é o ID da empresa: <strong>1.jpg</strong> vai para a empresa 1, <strong>2.mp4</strong> para
          a empresa 2. Cada arquivo é publicado no Facebook e/ou Instagram cadastrados para aquela empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="social-files">Arquivos (imagens ou vídeos)</Label>
          <Input
            id="social-files"
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={busy}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <p className="text-xs text-muted-foreground">
            Imagens viram JPEG e, se precisar, ganham bordas brancas para caber na proporção aceita pelo Instagram.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="social-caption">Legenda</Label>
          <Textarea
            id="social-caption"
            rows={4}
            value={caption}
            disabled={busy}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Texto da publicação. Use {empresa} para o nome da página e {id} para o número da empresa."
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useFacebook} onCheckedChange={(v) => setUseFacebook(v === true)} disabled={busy} />
            <Facebook className="h-4 w-4" /> Facebook
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={useInstagram} onCheckedChange={(v) => setUseInstagram(v === true)} disabled={busy} />
            <Instagram className="h-4 w-4" /> Instagram
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={schedule} onCheckedChange={(v) => setSchedule(v === true)} disabled={busy} />
            <CalendarClock className="h-4 w-4" /> Agendar
          </label>
          {schedule && (
            <Input
              type="datetime-local"
              className="w-auto"
              value={when}
              disabled={busy}
              onChange={(e) => setWhen(e.target.value)}
            />
          )}
        </div>

        {plan.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Destinos</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.map((p) => (
                  <TableRow key={p.file.name}>
                    <TableCell className="max-w-[180px] truncate">{p.file.name}</TableCell>
                    <TableCell>#{p.companyRef}{p.companyName ? ` · ${p.companyName}` : ""}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {p.targets.map((t) => t.platform === "facebook"
                          ? <Facebook key={t.id} className="h-4 w-4" aria-label="Facebook" />
                          : <Instagram key={t.id} className="h-4 w-4" aria-label="Instagram" />)}
                        {p.targets.length === 0 && <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.problem
                        ? <Badge variant="outline" className="text-amber-500 border-amber-500/40">{p.problem}</Badge>
                        : p.blocked
                          ? <Badge variant="outline">Bloqueada (blacklist)</Badge>
                          : <Badge className="bg-primary/20 text-primary border-primary/30">Pronto</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" disabled={busy} onClick={() => removeFile(p.file.name)} aria-label={`Remover ${p.file.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={busy || totalPosts === 0} className="gap-2">
            {schedule ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {busy ? "Enviando..." : schedule
              ? `Agendar ${totalPosts} publicação(ões)`
              : `Publicar ${totalPosts} publicação(ões)`}
          </Button>
          {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
          {!busy && accounts.length === 0 && (
            <span className="text-sm text-amber-500">Cadastre as empresas em "Contas por empresa" abaixo.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
