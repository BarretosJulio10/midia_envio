import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";

const db = supabase as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const statusLabel: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { text: "Na fila", variant: "secondary" },
  sending: { text: "Enviando", variant: "outline" },
  sent: { text: "Enviado", variant: "default" },
  failed: { text: "Falhou", variant: "destructive" },
  blocked: { text: "Bloqueado", variant: "outline" },
};

export default function EmailQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState("");
  const stopRef = useRef(false);

  const load = async () => {
    const { data } = await db.from("email_messages").select("*").order("created_at", { ascending: false }).limit(500);
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("email-messages-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const count = (s: string) => rows.filter((r) => r.status === s).length;

  const start = async () => {
    stopRef.current = false;
    setRunning(true);
    let sentInRow = 0;
    try {
      while (!stopRef.current) {
        const { data, error } = await supabase.functions.invoke("send-emails", { body: { action: "send_next" } });
        if (error) {
          const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
          throw new Error(d);
        }
        if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        await load();
        if (!data?.moreRemaining) { toast.success("Fila de e-mail concluída"); break; }
        sentInRow++;
        const d = data.delay ?? { min: 3000, max: 8000, pauseAfter: 50, pauseDuration: 60000 };
        if (d.pauseAfter > 0 && sentInRow % d.pauseAfter === 0) {
          setInfo(`Pausa de ${Math.round(d.pauseDuration / 1000)}s...`);
          await sleep(d.pauseDuration);
        } else {
          const wait = d.min + Math.random() * Math.max(0, d.max - d.min);
          setInfo(`Próximo em ${Math.round(wait / 1000)}s`);
          await sleep(wait);
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
      setInfo("");
    }
  };

  const retry = async () => {
    await supabase.functions.invoke("send-emails", { body: { action: "retry" } });
    load();
  };

  const clear = async () => {
    if (!confirm("Limpar enviados, falhados e bloqueados da fila?")) return;
    await db.from("email_messages").delete().in("status", ["sent", "failed", "blocked"]);
    load();
  };

  return (
    <Card className="border-border/50 bg-gradient-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Fila de e-mail</CardTitle>
          <CardDescription>
            {count("queued")} na fila · {count("sent")} enviados · {count("failed")} falhas · {count("blocked")} bloqueados
            {info && ` · ${info}`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {running
            ? <Button size="sm" variant="outline" className="gap-1" onClick={() => { stopRef.current = true; }}><Pause className="h-4 w-4" /> Pausar</Button>
            : <Button size="sm" className="gap-1" onClick={start} disabled={count("queued") === 0}><Play className="h-4 w-4" /> Iniciar envios</Button>}
          <Button size="sm" variant="outline" className="gap-1" onClick={retry} disabled={count("failed") === 0}><RotateCcw className="h-4 w-4" /> Reenviar falhados</Button>
          <Button size="sm" variant="ghost" className="gap-1" onClick={clear}><Trash2 className="h-4 w-4" /> Limpar</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Destinatário</TableHead><TableHead>Status</TableHead><TableHead>Horário</TableHead><TableHead>Motivo</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Fila vazia</TableCell></TableRow>}
            {rows.map((r) => {
              const s = statusLabel[r.status] ?? { text: r.status, variant: "outline" as const };
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.to_email}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.text}</Badge></TableCell>
                  <TableCell className="text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive" title={r.error_message ?? ""}>{r.error_message ?? ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
