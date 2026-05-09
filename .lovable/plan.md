## Problema

O envio de vídeos (e qualquer mídia que não seja imagem) está falhando com `fzap sendMedia(image) 40x` porque o sistema de envio individual está hardcoded como `image`. Os logs do print mostram arquivos `.mp4` sendo despachados com `type: 'image'` para o endpoint `/chat/send/image` do Fzap, que devolve 400.

Além disso, a detecção de tipo está duplicada (e incompleta) entre `send-messages` e `send-group-messages`, e o driver Fzap precisa de pequenos ajustes para ficar 100% compatível com a OpenAPI v1.23.0 em vídeo/áudio/documento.

## Objetivo

Tornar o envio de mídia **universal**: o mesmo pipeline detecta o tipo correto a partir da extensão/MIME e cada driver ativo (Evolution Go, Fzap, Evolution API) consome seu endpoint específico via `driver.sendMedia()`. Sem mudanças de schema, sem mudar UI.

## Mudanças

### 1. Helper compartilhado de detecção de mídia
Criar `supabase/functions/_shared/media-type.ts` com:
- `detectMediaType(filename, hint?)` → retorna `'image' | 'video' | 'audio' | 'document' | 'sticker'`
- Mapas de extensão: imagem (jpg/jpeg/png/webp/gif), vídeo (mp4/mov/webm/m4v/3gp), áudio (mp3/m4a/wav/ogg/aac/opus), sticker (.webp quando hint='sticker'), resto → document.
- Aceita `hint` para forçar sticker quando o usuário marca explicitamente.

### 2. Corrigir `supabase/functions/send-messages/index.ts` (BUG PRINCIPAL)
- Remover o hardcode `type: 'image'`.
- Gerar **signed URL** do arquivo em `whatsapp-files` (igual ao group sender) em vez de mandar a URL pública direta.
- Usar `detectMediaType(filename)` para escolher o tipo.
- Passar `fileName` no caso de document.
- Tratar `caption` opcional para áudio/sticker (não enviar).

### 3. Refatorar `supabase/functions/send-group-messages/index.ts`
- Substituir o switch de extensão local por `detectMediaType(filename, msg.file_type)`.
- Mantém a lógica de signed URL e batch existente.

### 4. Ajustes finos no driver Fzap (`_shared/drivers/fzap.ts`)
Conforme OpenAPI v1.23.0:
- `sendMedia` para `video`/`audio`/`document` aceita `caption` (manter) e o campo de mídia precisa ser **base64 ou URL**; garantir que a URL assinada está sendo enviada como string crua no campo correto.
- Adicionar `mimetype` no body quando o tipo for `audio` (Fzap exige para PTT/voice) e `audio: true` para PTT opcional.
- Para `document`, enviar `fileName` (camelCase) **e** `filename` (snake) como fallback — algumas versões do Fzap aceitam só uma das duas.
- Mensagem de erro do `sendMedia` passa a incluir o tipo e os primeiros 200 chars do response para facilitar debug futuro.

### 5. Garantir consistência nos outros drivers
- `evolution-go.ts` e `evolution-api.ts`: confirmar que `sendMedia` recebe `type` corretamente (já recebe via `SendMediaInput`). Sem mudança funcional além de garantir que `type` é repassado.

### 6. Redeploy
- `send-messages`, `send-group-messages` (consomem o helper novo).
- `_shared/drivers/fzap.ts` é compartilhado, então qualquer função que o carrega precisa redeploy: `fzap-create-instance`, `fzap-status`, `fzap-reset-instance`, `send-messages`, `send-group-messages`, `fetch-groups`, `wa-test-driver`, `test-connection`.

## Fora de escopo
- Mudanças de UI ou de schema do banco.
- Reprocessamento automático das mensagens marcadas como `failed` (usuário pode clicar **Reenviar** depois do fix).
- Suporte a Cloud API/WABA, webhooks, Chatwoot.

## Risco
Baixo. A detecção por extensão é determinística e o único caminho que muda comportamento é o sender individual (que já estava quebrado para tudo que não é imagem).
