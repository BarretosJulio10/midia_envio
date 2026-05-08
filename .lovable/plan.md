## Objetivo
Fazer o deploy das 4 Edge Functions da Evolution Go (`fzap-create-instance`, `fzap-status`, `send-messages`, `fzap-reset-instance`) no seu Supabase externo (`uvvaxwtumuabfklccjgd`) usando o token `SB_ACCESS_TOKEN` recém-salvo.

## Passos

1. **Verificar token e CLI**
   - Confirmar que `SB_ACCESS_TOKEN` está disponível no ambiente.
   - Usar `npx supabase` (sem instalação global).

2. **Deploy das 4 funções**
   ```bash
   SUPABASE_ACCESS_TOKEN=$SB_ACCESS_TOKEN npx supabase functions deploy \
     fzap-create-instance fzap-status send-messages fzap-reset-instance \
     --project-ref uvvaxwtumuabfklccjgd --no-verify-jwt
   ```

3. **Validação pós-deploy**
   - Chamar `/functions/v1/fzap-status` via `curl` no domínio `https://uvvaxwtumuabfklccjgd.supabase.co` para confirmar resposta 200.
   - Reportar logs de erro caso alguma função falhe no deploy.

4. **Recomendação de segurança**
   - Após deploy bem-sucedido, **revogar o token antigo** (já exposto no chat) no Supabase Dashboard.
   - Manter `SB_ACCESS_TOKEN` apenas enquanto necessário; pode ser deletado depois.

## Observações
- O código das 4 funções já foi atualizado em conversas anteriores para o padrão Evolution Go — apenas o deploy está pendente.
- Não haverá alteração de código nesta etapa, apenas execução de comandos.
