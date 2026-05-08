# Content from https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance

[Pular para o conteúdo principal](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#content-area)

[Documentação do Evolution Foundation home page![light logo](https://mintcdn.com/evoai-683d737d/cKWwJec4WH5zifr_/logo/light.svg?fit=max&auto=format&n=cKWwJec4WH5zifr_&q=85&s=64ed2f5f42f7300330599ed51d084814)![dark logo](https://mintcdn.com/evoai-683d737d/cKWwJec4WH5zifr_/logo/dark.svg?fit=max&auto=format&n=cKWwJec4WH5zifr_&q=85&s=a554ffb681dc5e131daba663dfecc536)](https://docs.evolutionfoundation.com.br/)

![BR](https://d3gk2c5xim1je2.cloudfront.net/flags/BR.svg)

Português (BR)

Pesquisar...

Ctrl K

Pesquisar...

Navigation

Instance

Connect to instance

[Início](https://docs.evolutionfoundation.com.br/) [Evolution](https://docs.evolutionfoundation.com.br/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/api-reference/introduction)

[Início](https://docs.evolutionfoundation.com.br/) [Evolution](https://docs.evolutionfoundation.com.br/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/api-reference/introduction)

POST

http://localhost:8080/https://localhost:8080/{customUrl}

/

instance

/

connect

Experimentar

Connect to instance

cURL

```
curl --request POST \
  --url http://localhost:8080/instance/connect \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "immediate": true,
  "phone": "<string>",
  "subscribe": [\
    "<string>"\
  ],
  "webhookUrl": "<string>"
}
'
```

200

400

401

403

404

500

```
{
  "data": {
    "eventString": "MESSAGE,SEND_MESSAGE,READ_RECEIPT,PRESENCE,HISTORY_SYNC,CHAT_PRESENCE,CALL,CONNECTION,LABEL,CONTACT,GROUP,NEWSLETTER,QRCODE",
    "jid": "",
    "webhookUrl": "https://your-webhook-url.com/webhook"
  },
  "message": "success"
}
```

> ## Documentation Index
>
> Fetch the complete documentation index at: [https://docs.evolutionfoundation.com.br/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

#### Autorizações

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#authorization-apikey)

apikey

string

header

obrigatório

API Key for authentication (global or instance-specific)

#### Corpo

application/json

Instance data

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#body-immediate)

immediate

boolean

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#body-phone)

phone

string

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#body-subscribe)

subscribe

string\[\]

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#body-webhook-url)

webhookUrl

string

#### Resposta

200

application/json

Instance connected successfully

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#response-success)

success

boolean

Exemplo:

`true`

[​](https://docs.evolutionfoundation.com.br/evolution-go/connect-to-instance#response-message)

message

string

[Anterior](https://docs.evolutionfoundation.com.br/evolution-go/get-all-instances) [Create a new instanceCreates a new instance with the provided data\\
\\
Próximo](https://docs.evolutionfoundation.com.br/evolution-go/create-a-new-instance)

Ctrl+I

Connect to instance

cURL

```
curl --request POST \
  --url http://localhost:8080/instance/connect \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '
{
  "immediate": true,
  "phone": "<string>",
  "subscribe": [\
    "<string>"\
  ],
  "webhookUrl": "<string>"
}
'
```

200

400

401

403

404

500

```
{
  "data": {
    "eventString": "MESSAGE,SEND_MESSAGE,READ_RECEIPT,PRESENCE,HISTORY_SYNC,CHAT_PRESENCE,CALL,CONNECTION,LABEL,CONTACT,GROUP,NEWSLETTER,QRCODE",
    "jid": "",
    "webhookUrl": "https://your-webhook-url.com/webhook"
  },
  "message": "success"
}
```