
# Sistema Universal de Drivers de API WhatsApp

## Objetivo

Criar uma camada de abstração ("driver") para que o sistema fale com qualquer API de WhatsApp (Fzap, Evolution Go, Evolution API oficial) trocando apenas uma chave no banco — sem mexer no código das Edge Functions a cada troca. Isso resolve também o bug atual de reconexão da Evolution Go isolando a lógica em um único lugar testável.

---

## 1. Modelo de dados (nova migration)

### Tabela `api_drivers`
Catálogo dos drivers disponíveis e suas credenciais.

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | `fzap`, `evolution-go`, `evolution-api` |
| `name` | text | Nome legível |
| `base_url` | text | Ex.: `https://evogo.pagoupix.com.br` |
| `api_key` | text | Apikey global (criptografada via secret reference se possível, senão texto) |
| `enabled` | boolean | |
| `is_active` | boolean | **Apenas um pode ser true** (driver ativo do sistema) |
| `config` | jsonb | Campos extras por driver (ex.: webhook URL) |
| `created_at`, `updated_at` | timestamptz | |

- RLS: SELECT só para usuários com role `admin` (via `has_role`); seed inicial vem por migration.
- Trigger garante apenas um `is_active = true`.

### Tabela `user_roles` + enum `app_role`
Padrão Lovable (admin, user) — necessário para proteger a tela de admin.

### Ajuste em `fzap_config`
Adicionar coluna `driver_slug text` (default 'evolution-go') para registrar com qual driver a instância do usuário foi criada (importante quando o admin troca o driver: as instâncias antigas continuam apontando pro driver original até o usuário reconectar).

---

## 2. Camada de drivers nas Edge Functions

Criar pasta compartilhada **`supabase/functions/_shared/drivers/`**:

```text
_shared/drivers/
  types.ts          # Interface WhatsAppDriver + tipos comuns
  registry.ts       # loadActiveDriver(supabase) → busca api_drivers ativo
  fzap.ts           # Driver Fzap (isolado, baseado no código atual)
  evolution-go.ts   # Driver Evolution Go (Evogo) — corrige bug de reconexão
  evolution-api.ts  # Driver Evolution API oficial (evolution-api.com)
  index.ts          # export getDriver(slug, creds)
```

### Interface comum (`types.ts`)

```ts
export interface WhatsAppDriver {
  slug: string;
  createInstance(p: { instanceName: string; userId: string }): Promise<{ token: string }>;
  getStatus(p: { instanceName: string; token: string }): Promise<{
    connected: boolean; loggedIn: boolean; qrCode: string | null;
  }>;
  reconnect(p: { instanceName: string; token: string }): Promise<void>;
  resetInstance(p: { instanceName: string; token: string }): Promise<void>;
  sendText(p: { token: string; to: string; text: string }): Promise<void>;
  sendMedia(p: { token: string; to: string; mediaUrl: string; type: 'image'|'video'|'document'|'audio'; caption?: string }): Promise<void>;
  fetchGroups?(p: { token: string }): Promise<Array<{ id: string; name: string }>>;
}
```

Cada Edge Function vira um **roteador fino**: carrega o driver ativo via `registry.ts` e delega.

### Drivers a implementar

**a) Evolution Go** (`evogo.pagoupix.com.br`) — baseado em `api_evogo.md`. Corrige o problema atual:
- após `/instance/connect`, faz polling com `subscribe:["QRCODE","CONNECTION","MESSAGE"]`
- detecta `loggedIn=true` para finalizar QR
- se `connected=false` por mais de N segundos, chama `/instance/connect` de novo (reanima)

**b) Fzap** — preserva código atual (`/session/status`, header `token:`), apenas isolado.

**c) Evolution API oficial** — vou pesquisar `https://doc.evolution-api.com` (web_search) para mapear endpoints reais. Preliminar:
- `POST /instance/create` (com `instanceName`, `qrcode:true`, `integration:'WHATSAPP-BAILEYS'`)
- `GET /instance/connect/{instance}` → QR
- `GET /instance/connectionState/{instance}` → status
- `DELETE /instance/logout/{instance}`
- `POST /message/sendText/{instance}` body `{number, text}`
- `POST /message/sendMedia/{instance}`
- header `apikey: <global>` ou `apikey: <instance-token>`

Vou validar essa lista durante a implementação e ajustar se a doc divergir.

---

## 3. Refator das Edge Functions existentes

Reescrever para usar a camada de drivers (sem mudar contrato com o frontend):

- `fzap-create-instance` → chama `driver.createInstance`
- `fzap-status` → chama `driver.getStatus` (+ reanimação)
- `fzap-reset-instance` → `driver.resetInstance`
- `send-messages` → `driver.sendText` / `driver.sendMedia`
- `send-group-messages` → idem (usando `to` no formato grupo)
- `fetch-groups` → `driver.fetchGroups`

Cada função carrega o driver ativo no início. Se a `fzap_config.driver_slug` do usuário diferir do driver ativo, prevalece o driver ativo (admin manda) — log informativo.

Renomear depois (etapa futura) `fzap-*` para `wa-*`, mas nesta entrega mantemos os nomes para não quebrar o frontend.

---

## 4. UI de Admin (frontend)

### Nova página `/admin/drivers` (acesso só admin via `has_role`)
- Lista drivers cadastrados (cards) com base_url, status, badge "ATIVO"
- Botão **"Ativar"** em cada card (toggle exclusivo)
- Botão **"Editar"** abre dialog com campos `base_url`, `api_key`, `enabled`, `config` (json)
- Botão **"Adicionar driver"** (slug + name + base_url + api_key)
- Botão **"Testar conexão"** chama um endpoint `wa-test-driver` que faz um ping no driver

### Indicador no Dashboard
Pequeno badge no header mostrando o driver ativo: `Driver: Evolution Go ✓`. Ao clicar, abre `/admin/drivers` se for admin.

---

## 5. Seed inicial

Migration insere os 3 drivers:
- `evolution-go` → `https://evogo.pagoupix.com.br` + apikey atual (já no código) → **is_active=true**
- `fzap` → vazios (admin preenche)
- `evolution-api` → vazios (admin preenche)

E cria role admin para o usuário atual logado (via SQL com `auth.users` lookup pelo email — vou pedir o email no momento da migration ou usar `WHERE email = (SELECT email FROM auth.users ORDER BY created_at LIMIT 1)`).

---

## 6. Detalhes técnicos resumidos

- **Sem CORS/Edge Function novo** além do `wa-test-driver` (opcional).
- **Deploy**: redeploy de todas as Edge Functions afetadas no Supabase externo (`uvvaxwtumuabfklccjgd`) via `npx supabase functions deploy ...` usando `SB_ACCESS_TOKEN`.
- **Tipagem**: types compartilhados via `_shared/drivers/types.ts` (Deno aceita import relativo).
- **Bug de reconexão**: o driver `evolution-go.ts` consolida toda a lógica de polling/reanimação num único arquivo testável, sem duplicação.
- **Fallback de QR**: aceitar `data.qr`, `data.Qrcode`, `data.QRCode`, `data.base64`.

---

## 7. Ordem de implementação

1. Migration: `app_role`, `user_roles`, `has_role`, `api_drivers` + seed + role admin.
2. `_shared/drivers/` (types, registry, evolution-go, fzap, evolution-api).
3. Refator das 6 Edge Functions para usar a camada.
4. Deploy no Supabase externo.
5. Página `/admin/drivers` + badge de driver ativo no header.
6. Teste end-to-end: trocar driver pelo painel → reconectar instância → enviar mensagem.
7. Atualizar `AI_MEMORY.md` e `CHANGELOG.md`.

---

## O que você ganha

- Trocar de provedor vira **um clique** no painel admin.
- Bug de reconexão do Evogo concentrado num arquivo só, fácil de evoluir.
- Pronto para adicionar novos drivers no futuro (Z-API, WPPConnect, etc.) sem tocar no resto do app.
