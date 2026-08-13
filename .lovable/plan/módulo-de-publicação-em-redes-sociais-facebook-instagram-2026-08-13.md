# Módulo de Publicação em Redes Sociais (Facebook + Instagram)

## Princípio inegociável
O fluxo atual de WhatsApp (upload CSV -> fila `messages` -> `send-messages` -> driver FZAP) **não é alterado**. O módulo social é adicionado **ao lado**, como novos drivers e novas tabelas. Nenhuma coluna existente é removida, nenhuma função de envio existente muda de comportamento quando o módulo está desligado.

## Como funciona hoje (verificado no código)
- `UploadSection` recebe um CSV `id;telefone`, sobe os arquivos no bucket `whatsapp-files` e cria linhas em `messages` (status `queued`).
- A blacklist (`blacklist`) bloqueia por telefone ou por `number_ids` (os números da lista que você digita) — é exatamente o mesmo mecanismo que vamos reaproveitar para bloquear empresa inadimplente.
- `send-messages` processa **uma** mensagem por chamada; o frontend controla delay e pausa.
- Drivers ficam em `supabase/functions/_shared/drivers/` com a interface `WhatsAppDriver` e um registry por `slug` lendo a tabela `api_drivers`.

## Arquitetura proposta

```text
CSV (id;telefone;empresa)  +  mídia  +  texto
                 |
        [ criação da fila ]
          /                \
   messages (WhatsApp)   social_posts (Meta)
   driver fzap/evo       driver facebook / instagram
          \                /
        mesma blacklist (id da lista / telefone)
```

### 1. Banco de dados (tudo novo, nada alterado)
- `social_accounts` — uma linha por empresa/conta: `user_id`, `company_ref` (o mesmo id da lista/CSV), `nome`, `platform` (`facebook` | `instagram`), `page_id`, `ig_user_id`, `access_token` (criptografado/só server), `enabled`, `token_expires_at`.
- `social_posts` — fila de publicações: `user_id`, `campaign_id`, `social_account_id`, `platform`, `media_url`, `media_type`, `caption`, `status` (`queued|publishing|published|failed|blocked`), `external_post_id`, `error_message`, `published_at`.
- `social_drivers` (ou reuso de `api_drivers` com slugs `meta-facebook` / `meta-instagram`) — mantém o padrão de driver plugável.
- Todas com RLS por `user_id` + GRANTs para `authenticated` e `service_role`.

### 2. Bloqueio por blacklist (inadimplência)
A mesma checagem usada no WhatsApp é aplicada na criação da fila social:
- Se o `id` da lista estiver em `blacklist.number_ids` **ou** o telefone da empresa estiver em `blacklist.phone`, o post social é criado com status `blocked` (fica visível no painel, mas nunca publica).
- Empresa sem `social_accounts.enabled = true` simplesmente não gera post — serviço opcional por empresa.

### 3. Backend (Edge Functions novas)
- `_shared/drivers/social/types.ts` — interface `SocialDriver` (`publish`, `checkToken`, `getAccountInfo`).
- `_shared/drivers/social/facebook.ts` — Graph API: foto `POST /{page-id}/photos`, vídeo `POST /{page-id}/videos`, texto `POST /{page-id}/feed`.
- `_shared/drivers/social/instagram.ts` — fluxo em 2 etapas: `POST /{ig-user-id}/media` (container, com `image_url`/`video_url` + `caption`) e `POST /{ig-user-id}/media_publish`; para vídeo/Reels, polling de `status_code`.
- `publish-social` — processa **um** post por chamada (mesmo padrão de `send-messages`), respeitando rate limit da Meta.
- `social-connect` — troca o código OAuth por token de longa duração e descobre páginas/contas IG vinculadas.

Requisitos Meta: App do Facebook em modo Live, com `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management`. A conta do Instagram precisa ser **Business** vinculada a uma Página. A mídia precisa estar em URL pública — usaremos URL assinada do Storage com validade longa (a Meta baixa o arquivo no momento da criação do container).

### 4. Frontend
- Nova aba **"Redes Sociais"** no `Dashboard` (ao lado de Individual e Grupos) — as abas existentes não mudam.
- Tela **Contas**: conectar Facebook/Instagram por empresa, ligar/desligar o serviço, ver validade do token.
- No `UploadSection`, um checkbox opcional **"Publicar também nas redes sociais"**. Desmarcado = comportamento atual, byte a byte.
- Tabela de fila social com status, erro e botão de reenvio, no mesmo estilo do `QueueTable`.

## Segurança
- Tokens da Meta nunca chegam ao frontend: ficam na tabela protegida por RLS e são lidos apenas por Edge Function com `service_role`. `App Secret` da Meta vai para os secrets do projeto.
- Validação de entrada (Zod) nas funções novas.
- RLS estrita por `user_id` em todas as tabelas novas.

## Fases de entrega
1. **Fase 1 — Fundação:** tabelas + RLS + interface `SocialDriver` + tela de contas (sem publicar nada ainda).
2. **Fase 2 — OAuth Meta:** `social-connect`, listagem de páginas/IG, armazenamento seguro de tokens, teste de conexão.
3. **Fase 3 — Publicação:** `publish-social` + drivers Facebook e Instagram + fila com blacklist aplicada.
4. **Fase 4 — Integração no upload:** checkbox opcional no `UploadSection` gerando fila social junto com a fila do WhatsApp.
5. **Fase 5 — Operação:** reenvio de falhas, renovação de token, logs e atualização de `AI_MEMORY.md` / `CHANGELOG.md`.

## Viabilidade
Alta. A arquitetura de drivers e o padrão "uma unidade por chamada" já existem e se encaixam perfeitamente na Graph API. O maior custo não é código: é a **revisão do App na Meta** para liberar as permissões de publicação — isso precisa ser iniciado cedo, em paralelo com a Fase 1.
