# Plano para corrigir o envio de figurinhas pela FZAP

## Objetivo
Fazer o PNG enviado pelo usuário virar uma figurinha nativa do WhatsApp, reconhecida como sticker real no Android e iPhone, enviada pelo endpoint `/chat/send/sticker` da FZAP com `mimeType: image/webp`, sem cair como imagem/documento e sem aparecer como “Figurinha sem etiqueta” quebrada.

## Diagnóstico atual
- O driver FZAP já chama `/chat/send/sticker`, mas hoje ele apenas baixa o arquivo e exige que ele já esteja em WEBP válido.
- A conversão atual está acontecendo no frontend via `canvas.toBlob(..., 'image/webp')`, o que não garante um WEBP compatível com sticker nativo do WhatsApp.
- A Edge Function responde `sent: 1`, então o problema não está no disparo da fila, e sim no conteúdo/montagem do sticker enviado à FZAP.
- A documentação local da FZAP confirma que o endpoint correto é `POST /chat/send/sticker` e aceita `sticker` em data URL/base64/URL, com `mimeType: image/webp`.

## Observação técnica importante
O runtime de Supabase Edge Functions normalmente não suporta `sharp` nativo. Então a implementação precisa começar verificando se esse deploy aceita `npm:sharp`; se não aceitar, será necessário usar uma alternativa compatível com Edge mantendo exatamente o mesmo contrato de saída (`image/webp`, 512x512, transparência, base64/data URL).

## O que vou implementar

### 1) Mover a conversão de sticker para o backend
- Tirar a confiança da conversão do frontend como etapa principal.
- Fazer a conversão final no driver/Edge Function antes do envio à FZAP.
- Usar o arquivo original armazenado no Storage como entrada real do pipeline.

### 2) Criar pipeline de conversão compatível com sticker WhatsApp
- Entrada: PNG/JPG enviado pelo usuário.
- Processamento:
  - resize para 512x512
  - `fit: contain`
  - fundo transparente
  - exportar como WEBP
- Garantir saída em buffer/binário válido para sticker.
- Gerar base64/data URL final com `data:image/webp;base64,...`.

### 3) Corrigir o driver FZAP para enviar sticker de forma estrita
- No branch `sticker`, sempre enviar:
  - `phone`
  - `sticker: data:image/webp;base64,...`
  - `mimeType: 'image/webp'`
  - `check: true`
- Impedir fallback silencioso para `/chat/send/image` ou `/chat/send/document`.
- Validar magic bytes do WEBP gerado antes do POST.

### 4) Adicionar logs completos de ponta a ponta
Registrar no backend:
- tipo original do arquivo
- tamanho original
- tamanho final
- mime detectado
- mime enviado
- tipo enviado (`sticker`)
- se houve conversão ou não
- resposta HTTP da FZAP
- body resumido da resposta da FZAP
- erro detalhado de conversão/download/upload

### 5) Ajustar os fluxos que alimentam a fila
Revisar e alinhar:
- `UploadSection.tsx`
- `GroupSender.tsx`
- `SavedListsManager.tsx`
- `send-messages`
- `send-group-messages`

Objetivo:
- preservar `file_type: 'sticker'`
- permitir subir o arquivo original sem depender do WEBP do browser como verdade final
- garantir que toda mensagem marcada como figurinha passe pelo mesmo pipeline backend

### 6) Validar compatibilidade com a documentação FZAP
- Confirmar aderência ao schema `MessageSticker` da documentação local.
- Validar se `pngThumbnail` é necessário ou opcional no caso real.
- Confirmar se a FZAP aceita melhor data URL ou raw base64 para sticker neste projeto; se necessário, testar ambos no driver.

### 7) Verificação final
Validar que o fluxo entrega:
- figurinha abrindo normalmente
- sem placeholder quebrado
- sem “Figurinha sem etiqueta” incorreta por payload inválido
- sem envio como documento
- compatível com Android e iPhone

## Arquivos previstos para ajuste
- `supabase/functions/_shared/drivers/fzap.ts`
- `supabase/functions/send-messages/index.ts`
- `supabase/functions/send-group-messages/index.ts`
- `src/components/UploadSection.tsx`
- `src/components/GroupSender.tsx`
- `src/components/SavedListsManager.tsx`

## Detalhes técnicos
```text
Frontend upload
  -> Storage (arquivo original)
  -> messages/group_messages com file_type='sticker'
  -> Edge Function processa fila
  -> Driver FZAP baixa original
  -> converte para WEBP sticker-safe no backend
  -> valida buffer WEBP
  -> monta data URL base64
  -> POST /chat/send/sticker
```

## Risco principal
- Se `sharp` não puder rodar no runtime do Supabase Edge desse projeto, a correção precisará usar uma biblioteca compatível com Edge para produzir o mesmo resultado. Isso não muda o comportamento final esperado, só a engine da conversão.

## Resultado esperado
O sistema deixará de apenas renomear/salvar `.webp` e passará a gerar e enviar uma figurinha real, em buffer WEBP válido, pelo endpoint correto da FZAP.