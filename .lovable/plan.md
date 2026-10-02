# Disparador de E-mail (novo módulo, via Resend)

Uma nova aba **E-mail** no painel, separada de tudo que já existe. Você escolhe uma lista de e-mails (salva ou nova), monta a mensagem com imagem, texto e botão de link, vê na hora como o cliente vai receber e manda para a fila. Os envios saem pela Resend, um por vez, com intervalo e pausa. **Nada do que já existe é alterado** — WhatsApp, redes sociais, blacklist e filas atuais continuam iguais.

## Como vai funcionar

```text
Aba "E-mail"
  1. Lista: usar uma salva  OU  subir CSV novo (só a coluna email)
  2. Mensagem: assunto + imagem + texto + botão com link
  3. Prévia ao vivo (como o cliente vai ver)
        v
  Blacklist de e-mail remove quem não pode receber
        v
  Fila -> 1 e-mail por vez, com intervalo/pausa
        v
  Status por linha: na fila / enviado / falhou (motivo) / bloqueado
```

## O que vai ter na tela

1. **Listas de e-mail salvas**
   - Subir CSV com uma única coluna `email` (com ou sem cabeçalho). E-mails inválidos e repetidos são ignorados, com aviso de quantos.
   - Salvar a lista com um nome.
   - Gerenciar listas: ver, **editar** (renomear, adicionar/remover e-mails), **excluir**.
   - Na hora de enviar: escolher **"Usar lista salva"** ou **"Nova lista"**.
2. **Editor da mensagem** (lado esquerdo)
   - Assunto.
   - Imagem (upload) — aparece no corpo do e-mail.
   - Texto da mensagem (com quebras de linha).
   - **Botão de ação** opcional: texto do botão (ex.: "Ver oferta") + link (ex.: https://...). Você pode ligar/desligar.
3. **Prévia ao vivo** (lado direito)
   - Mostra exatamente o e-mail montado: remetente, assunto, imagem, texto e botão, no visual de uma caixa de entrada.
   - Alternar entre visual de computador e de celular.
   - Botão "Enviar teste para mim" para conferir no seu próprio e-mail antes do disparo.
4. **Blacklist de e-mail**: campo para digitar endereços bloqueados (separada da blacklist do WhatsApp).
5. **Fila**: destinatário, status, horário e motivo da falha; botões iniciar, pausar, reenviar falhados e limpar.
6. **Configurações**: e-mail e nome do remetente, intervalo mínimo/máximo e pausa a cada N envios.

## O que preciso de você

- Conectar sua conta da **Resend** (aparece um cartão para conectar quando eu for implementar).
- Ter um **domínio verificado na Resend** (ex.: suaempresa.com.br). Sem isso, a Resend só entrega para o seu próprio e-mail.

## Detalhes técnicos

- Novas tabelas, sem tocar nas existentes, todas com RLS por `user_id` e grants:
  - `email_lists` (id, name, emails text[], created_at, updated_at)
  - `email_config` (from_email, from_name, delay_min, delay_max, pause_after, pause_duration)
  - `email_campaigns` (subject, body_text, image_url, button_text, button_url, list_id)
  - `email_messages` (fila: campaign_id, to_email, status, resend_id, error_message, sent_at)
  - `email_blacklist` (email)
- Template HTML único gerado por uma função compartilhada (`buildEmailHtml`), usada **tanto na prévia quanto no envio**, garantindo que o que você vê é o que o cliente recebe. Layout em tabela compatível com Gmail/Outlook, texto escapado, imagem com `alt`, botão como link estilizado.
- Validação com zod: e-mail válido, assunto ≤ 200, texto ≤ 5000, link do botão obrigatoriamente `https://`.
- Nova edge function `send-emails`: ações `send_next` (1 mensagem por chamada, mesmo padrão de `send-messages`) e `send_test`; chama a Resend pelo conector gateway.
- Imagens no bucket existente `whatsapp-files`, pasta própria `email/`, URL pública no HTML.
- Frontend: novos componentes `EmailSender`, `EmailListsManager`, `EmailComposer`, `EmailPreview`, `EmailQueue`, `EmailConfig`. Única alteração em arquivo existente: inclusão da aba no `Dashboard`.
- Pendências anteriores mantidas: secrets `META_APP_ID`/`META_APP_SECRET` do botão do Facebook e novo token de deploy do Supabase.
