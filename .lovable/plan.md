# Objetivo
Corrigir o caso dos números como `5566999730909` e `5537998719273` que aparecem como **Enviado** no sistema, mas não recebem a mensagem.

# Diagnóstico
O problema é o mesmo nos dois números:

1. O backend atual marca `messages.status = 'sent'` assim que a API Fzap aceita a requisição.
2. O driver Fzap atual não valida antes se o número realmente existe no WhatsApp.
3. A documentação da Fzap mostra dois mecanismos que hoje não estão sendo usados no projeto:
   - `POST /user/check` para validar se o número/JID está no WhatsApp e retornar o `jid` correto.
   - `check: true` no payload de envio para forçar validação via `IsOnWhatsApp`.
4. Em números brasileiros, isso é crítico porque alguns números antigos/regionais podem estar cadastrados no WhatsApp com outro formato sem o nono dígito. Exemplo provável:
   - `5566999730909` pode resolver para `556699730909@s.whatsapp.net`
   - `5537998719273` pode resolver para `553798719273@s.whatsapp.net`

Ou seja: hoje o sistema está registrando “requisição aceita pela API” como se fosse “mensagem entregue”, e isso gera falso positivo.

# Solução
## 1) Validar o número antes de enviar
No driver Fzap, adicionar uma função para chamar `POST /user/check` usando o token da instância e o número informado.

Essa validação deve retornar:
- se o número existe no WhatsApp
- o `jid` correto reconhecido pelo WhatsApp

## 2) Enviar usando o JID resolvido
Se o número existir, o envio deve usar o `jid` retornado pela Fzap, não apenas o telefone cru digitado/importado.

Isso resolve os casos em que a conta está registrada com formato diferente do número original.

## 3) Forçar checagem no próprio endpoint de envio
Além da pré-validação, todos os envios do driver Fzap devem passar `check: true` no body.

Assim, se houver discrepância de JID no momento do envio, a API passa a falhar de forma explícita em vez de aceitar silenciosamente.

## 4) Não marcar como “Enviado” quando não houve entrega real
Ajustar o fluxo para separar os conceitos:
- `sent`: só deve significar que houve envio confirmado de forma aceitável pelo backend
- `failed`: quando o número não existe, quando o JID é inválido, ou quando a Fzap recusar

Como o projeto hoje não possui webhook/receipt implementado para confirmação real de entrega, o plano é:
- impedir os falsos positivos imediatos
- marcar como `failed` quando a validação disser que o número não está no WhatsApp
- opcionalmente, numa próxima etapa, criar confirmação real via webhook/receipts da Fzap

## 5) Atualizar também o fluxo de grupos apenas se necessário
O problema relatado é para envio individual. O ajuste principal entra em `send-messages`.

No envio para grupos, não há lookup de número individual, então o fluxo de `group_messages` só precisa ser alterado se quisermos padronizar o tratamento de `success: false` no body da Fzap.

# Arquivos a alterar
- `supabase/functions/_shared/drivers/types.ts`
  - estender a interface do driver para suportar validação de número/JID
- `supabase/functions/_shared/drivers/fzap.ts`
  - implementar `checkNumber()` usando `/user/check`
  - incluir `check: true` em `sendText()` e `sendMedia()`
  - tratar resposta HTTP 200 com `success: false` como erro
- `supabase/functions/send-messages/index.ts`
  - validar número antes do envio
  - usar o `jid` retornado
  - marcar como `failed` com erro claro quando o número não estiver no WhatsApp
- `supabase/functions/send-group-messages/index.ts`
  - opcionalmente alinhar tratamento de erro da Fzap para não confiar apenas em `r.ok`

# Resultado esperado
Depois da correção:
- números como `5566999730909` e `5537998719273` não ficarão mais como “Enviado” se não forem válidos
- quando houver correspondência com outro JID válido, o sistema enviará para o JID correto
- quando não houver correspondência, o sistema mostrará falha com mensagem do tipo:
  - `Número não cadastrado no WhatsApp`
  - ou `Número inválido / JID não encontrado`

# Detalhes técnicos
```text
Fluxo novo:
Fila -> pegar mensagem queued
     -> /user/check(phone)
        -> existe? não -> status=failed
        -> existe? sim -> usar jid retornado
     -> /chat/send/* com check=true
        -> erro -> status=failed
        -> sucesso -> status=sent
```

## Observação importante
Hoje o banco `messages.status` só tem:
- `queued`
- `sending`
- `sent`
- `failed`
- `paused`

Então, sem criar migração, a correção imediata será:
- continuar usando `sent` para envio aceito e validado
- usar `failed` quando não houver confirmação mínima de existência do número

Se você quiser a solução mais correta possível depois desta, a próxima etapa é adicionar um novo status como `accepted` e usar webhook/receipt da Fzap para marcar `delivered` ou `read` de verdade.