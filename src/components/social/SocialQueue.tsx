import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, Send, XCircle, Ban, Pause, RotateCcw, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export default function SocialQueue() {
  const [posts, setPosts] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false);

  const load = async () => {
    const { data } = await db.from("social_posts").select("*")
      .order("created_at", { ascending: false }).limit(200);
    setPosts(data ?? []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("social-posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const start = async () => {
    if (!posts.some((p) => p.status === "queued")) {
      toast.error("Não há publicações na fila!");
      return;
    }
    setPublishing(true);
    publishingRef.current = true;
    toast.success("Publicação iniciada!");

    const loop = async () => {
      if (!publishingRef.current) return;
      try {
        const { data, error } = await supabase.functions.invoke("publish-social", {
          body: { action: "start" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.moreRemaining) {
          setTimeout(() => { if (publishingRef.current) loop(); }, 8000);
        } else {
          publishingRef.current = false;
          setPublishing(false);
          toast.success("Fila de publicações concluída!");
        }
      } catch (e: any) {
        publishingRef.current = false;
        setPublishing(false);
        toast.error(e.message ?? "Erro ao publicar");
      }
    };
    loop();
  };

  const stop = () => {
    publishingRef.current = false;
    setPublishing(false);
    toast.info("Publicação pausada");
  };

  const retry = async () => {
    await supabase.functions.invoke("publish-social", { body: { action: "retry" } });
    toast.success("Falhas recolocadas na fila");
    load();
  };

  const badge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="gap-1 bg-primary/20 text-primary border-primary/30"><CheckCircle2 className="h-3 w-3" />Publicado</Badge>;
      case "publishing":
        return <Badge className="gap-1 bg-secondary/20 text-secondary border-secondary/30"><Send className="h-3 w-3" />Publicando</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Falhou</Badge>;
      case "blocked":
        return <Badge variant="outline" className="gap-1"><Ban className="h-3 w-3" />Bloqueado</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Na fila</Badge>;
    }
  };

  const counts = {
    queued: posts.filter((p) => p.status === "queued").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
    blocked: posts.filter((p) => p.status === "blocked").length,
  };

  return (
    <Card className="border-border/50 bg-gradient-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          Fila social — {counts.queued} na fila · {counts.published} publicadas · {counts.failed} falhas · {counts.blocked} bloqueadas
        </CardTitle>
        <div className="flex gap-2">
          {publishing ? (
            <Button size="sm" variant="outline" onClick={stop} className="gap-2"><Pause className="h-4 w-4" />Pausar</Button>
          ) : (
            <Button size="sm" onClick={start} className="gap-2"><Send className="h-4 w-4" />Publicar</Button>
          )}
          <Button size="sm" variant="outline" onClick={retry} className="gap-2"><RotateCcw className="h-4 w-4" />Reenviar falhas</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Rede</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detalhe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma publicação ainda</TableCell></TableRow>
            )}
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>#{p.company_ref}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm">
                    {p.platform === "facebook" ? <Facebook className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                    {p.platform}
                  </span>
                </TableCell>
                <TableCell className="max-w-[180px] truncate">{p.filename ?? "-"}</TableCell>
                <TableCell>{badge(p.status)}</TableCell>
                <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                  {p.error_message ?? p.external_post_id ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
