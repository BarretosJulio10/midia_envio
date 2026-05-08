import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";

export default function ActiveDriverBadge({ onClick }: { onClick?: () => void }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('api_drivers' as any).select('name').eq('is_active', true).maybeSingle()
      .then(({ data }: any) => setName(data?.name ?? null));
  }, []);
  if (!name) return null;
  return (
    <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={onClick} title="Driver ativo">
      <Cpu className="h-3 w-3" /> {name}
    </Badge>
  );
}
