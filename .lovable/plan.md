## Problema

1. **Envios individuais ignoram pausas/delays.** O frontend (`IndividualSender.tsx`) já implementa toda a orquestração (delay aleatório entre msgs, `pause_after`, `pause_duration`) chamando `send-messages` em loop esperando **1 mensagem por chamada** e o flag `moreRemaining`. Mas o backend `send-messages/index.ts` processa **até 10 mensagens em sequência sem delay** e **não retorna `moreRemaining`/`sent`/`failed`**. Resultado: dispara 10 de uma vez e o loop morre após o 1º batch (porque `more` vem `undefined`).

2. **Driver Fzap manda campos errados para áudio.** Spec oficial (`fzapdoc.md` /chat/send/audio) usa `ptt: true` (e opcional `delay`) — não existe `mimetype` em JSON. Atualmente o driver envia `body.mimetype = 'audio/ogg; codecs=opus'`, que o Fzap ignora ou rejeita; voice messages não saem como PTT.

3. **Document manda `filename` lowercase além de `fileName`.** Spec só documenta `fileName`; `filename` é ruído (inofensivo, mas remover por higiene).

## Mudanças

### A) `supabase/functions/send-messages/index.ts`
- Aceitar `action: 'start' | 'pause' | 'retry'`.
- Para `'start'`: pegar **1** mensagem `queued` (não 10), processá-la e retornar `{ success, processed, sent, failed, moreRemaining }` onde `moreRemaining = (count de queued restantes > 0)`.
- Para `'retry'`: `UPDATE messages SET status='queued', error_message=null WHERE user_id=? AND status='failed'` e retornar `{ success: true }`.
- Para `'pause'`: apenas `{ success: true }` (frontend já controla via ref).
- Manter detecção de tipo via `detectMediaType` + signed URL (já está correto).

### B) `supabase/functions/_shared/drivers/fzap.ts` — método `sendMedia`
- Áudio: remover `body.mimetype`; adicionar `body.ptt = true` (envia como voice message com waveform).
- Document: remover `body.filename` (lowercase); manter apenas `body.fileName`.
- Image/video/sticker: payload já está correto (`phone`, campo do tipo, `caption` opcional).

### C) `supabase/functions/send-group-messages/index.ts`
Já respeita `safeBatch` + delay aleatório internamente (modelo diferente, ok). Sem mudança.

## Arquivos NÃO alterados
- Frontend (`IndividualSender.tsx`, `GroupSender.tsx`, `ConfigDialog.tsx`) — já correto.
- Drivers `evolution-go.ts` / `evolution-api.ts` — fora do escopo desta correção.
- Schema do banco — nenhuma alteração necessária.

## Como validar (após você aplicar e re-deployar as functions no seu Supabase externo)
1. Configurar `pause_after=3`, `delay_min=8000`, `delay_max=12000`.
2. Enfileirar 8 mensagens (texto + 1 vídeo + 1 áudio).
3. Esperado: envia 1 → aguarda 8–12s → envia 1 → … → após 3, pausa por `pause_duration` → retoma. Vídeo entrega como vídeo, áudio como mensagem de voz (PTT) com waveform.

## Observação sobre deploy
Não tenho conexão direta com seu Supabase externo nesta sessão (sem `PG*` env vars / connector). Vou alterar apenas o código do repositório; você precisa rodar `supabase functions deploy send-messages` (e implicitamente o `_shared` é incluído em todas as functions que o importam) no seu projeto externo.
