import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { parseEmails, type EmailList } from "./emailLists";

const db = supabase as any;

export default function EmailListsManager({ onChanged }: { onChanged?: () => void }) {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [editing, setEditing] = useState<EmailList | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await db.from("email_lists").select("*").order("created_at", { ascending: false });
    setLists(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setName(""); setText(""); setOpen(true); };
  const startEdit = (l: EmailList) => { setEditing(l); setName(l.name); setText(l.emails.join("\n")); setOpen(true); };

  const onCsv = async (f?: File | null) => {
    if (!f) return;
    const content = await f.text();
    setText((t) => (t.trim() ? `${t.trim()}\n${content}` : content));
  };

  const save = async () => {
    const n = name.trim();
    if (!n || n.length > 100) return toast.error("Informe um nome (até 100 caracteres)");
    const { emails, invalid, duplicated } = parseEmails(text);
    if (emails.length === 0) return toast.error("Nenhum e-mail válido na lista");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const q = editing
        ? db.from("email_lists").update({ name: n, emails, updated_at: new Date().toISOString() }).eq("id", editing.id)
        : db.from("email_lists").insert({ user_id: user.id, name: n, emails });
      const { error } = await q;
      if (error) throw error;
      toast.success(`Lista salva com ${emails.length} e-mail(s)` +
        (invalid || duplicated ? ` · ${invalid} inválido(s), ${duplicated} repetido(s) ignorados` : ""));
      setOpen(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l: EmailList) => {
    if (!confirm(`Excluir a lista "${l.name}"?`)) return;
    await db.from("email_lists").delete().eq("id", l.id);
    toast.success("Lista excluída");
    await load();
    onChanged?.();
  };

  return (
    <Card className="border-border/50 bg-gradient-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Listas de e-mail</CardTitle>
          <CardDescription>CSV com uma única coluna: email.</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={startNew}><Plus className="h-4 w-4" /> Nova lista</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {lists.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma lista salva ainda.</p>}
        {lists.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{l.name}</span>
              <Badge variant="outline">{l.emails.length} e-mails</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => startEdit(l)}><Pencil className="h-3 w-3" /> Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar lista" : "Nova lista de e-mail"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome da lista</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Clientes ativos" />
            </div>
            <div className="space-y-1">
              <Label>Importar CSV (coluna email)</Label>
              <Input type="file" accept=".csv,.txt" onChange={(e) => onCsv(e.target.files?.[0])} />
            </div>
            <div className="space-y-1">
              <Label>E-mails (um por linha — pode adicionar ou apagar)</Label>
              <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={"cliente1@email.com\ncliente2@email.com"} />
              <p className="text-xs text-muted-foreground">{parseEmails(text).emails.length} e-mail(s) válido(s)</p>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar lista"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
