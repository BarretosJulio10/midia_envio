## Objetivo
Reescrever o driver **Fzap** (`supabase/functions/_shared/drivers/fzap.ts`) seguindo a OpenAPI oficial v1.23.0 (arquivo enviado), para que a troca de driver em `/admin/drivers` deixe o Fzap 100% funcional sem novos deploys.

## Diagnóstico — bugs no driver atual

| # | Problema | Correto (docs Fzap v1.23.0) |
|---|---|---|
| 1 | `createInstance` chama `POST /instance/create` (não existe no Fzap) com header `apikey` | Endpoint correto: `POST /admin/users` com header `Authorization: <ADMIN_TOKEN>`, body `{ name, token }` |
| 2 | Header de auth nas chamadas usa `apikey` em alguns lugares | Fzap usa **dois** headers: `Authorization` para `/admin/*` (admin token), e `token` para todos os endpoints de usuário (`/session/*`, `/chat/*`, `/group/*`) |
| 3 | `getStatus` lê `qr` minúsculo | `GET /session/qr` retorna `data.QRCode` (já no formato `data:image/png;base64,...`) — renderizar direto |
| 4 | `getStatus` não força reconexão quando o socket cai | Docs: se QR expirar ou websocket fechar, é preciso `POST /session/connect` de novo antes de pedir QR |
| 5 | `resetInstance` só chama `/session/logout` | Adicionar fallback `POST /session/disconnect` e oferecer `POST /session/reset` (limpa estado persistido) |
| 6 | `fetchGroups` espera `data` como array | `GET /group/list` retorna `data.groups[]` com campos `jid`, `name`, `participants[]` |
| 7 | `sendMedia` usa fileName mas não envia `imageQualityHD`, `mimeType` etc. | Manter simples; aceitar URL HTTPS (Fzap baixa com cache) — campos por tipo: `image`, `video`, `audio`, `document`, `sticker` |

## Arquitetura

### Credenciais
A tabela `api_drivers` guarda **uma** chave por driver (`api_key`). Para o Fzap precisamos de duas:
- **Admin token** → criar instâncias (`/admin/users`)
- **User/instance token** → operações do dia a dia (criado em `createInstance`, salvo em `fzap_config.token`)

Solução: usar `api_drivers.api_key` como **admin token**. O token de cada instância continua sendo gerado por `createInstance` (`token-${userId.substring(0,8)}`) e enviado no `POST /admin/users`. Sem mudança de schema.

(Se no futuro o Fzap precisar de outras credenciais — ex. URL Cloud API — usar o campo `config jsonb` que já existe na tabela.)

## Mudanças

### `supabase/functions/_shared/drivers/fzap.ts` — reescrita completa

- **`createInstance({ instanceName, userId })`**:
  1. `POST {baseUrl}/admin/users` com header `Authorization: <admin_token>` e body `{ name: instanceName, token: instanceToken }`. Idempotente: se 409/já existe, segue.
  2. `POST {baseUrl}/session/connect` com header `token: <instanceToken>` e body `{ immediate: true }` para iniciar fluxo QR.
  3. Retorna `{ token: instanceToken, logs }`.

- **`getStatus({ instanceName, token })`**:
  1. `GET /session/status` com header `token`. Lê `data.loggedIn` e `data.connected`.
  2. Se `connected=false`, dispara `POST /session/connect` (reanima websocket).
  3. Se não está logado, `GET /session/qr` → `data.QRCode` (já é `data:image/png;base64,...`). Se vazio, espera próximo poll.
  4. Retorna `{ connected, loggedIn, qrCode, logs }`.

- **`resetInstance({ token })`**:
  1. `POST /session/logout` (token header).
  2. Se falhar, `POST /session/disconnect` como fallback.
  3. (Opcional) `POST /session/reset` para limpar estado persistido.

- **`sendText({ token, to, text })`**:
  - `POST /chat/send/text` com `{ phone: to, body: text }`.

- **`sendMedia({ token, to, mediaUrl, type, caption, fileName })`**:
  - Mapeia `type` → endpoint:
    - `image` → `/chat/send/image` body `{ phone, image: mediaUrl, caption }`
    - `video` → `/chat/send/video` body `{ phone, video: mediaUrl, caption }`
    - `audio` → `/chat/send/audio` body `{ phone, audio: mediaUrl }`
    - `document` → `/chat/send/document` body `{ phone, document: mediaUrl, fileName, caption }`
    - `sticker` → `/chat/send/sticker` body `{ phone, sticker: mediaUrl }`
  - Header `token`. Aceita URL HTTPS (Fzap baixa com cache).

- **`fetchGroups({ token })`**:
  - `GET /group/list` com header `token`. Mapeia `data.groups[] → { id: g.jid, name: g.name, participants: g.participants?.length ?? 0 }`.

- **`testConnection()`**:
  - `GET /admin/users` com `Authorization: <admin_token>` para validar admin token (status < 500 = ok).

### Validação
1. Em `/admin/drivers`, editar Fzap: preencher `base_url` (URL da Fzap) e `api_key` (admin token).
2. Clicar **Testar conexão** → deve responder OK.
3. Clicar **Ativar**.
4. No Dashboard, abrir conexão → deve criar usuário no Fzap, exibir QR e detectar `loggedIn=true` ao escanear.
5. Enviar uma mensagem de teste (texto + imagem por URL).
6. Listar grupos.
7. Botão **Desconectar** chama `/session/logout` + `/session/disconnect`.

### Deploy
Como só o arquivo `_shared/drivers/fzap.ts` muda, redeploy das funções que carregam o driver:
- `fzap-create-instance`
- `fzap-status`
- `fzap-reset-instance`
- `send-messages`
- `send-group-messages`
- `fetch-groups`
- `wa-test-driver`
- `test-connection`

### Documentação
Atualizar `AI_MEMORY.md` / `CHANGELOG.md` com a correção dos endpoints Fzap (`/admin/users`, headers `Authorization` vs `token`, response `data.QRCode` e `data.groups`).

## Fora de escopo
- Suporte ao modo **Cloud API (WABA)** do Fzap (`providerType: "cloudapi"`). Apenas `whatsmeow` (QR) por enquanto.
- Webhooks Fzap (`/webhook`) — sistema atual usa polling.
- Endpoints Chatwoot, Newsletter, Community, Typebot, paid-traffic.

## Risco
Baixo. Mudança isolada em um único arquivo de driver. Schema do banco e UI não mudam. Evolution Go (driver ativo atualmente) não é afetado.
