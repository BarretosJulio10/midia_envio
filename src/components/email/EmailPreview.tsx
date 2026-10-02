import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { buildEmailHtml, type EmailContent } from "@/lib/emailTemplate";

export default function EmailPreview({ content, fromEmail }: { content: EmailContent; fromEmail?: string }) {
  const [mobile, setMobile] = useState(false);
  const html = useMemo(() => buildEmailHtml(content), [content]);

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2">
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{content.subject || "(sem assunto)"}</p>
          <p className="truncate text-xs text-muted-foreground">
            De: {content.fromName || "Remetente"} {fromEmail ? `<${fromEmail}>` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant={mobile ? "ghost" : "secondary"} onClick={() => setMobile(false)} title="Computador">
            <Monitor className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={mobile ? "secondary" : "ghost"} onClick={() => setMobile(true)} title="Celular">
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-center bg-muted/40 p-3">
        <iframe
          title="Prévia do e-mail"
          srcDoc={html}
          sandbox=""
          className="rounded-md border border-border/50 bg-background transition-all"
          style={{ width: mobile ? 375 : "100%", height: 560 }}
        />
      </div>
    </div>
  );
}
