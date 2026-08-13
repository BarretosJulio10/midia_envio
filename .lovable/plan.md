# Conectar com Facebook em 1 clique (igual mLabs)

Hoje a tela pede Page ID, IG User ID e Access Token na mão. O objetivo é trocar isso por um botão **"Conectar com Facebook"**: você faz login com a conta que é administradora das páginas, o sistema lista automaticamente todas as páginas e os Instagram Business vinculados, e você só escolhe qual página pertence a qual empresa (ID do CSV).

## Como vai funcionar

```text
[Botão Conectar com Facebook]
        v
Login/permissões na Meta (popup)
        v
Volta com um código -> edge function troca por token de longa duração (60 dias)
        v
Lista automática: Página X (IG @loja_x), Página Y (IG @loja_y) ...
        v
Você associa cada página a um ID de empresa do CSV -> salvo em social_accounts
```

Nada de token digitado, nada de Page ID copiado. Você continua precisando, na Meta, ser administrador da página e ter o Instagram (conta Profissional/Business) vinculado à página — isso é exigência da Meta, igual no mLabs.

## O que muda no sistema

1. **Edge function `social-connect`** ganha duas ações novas:
   - `oauth_url`: devolve a URL de autorização da Meta com os escopos `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management`.
   - `oauth_callback`: recebe o `code`, troca por token de usuário, converte para token de longa duração e retorna a lista de páginas + IG vinculado (já usando o `page access token`, que não expira enquanto o token de usuário for válido).
   - A ação manual atual (`discover` por token colado) continua existindo como alternativa/fallback.
2. **Nova rota de retorno** `/oauth/facebook` no app: recebe o `code` da Meta e devolve para a tela de contas (via popup + postMessage). Essa URL é cadastrada como "Valid OAuth Redirect URI" no app da Meta.
3. **Tela `SocialAccounts`** reformulada:
   - Botão principal "Conectar com Facebook".
   - Depois do login, lista de páginas com nome, foto e o @ do Instagram detectado.
   - Para cada página, um campo "ID da empresa (CSV)" e um switch ativo/inativo. Salvar grava/atualiza as linhas de `social_accounts` (Facebook e Instagram) automaticamente.
   - Aviso claro quando a página não tem Instagram vinculado.
4. **Renovação**: `social_accounts` passa a guardar `token_expires_at`. A tela mostra "Reconectar" quando faltar menos de 7 dias, e a `publish-social` marca erro amigável ("Token expirado, reconecte a conta") em vez de falha genérica.

## O que preciso de você

Um app na Meta (developers.facebook.com) com o produto **Facebook Login** e permissões de páginas/Instagram. Dele vêm dois valores que salvo como secrets:
- `META_APP_ID`
- `META_APP_SECRET`

E na configuração do app da Meta, adicionar como Redirect URI:
`https://midiaenvios.lovable.app/oauth/facebook`

Enquanto o app estiver em modo de desenvolvimento na Meta, só contas listadas como testadores/administradores conseguem conectar; para clientes externos é preciso a revisão (App Review) das permissões — igual mLabs teve que fazer.

## Detalhes técnicos

- Graph API v21.0, fluxo OAuth server-side (`/dialog/oauth` -> `/oauth/access_token` -> `fb_exchange_token`).
- O `code` é trocado apenas na edge function, com `META_APP_SECRET` nunca exposto no frontend.
- Migração leve em `social_accounts`: colunas `page_name`, `ig_username`, `token_expires_at`, `connected_via` ('oauth' | 'manual').
- Nenhuma alteração no fluxo de WhatsApp (`send-messages`, drivers FZAP, `messages`, blacklist). Módulo social permanece isolado.
- Pendência atual mantida: token de deploy do Supabase expirado — preciso de um novo para publicar as funções.
