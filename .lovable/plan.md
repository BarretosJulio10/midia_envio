# Plano — Corrigir QR Code da instância Fzap

## Diagnóstico baseado no spec-4.yml (oficial v1.23.0)

Lendo o spec linha por linha (4114-4187 e 3692-3714), a resposta de `GET /session/qr` é:

```yaml
data:
  QRCode: "data:image/png;base64,...."   # uppercase Q, R, C
```

**Erro histórico no projeto:** uma iteração anterior trocou tudo para `data.qrCode` (camelCase), com base em uma suposição errada. O spec real diz **`data.QRCode`**. O código atual ainda tem `qrCode` como primeira opção do fallback, então pode até funcionar por sorte, mas o canônico está invertido.

Estado atual no banco (`evolution_config`): `token=""`, `instance_created=false`, `qr_code=null` — confirma que a última tentativa de criar instância não persistiu nada utilizável (provavelmente caiu no catch ou polling expirou sem QR).

## Causa raiz provável

1. Ordem de fallback de extração no Edge Function prioriza `qrCode` (errado pelo spec). Se a Fzap retornar `QRCode` (correto), funciona via fallback — mas se algum middleware normalizar JSON, pode falhar silenciosamente.
2. Fluxo do spec exige: `connect` → aguardar resposta com `loggedIn:false` → poll `/session/qr` até `data.QRCode` não vazio. O código já faz isso, mas:
   - O `connect` é feito com `{ immediate: true }` — o spec não menciona esse parâmetro; pode não ter efeito ou alterar comportamento. Spec recomenda `connect` puro.
   - Polling de 25 × 1.5s (~37s) pode ser curto se a Fzap demorar a emitir o primeiro QR (spec diz ser assíncrono, sem garantia de tempo).
3. Frontend: `setQrCode(current => current !== data.qrCode ? data.qrCode : current)` — está OK, mas `data.qrCode` vem do edge function (que já normaliza). Se o edge function devolver string vazia no primeiro retorno, o `<img src="">` quebra.

## Correções propostas

### 1. `supabase/functions/evolution-create-instance/index.ts`
- Reordenar extração para **prioridade do spec**: `data?.data?.QRCode` primeiro, depois fallbacks defensivos.
- Remover `body: JSON.stringify({ immediate: true })` do `/session/connect` — usar POST sem body conforme spec.
- Aumentar polling para 40 tentativas × 1.5s = 60s. Se ainda assim vazio, retornar mensagem clara "QR ainda não emitido — aguarde polling de status".
- Logar resposta crua completa de `/session/qr` na primeira tentativa para diagnóstico futuro.

### 2. `supabase/functions/evolution-status/index.ts`
- Mesma reordenação: `data?.data?.QRCode` primeiro.
- Remover `{ immediate: true }` do reconnect.
- Quando `loggedIn=false` e QR vazio + `connected=false`, disparar `/session/connect` (já faz). Quando `connected=true` e QR vazio, **continuar polling** (não reconnectar — apenas aguardar Fzap emitir).

### 3. `src/components/ConfigDialog.tsx`
- Garantir que `<img>` só renderize quando `qrCode.length > 50` (já tem `qrCode ?` mas string vazia também é truthy se for `""`? Não — `""` é falsy. OK).
- Quando `handleCreateInstance` retornar sem QR (`data.qrCode === ""`), **ainda assim ir para step "qrcode"** com loader "Aguardando QR Code..." e deixar o polling do `evolution-status` capturar quando emitir.
- Já faz isso na prática, mas adicionar UI explícita de loader para o caso `qrCode === ""`.

### 4. Validação
- Após deploy, criar instância via UI, observar logs do edge function (`server-function-logs`) confirmando que linha bruta do `/session/qr` traz `data.QRCode: "data:image/png;base64..."`.
- Validar visualmente que `<img>` renderiza no modal.

## Arquivos afetados

- `supabase/functions/evolution-create-instance/index.ts`
- `supabase/functions/evolution-status/index.ts`
- `src/components/ConfigDialog.tsx`

## Não muda

- Tabela `evolution_config`, RLS, secrets.
- Endpoints de admin (`/admin/users`) já estão corretos.
- Endpoints de envio de mensagem.
