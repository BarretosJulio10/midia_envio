# Corrigir erro do botão "Conectar com Facebook"

## Causa confirmada
No seu Supabase não existem as chaves `META_APP_ID` e `META_APP_SECRET`. Sem elas o sistema não consegue abrir o login do Facebook e devolve o erro "Edge Function returned a non-2xx status code".

## O que você precisa fazer (na Meta)
1. Entre em developers.facebook.com -> Meus Apps -> Criar app (tipo "Empresa").
2. Adicione o produto **Login do Facebook para Empresas**.
3. Em Configurações do Login, cadastre como URI de redirecionamento válido:
   `https://midiaenvios.lovable.app/oauth/facebook`
   (e também `https://id-preview--84f4e66b-2cac-41d6-9612-c8e2291c24e8.lovable.app/oauth/facebook` para testar no preview)
4. Em Configurações -> Básico copie o **ID do app** e a **Chave secreta do app** e me envie.

## O que eu faço depois
1. Cadastro `META_APP_ID` e `META_APP_SECRET` direto no seu Supabase.
2. Melhoro a mensagem de erro na tela: em vez de "non-2xx", aparece o motivo real (ex.: "Chave da Meta não configurada").
3. Testo o botão até abrir a janela de login do Facebook.

## Detalhes técnicos
- `social-connect` ação `oauth_url` lança erro quando `META_APP_ID` falta; o front não lê `error.context`.
- Ajuste em `SocialAccounts.tsx`: ler o corpo do `FunctionsHttpError` e mostrar no aviso.
- Nenhuma alteração no WhatsApp ou e-mail.
