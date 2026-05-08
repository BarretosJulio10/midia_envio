# Documentação Técnica Evolution Go

**Base URL:** `https://evogo.pagoupix.com.br`
**Auth Header:** `apikey: 006763caee95f33088ebc5ac90ce975ef1c62a2622271937450fe9254635a97f`

---

## 1. Instância (Instance)

### Conectar Instância (Gerar QR Code/Status)
- **Endpoint:** `POST /instance/connect`
- **Body:**
```json
{
  "immediate": true,
  "phone": "",
  "subscribe": ["QRCODE", "CONNECTION", "MESSAGE"],
  "webhookUrl": ""
}
```

### Status da Instância
- **Endpoint:** `GET /instance/status`
- **Headers:** `apikey: <token>`
- **Resposta Sucesso (200):**
```json
{
  "data": {
    "connected": true,
    "loggedIn": true,
    "name": "nome_instancia"
  }
}
```

### Obter QR Code (Base64)
- **Endpoint:** `GET /instance/qr`
- **Headers:** `apikey: <token>`
- **Resposta Sucesso (200):**
```json
{
  "data": {
    "qr": "base64_string..."
  }
}
```

### Desconectar Instância (Logout)
- **Endpoint:** `POST /instance/logout` (Alguns setups usam `/instance/disconnect`)
- **Headers:** `apikey: <token>`

---

## 2. Mensagens (Messages)

### Enviar Mensagem de Texto
- **Endpoint:** `POST /send/text`
- **Body:**
```json
{
  "to": "5511999999999",
  "text": "Olá mundo!",
  "delay": 0
}
```

### Enviar Mensagem de Mídia
- **Endpoint:** `POST /send/media`
- **Body:**
```json
{
  "to": "5511999999999",
  "mediaUrl": "https://link.com/foto.jpg",
  "type": "image",
  "caption": "Legenda da foto"
}
```

---

## 3. Webhooks

### Configurar Webhook
- **Endpoint:** `POST /instance/webhook`
- **Body:**
```json
{
  "url": "https://seu-webhook.com",
  "events": ["MESSAGE", "CONNECTION", "QRCODE"]
}
```

