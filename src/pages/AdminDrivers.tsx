import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, PlugZap, Plus } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type Driver = {
  id: string; slug: string; name: string;
  base_url: string; api_key: string;
  enabled: boolean; is_active: boolean; config: any;
};

export default function AdminDrivers() {
  const { isAdmin, loading: loadingRole } = useIsAdmin();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('api_drivers' as any).select('*').order('name');
    setDrivers((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activate = async (id: string) => {
    await supabase.from('api_drivers' as any).update({ is_active: false }).neq('id', id);
    const { error } = await supabase.from('api_drivers' as any).update({ is_active: true }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Driver ativado'); load(); }
  };

  const test = async (id: string) => {
    setTesting(id);
    const { data, error } = await supabase.functions.invoke('wa-test-driver', { body: { driver_id: id } });
    setTesting(null);
    if (error) toast.error(error.message);
    else toast[data?.ok ? 'success' : 'error'](data?.message ?? 'sem resposta');
  };

  if (loadingRole) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center text-center p-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Acesso negado</h2>
        <p className="text-muted-foreground mb-4">Apenas administradores podem gerenciar drivers.</p>
        <Button variant="outline" onClick={() => history.back()}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="outline" size="icon" onClick={() => history.back()}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-lg sm:text-xl font-bold truncate">Drivers de API</h1>
          </div>
          <Button onClick={() => setCreating(true)} size="sm" className="sm:size-default"><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <Loader2 className="animate-spin" /> : drivers.map(d => (
          <Card key={d.id} className={d.is_active ? "border-primary" : ""}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{d.name}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono">{d.slug}</p>
              </div>
              {d.is_active && <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />ATIVO</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground break-all">
                <p><strong>URL:</strong> {d.base_url || <em>vazio</em>}</p>
                <p><strong>API Key:</strong> {d.api_key ? '••••' + d.api_key.slice(-6) : <em>vazio</em>}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {!d.is_active && (
                  <Button size="sm" variant="default" disabled={!d.base_url || !d.api_key} onClick={() => activate(d.id)}>
                    Ativar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(d)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => test(d.id)} disabled={testing === d.id}>
                  {testing === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlugZap className="h-3 w-3" />}
                  Testar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>

      <DriverDialog
        open={!!editing || creating}
        driver={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSaved={() => { setEditing(null); setCreating(false); load(); }}
      />
    </div>
  );
}

function DriverDialog({ open, driver, onClose, onSaved }: { open: boolean; driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ slug: '', name: '', base_url: '', api_key: '', enabled: true, config: '{}' });
  useEffect(() => {
    if (driver) setForm({ ...driver, config: JSON.stringify(driver.config ?? {}, null, 2) });
    else setForm({ slug: '', name: '', base_url: '', api_key: '', enabled: true, config: '{}' });
  }, [driver, open]);

  const save = async () => {
    let config: any = {};
    try { config = JSON.parse(form.config || '{}'); } catch { toast.error('Config JSON inválido'); return; }
    const payload = { slug: form.slug, name: form.name, base_url: form.base_url, api_key: form.api_key, enabled: form.enabled, config };
    const q = driver
      ? supabase.from('api_drivers' as any).update(payload).eq('id', driver.id)
      : supabase.from('api_drivers' as any).insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message); else { toast.success('Salvo'); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{driver ? 'Editar driver' : 'Novo driver'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Slug</Label><Input value={form.slug} disabled={!!driver} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="evolution-go" /></div>
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Base URL</Label><Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>API Key</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} type="password" /></div>
          <div><Label>Config (JSON)</Label><Textarea rows={4} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} className="font-mono text-xs" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
