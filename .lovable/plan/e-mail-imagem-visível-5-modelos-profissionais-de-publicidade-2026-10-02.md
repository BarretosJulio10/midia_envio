# E-mail: imagem visível + 5 modelos profissionais de publicidade

Só o módulo de E-mail muda. WhatsApp, redes sociais, blacklist e filas atuais continuam iguais.

## 1. Corrigir a imagem que não aparece
- A imagem estava salva numa pasta privada, então o Gmail/Outlook não conseguia abrir.
- Criar uma pasta pública própria para imagens de e-mail (`email-assets`) e passar a enviar as imagens novas para ela.
- A prévia e o e-mail recebido usam o mesmo link público.

## 2. Galeria com 5 modelos
No editor, antes do texto, aparece uma galeria com miniaturas. Você escolhe o modelo e só preenche textos, imagem e link:

1. **Promoção** – faixa colorida no topo, imagem grande, título forte, botão de destaque.
2. **Newsletter** – cabeçalho com nome da empresa, imagem, título, texto, botão discreto.
3. **Lançamento** – fundo escuro elegante, imagem central, título grande, botão claro.
4. **Evento/Convite** – cartão centralizado, título, texto, botão "Confirmar presença".
5. **Minimalista** – fundo branco, tipografia limpa, imagem e botão simples.

Campos editáveis (iguais para todos): título, subtítulo/texto, imagem, texto do botão, link do botão, nome da empresa no rodapé e cor principal.

## 3. Prévia
A prévia ao vivo (computador/celular) troca na hora quando você muda de modelo. "Enviar teste para mim" continua funcionando.

## Detalhes técnicos
- Bucket público `email-assets` criado via API do Supabase (projeto `uvvaxwtumuabfklccjgd`), com política de upload para usuários autenticados na pasta `{user_id}/`.
- `buildEmailHtml` recebe `template` (`promo | newsletter | launch | event | minimal`), `title`, `accentColor`; layouts em tabela, estilos inline, compatíveis com Outlook e mobile. Cópia idêntica em `supabase/functions/_shared/email-template.ts`.
- Colunas novas em `email_campaigns`: `template text default 'minimal'`, `title text`, `accent_color text` (migração aditiva, sem alterar dados existentes).
- `EmailComposer`: galeria de modelos, novos campos, upload para `email-assets`.
- `send-emails`: passa os novos campos ao template; redeploy da função.
