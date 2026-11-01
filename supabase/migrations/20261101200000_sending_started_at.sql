-- Horário em que o servidor começou a enviar a mensagem.
-- Se a Edge Function for encerrada à força (ex.: "CPU Time exceeded"), a linha
-- fica presa em status 'sending'. Com este horário, as funções send-messages e
-- send-group-messages reconhecem o envio morto e o marcam como 'failed'.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sending_started_at timestamptz;

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS sending_started_at timestamptz;

COMMENT ON COLUMN public.messages.sending_started_at IS
  'Início do envio no servidor; usado para detectar envios interrompidos presos em sending';
COMMENT ON COLUMN public.group_messages.sending_started_at IS
  'Início do envio no servidor; usado para detectar envios interrompidos presos em sending';
