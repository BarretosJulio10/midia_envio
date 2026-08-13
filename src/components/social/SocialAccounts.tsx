import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, Plus, Trash2, PlugZap, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export type SocialAccount = {
  id: string;
  company_ref: string;
  name: string;
  platform: "facebook" | "instagram";
  page_id: string | null;
  ig_user_id: string | null;
  ig_username?: string | null;
  page_name?: string | null;
  access_token: string;
  enabled: boolean;
  token_expires_at?: string | null;
  connected_via?: string | null;
};

type DiscoveredPage = {
  page_id: string;
  page_name: string;
  page_token: string;
  picture?: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
};

const emptyForm = {
  company_ref: "",
  name: "",
  platform: "facebook" as "facebook" | "instagram",
  page_id: "",
  ig_user_id: "",
  access_token: "",
};

const REDIRECT_URI = `${window.location.origin}/oauth/facebook`;

export default function SocialAccounts({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [userToken, setUserToken] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pages, setPages] = useState<DiscoveredPage[]>([]);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [companyByPage, setCompanyByPage] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const load = async () => {
    const { data } = await db
      .from("social_accounts")
      .select("*")
      .order("company_ref", { ascending: true });
    setAccounts((data ?? []) as SocialAccount[]);
  };

  useEffect(() => { load(); }, []);

  // ---------- OAuth: Conectar com Facebook ----------
  const exchangeCode = async (code: string) => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-connect", {
        body: { action: "oauth_callback", code, redirectUri: REDIRECT_URI },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPages(data?.pages ?? []);
      setTokenExpiresAt(data?.token_expires_at ?? null);
      toast.success(`${data?.pages?.length ?? 0} página(s) encontrada(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("fb_oauth_code");
    if (stored) {
      sessionStorage.removeItem("fb_oauth_code");
      exchangeCode(stored);
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== "fb-oauth") return;
      popupRef.current?.close();
      if (ev.data.error) return toast.error(String(ev.data.error));
      if (ev.data.code) exchangeCode(String(ev.data.code));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connectFacebook = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-connect", {
        body: { action: "oauth_url", redirectUri: REDIRECT_URI },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      popupRef.current = window.open(data.url, "fb-oauth", "width=650,height=750");
      if (!popupRef.current) {
        window.location.href = data.url;
        return;
      }
      toast.info("Faça login na janela do Facebook para autorizar as páginas");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConnecting(false);
    }
  };

  // ---------- Vincular página descoberta a uma empresa ----------
  const linkPage = async (p: DiscoveredPage) => {
    const companyRef = (companyByPage[p.page_id] ?? "").trim();
    if (!companyRef) return toast.error("Informe o ID da empresa (igual ao CSV)");
    setLinking(p.page_id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const rows: any[] = [{
        user_id: user.id,
        company_ref: companyRef,
        name: p.page_name,
        platform: "facebook",
        page_id: p.page_id,
        ig_user_id: null,
        page_name: p.page_name,
        ig_username: null,
        access_token: p.page_token,
        token_expires_at: tokenExpiresAt,
        connected_via: "oauth",
        enabled: true,
      }];

      if (p.ig_user_id) {
        rows.push({
          user_id: user.id,
          company_ref: companyRef,
          name: p.ig_username ? `@${p.ig_username}` : p.page_name,
          platform: "instagram",
          page_id: p.page_id,
          ig_user_id: p.ig_user_id,
          page_name: p.page_name,
          ig_username: p.ig_username,
          access_token: p.page_token,
          token_expires_at: tokenExpiresAt,
          connected_via: "oauth",
          enabled: true,
        });
      }

      const { error } = await db
        .from("social_accounts")
        .upsert(rows, { onConflict: "user_id,company_ref,platform" });
      if (error) throw error;

      toast.success(p.ig_user_id
        ? `Facebook + Instagram vinculados à empresa #${companyRef}`
        : `Facebook vinculado à empresa #${companyRef}`);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLinking(null);
    }
  };

  // ---------- Cadastro manual (fallback) ----------
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
        connected_via: "manual",
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
      setTokenExpiresAt(data?.token_expires_at ?? null);
      toast.success(`${data?.pages?.length ?? 0} página(s) encontrada(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDiscovering(false);
    }
  };

  const expiryLabel = (acc: SocialAccount) => {
    if (!acc.token_expires_at) return null;
    const days = Math.floor((new Date(acc.token_expires_at).getTime() - Date.now()) / 86400000);
    if (days <= 0) return { text: "Token expirado", danger: true };
    if (days <= 7) return { text: `Expira em ${days}d`, danger: true };
    return { text: `Válido por ${days}d`, danger: false };
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            Conectar com Facebook
          </CardTitle>
          <CardDescription>
            Entre com a conta administradora das páginas. As páginas e os Instagram Business
            vinculados aparecem automaticamente — sem colar token nem Page ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={connectFacebook} disabled={connecting} className="gap-2">
              <Facebook className="h-4 w-4" />
              {connecting ? "Conectando..." : "Conectar com Facebook"}
            </Button>
            {pages.length > 0 && (
              <Button variant="ghost" className="gap-2" onClick={connectFacebook}>
                <RefreshCw className="h-4 w-4" /> Reconectar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setManualOpen((v) => !v)}>
              {manualOpen ? "Ocultar modo manual" : "Usar token manual"}
            </Button>
          </div>

          {manualOpen && (
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
          )}

          {pages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Informe o ID da empresa (mesmo da primeira coluna do CSV) e clique em vincular.
              </p>
              {pages.map((p) => (
                <div key={p.page_id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/50 p-3">
                  <div className="flex items-center gap-3">
                    {p.picture
                      ? <img src={p.picture} alt={`Foto da página ${p.page_name}`} className="h-9 w-9 rounded-full" />
                      : <Facebook className="h-5 w-5 text-primary" />}
                    <div className="text-sm">
                      <p className="font-medium">{p.page_name}</p>
                      {p.ig_user_id ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Instagram className="h-3 w-3" /> @{p.ig_username}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Sem Instagram vinculado à página
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32"
                      placeholder="ID empresa"
                      value={companyByPage[p.page_id] ?? ""}
                      onChange={(e) => setCompanyByPage({ ...companyByPage, [p.page_id]: e.target.value })}
                    />
                    <Button size="sm" disabled={linking === p.page_id} onClick={() => linkPage(p)}>
                      {linking === p.page_id ? "Vinculando..." : "Vincular"}
                    </Button>
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
              <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Manual</Button>
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
          {accounts.map((acc) => {
            const exp = expiryLabel(acc);
            return (
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
                  {exp && (
                    <Badge variant={exp.danger ? "destructive" : "outline"}>{exp.text}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {exp?.danger && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={connectFacebook}>
                      <RefreshCw className="h-3 w-3" /> Reconectar
                    </Button>
                  )}
                  <Switch checked={acc.enabled} onCheckedChange={(v) => toggle(acc, v)} />
                  <Button size="sm" variant="outline" onClick={() => test(acc)}>Testar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(acc)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
