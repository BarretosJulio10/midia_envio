## Objetivo

Corrigir o `supabase/config.toml` para refletir o projeto Supabase realmente em uso (`uvvaxwtumuabfklccjgd` — `bot_envios_supabase`), eliminando a divergência com o `dwccuemwhiheukaoylsq` que está lá hoje.

## Mudança

**Arquivo:** `supabase/config.toml`

- Trocar `project_id = "dwccuemwhiheukaoylsq"` por `project_id = "uvvaxwtumuabfklccjgd"`.
- Manter todas as configurações de `[functions.*]` (verify_jwt) exatamente como estão.

## O que NÃO muda

- `.env` já aponta corretamente para `uvvaxwtumuabfklccjgd` (URL, anon key, service role).
- `supabase/.temp/linked-project.json` já está correto.
- Nenhum código de aplicação (`src/`), Edge Functions ou migrations precisa ser alterado — eles usam variáveis de ambiente, não o `project_id` do config.toml.

## Validação após a mudança

1. Confirmar que `supabase/config.toml` mostra o ref correto.
2. Conferir que o preview continua carregando normalmente (a conexão do client usa `VITE_SUPABASE_URL`, que já está correta — então não deve haver impacto visível).

## Observação

O `project_id` no `config.toml` é usado pelo Supabase CLI para operações locais (link, deploy de functions, db push). Como o `.temp/linked-project.json` já aponta para o projeto certo, na prática o CLI já estava usando o correto — mas deixar o `config.toml` consistente evita confusão futura e erros caso alguém rode `supabase link` baseado nele.