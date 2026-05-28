## Objetivo
Corrigir apenas a exibição da figurinha no Fzap, sem mexer no restante do sistema de fila, banco, UI ou outros tipos de mídia.

## Diagnóstico
- O frontend já faz a parte principal da conversão: gera **WEBP 512×512** antes do upload quando a opção de figurinha está marcada (`src/components/UploadSection.tsx`).
- O envio atual do Fzap usa `/chat/send/sticker` com `sticker: <signedUrl>` e `mimeType: 'image/webp'` (`supabase/functions/_shared/drivers/fzap.ts`).
- A documentação real do Fzap confirma que sticker aceita **URL HTTPS** ou **data URL/base64**, mas o sintoma mostrado (“Figurinha sem etiqueta”, 8 B) é compatível com o WhatsApp recebendo um sticker inválido/incompleto apesar de a mensagem ser entregue.
- Como o fluxo já funcionava com Evolution e a conversão no frontend já existe, a correção mínima deve ficar **no endpoint do driver Fzap**, não no restante da aplicação.

## Plano
1. **Manter a conversão atual do frontend como está**
   - Não alterar `UploadSection.tsx`, fila, storage, banco ou `send-messages/index.ts`.
   - O WEBP 512×512 já está sendo gerado e salvo corretamente.

2. **Ajustar somente o branch de sticker em `supabase/functions/_shared/drivers/fzap.ts`**
   - Quando `p.type === 'sticker'`, em vez de enviar a **URL assinada** diretamente no campo `sticker`, baixar o arquivo WEBP e enviar para o Fzap como **`data:image/webp;base64,...`**.
   - Montar um payload mínimo e específico para sticker, sem reutilizar a lógica dos outros tipos.
   - Manter o endpoint `/chat/send/sticker` e o campo `sticker`, mas tornar o conteúdo determinístico para o Fzap/WhatsApp.

3. **Limitar o payload de sticker ao estritamente necessário**
   - Usar apenas os campos compatíveis com a doc para sticker.
   - Não tocar no comportamento de `image`, `video`, `audio` e `document`.
   - Não alterar o fluxo de detecção de mídia.

4. **Validar apenas o cenário afetado**
   - Testar envio de uma imagem marcada como figurinha.
   - Confirmar que chega renderizada no WhatsApp, sem placeholder de 8 B.

## Detalhes técnicos
- **Arquivo alvo:** `supabase/functions/_shared/drivers/fzap.ts`
- **Sem mudanças em:**
  - `src/components/UploadSection.tsx`
  - `supabase/functions/send-messages/index.ts`
  - banco/migrations
  - outros drivers
- **Motivo técnico da correção:** a conversão visual já existe; o ponto instável é o formato em que o sticker é entregue ao endpoint do Fzap.

## Fora de escopo
- Refatorar o sistema de upload
- Alterar filas ou tabelas
- Mexer em grupos
- Ajustar outros tipos de mídia
- Fazer mudanças visuais na interface