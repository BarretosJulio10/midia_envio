## Objetivo
Deixar o driver **Evolution Go** 100% funcional (criar instância → ler QR → conectar → enviar texto/mídia → grupos) seguindo a documentação oficial em `docs.evolutionfoundation.com.br/evolution-go`.

## Diagnóstico — bugs no driver atual

Comparando `supabase/functions/_shared/drivers/evolution-go.ts` com a OpenAPI oficial:

| # | Endpoint | Bug atual | Correto (docs) |
|---|---|---|---|
| 1 | `GET /instance/status` | lê `data.loggedIn` / `data.connected` (minúsculo) | retorna `data.LoggedIn` / `data.Connected` (PascalCase) — **por isso o QR nunca some após escanear** |
| 2 | `GET /instance/qr` | já trata `Qrcode`, ok | retorna `data.Qrcode` (já em `data:image/png;base64,...`) e `data.Code` |
| 3 | `POST /send/text` | envia `{ to, text, delay }` | schema é `{ number, text, delay, ... }` — **mensagem de texto não envia** |
| 4 | `POST /send/media` | envia `{ to, mediaUrl, type, caption }` | schema é `{ number, url, type, caption, filename, ... }` — **mídia não envia** |
| 5 | `GET /group/list` | já mapeia `JID`, ok | retorna `data: [{ JID, Name, ... }]` |

Auth: header `apikey` — global (creds.apiKey) para `/instance/create`; **token da instância** para todos os demais. Já está assim.

## Mudanças

### 1. `supabase/functions/_shared/drivers/evolution-go.ts`
- `getStatus`: ler `sj?.data?.LoggedIn` e `sj?.data?.Connected` (com fallback para minúsculo por segurança).
- `sendText`: trocar `to` → `number` no body.
- `sendMedia`: trocar `to` → `number`, `mediaUrl` → `url`; manter `type` (`image|video|audio|document`); para `sticker`, enviar `type: 'sticker'` (a API suporta — ver `/send/sticker` separado se necessário; manter mapeando para `image` apenas se a versão atual da API rejeitar `sticker`).
- `createInstance`: manter como está (POST `/instance/create` com `{ name, token }` global apikey, depois `/instance/connect` com apikey = token da instância).
- `resetInstance`: usar `POST /instance/logout` com apikey do instance token (já está). Adicionar fallback para `POST /instance/disconnect` se logout falhar.
- `fetchGroups`: já compatível; manter.

### 2. Validação end-to-end
Após o deploy, validar pela UI:
1. Em `/admin/drivers`, clicar **Testar conexão** no Evolution Go (deve responder HTTP < 500).
2. Em `/dashboard`, abrir conexão, gerar QR, escanear no celular.
3. Confirmar que o painel sai da tela do QR e mostra "Conectado" (status passa a `LoggedIn=true`).
4. Enviar uma mensagem de teste (texto e imagem).
5. Listar grupos.

### 3. Deploy
Redeploy das funções afetadas no projeto Supabase externo (`uvvaxwtumuabfklccjgd`):
- `fzap-status` (consome o driver — fix do status é o que faz o QR sumir)
- `send-messages`
- `send-group-messages`
- `fetch-groups`
- `wa-test-driver`

### 4. Documentação
Atualizar `AI_MEMORY.md` / `CHANGELOG.md` com a correção dos campos PascalCase e dos nomes corretos de payload (`number`/`url`).

## Fora de escopo
- Mexer nos drivers Fzap e Evolution API (oficial) — só Evolution Go agora.
- Webhooks (subscribe já é enviado no `/instance/connect`, mas o sistema atual usa polling de status; manter assim).

## Risco
Baixo: mudanças isoladas no driver Evolution Go; nenhuma alteração de schema do banco; nenhuma mudança de UI.
