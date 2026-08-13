import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, Plus, Trash2, PlugZap, Search } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export type SocialAccount = {
  id: string;
  company_ref: string;
  name: string;
  platform: "facebook" | "instagram";
  page_id: string | null;
  ig_user_id: string | null;
  access_token: string;
  enabled: boolean;
};

const emptyForm = {
  company_ref: "",
  name: "",
  platform: "facebook" as "facebook" | "instagram",
  page_id: "",
  ig_user_id: "",
  access_token: "",
};

export default function SocialAccounts({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [userToken, setUserToken] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [pages, setPages] = useState<any[]>([]);

  const load = async () => {
    const { data } = await db
      .from("social_accounts")
      .select("*")
      .order("company_ref", { ascending: true });
    setAccounts((data ?? []) as SocialAccount[]);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.company_ref.trim() || !form.name.trim()) {
      toast.error("Informe o ID da empresa (mesmo do CSV) e o nome");
      return;
    }
    if (form.platform === "facebook" && !form.page_id.trim()) {
      toast.error("Facebook exige o Page ID");
      return;
    }
    if (form.platform === "instagram" && !form.ig_user_id.trim()) {
      toast.error("Instagram exige o IG User ID (conta Business)");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await db.from("social_accounts").upsert({
        user_id: user.id,
        company_ref: form.company_ref.trim(),
        name: form.name.trim(),
        platform: form.platform,
        page_id: form.page_id.trim() || null,
        ig_user_id: form.ig_user_id.trim() || null,
        access_token: form.access_token.trim(),
        enabled: true,
      }, { onConflict: "user_id,company_ref,platform" });
      if (error) throw error;
      toast.success("Conta salva");
      setForm(emptyForm);
      setOpen(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (acc: SocialAccount, enabled: boolean) => {
    await db.from("social_accounts").update({ enabled }).eq("id", acc.id);
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, enabled } : a)));
  };

  const remove = async (acc: SocialAccount) => {
    await db.from("social_accounts").delete().eq("id", acc.id);
    toast.success("Conta removida");
    load();
  };

  const test = async (acc: SocialAccount) => {
    const { data, error } = await supabase.functions.invoke("publish-social", {
      body: { action: "test", accountId: acc.id },
    });
    if (error) return toast.error(error.message);
    data?.success ? toast.success(data.message) : toast.error(data?.message ?? "Falhou");
  };

  const discover = async () => {
    if (!userToken.trim()) return toast.error("Cole o token de usuário da Meta");
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-connect", {
        body: { action: "discover", userToken: userToken.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPages(data?.pages ?? []);
      toast.success(`${data?.pages?.length ?? 0} página(s) encontrada(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDiscovering(false);
    }
  };

  const usePage = (p: any, platform: "facebook" | "instagram") => {
    setForm((f) => ({
      ...f,
      name: platform === "instagram" ? `@${p.ig_username ?? p.page_name}` : p.page_name,
      platform,
      page_id: p.page_id ?? "",
      ig_user_id: p.ig_user_id ?? "",
      access_token: p.page_token ?? "",
    }));
    setOpen(true);
    toast.info("Preencha o ID da empresa e salve");
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            Conectar contas da Meta
          </CardTitle>
          <CardDescription>
            Cole um token de usuário da Meta para listar as páginas e contas Instagram Business disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Token de usuário da Meta"
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
            />
            <Button onClick={discover} disabled={discovering} variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              {discovering ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {pages.length > 0 && (
            <div className="space-y-2">
              {pages.map((p) => (
                <div key={p.page_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3">
                  <div className="text-sm">
                    <p className="font-medium">{p.page_name}</p>
                    <p className="text-muted-foreground text-xs">
                      Page ID: {p.page_id}{p.ig_user_id ? ` · IG: @${p.ig_username}` : " · sem Instagram vinculado"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => usePage(p, "facebook")}>
                      <Facebook className="h-3 w-3" /> Usar
                    </Button>
                    {p.ig_user_id && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => usePage(p, "instagram")}>
                        <Instagram className="h-3 w-3" /> Usar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-gradient-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Contas por empresa</CardTitle>
            <CardDescription>
              O "ID da empresa" é o mesmo id usado na primeira coluna do CSV de envio.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Conta de rede social</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>ID da empresa (igual ao CSV)</Label>
                  <Input value={form.company_ref} onChange={(e) => setForm({ ...form, company_ref: e.target.value })} placeholder="Ex: 12" />
                </div>
                <div className="space-y-1">
                  <Label>Nome da empresa/conta</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Plataforma</Label>
                  <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Page ID</Label>
                  <Input value={form.page_id} onChange={(e) => setForm({ ...form, page_id: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>IG User ID (Business)</Label>
                  <Input value={form.ig_user_id} onChange={(e) => setForm({ ...form, ig_user_id: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Access Token da página</Label>
                  <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
                </div>
                <Button onClick={save} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar conta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma empresa com rede social ativa ainda.</p>
          )}
          {accounts.map((acc) => (
            <div key={acc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/50 p-3">
              <div className="flex items-center gap-3">
                {acc.platform === "facebook"
                  ? <Facebook className="h-4 w-4 text-primary" />
                  : <Instagram className="h-4 w-4 text-primary" />}
                <div className="text-sm">
                  <p className="font-medium">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">Empresa #{acc.company_ref}</p>
                </div>
                <Badge variant={acc.enabled ? "default" : "outline"}>
                  {acc.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={acc.enabled} onCheckedChange={(v) => toggle(acc, v)} />
                <Button size="sm" variant="outline" onClick={() => test(acc)}>Testar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(acc)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
