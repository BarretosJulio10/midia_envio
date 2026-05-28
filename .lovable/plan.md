## Objetivo
Corrigir apenas o fluxo de figurinha para que arquivos PNG marcados como sticker cheguem e renderizem corretamente no WhatsApp, sem alterar fila, banco, UI, outros tipos de mídia ou o restante do sistema.

## Diagnóstico já confirmado
- O frontend já tenta converter imagem para **WEBP 512x512** em `src/components/UploadSection.tsx`.
- A fila persiste `file_type: 'sticker'`, então a edge function de envio identifica o item como figurinha.
- `send-messages/index.ts` já encaminha corretamente `type: 'sticker'` para o driver.
- A doc local do Fzap (`fzapdoc.md`) mostra que `/chat/send/sticker` aceita:
  - `sticker` em **data URL/base64**
  - `sticker` em **URL HTTPS**
  - `sticker` em **multipart/form-data** com binário
  - `mimeType: image/webp` opcional
- Como o envio “vai” mas a mídia aparece vazia/cinza no WhatsApp, a quebra mais provável está no **handoff final para o Fzap/WhatsApp**, não na fila.

## Plano
1. **Validar o ponto exato da quebra no pipeline de sticker**
   - Conferir se o arquivo que sai do frontend é realmente WEBP válido e não só renomeado.
   - Confirmar se o driver do Fzap está mandando sticker no formato mais compatível com o endpoint real.
   - Comparar o fluxo atual com o comportamento antigo que funcionava no provider anterior, sem reintroduzir lógica dele.

2. **Corrigir somente o branch de sticker no driver Fzap**
   - Ajustar `supabase/functions/_shared/drivers/fzap.ts` para usar o formato de envio mais determinístico para sticker.
   - A mudança prevista é trocar o envio JSON atual por **upload binário `multipart/form-data`**, com `sticker` como arquivo real e `mimeType: image/webp`, porque a própria documentação do Fzap lista esse modo e ele evita corrupção/serialização do conteúdo no caminho.
   - Manter o endpoint `/chat/send/sticker` e não tocar nos branches de `image`, `video`, `audio` e `document`.

3. **Endurecer a validação da figurinha sem expandir escopo**
   - No branch de sticker, validar o arquivo baixado antes do envio ao Fzap.
   - Se o conteúdo não for WEBP válido, falhar com erro explícito em vez de “enviar com sucesso” uma figurinha quebrada.
   - Não alterar o fluxo de upload para outros arquivos.

4. **Revisar a conversão do frontend apenas se necessário**
   - Se a validação mostrar que o arquivo salvo não é um WEBP real, corrigir somente `src/components/UploadSection.tsx` para garantir a conversão PNG → WEBP antes do upload.
   - Se o arquivo já estiver correto, o frontend fica intacto.

5. **Validar apenas o cenário afetado**
   - Testar envio de uma imagem PNG marcada como figurinha.
   - Confirmar que chega como sticker renderizado no WhatsApp, sem bloco cinza/placeholder.
   - Confirmar que outros tipos de mídia continuam intocados.

## Arquivos que podem entrar na implementação
- `supabase/functions/_shared/drivers/fzap.ts`
- `src/components/UploadSection.tsx` **somente se a validação provar que a conversão está saindo errada**

## Fora de escopo
- Refatorar fila
- Alterar banco/migrations
- Mudar UI
- Mexer em grupos, documentos, imagens, áudio ou vídeo
- Reescrever `send-messages/index.ts` sem necessidade

## Detalhes técnicos
- Referência da doc local do Fzap:
  - `/chat/send/sticker`: aceita `data URL`, `raw base64`, `HTTPS URL` e `multipart/form-data`
  - `MessageSticker`: suporta `mimeType: image/webp`
- Hipótese principal: o problema não é a marcação `sticker`, e sim o **formato efetivo entregue ao Fzap**; por isso a mensagem sai, mas o WhatsApp não consegue renderizar a mídia como figurinha válida.