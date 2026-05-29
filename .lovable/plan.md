# Plano de correção

## Objetivo
Fazer a FZAP receber e encaminhar a mídia como sticker nativo do WhatsApp, evitando o comportamento atual de arquivo quebrado/"Figurinha sem etiqueta".

## O que vou corrigir

1. **Remover a conversão principal do frontend**
   - Parar de depender do `canvas.toBlob(..., 'image/webp')` em `UploadSection.tsx` e `GroupSender.tsx` como etapa principal do fluxo.
   - O frontend continuará apenas marcando `file_type: 'sticker'` e enviando o arquivo original.

2. **Padronizar a conversão no backend**
   - Garantir que o driver FZAP converta sempre o arquivo original para sticker compatível.
   - Revisar o pipeline atual em `sticker-convert.ts` para produzir um WEBP realmente adequado ao WhatsApp/FZAP.

3. **Corrigir o payload enviado à FZAP**
   - Validar o uso de `/chat/send/sticker` com `sticker`, `mimeType: image/webp` e, se necessário, incluir `pngThumbnail`.
   - Confirmar se a FZAP aceita melhor `data URL`, base64 puro ou `multipart/form-data` neste caso e padronizar o envio.

4. **Melhorar logs de diagnóstico**
   - Adicionar logs completos no backend para tamanho final, MIME detectado, MIME enviado, tipo de mensagem enviado, modo de payload usado e resposta completa da FZAP.
   - Logar explicitamente quando o frontend subir PNG original vs WEBP convertido.

5. **Eliminar ambiguidades no fluxo**
   - Garantir que `file_type: 'sticker'` seja preservado em upload individual, grupos e listas salvas.
   - Verificar se algum trecho ainda reclassifica `.webp` como imagem comum em vez de sticker.

6. **Validar o resultado final**
   - Conferir que o arquivo não chega mais como documento/imagem.
   - Confirmar que o backend usa o endpoint correto e que o WhatsApp abre a figurinha normalmente.

## Arquivos envolvidos
- `src/components/UploadSection.tsx`
- `src/components/GroupSender.tsx`
- `src/components/SavedListsManager.tsx` (se necessário para preservar `file_type`)
- `supabase/functions/_shared/sticker-convert.ts`
- `supabase/functions/_shared/drivers/fzap.ts`
- `supabase/functions/send-messages/index.ts`
- `supabase/functions/send-group-messages/index.ts`

## Diagnóstico atual
- O endpoint documentado está correto: `POST /chat/send/sticker`.
- A doc local da FZAP aceita `sticker` em data URL/base64/URL e `mimeType: image/webp`.
- O frontend ainda converte e salva `.webp` antes do backend, o que pode estar contaminando o fluxo.
- O backend já tenta converter para WEBP, mas ainda falta validar se o formato gerado e o corpo enviado batem exatamente com o que a FZAP/WhatsApp espera para sticker nativo.

## Detalhes técnicos
- Vou centralizar a conversão no backend para eliminar variação entre navegadores.
- Vou revisar se o pipeline precisa gerar também thumbnail PNG/base64 para compatibilidade com FZAP/whatsmeow.
- Vou comparar o envio atual com o schema `MessageSticker` documentado e ajustar o serializador final.
- Se o problema for limitação do runtime Edge para processamento pesado, eu proponho a menor mudança necessária após validar isso no código.

## Resultado esperado
- PNG enviado pelo usuário.
- Conversão automática server-side para sticker WEBP 512x512 com transparência.
- Envio via `/chat/send/sticker` como sticker nativo.
- Sem placeholder quebrado, sem envio como documento, sem "figurinha sem etiqueta" inválida.