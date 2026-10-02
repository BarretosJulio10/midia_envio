import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { EMAIL_RE } from "@/lib/emailTemplate";

const db = supabase as any;

export type EmailCfg = {
  from_email: string; from_name: string;
  delay_min: number; delay_max: number; pause_after: number; pause_duration: number;
};
export const defaultCfg: EmailCfg = { from_email: "", from_name: "", delay_min: 3000, delay_max: 8000, pause_after: 50, pause_duration: 60000 };

export async function loadEmailCfg(): Promise<EmailCfg> {
  const { data } = await db.from("email_config").select("*").maybeSingle();
  return data ? { ...defaultCfg, ...data } : defaultCfg;
}

export default function EmailConfig({ onSaved }: { onSaved?: (c: EmailCfg) => void }) {
  const [cfg, setCfg] = useState<EmailCfg>(defaultCfg);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadEmailCfg().then(setCfg); }, []);

  const num = (k: keyof EmailCfg, sec = true) => (
    <Input type="number" min={0}
      value={sec ? Math.round(Number(cfg[k]) / 1000) : Number(cfg[k])}
      onChange={(e) => setCfg({ ...cfg, [k]: Math.max(0, Number(e.target.value) || 0) * (sec ? 1000 : 1) })} />
  );

  const save = async () => {
    if (!EMAIL_RE.test(cfg.from_email.trim())) return toast.error("E-mail remetente inválido");
    if (cfg.delay_max < cfg.delay_min) return toast.error("Intervalo máximo deve ser maior que o mínimo");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const row = { ...cfg, from_email: cfg.from_email.trim(), from_name: cfg.from_name.trim().slice(0, 100), user_id: user.id, updated_at: new Date().toISOString() };
      delete (row as any).id;
      const { error } = await db.from("email_config").upsert(row, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Configurações salvas");
      onSaved?.(cfg);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Configurações de e-mail</CardTitle>
        <CardDescription>O remetente precisa ser de um domínio verificado na Resend.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>E-mail remetente</Label>
          <Input value={cfg.from_email} onChange={(e) => setCfg({ ...cfg, from_email: e.target.value })} placeholder="contato@suaempresa.com.br" /></div>
        <div className="space-y-1"><Label>Nome do remetente</Label>
          <Input value={cfg.from_name} onChange={(e) => setCfg({ ...cfg, from_name: e.target.value })} placeholder="Sua Empresa" /></div>
        <div className="space-y-1"><Label>Intervalo mínimo (seg)</Label>{num("delay_min")}</div>
        <div className="space-y-1"><Label>Intervalo máximo (seg)</Label>{num("delay_max")}</div>
        <div className="space-y-1"><Label>Pausar a cada (e-mails)</Label>{num("pause_after", false)}</div>
        <div className="space-y-1"><Label>Duração da pausa (seg)</Label>{num("pause_duration")}</div>
        <Button className="sm:col-span-2" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
      </CardContent>
    </Card>
  );
}
