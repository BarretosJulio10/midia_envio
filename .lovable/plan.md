# Por que o e-mail falhou: "RESEND_API_KEY não configurada"

## Causa
A chave da Resend foi salva no cofre de segredos do Lovable, mas a função de envio `send-emails` roda no seu Supabase externo (`uvvaxwtumuabfklccjgd`). Esse Supabase tem seu próprio cofre de segredos, e lá a chave não existe. A função procura a chave, não acha e marca o envio como "Falhou".

## Correção
1. Copiar a chave `RESEND_API_KEY` (já disponível no ambiente de trabalho) para os segredos do Supabase `uvvaxwtumuabfklccjgd` usando o comando `supabase secrets set`. O valor não aparece no chat.
2. Confirmar que o segredo aparece na lista do Supabase (`supabase secrets list`).
3. No painel, clicar em reenviar o e-mail que falhou (ou "Enviar teste para mim").
4. Se aparecer outro erro, provavelmente será o remetente: o domínio usado em **E-mail → Configurações** precisa estar verificado na Resend.

## Observação
Para publicar segredos no Supabase é preciso o token de acesso. O token colado antes pode ter sido revogado; se der erro de autorização, peço um token novo.

Nada do WhatsApp nem das redes sociais será alterado.
