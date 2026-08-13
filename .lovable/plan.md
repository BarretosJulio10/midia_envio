# Plano: Estudo de Viabilidade e Arquitetura do Módulo de Postagem em Redes Sociais

## Objetivo
Analisar a viabilidade de adicionar um módulo de postagem em redes sociais (similar ao mLabs) à arquitetura atual de mensagens do WhatsApp, permitindo o gerenciamento centralizado para várias empresas postarem no Facebook e Instagram, mantendo a funcionalidade atual do WhatsApp e as regras de blacklist.

## Análise da Arquitetura Atual
- **Stack Tecnológica:** React (Vite), Supabase (Banco de Dados, Storage, Edge Functions).
- **Fluxo Atual:** Usuários fazem upload de mídia, adicionam texto e enviam para clientes do WhatsApp (individuais ou grupos) usando vários drivers de API (FZAP, Evolution Go).
- **Modelo de Dados:** Centralizado em filas de mensagens e listas de clientes (com blacklists).
- **Multitenancy:** O sistema já suporta múltiplas configurações (drivers/chaves de API) para diferentes integrações.

## Módulo Proposto: Social Media Poster
Um novo módulo independente que aproveita o gerenciamento de mídia e a lógica de blacklist existentes, mas tem como alvo as APIs da Meta (Facebook/Instagram).

### Componentes Técnicos
1. **Extensões do Esquema do Banco de Dados:**
   - `social_configs`: Armazenar credenciais (Tokens de Acesso de Página, IDs de Conta Comercial do Instagram).
   - `social_posts`: Acompanhar o status das postagens (pendente, agendado, postado, falhou).
   - Vincular `saved_lists` e `blacklists` existentes à lógica de postagem social.

2. **Backend (Supabase Edge Functions):**
   - Nova função `post-social-media`: Lida com a postagem baseada em OAuth para a API do Facebook Graph.
   - Reutilizar auxiliares de `media-type` para garantir que os ativos atendam aos requisitos da Meta.

3. **Adições no Frontend:**
   - **Dashboard Social:** Uma visualização separada para gerenciar postagens e conectar contas sociais.
   - **Compositor Integrado:** Estender o `UploadSection` ou criar uma variante que permita selecionar "WhatsApp", "Facebook", "Instagram" como destinos.

### Principais Restrições e Segurança
- **Separação Estrita:** O módulo social será "opcional" (opt-in) e funcionará em paralelo sem modificar o caminho crítico de `send-messages` do WhatsApp.
- **Requisitos da API do Facebook/Instagram:**
  - Requer um Aplicativo do Facebook com permissões `pages_manage_posts`, `pages_read_engagement`, `instagram_basic` e `instagram_content_publish`.
  - Requer Tokens de Acesso de Página permanentes para postagem automatizada.

## Cronograma de Implementação

### Fase 1: Fundação (Banco de Dados e Autenticação)
- Criar tabelas para credenciais sociais e histórico de postagens.
- Implementar o fluxo "Conectar com Facebook" para obter tokens.

### Fase 2: Lógica Central de Postagem
- Desenvolver a Edge Function para lidar com uploads de mídia para Facebook/Instagram.
- Implementar lógica para verificar contra blacklists existentes.

### Fase 3: Integração da Interface (UI)
- Adicionar uma aba "Redes Sociais" no Dashboard.
- Permitir postagem cruzada: Um upload, múltiplos destinos (WhatsApp + Social).

## Conclusão de Viabilidade
**Alta Viabilidade.** A arquitetura atual usando Supabase Edge Functions é ideal para isso. Podemos tratar "Facebook" e "Instagram" como novos "Drivers" na arquitetura de drivers existente ou como um serviço paralelo separado que consome os mesmos ativos de mídia/texto.

---
*Nota: Este plano é para análise arquitetônica e aprovação. Nenhuma alteração de código será feita no sistema de produção do WhatsApp durante esta fase.*
