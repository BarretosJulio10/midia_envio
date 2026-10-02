# Disparador de E-mail (novo módulo, via Resend)

Uma nova aba **E-mail** no painel, com o mesmo jeito de usar do envio de WhatsApp: você sobe um CSV com os e-mails, escolhe a imagem, escreve o texto e manda para a fila. Os envios saem pela Resend, um por vez, com intervalo e pausa configuráveis. **Nada do que já existe é alterado** — WhatsApp, redes sociais, blacklist e filas atuais continuam iguais.

## Como vai funcionar

```text
Aba "E-mail"
  CSV (id;email)  +  imagem (opcional)  +  assunto  +  texto
        v
Blacklist de e-mail (IDs ou endereços) remove quem não pode receber
        v
Fila de e-mails (tabela própria)
        v
Botão "Iniciar envios" -> 1 e-mail por vez, com intervalo/pausa
        v
Status por linha: na fila / enviado / falhou (com motivo) / bloqueado
```

## O que vai ter na tela

1. **Upload**: CSV no formato `id;email`, campo de assunto, texto da mensagem e uma imagem (vai no corpo do e-mail, abaixo do texto). Opção de imagem por empresa igual ao WhatsApp: se o nome do arquivo for o ID (ex.: `12.png`), aquela imagem vai só para o e-mail do ID 12; se for uma imagem única, vai para todos.
2. **Blacklist de e-mail**: campo igual ao do WhatsApp para digitar IDs (`1,2,7`) ou endereços. Lista separada da blacklist do WhatsApp, para não misturar.
3. **Fila**: tabela com destinatário, assunto, status, horário e motivo da falha; botões iniciar, pausar, reenviar falhados e limpar.
4. **Configurações**: e-mail remetente (ex.: `contato@suaempresa.com.br`), nome do remetente, intervalo mínimo/máximo e pausa a cada N envios.

## O que preciso de você

- Conectar sua conta da **Resend** (aparece um cartão para conectar quando eu for implementar).
- Ter um **domínio verificado na Resend** (ex.: suaempresa.com.br). Sem domínio verificado, a Resend só entrega para o seu próprio e-mail de teste.

## Detalhes técnicos

- Novas tabelas, sem tocar nas existentes: `email_config` (remetente, delays), `email_campaigns`, `email_messages` (fila), `email_blacklist` — todas com RLS por `user_id` e grants.
- Nova edge function `send-emails`: processa 1 mensagem por chamada (mesmo padrão de `send-messages`, respeitando delay/pausa no frontend), chama a Resend pelo conector gateway, grava `resend_id` ou `error_message`.
- Imagens no bucket existente `whatsapp-files` em pasta própria `email/`, com URL pública no HTML do e-mail.
- HTML do e-mail simples e seguro: texto escapado (sem HTML do usuário), quebras de linha convertidas, imagem com `alt`.
- Validação com zod no frontend e na função (e-mail válido, assunto ≤ 200, texto ≤ 5000).
- Frontend: novo componente `EmailSender` (com `EmailUpload`, `EmailQueue`, `EmailConfig`) e nova aba no `Dashboard` — única linha alterada em arquivo existente é a inclusão da aba.
- Pendências anteriores mantidas: secrets `META_APP_ID`/`META_APP_SECRET` do botão do Facebook e novo token de deploy do Supabase.
