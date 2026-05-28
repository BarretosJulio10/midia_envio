## Problema

Ao enviar como **figurinha**, o sistema sobe o PNG/JPG original e chama `/chat/send/sticker` passando a URL. A Fzap entrega o arquivo, mas o WhatsApp **não renderiza** stickers que não estejam em **WEBP 512×512** — por isso aparece o placeholder "Figurinha sem etiqueta" com 8 B no celular do destinatário (a thumbnail nem chega a baixar).

A doc Fzap v1.23 (linha 6889) é explícita: *"Sticker file (preferably image/webp)"*. WhatsApp/whatsmeow exige WEBP quadrado ≤ 512 px.

## Solução

Converter cada imagem para **WEBP 512×512** no navegador (via `<canvas>` + `canvas.toBlob('image/webp')`) **antes do upload** quando a opção "Enviar como figurinha" estiver marcada. O resto do fluxo continua igual: upload no Storage, fila em `messages` com `file_type='sticker'`, edge function `send-messages` chama `/chat/send/sticker`.

Como reforço, na edge function passamos também `mimeType: "image/webp"` no body do sticker, conforme a spec (campo opcional, mas remove ambiguidade).

### Alterações

1. **`src/components/UploadSection.tsx`**
   - Nova função `convertToStickerWebp(file)`:
     - Carrega imagem em `<img>` → desenha em `<canvas>` 512×512 com `object-fit: contain` (fundo transparente, sem distorcer aspecto).
     - Exporta via `canvas.toBlob(blob, 'image/webp', 0.9)`.
     - Retorna novo `File` com extensão `.webp` e `type: 'image/webp'` (mantém o `id`/nome-base original do CSV para casar com o telefone).
   - No loop de upload (linhas ~191-224), se `sendAsSticker === true` e o arquivo for imagem (`image/*`), substitui `file` pelo resultado da conversão antes do `supabase.storage.upload`.
   - Aplica também no branch de "salvar lista" (~linhas 130-160).
   - Se a conversão falhar (formato não suportado pelo canvas, ex.: HEIC), pula o item com `toast.warning` claro e continua.

2. **`supabase/functions/_shared/drivers/fzap.ts`** — em `sendMedia`, quando `p.type === 'sticker'`, adicionar `body.mimeType = 'image/webp'` no payload.

3. **`supabase/functions/_shared/media-type.ts`** — sem mudanças; já respeita o `hint='sticker'`.

### Fora de escopo

- `send-group-messages` (mesmo padrão; pode ser feito num passo futuro se você usar figurinha em grupo).
- Conversão server-side (não precisa: o navegador resolve sem custo).
- Alterar endpoint, fluxo de fila, retry, validação de número, vídeo.

### Risco

Baixo. Mudança isolada no upload + 1 linha na edge function. Imagens já enviadas como sticker no banco não retroagem — só novas filas serão convertidas.

### Validação

Após implementar, fazer upload de um PNG com "Enviar como figurinha", processar fila e confirmar que chega no WhatsApp como figurinha renderizada (não mais "Figurinha sem etiqueta / 8 B"). Redeploy da função `send-messages` no projeto `uvvaxwtumuabfklccjgd`.
