openapi: 3.0.0
info:
  title: "Fzap"
  description: "Fzap implements a multi-user and multi-device REST API for WhatsApp.\n\n<h2>Authentication</h2><ul><li>Standard Endpoints: Include the token header with a valid user token (matches tokens stored in the users database table).</li><li>Admin Endpoints: Use the Authorization header with the admin token (set in .env as ADMIN_TOKEN).</li></ul><h2>Admin Setup:</h2>You can manage users and do some tests by using the builtin dashboard [here](/dashboard).<h3>Add a Sample User via API</h3>Run this command to create a test user:<pre><code>curl -X POST http://localhost:8080/admin/users \\ \n-H \"Authorization: $ADMIN_TOKEN\" \\ \n-H \"Content-Type: application/json\" \\ \n-d '{\"name\": \"John\", \"token\": \"Z1234ABCCXD\"}' </code> </pre>\n\n<h2>LID (Link ID) Conversion</h2>Fzap provides endpoints to convert between WhatsApp's standard JID format and LID format:<ul><li><b>JID Format</b>: Standard format like <code>phone@s.whatsapp.net</code></li><li><b>LID Format</b>: WhatsApp's internal identifier like <code>2:hash@lid</code></li><li><b>Bidirectional conversion</b>: Convert JID to LID and vice versa</li><li><b>Native whatsmeow integration</b>: Uses whatsmeow's built-in mapping system</li><li><b>GET and POST support</b>: Both query parameters and JSON payloads supported</li></ul>\n\n<h2>Media via URL with Smart Caching</h2>Fzap now supports sending media files via URL with intelligent caching:<ul><li><b>URL-based endpoints</b>: Send images, videos, audio, and documents using URLs instead of base64</li><li><b>Smart caching</b>: Same URL won't be downloaded multiple times (30min cache)</li><li><b>Conditional requests</b>: Uses ETag/Last-Modified headers for efficient bandwidth usage</li><li><b>Cache management</b>: Admin endpoints to monitor and clear cache</li><li><b>OGG audio special handling</b>: Automatic PTT (Push-to-Talk) detection</li></ul>\n\n<h2>Webhook Configuration</h2>To receive WhatsApp messages:<ul><li>Host your own server (to process incoming messages).</li><li>Set its URL as the webhook via the [webhook](#Webhook) API call.</li></ul><h2>Phone number format:</h2><ul><li>Required: Country code (e.g. <b>5491155553934</b> for Argentina</li><li>Do not prefix with a plus sign (+), as natively whatsapp requires no plus sign prefix.</li></ul>"
  version: '1.23.0'
  termsOfService: ''
   
schemes:
  - http

servers:
  - url: '/'
    description: Current host

paths:
  /admin/users:
    get:
      tags:
        - Admin
      summary: List users
      description: Retrieve a list of users from the database, displaying also connection status and other info.
      security:
        - AdminAuth: []
      responses:
        200:
          description: A JSON array of user objects
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  - id: "bec45bb93cbd24cbec32941ec3c93a12"
                    name: "Normal WhatsApp Instance"
                    token: "d030sl9aDL39sl3075zz"
                    jid: "5491155551122@s.whatsapp.net"
                    qrCode: ""
                    connected: true
                    loggedIn: true
                    providerType: "whatsmeow"
                    expiration: 0
                    proxyUrl: ""
                    bindAddress: ""
                    folderId: null
                    webhooks:
                      - "https://some.domain/webhook"
                    events:
                      - "All"
                    proxyConfig:
                      enabled: false
                      proxyUrl: ""
                    s3Config:
                      enabled: true
                      endpoint: "https://s3.amazonaws.com"
                      region: "us-east-1"
                      bucket: "my-bucket"
                      accessKey: "***"
                      pathStyle: true
                      publicUrl: "https://s3.amazonaws.com"
                      mediaDelivery: "both"
                      retentionDays: 30
                    metadata:
                      cliente: "Empresa X"
                      crm_id: "abc123"
                      config:
                        env: "producao"
                        plano: "premium"
                  - id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
                    name: "WABA Instance"
                    token: "waba_token_xyz"
                    jid: "5511987654321@s.whatsapp.net"
                    qrCode: ""
                    connected: true
                    loggedIn: true
                    providerType: "cloudapi"
                    expiration: 0
                    proxyUrl: ""
                    bindAddress: ""
                    folderId: null
                    webhooks:
                      - "https://some.domain/webhook"
                    events:
                      - "All"
                    proxyConfig:
                      enabled: false
                      proxyUrl: ""
                    s3Config:
                      enabled: false
                      endpoint: ""
                      region: ""
                      bucket: ""
                      accessKey: "***"
                      pathStyle: false
                      publicUrl: ""
                      mediaDelivery: ""
                      retentionDays: 0
                    metadata:
                      cliente: "Empresa Y"
                      crm_id: "waba123"
    post:
      tags:
        - Admin
      summary: Create a new user
      description: |
        Adds a new user/instance to the database.

        Unknown fields are rejected.
        Webhooks are not configured here anymore; use the `/webhook` endpoints after creating the instance.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/CreateUser'
            example:
              name: "test_user"
              token: "user_token"
              expiration: 0
              bindAddress: ""
              proxyConfig:
                enabled: false
                proxyUrl: ""
              s3Config:
                enabled: false
                pathStyle: false
              metadata:
                cliente: "Empresa X"
                crm_id: "abc123"
      responses:
        201:
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 201
                success: true
                data:
                  id: "5663e0c52063ec35d0ba45f7c2011c06"
                  name: "John Doe"
                  token: "1234ABCD"
                  expiration: 0
                  webhooks: []
                  events: []
                  folderId: null
                  proxyConfig:
                    enabled: false
                    proxyUrl: ""
                  s3Config:
                    enabled: false
                    endpoint: ""
                    region: ""
                    bucket: ""
                    accessKey: "***"
                    pathStyle: false
                    publicUrl: ""
                    mediaDelivery: ""
                    retentionDays: 0
                  metadata:
                    cliente: "Empresa X"
                    crm_id: "abc123"
  /admin/users/{id}:
    get:
      tags:
        - Admin
      summary: Get a user from DB
      description: |
        Retrieves a user by ID.

        Current handler behavior returns `data` as an array containing zero or one user objects.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: ID of the user to retrieve
          schema:
            type: string
            example: 4e4942c7dee1deef99ab8fd9f7350de5
      responses:
        200:
          description: User lookup result
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  - id: "4e4942c7dee1deef99ab8fd9f7350de5"
                    name: "Some User"
                    token: "d030sl9aDL39sl3075zz"
                    jid: "5491155551122@s.whatsapp.net"
                    qrCode: ""
                    connected: true
                    loggedIn: true
                    providerType: "whatsmeow"
                    expiration: 0
                    proxyUrl: ""
                    folderId: null
                    webhooks: []
                    events: []
                    proxyConfig:
                      enabled: false
                      proxyUrl: ""
                    s3Config:
                      enabled: false
                      endpoint: ""
                      region: ""
                      bucket: ""
                      accessKey: "***"
                      pathStyle: false
                      publicUrl: ""
                      mediaDelivery: ""
                      retentionDays: 0
                    metadata:
                      cliente: "Empresa X"
                      crm_id: "abc123"
    patch:
      tags:
        - Admin
      summary: Partially update a user
      description: |
        Partially updates a user record. Only fields present in the request body are updated; omitted fields remain unchanged.

        Currently supported fields:
        - `name` — display name of the instance
        - `metadata` — arbitrary JSON object (max 3 levels deep, max 16 KB)
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: ID of the user to update
          schema:
            type: string
            example: 4e4942c7dee1deef99ab8fd9f7350de5
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: New display name
                  example: "New Name"
                metadata:
                  type: object
                  description: Arbitrary key-value metadata (max 3 levels deep, max 16 KB). Replaces existing metadata entirely.
                  additionalProperties: true
                  example:
                    cliente: "Empresa X"
                    crm_id: "abc123"
                    config:
                      env: "producao"
            examples:
              metadata_only:
                summary: Update only metadata
                value:
                  metadata:
                    cliente: "Empresa X"
                    crm_id: "abc123"
              name_only:
                summary: Update only name
                value:
                  name: "New Instance Name"
              both:
                summary: Update name and metadata
                value:
                  name: "New Instance Name"
                  metadata:
                    cliente: "Empresa X"
      responses:
        200:
          description: User updated — returns the full updated user object
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "4e4942c7dee1deef99ab8fd9f7350de5"
                  name: "Some User"
                  token: "d030sl9aDL39sl3075zz"
                  connected: true
                  metadata:
                    cliente: "Empresa X"
                    crm_id: "abc123"
        400:
          description: Bad request — invalid payload, missing fields, depth exceeded, or size exceeded
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              examples:
                no_fields:
                  summary: No fields to update
                  value:
                    code: 400
                    success: false
                    error: "no fields to update"
                depth_exceeded:
                  summary: Depth exceeded
                  value:
                    code: 400
                    success: false
                    error: "metadata exceeds maximum depth of 3 levels"
                size_exceeded:
                  summary: Size exceeded
                  value:
                    code: 400
                    success: false
                    error: "metadata exceeds maximum size of 16 KB"
        404:
          description: User not found
    delete:
      tags:
        - Admin
      summary: Delete a user from DB
      description: Deletes a user by their ID.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: ID of the user to delete
          schema:
            type: string
            example: 4e4942c7dee1deef99ab8fd9f7350de5
      responses:
        200:
          description: User deleted
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "6b927654cada7635a4586bf8fad260a3"
                details: "user deleted successfully"
  /admin/settings:
    get:
      tags:
        - Admin
      summary: Get dashboard settings
      description: Retrieves dashboard branding values derived from environment variables.
      security:
        - AdminAuth: []
      responses:
        200:
          description: Settings retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  customServiceName:
                    type: string
                  customServiceUrl:
                    type: string
              example:
                customServiceName: "WuzAPI"
                customServiceUrl: "https://wuzapi.example.com"
    post:
      tags:
        - Admin
      summary: Save dashboard settings
      description: |
        Legacy compatibility endpoint.

        It still accepts the old payload shape, but settings are now managed via environment variables and are not persisted by this request.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                customServiceName:
                  type: string
                customServiceUrl:
                  type: string
            example:
              customServiceName: "WuzAPI"
              customServiceUrl: "https://wuzapi.example.com"
      responses:
        200:
          description: Settings saved
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
              example:
                message: "Settings are now managed via environment variables. Please configure CHATWOOT_PLATFORM_NAME and CHATWOOT_SERVICE_URL."

  /admin/users/{id}/full:
    delete:
      tags:
        - Admin
      summary: Delete a user from DB and S3, logout and disconnect from whatsapp and clear it up from memory
      description: Deletes a user by their ID, including login out, disconnect and memory cleanup Also removes all user files from S3.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: ID of the user to delete
          schema:
            type: string
            example: 4e4942c7dee1deef99ab8fd9f7350de5
      responses:
        200:
          description: User deleted
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "4e4942c7dee1deef99ab8fd9f7350de5"
                  jid: ""
                  name: "mariano"
                details: "user instance removed completely"
  /admin/users/{id}/clone:
    post:
      tags:
        - Admin
      summary: Clone user instance
      description: |
        Creates a new instance by cloning configuration from an existing user.
        The cloned instance starts disconnected (new QR required).
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Source user ID to clone from
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the new cloned instance
                token:
                  type: string
                  description: Optional token for the new instance. If omitted, one is generated automatically.
              required:
                - name
            example:
              name: "New Cloned Instance"
              token: "optional_custom_token"
      responses:
        201:
          description: User cloned successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 201
                success: true
                data:
                  id: "new_user_id"
                  name: "New Cloned Instance"
                  token: "optional_custom_token"
        404:
          description: Source user not found
        409:
          description: Token already in use
  /folder/instances:
    get:
      tags:
        - Folder
      summary: List instances in folders
      description: Retrieves a list of instances that belong to folders.
      security:
        - FolderAuth: []
      responses:
        200:
          description: Success
    post:
      tags:
        - Folder
      summary: Create an instance in a folder
      description: Adds a new instance to a specific folder.
      security:
        - FolderAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        201:
          description: Created
  /folder/instances/{id}:
    delete:
      tags:
        - Folder
      summary: Remove instance from folder
      description: Removes an instance from its folder association.
      security:
        - FolderAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Deleted
  /folder/instances/{id}/full:
    delete:
      tags:
        - Folder
      summary: Delete instance completely
      description: Removes instance from folder and deletes it from DB.
      security:
        - FolderAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Deleted
  /folder/metadata:
    patch:
      tags:
        - Folder
      summary: Update authenticated folder metadata
      description: |
        Replaces the metadata object of the currently authenticated folder.
        Authenticated via folder token (`FolderAuth`).
        Maximum 3 levels deep and 16 KB.
      security:
        - FolderAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - metadata
              properties:
                metadata:
                  type: object
                  additionalProperties: true
                  description: New metadata object. Replaces existing metadata entirely.
            example:
              metadata:
                client: "Acme"
                plan: "enterprise"
      responses:
        200:
          description: Folder metadata updated
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  metadata:
                    client: "Acme"
                    plan: "enterprise"
        400:
          description: Invalid or missing metadata field
        401:
          description: Unauthorized (invalid folder token)
  /chatwoot/config:

    post:
      tags:
        - Chatwoot
      summary: Configure Chatwoot integration
      description: |
        Configures Chatwoot integration settings for the authenticated user.
        Enables bidirectional message flow between WhatsApp and Chatwoot.
        
        Required fields:
        - `url`
        - `accountId`
        
        Conditionally required:
        - `token` when creating a new config or when `enabled=true`
        - `openaiApiKey` when `transcriptionEnabled=true` and `transcriptionProvider=openai`
        - `groqApiKey` when `transcriptionEnabled=true` and `transcriptionProvider=groq`
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/ChatwootConfig'
            example:
              enabled: true
              url: "https://app.chatwoot.com"
              accountId: "12345"
              token: "cw_api_token_abc"
              nameInbox: "WhatsApp Inbox"
              chatwootInboxId: 42
              signMsg: true
              signMsgAgentBot: true
              signDelimiter: "\n--"
              reopenConversation: true
              conversationPending: false
              mergeBrazilContacts: true
              preserveExistingContactName: true
              ignoreJids: "120363043611111111@g.us"
              ignoreGroups: false
              importHistory: true
              chatwootHistoryDaysLimit: 30
              enableTypingIndicator: true
              deleteMessageOnRevoke: true
              transcriptionEnabled: true
              transcriptionProvider: "openai"
              openaiApiKey: "sk-xxxxxxxx"
              openaiModel: "whisper-1"
              openaiApiBaseUrl: "https://api.openai.com/v1"
              groqApiKey: "gsk-xxxxxxxx"
              groqModel: "distil-whisper"
              groqApiBaseUrl: "https://api.groq.com/openai/v1"
              proxyUrl: "http://proxy.internal:8080"
              chatwootDbEnabled: true
              chatwootDbHost: "chatwoot-db.internal"
              chatwootDbPort: 5432
              chatwootDbName: "chatwoot_production"
              chatwootDbUser: "chatwoot"
              chatwootDbPass: "supersecret"
              messageDeliveryTimeoutSeconds: 45
      responses:
        200:
          description: Configuration saved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/ChatwootConfigResponse'
              example:
                code: 200
                success: true
                data:
                  status: "success"
                  message: "Chatwoot configuration saved successfully"
                  webhookUrl: "http://localhost:8080/chatwoot/webhook/USER_TOKEN"
        400:
          description: Invalid configuration
    get:
      tags:
        - Chatwoot
      summary: Get Chatwoot configuration
      description: Retrieves current Chatwoot configuration (token is masked for security).
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Configuration retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  enabled: true
                  url: "https://app.chatwoot.com"
                  accountId: "123"
                  token: "***"
                  nameInbox: "WhatsApp Bot"
                  signMsg: true
                  signMsgAgentBot: true
                  preserveExistingContactName: true
                  reopenConversation: true
                  conversationPending: false
                  importHistory: true
                  chatwootHistoryDaysLimit: 30
                  deleteMessageOnRevoke: true
                  messageDeliveryTimeoutSeconds: 45
                  ignoreJids: "120363043611111111@g.us"
        404:
          description: Configuration not found
    delete:
      tags:
        - Chatwoot
      summary: Delete Chatwoot configuration
      description: Removes Chatwoot configuration for the authenticated user.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Configuration deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    status: "success"
                    message: "Chatwoot configuration deleted successfully"
  /chatwoot/status:
    get:
      tags:
        - Chatwoot
      summary: Get Chatwoot integration status
      description: |
        Returns the current status of the Chatwoot integration including connection status,
        message queue information, and integration statistics.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Status retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/ChatwootStatusResponse'
              example:
                code: 200
                success: true
                data:
                  configured: true
                  enabled: true
                  connected: true
                  stats:
                    messagesSent: 150
                    activeConversations: 5
                    lastSync: "2024-12-25T10:30:00Z"
                  messageQueues:
                    activeQueues: 3
                    totalQueued: 12
                    queueDetails:
                      "5511988776655@s.whatsapp.net": 5
                      "5511987654321@s.whatsapp.net": 4
                      "5511944332211@s.whatsapp.net": 3
  /chatwoot/test:
    post:
      tags:
        - Chatwoot
      summary: Test Chatwoot connection
      description: Tests connectivity to the configured Chatwoot instance.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Connection test successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    details: "Connection successful"
                    accountId: "123"
                    url: "https://app.chatwoot.com"
        400:
          description: Connection test failed
  /chatwoot/history/status:
    get:
      tags:
        - Chatwoot
      summary: Get Chatwoot history sync status
      description: Returns the status/progress of Chatwoot history synchronization.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: History sync status
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                active: true
                phase: "processing"
                progress: 62.5
                totalMessages: 2000
                processedMessages: 1250
                totalChunks: 20
                processedChunks: 12
                syncType: "full"
                startedAt: "2026-03-04T18:00:00Z"
  /chatwoot/history/import:
    post:
      tags:
        - Chatwoot
      summary: Start manual Chatwoot history import
      description: Starts manual import of pending `message_history` records to Chatwoot.
      security:
        - ApiKeyAuth: []
      responses:
        202:
          description: Import started
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                status: "started"
                total: 1200
        200:
          description: Nothing to import
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                status: "completed"
                total: 0
        409:
          description: Import already running
  /chatwoot/history/import/status:
    get:
      tags:
        - Chatwoot
      summary: Get manual import status
      description: Returns current manual import progress and message history stats.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Manual import status
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
  /chatwoot/test-db:
    post:
      tags:
        - Chatwoot
      summary: Test Chatwoot database connection
      description: Tests direct PostgreSQL connection to Chatwoot database using provided credentials.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                host:
                  type: string
                port:
                  type: integer
                  default: 5432
                database:
                  type: string
                user:
                  type: string
                password:
                  type: string
                accountId:
                  type: string
                nameInbox:
                  type: string
              required:
                - host
                - database
                - user
            example:
              host: "chatwoot-db.internal"
              port: 5432
              database: "chatwoot_production"
              user: "chatwoot"
              password: "supersecret"
              accountId: "1"
              nameInbox: "WhatsApp Inbox"
      responses:
        200:
          description: Database connection successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
        400:
          description: Invalid config or failed connection
  /chatwoot/setup-capi:
    post:
      tags:
        - Chatwoot
      summary: Provision Chatwoot CAPI resources
      description: Creates/updates required Chatwoot resources for CAPI integration (macro, labels, custom attributes).
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: CAPI setup completed
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
        404:
          description: Chatwoot config not found
  /chatwoot/waba-config:
    get:
      tags:
        - Chatwoot
      summary: Get WABA to Chatwoot forwarding config
      description: Retrieves raw WABA webhook forwarding configuration.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Configuration retrieved
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                config:
                  id: "cfg_123"
                  enabled: true
                  webhookUrl: "https://chatwoot.example.com/webhooks/whatsapp"
                  webhookToken: "***"
    post:
      tags:
        - Chatwoot
      summary: Save WABA to Chatwoot forwarding config
      description: Creates or updates raw WABA webhook forwarding configuration.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                webhookUrl:
                  type: string
                webhookToken:
                  type: string
            example:
              enabled: true
              webhookUrl: "https://chatwoot.example.com/webhooks/whatsapp"
              webhookToken: "secret_token_here"
      responses:
        200:
          description: Configuration saved
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
    delete:
      tags:
        - Chatwoot
      summary: Delete WABA to Chatwoot forwarding config
      description: Removes raw WABA webhook forwarding configuration.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Configuration deleted
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
  /chatwoot/waba-inbox/preview:
    get:
      tags:
        - Chatwoot
      summary: Preview WABA inbox configuration
      description: Returns pre-filled data for inbox creation — loads saved CloudAPI and Chatwoot configurations without creating anything.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Preview data returned
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                chatwootUrl: "https://app.chatwoot.com"
                accountId: "123"
                phoneNumber: "+5511999999999"
                phoneNumberId: "12345"
                wabaId: "waba_123"
                hasAccessToken: true
                hasChatwootToken: true
                existingInboxId: 42
                missingFields: []
  /chatwoot/waba-inbox/check:
    post:
      tags:
        - Chatwoot
      summary: Check if WABA inbox exists in Chatwoot
      description: Verifies whether a matching inbox already exists in Chatwoot by checking stored inbox ID, inbox name, and phone number.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                inboxName:
                  type: string
                  description: Name to match against existing inboxes
                inboxId:
                  type: integer
                  description: Specific inbox ID to check
            example:
              inboxName: "WhatsApp FZAP"
              inboxId: 0
      responses:
        200:
          description: Check result returned
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                exists: true
                storedInboxId: 42
                matches:
                  - id: 42
                    name: "WhatsApp FZAP"
                    channelType: "Channel::Whatsapp"
                    phoneNumber: "+5511999999999"
                    storedMatch: true
                    nameMatch: true
                    phoneMatch: true
                    selectedMatch: false
                preferredInbox:
                  id: 42
                  name: "WhatsApp FZAP"
                  channelType: "Channel::Whatsapp"
                  phoneNumber: "+5511999999999"
                  storedMatch: true
                  nameMatch: true
                  phoneMatch: true
                  selectedMatch: false
  /chatwoot/waba-inbox:
    post:
      tags:
        - Chatwoot
      summary: Create or update WABA inbox in Chatwoot
      description: Creates or updates a WhatsApp Cloud API inbox in Chatwoot using saved CloudAPI and Chatwoot configurations. Returns the webhook URL and verify token to auto-fill the forwarding tab.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - inboxName
              properties:
                inboxName:
                  type: string
                  description: Name for the Chatwoot inbox
                mode:
                  type: string
                  enum: [create, update]
                  description: Force create (ignores stored inbox) or update (requires existing inbox)
                inboxId:
                  type: integer
                  description: Target inbox ID (for update mode or to override stored ID)
                chatwootUrl:
                  type: string
                  description: Override Chatwoot URL (optional, uses saved config if omitted)
                chatwootAccountId:
                  type: string
                  description: Override Chatwoot account ID (optional)
                chatwootToken:
                  type: string
                  description: Override Chatwoot API token (optional)
            example:
              inboxName: "WhatsApp FZAP"
              mode: "create"
      responses:
        200:
          description: Inbox created or updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                inboxId: 42
                webhookUrl: "https://yourapp.com/chatwoot/webhook/USER_TOKEN"
                webhookToken: "verify_token_abc"
                action: "create"
        400:
          description: Missing required configuration or invalid request
  /chatwoot/embed-setup:
    post:
      tags:
        - Chatwoot
      summary: Set up embed-only Chatwoot configuration
      description: Creates or updates an embed-only Chatwoot config used exclusively for the Chatwoot embed widget. Does not require a full bidirectional Chatwoot integration (enabled=false).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  description: Chatwoot instance URL
                token:
                  type: string
                  description: Chatwoot API token
                accountId:
                  type: string
                  description: Chatwoot account ID
            example:
              url: "https://app.chatwoot.com"
              token: "chatwoot_api_token"
              accountId: "123"
      responses:
        200:
          description: Embed setup completed
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
  /chatwoot/embed/url:
    get:
      tags:
        - Chatwoot
      summary: Get Chatwoot embed URL
      description: Generates a signed embed token and returns the full embed URL for integrating the Chatwoot widget. Requires Chatwoot to be configured and enabled.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Embed URL generated
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                embedUrl: "https://yourapp.com/chatwoot/embed?token=BASE64.SIGNATURE"
                token: "BASE64.SIGNATURE"
        400:
          description: Chatwoot not configured or not enabled
        403:
          description: Embed feature not enabled on this instance
  /webhook/meta/{user_token}:
    get:
      tags:
        - Session
      summary: Verify Meta webhook (WABA)
      description: |
        Webhook verification endpoint used by Meta (Facebook) when registering the webhook in Meta Business Manager.

        Meta sends a `GET` request with the following query parameters:
        - `hub.mode` = `"subscribe"`
        - `hub.verify_token` = the token you set as `webhookVerifyToken` in your WABA instance
        - `hub.challenge` = a random challenge string

        If the `hub.verify_token` matches the one stored for the instance, the server responds with `hub.challenge` (plain text), confirming ownership of the endpoint.

        **⚠️ No authentication header required.** This endpoint is public and must be accessible by Meta's servers.
      parameters:
        - name: user_token
          in: path
          required: true
          description: Instance token (same as the `token` header used in regular API calls)
          schema:
            type: string
            example: "waba_token_xyz"
        - name: hub.mode
          in: query
          required: true
          schema:
            type: string
            example: "subscribe"
        - name: hub.verify_token
          in: query
          required: true
          description: Must match the `webhookVerifyToken` returned by POST /session/connect for this instance
          schema:
            type: string
            example: "fzap_wvt_a1b2c3d4e5f6"
        - name: hub.challenge
          in: query
          required: true
          schema:
            type: string
            example: "1158201444"
      responses:
        200:
          description: Verification successful — returns the challenge string as plain text
          content:
            text/plain:
              example: "1158201444"
        403:
          description: Invalid verify token
    post:
      tags:
        - Session
      summary: Receive Meta webhook events (WABA)
      description: |
        Receives incoming WhatsApp messages and status updates from Meta's Cloud API.

        Meta sends `POST` requests to this URL when events occur (incoming messages, delivery receipts, etc.). The server:
        1. Validates the `X-Hub-Signature-256` header using the `appSecret` (if configured)
        2. Normalizes the Meta payload to the internal message format
        3. Dispatches to your registered webhooks (same format as normal mode)

        **⚠️ No authentication header required.** This endpoint is public and must be accessible by Meta's servers.

        **Signature validation:** If `appSecret` is configured for the instance, requests without a valid `X-Hub-Signature-256` header are rejected with 403.
      parameters:
        - name: user_token
          in: path
          required: true
          description: Instance token
          schema:
            type: string
            example: "waba_token_xyz"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
            examples:
              textMessage:
                summary: Incoming text message
                value:
                  object: "whatsapp_business_account"
                  entry:
                    - id: "123456789"
                      changes:
                        - value:
                            messaging_product: "whatsapp"
                            metadata:
                              display_phone_number: "5511987654321"
                              phone_number_id: "123456789012345"
                            contacts:
                              - profile:
                                  name: "John Doe"
                                wa_id: "5511999998888"
                            messages:
                              - from: "5511999998888"
                                id: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
                                timestamp: "1713459372"
                                text:
                                  body: "Hello!"
                                type: "text"
                          field: "messages"
              imageMessage:
                summary: Incoming image message
                value:
                  object: "whatsapp_business_account"
                  entry:
                    - id: "123456789"
                      changes:
                        - value:
                            messaging_product: "whatsapp"
                            metadata:
                              display_phone_number: "5511987654321"
                              phone_number_id: "123456789012345"
                            contacts:
                              - profile:
                                  name: "John Doe"
                                wa_id: "5511999998888"
                            messages:
                              - from: "5511999998888"
                                id: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
                                timestamp: "1713459372"
                                image:
                                  caption: "Check this out"
                                  mime_type: "image/jpeg"
                                  sha256: "abc123"
                                  id: "media_id_123"
                                type: "image"
                          field: "messages"
              paidTrafficReferral:
                summary: Incoming message from paid ad (referral)
                value:
                  object: "whatsapp_business_account"
                  entry:
                    - id: "123456789"
                      changes:
                        - value:
                            messaging_product: "whatsapp"
                            metadata:
                              display_phone_number: "5511987654321"
                              phone_number_id: "123456789012345"
                            contacts:
                              - profile:
                                  name: "Lead Name"
                                wa_id: "5511999998888"
                            messages:
                              - from: "5511999998888"
                                id: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
                                timestamp: "1713459372"
                                text:
                                  body: "Olá, vi o anúncio!"
                                type: "text"
                                referral:
                                  source_url: "https://www.facebook.com/ads/123456"
                                  source_type: "ad"
                                  source_id: "ad_123456"
                                  headline: "Oferta Especial"
                                  body: "Clique para saber mais"
                                  media_type: "image"
                                  image_url: "https://example.com/ad-image.jpg"
                                  ctwa_clid: "ARAkLgBgg..."
                          field: "messages"
      responses:
        200:
          description: Event received and processed
          content:
            text/plain:
              example: "OK"
        403:
          description: Invalid webhook signature
  /admin/media-cache/stats:
    get:
      tags:
        - Admin
      summary: Get media cache statistics
      description: |
        Returns statistics about the media URL cache including number of cached items,
        cache configuration, and performance metrics.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Cache statistics retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  totalItems: 42
                  cacheType: "Media URL Cache"
                  defaultExpiration: "30 minutes"
                  cleanupInterval: "1 hour"
  /admin/media-cache/clear:
    post:
      tags:
        - Admin
      summary: Clear media cache
      description: |
        Clears all cached media files from the URL cache. This will force all subsequent
        media URL requests to download content fresh from their sources.
        
        **Use Cases:**
        - Free up memory when cache grows too large
        - Force refresh of cached content that may have changed
        - Troubleshooting cache-related issues
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Cache cleared successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Media cache cleared successfully"
                  itemsCleared: 42
  /admin/folders:
    get:
      tags:
        - Admin
      summary: List all folders
      description: Retrieves a list of all folders with their display order and instance counts. Supports filtering by parent_id.
      security:
        - AdminAuth: []
      parameters:
        - name: parent_id
          in: query
          description: Filter folders by parent ID
          schema:
            type: string
        - name: parentId
          in: query
          description: Alias for parent_id
          schema:
            type: string
      responses:
        200:
          description: List of folders
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  - id: "f1"
                    name: "Production"
                    description: ""
                    color: "#4CAF50"
                    token: "folder_token_1"
                    parent_id: null
                    display_order: 0
                    metadata:
                      client: "Acme"
                      plan: "premium"
                    created_at: "2026-03-04T21:10:00Z"
                    updated_at: "2026-03-04T21:10:00Z"
                    instance_count: 3
                  - id: "f2"
                    name: "Testing"
                    description: ""
                    color: "#2196F3"
                    token: "folder_token_2"
                    parent_id: null
                    display_order: 1
                    metadata: {}
                    created_at: "2026-03-05T10:00:00Z"
                    updated_at: "2026-03-05T10:00:00Z"
                    instance_count: 1
    post:
      tags:
        - Admin
      summary: Create a new folder
      description: Creates a new folder for organizing WhatsApp instances.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Folder name
                  example: "Production Accounts"
                token:
                  type: string
                  description: Unique token for folder-level API access
                  example: "secret_folder_token_123"
                description:
                  type: string
                  description: Folder description
                  example: "Primary production instances"
                color:
                  type: string
                  description: Folder color in hex format
                  example: "#4CAF50"
                parentId:
                  type: string
                  description: Parent folder ID (optional)
                  example: "root"
                displayOrder:
                  type: integer
                  description: Display order for sorting
                  example: 0
                metadata:
                  type: object
                  description: Arbitrary folder metadata (max 3 levels deep, max 16 KB). Replaces existing metadata entirely when supplied.
                  additionalProperties: true
                  example:
                    client: "Acme"
                    plan: "premium"
              required:
                - name
                - token
      responses:
        201:
          description: Folder created successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 201
                success: true
                data:
                  id: "f1"
                  name: "Production Accounts"
                  token: "secret_folder_token_123"
                  description: "Primary production instances"
                  color: "#4CAF50"
                  parent_id: null
                  display_order: 0
                  metadata:
                    client: "Acme"
                    plan: "premium"
                  created_at: "2026-03-05T12:00:00Z"
                  updated_at: "2026-03-05T12:00:00Z"
  /admin/folders/{id}:
    get:
      tags:
        - Admin
      summary: Get folder details
      description: Retrieves detailed information about a specific folder.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      responses:
        200:
          description: Folder details
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "f1"
                  name: "Production"
                  token: "folder_token_1"
                  description: ""
                  color: "#4CAF50"
                  parent_id: null
                  display_order: 0
                  metadata:
                    client: "Acme"
                    plan: "premium"
                  created_at: "2026-03-04T21:10:00Z"
                  updated_at: "2026-03-04T21:10:00Z"
                  instance_count: 3
        400:
          description: Folder not found or folder is not empty
    put:
      tags:
        - Admin
      summary: Update folder
      description: Updates folder name, color, and other attributes.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: New folder name
                  example: "Production Environment"
                token:
                  type: string
                  description: Folder access token
                  example: "new_folder_token_123"
                description:
                  type: string
                  description: New folder description
                  example: "Primary production instances"
                color:
                  type: string
                  description: New folder color
                  example: "#8BC34A"
                parentId:
                  type: string
                  description: Parent folder ID (optional)
                  example: "root"
                displayOrder:
                  type: integer
                  description: Display order for sorting
                  example: 1
                metadata:
                  type: object
                  description: Arbitrary folder metadata (max 3 levels deep, max 16 KB). Replaces existing metadata entirely when supplied. Omit to preserve current metadata.
                  additionalProperties: true
                  example:
                    client: "Acme"
                    plan: "enterprise"
      responses:
        200:
          description: Folder updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "f1"
                  name: "Production Environment"
                  token: "new_folder_token_123"
                  description: "Primary production instances"
                  color: "#8BC34A"
                  parent_id: null
                  display_order: 1
                  metadata:
                    client: "Acme"
                    plan: "enterprise"
                  created_at: "2026-03-04T21:10:00Z"
                  updated_at: "2026-03-05T13:00:00Z"
        404:
          description: Folder not found
    delete:
      tags:
        - Admin
      summary: Delete folder
      description: Deletes an empty folder. The operation fails if the folder still has instances or subfolders.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      responses:
        200:
          description: Folder deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  message: "Folder deleted successfully"
        404:
          description: Folder not found
  /admin/folders/{id}/metadata:
    patch:
      tags:
        - Admin
      summary: Update folder metadata
      description: Replaces the metadata object of a folder without changing name, token, color, limits, or public dashboard settings.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - metadata
              properties:
                metadata:
                  type: object
                  description: New metadata object. Replaces existing metadata. Maximum 3 levels deep and 16 KB.
                  additionalProperties: true
            examples:
              metadata_only:
                summary: Update folder metadata
                value:
                  metadata:
                    client: "Acme"
                    plan: "enterprise"
              clear:
                summary: Clear folder metadata
                value:
                  metadata: {}
      responses:
        200:
          description: Folder metadata updated
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  metadata:
                    client: "Acme"
                    plan: "enterprise"
        400:
          description: Invalid metadata payload
        404:
          description: Folder not found
  /admin/folders/{id}/instances:
    get:
      tags:
        - Admin
      summary: Get folder instances
      description: |
        Retrieves instances assigned to a folder.

        Use `id = null` or `id = none` to list instances without a folder.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      responses:
        200:
          description: List of instances in folder
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  - id: "user1"
                    name: "John's WhatsApp"
                    token: "user_token_1"
                    jid: "5511999999999@s.whatsapp.net"
                    connected: true
                    folder_id: "f1"
                  - id: "user2"
                    name: "Jane's Account"
                    token: "user_token_2"
                    jid: ""
                    connected: false
                    folder_id: "f1"
  /admin/folders/order:
    patch:
      tags:
        - Admin
      summary: Update folder order
      description: Updates the display order of folders for custom sorting.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                folderOrders:
                  type: object
                  additionalProperties:
                    type: integer
                  description: Mapping of folder IDs to display order
                  example:
                    f2: 0
                    f1: 1
                    f3: 2
              required:
                - folderOrders
      responses:
        200:
          description: Folder order updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  message: "Folder order updated successfully"
  /admin/instances/{id}/folder:
    patch:
      tags:
        - Admin
      summary: Move instance to folder
      description: Moves a WhatsApp instance to a different folder or to root level.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Instance/User ID
          schema:
            type: string
            example: user1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                folderId:
                  type: string
                  description: Target folder ID (empty string or null for root level)
                  example: "f1"
      responses:
        200:
          description: Instance moved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  message: "Instance moved successfully"
        400:
          description: Instance or folder not found, or request body is invalid
  /admin/folders/{id}/public-dashboard:
    get:
      tags:
        - Admin
      summary: Get public dashboard config
      description: Returns the public dashboard configuration for a folder (slug, branding, access mode, etc.). Requires paid-traffic license.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      responses:
        200:
          description: Public dashboard config
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  enabled: true
                  slug: "acme-corp"
                  access: "open"
                  brandName: "Acme"
                  brandColor: "#3B82F6"
                  logoUrl: ""
                  logoData: ""
                  clientName: ""
                  clientLogoUrl: ""
                  clientLogoData: ""
                  dashUrl: "/dash/acme-corp"
                  hasPassword: false
        403:
          description: Paid-traffic license required
        404:
          description: Folder not found
    patch:
      tags:
        - Admin
      summary: Update public dashboard config
      description: |
        Updates the public dashboard configuration for a folder. Requires paid-traffic license.
        When `access` is set to `"password"` and no password hash exists yet, `password` is required.
        When `enabled` is `true`, `slug` must be non-empty.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                slug:
                  type: string
                  description: URL slug for the public dashboard. Required when enabling.
                access:
                  type: string
                  enum: [open, password]
                  description: Access mode. Use "password" to require a password.
                password:
                  type: string
                  description: Required when setting access to "password" and no password exists yet.
                brandName:
                  type: string
                brandColor:
                  type: string
                logoUrl:
                  type: string
                logoData:
                  type: string
                  description: Base64-encoded logo image.
                clientName:
                  type: string
                clientLogoUrl:
                  type: string
                clientLogoData:
                  type: string
                  description: Base64-encoded client logo image.
            example:
              enabled: true
              slug: "acme-corp"
              access: "open"
              brandName: "Acme"
              brandColor: "#3B82F6"
      responses:
        200:
          description: Updated config
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  enabled: true
                  slug: "acme-corp"
                  access: "open"
                  brandName: "Acme"
                  brandColor: "#3B82F6"
                  logoUrl: ""
                  clientName: ""
                  clientLogoUrl: ""
                  dashUrl: "/dash/acme-corp"
        400:
          description: Invalid request (missing slug, missing password when required, etc.)
        403:
          description: Paid-traffic license required
        404:
          description: Folder not found
        409:
          description: Slug already in use by another folder
  /admin/folders/{id}/public-dashboard/access-users:
    get:
      tags:
        - Admin
      summary: List public dashboard access users
      description: Returns all access users for the folder's public dashboard portal.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      responses:
        200:
          description: List of access users
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  items:
                    - id: "acc1"
                      name: "Maria"
                      login: "maria"
                      permissions: ["view", "connect"]
                      active: true
                      expiresAt: null
        404:
          description: Folder not found
    post:
      tags:
        - Admin
      summary: Create public dashboard access user
      description: Creates a new access user for the folder's public dashboard portal.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - login
                - password
              properties:
                name:
                  type: string
                login:
                  type: string
                password:
                  type: string
                  description: Required on creation.
                permissions:
                  type: array
                  items:
                    type: string
                  description: Permission list (e.g. "view", "connect", "disconnect").
                active:
                  type: boolean
                  default: true
                expiresAt:
                  type: string
                  description: Optional expiry in RFC3339 or YYYY-MM-DD format.
                  example: "2026-12-31"
            example:
              name: "Maria"
              login: "maria"
              password: "secret123"
              permissions: ["view", "connect"]
              active: true
      responses:
        201:
          description: Access user created
          content:
            application/json:
              example:
                code: 201
                success: true
                data:
                  id: "acc1"
                  name: "Maria"
                  login: "maria"
                  permissions: ["view", "connect"]
                  active: true
                  expiresAt: null
        400:
          description: Missing required fields or invalid expiry format
        404:
          description: Folder not found
        409:
          description: Login already in use
  /admin/folders/{id}/public-dashboard/access-users/{access_id}:
    put:
      tags:
        - Admin
      summary: Update public dashboard access user
      description: Updates an existing access user for the folder's public dashboard portal.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
        - name: access_id
          in: path
          required: true
          description: Access user ID
          schema:
            type: string
            example: acc1
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                login:
                  type: string
                password:
                  type: string
                  description: If provided, replaces the current password.
                permissions:
                  type: array
                  items:
                    type: string
                active:
                  type: boolean
                expiresAt:
                  type: string
                  description: Optional expiry in RFC3339 or YYYY-MM-DD format. Pass empty string to clear.
            example:
              name: "Maria Silva"
              login: "maria"
              permissions: ["view", "connect", "disconnect"]
              active: true
      responses:
        200:
          description: Access user updated
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  id: "acc1"
                  name: "Maria Silva"
                  login: "maria"
                  permissions: ["view", "connect", "disconnect"]
                  active: true
                  expiresAt: null
        400:
          description: Invalid request
        404:
          description: Folder or access user not found
        409:
          description: Login already in use
    delete:
      tags:
        - Admin
      summary: Delete public dashboard access user
      description: Removes an access user from the folder's public dashboard portal.
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Folder ID
          schema:
            type: string
            example: f1
        - name: access_id
          in: path
          required: true
          description: Access user ID
          schema:
            type: string
            example: acc1
      responses:
        200:
          description: Access user deleted
          content:
            application/json:
              example:
                code: 200
                success: true
                data:
                  success: true
        404:
          description: Access user not found
  /admin/chatwoot/migrate-inbox/test:
    post:
      tags:
        - Admin
      summary: Test Chatwoot database connection for inbox migration
      description: Validates connectivity to an external Chatwoot PostgreSQL database and returns the number of accessible inboxes. This is the first step of the inbox migration flow.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dbHost
                - dbName
                - dbUser
                - accountId
              properties:
                dbHost:
                  type: string
                dbPort:
                  type: integer
                  default: 5432
                dbName:
                  type: string
                dbUser:
                  type: string
                dbPass:
                  type: string
                accountId:
                  type: integer
                  description: Chatwoot account ID to scope the operation
            example:
              dbHost: "chatwoot-db.internal"
              dbPort: 5432
              dbName: "chatwoot_production"
              dbUser: "chatwoot"
              dbPass: "secret"
              accountId: 1
      responses:
        200:
          description: Connection test result (success flag always present; failure details included on error)
          content:
            application/json:
              examples:
                ok:
                  value:
                    success: true
                    inboxCount: 5
                failed:
                  value:
                    success: false
                    errorType: "auth"
                    message: "password authentication failed for user"
        400:
          description: Missing required fields
  /admin/chatwoot/migrate-inbox/list-inboxes:
    post:
      tags:
        - Admin
      summary: List inboxes available for migration
      description: Returns all inboxes in the external Chatwoot database for the given account ID.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dbHost
                - dbName
                - dbUser
                - accountId
              properties:
                dbHost:
                  type: string
                dbPort:
                  type: integer
                dbName:
                  type: string
                dbUser:
                  type: string
                dbPass:
                  type: string
                accountId:
                  type: integer
            example:
              dbHost: "chatwoot-db.internal"
              dbPort: 5432
              dbName: "chatwoot_production"
              dbUser: "chatwoot"
              dbPass: "secret"
              accountId: 1
      responses:
        200:
          description: List of inboxes
          content:
            application/json:
              example:
                - id: 10
                  name: "WhatsApp Support"
                  channelType: "Channel::Whatsapp"
                - id: 11
                  name: "WhatsApp Sales"
                  channelType: "Channel::Whatsapp"
        502:
          description: Database connection error
  /admin/chatwoot/migrate-inbox/preview:
    post:
      tags:
        - Admin
      summary: Preview inbox migration impact
      description: Returns counts of conversations, messages, and contact_inboxes that would be migrated from source inbox to destination inbox, without making any changes.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dbHost
                - dbName
                - dbUser
                - accountId
                - sourceInboxId
                - destInboxId
              properties:
                dbHost:
                  type: string
                dbPort:
                  type: integer
                dbName:
                  type: string
                dbUser:
                  type: string
                dbPass:
                  type: string
                accountId:
                  type: integer
                sourceInboxId:
                  type: integer
                  description: ID of the inbox to migrate from
                destInboxId:
                  type: integer
                  description: ID of the inbox to migrate to
            example:
              dbHost: "chatwoot-db.internal"
              dbPort: 5432
              dbName: "chatwoot_production"
              dbUser: "chatwoot"
              dbPass: "secret"
              accountId: 1
              sourceInboxId: 10
              destInboxId: 11
      responses:
        200:
          description: Migration preview
          content:
            application/json:
              example:
                conversations: 1240
                messages: 8500
                contactInboxes: 320
        400:
          description: sourceInboxId and destInboxId are required, or they are equal
        502:
          description: Database connection error
  /admin/chatwoot/migrate-inbox/execute:
    post:
      tags:
        - Admin
      summary: Execute inbox migration
      description: Starts the background migration of conversations, messages, and contact_inboxes from source inbox to destination inbox. Returns immediately; poll `/admin/chatwoot/migrate-inbox/status` for progress.
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dbHost
                - dbName
                - dbUser
                - accountId
                - sourceInboxId
                - destInboxId
              properties:
                dbHost:
                  type: string
                dbPort:
                  type: integer
                dbName:
                  type: string
                dbUser:
                  type: string
                dbPass:
                  type: string
                accountId:
                  type: integer
                sourceInboxId:
                  type: integer
                destInboxId:
                  type: integer
            example:
              dbHost: "chatwoot-db.internal"
              dbPort: 5432
              dbName: "chatwoot_production"
              dbUser: "chatwoot"
              dbPass: "secret"
              accountId: 1
              sourceInboxId: 10
              destInboxId: 11
      responses:
        200:
          description: Migration started or already running
          content:
            application/json:
              examples:
                started:
                  value:
                    started: true
                already_running:
                  value:
                    running: true
        400:
          description: Missing required fields
  /admin/chatwoot/migrate-inbox/status:
    get:
      tags:
        - Admin
      summary: Get inbox migration status
      description: Returns the current status of the background inbox migration process. Phase values are `starting`, `contact_inboxes`, `conversations`, `messages`, `done`, or `error`.
      security:
        - AdminAuth: []
      responses:
        200:
          description: Migration status
          content:
            application/json:
              examples:
                running:
                  value:
                    active: true
                    phase: "messages"
                done:
                  value:
                    active: false
                    phase: "done"
                error:
                  value:
                    active: false
                    phase: "error"
                    error: "connection refused"
  /chatwoot/create-inbox:
    post:
      tags:
        - Chatwoot
      summary: Create Chatwoot inbox
      description: Creates a new WhatsApp inbox in Chatwoot with webhook configuration.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Inbox created successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    details: "Inbox created successfully"
                    inboxId: "456"
                    webhookUrl: "http://localhost:8080/chatwoot/webhook/USER_TOKEN"
        400:
          description: Failed to create inbox
  /chatwoot/update-inbox:
    patch:
      tags:
        - Chatwoot
      summary: Update Chatwoot inbox
      description: Updates the webhook URL for an existing Chatwoot inbox.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Inbox updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    details: "Inbox webhook updated successfully"
                    webhookUrl: "http://localhost:8080/chatwoot/webhook/USER_TOKEN"
        400:
          description: Failed to update inbox
  /chatwoot/cleanup:
    post:
      tags:
        - Chatwoot
      summary: Cleanup old messages
      description: Forces manual cleanup of old messages and conversation data.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Cleanup completed successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    details: "Message cleanup completed successfully"
                    messagesCleaned: 25
                    conversationsCleaned: 5
        500:
          description: Cleanup failed
  /chatwoot/webhook/{token}:
    post:
      tags:
        - Chatwoot
      summary: Chatwoot webhook (External)
      description: |
        This endpoint receives webhooks from Chatwoot when agents send messages.
        It's called externally by Chatwoot and doesn't require user authentication.
        Configure this URL in your Chatwoot inbox webhook settings.
      parameters:
        - name: token
          in: path
          required: true
          description: User token for webhook authentication
          schema:
            type: string
            example: "USER_TOKEN"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              description: Chatwoot webhook payload
            example:
              id: 12345
              event: "message_created"
              message_type: "outgoing"
              content: "Hello from Chatwoot"
              private: false
              source_id: "3EB06F9067F80BAB89FF"
              attachments:
                - id: 987
                  data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
                  file_type: "image"
                  file_name: "screenshot.png"
                  thumb_url: "https://app.chatwoot.com/rails/active_storage/blobs/preview/..."
              conversation:
                id: 555
                inbox_id: 10
                status: "open"
                contact_inbox:
                  id: 22
                  contact_id: 33
                  inbox_id: 10
                  source_id: "wa:5511987654321@s.whatsapp.net"
                meta:
                  sender:
                    id: 99
                    name: "John Doe"
                    identifier: "john@example.com"
                    phone_number: "+5511987654321"
                    thumbnail: "https://app.chatwoot.com/avatar.png"
                    custom_attributes:
                      company: "ACME"
                      segment: "vip"
                messages:
                  - id: 111
                    content: "Previous message"
                    attachments: []
              inbox:
                id: 10
                name: "WhatsApp Inbox"
              sender:
                id: 77
                name: "Agent Mary"
                available_name: "Mary"
                type: "agent"
              content_attributes:
                in_reply_to: 123
                in_reply_to_external_id: "3EB06F9067F80BAB89FF"
                deleted: false
      responses:
        200:
          description: Webhook processed successfully
        400:
          description: Invalid webhook payload
        401:
          description: Invalid token
  /{platform}/webhook/{token}:
    post:
      tags:
        - Chatwoot
      summary: Chatwoot webhook (Custom platform alias)
      description: |
        Alternative Chatwoot webhook endpoint with customizable platform prefix.
        Functionally equivalent to `/chatwoot/webhook/{token}` for compatibility scenarios.
      parameters:
        - name: platform
          in: path
          required: true
          description: Platform prefix used in webhook URL
          schema:
            type: string
            example: "fzap"
        - name: token
          in: path
          required: true
          description: User token for webhook authentication
          schema:
            type: string
            example: "USER_TOKEN"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              description: Chatwoot webhook payload
      responses:
        200:
          description: Webhook processed successfully
        400:
          description: Invalid webhook payload
        401:
          description: Invalid token
  /cloudapi/webhook-ping/start:
    post:
      tags:
        - CloudAPI
      summary: Start webhook test mode
      description: Marks the instance as awaiting a test webhook from Meta. Allows test payloads with a fictitious phone_number_id to be accepted by the shared webhook endpoint for verification purposes.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Test mode started
          content:
            application/json:
              example:
                started: true
  /cloudapi/webhook-ping:
    get:
      tags:
        - CloudAPI
      summary: Poll for last received Meta webhook
      description: Returns whether a webhook was received from Meta since test mode was started, and the timestamp of the last received webhook.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Ping status
          content:
            application/json:
              examples:
                received:
                  value:
                    received: true
                    lastReceivedAt: "2025-01-15T10:30:00Z"
                not_received:
                  value:
                    received: false
  /cloudapi/webhook-token:
    post:
      tags:
        - CloudAPI
      summary: Resolve webhook verify token
      description: Resolves or generates the webhook verify token for manual Cloud API setup. Prefers the current instance token, then reuses a token from another instance with the same WABA ID, otherwise generates a new one.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - wabaId
              properties:
                wabaId:
                  type: string
                  description: WABA Account ID
                appSecret:
                  type: string
                  description: Meta App Secret (optional)
            example:
              wabaId: "waba_123"
      responses:
        200:
          description: Verify token resolved
          content:
            application/json:
              example:
                success: true
                webhookVerifyToken: "verify_token_abc"
                source: "current"
                reused: true
        400:
          description: wabaId is required
  /cloudapi/webhook-subscription:
    post:
      tags:
        - CloudAPI
      summary: Register Meta webhook subscription
      description: Registers this server's webhook URL on the Meta app/WABA for manually configured Cloud API instances. Uses the saved access token and webhook verify token from the instance configuration.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Webhook subscription registered
          content:
            application/json:
              example:
                success: true
                webhookUrl: "https://yourapp.com/webhook/meta"
                webhookVerifyToken: "verify_token_abc"
                wabaId: "waba_123"
        400:
          description: Cloud API not configured, or missing access token / verify token
        502:
          description: Meta API returned an error
  /cloudapi/media/upload:
    post:
      tags:
        - CloudAPI
      summary: Upload media to WhatsApp Cloud API
      description: Uploads a file to the WhatsApp Cloud API media endpoint and returns the media_id for use in subsequent message sends. Only available for CloudAPI instances.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: File to upload
      responses:
        200:
          description: Media uploaded successfully
          content:
            application/json:
              example:
                mediaId: "media_abc123"
                mimeType: "image/jpeg"
                fileName: "photo.jpg"
        400:
          description: Missing file field, or instance is not a Cloud API instance
  /rabbitmq/status:
    get:
      tags:
        - Infrastructure
      summary: Get RabbitMQ Status
      description: Retrieves the current status of the RabbitMQ global messaging system, including connection state and queue statistics.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: RabbitMQ status retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  enabled: true
                  connected: true
                  url: "amqp://guest:***@localhost:5672/"
                  queues:
                    whatsapp_events:
                      messages: 0
                      consumers: 2
        503:
          description: RabbitMQ is not available
  /rabbitmq/consumers:
    get:
      tags:
        - Infrastructure
      summary: Get RabbitMQ Consumers Status
      description: Retrieves detailed information about all active RabbitMQ consumers processing WhatsApp events.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Consumer status retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  consumers:
                    - id: "consumer-1"
                      queue: "whatsapp_events"
                      status: "active"
                      messages_processed: 1523
                    - id: "consumer-2"
                      queue: "whatsapp_events"
                      status: "active"
                      messages_processed: 1489
        503:
          description: RabbitMQ is not available
  /newsletter/list:
    get:
      tags:
        - Newsletter
      summary: List subscribed newsletters
      description: |
        Returns the complete list of WhatsApp newsletters/channels the current whatsmeow session is subscribed to.

        Notes:
        - Only available for `whatsmeow` sessions.
        - Returns subscribed channels only. It does not search the public directory.
        - Newsletter JIDs use the `@newsletter` suffix.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  newsletter:
                    - id: "120363144038483540@newsletter"
                      state:
                        type: "active"
                      threadMetadata:
                        creationTime: "1688746895"
                        description:
                          id: "1689653839450668"
                          text: "WhatsApp's official channel. Follow for feature launches and updates."
                          updateTime: "1689653839450668"
                        invite: "0029Va4K0PZ5a245NkngBA2M"
                        name:
                          id: "1688746895480511"
                          text: "WhatsApp"
                          updateTime: "1688746895480511"
                        picture:
                          directPath: "/v/t61.24694-24/416962407_970228831134395_8869146381947923973_n.jpg"
                          id: "1707950960975554"
                          type: "IMAGE"
                          url: ""
                        preview:
                          directPath: "/v/t61.24694-24/416962407_970228831134395_8869146381947923973_n.jpg"
                          id: "1707950960975554"
                          type: "PREVIEW"
                          url: ""
                        settings:
                          reactionCodes:
                            value: "ALL"
                        subscribersCount: "0"
                        verification: "verified"
                      viewerMetadata:
                        mute: "on"
                        role: "subscriber"
  /newsletter/follow:
    post:
      tags:
        - Newsletter
      summary: Follow a newsletter
      description: |
        Follows a WhatsApp newsletter/channel.

        Accepted identifier fields:
        - `phone`
        - `jid`
        - `newsletterId`

        Notes:
        - At least one identifier field must be provided.
        - If the value does not contain `@newsletter`, the suffix is added automatically.
        - Only available for `whatsmeow` sessions.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Newsletter JID or raw newsletter ID
                  example: "120363144038483540@newsletter"
                jid:
                  type: string
                  description: Alias for `phone`
                  example: "120363144038483540@newsletter"
                newsletterId:
                  type: string
                  description: Alias for `phone`; raw ID or full JID
                  example: "120363144038483540"
            examples:
              fullJid:
                summary: Full newsletter JID
                value:
                  phone: "120363144038483540@newsletter"
              rawId:
                summary: Raw newsletter ID
                value:
                  newsletterId: "120363144038483540"
      responses:
        200:
          description: Newsletter followed successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Followed"
                  jid: "120363144038483540@newsletter"
  /newsletter/unfollow:
    post:
      tags:
        - Newsletter
      summary: Unfollow a newsletter
      description: |
        Unfollows a WhatsApp newsletter/channel.

        Accepted identifier fields:
        - `phone`
        - `jid`
        - `newsletterId`

        Notes:
        - At least one identifier field must be provided.
        - If the value does not contain `@newsletter`, the suffix is added automatically.
        - Only available for `whatsmeow` sessions.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Newsletter JID or raw newsletter ID
                  example: "120363144038483540@newsletter"
                jid:
                  type: string
                  description: Alias for `phone`
                  example: "120363144038483540@newsletter"
                newsletterId:
                  type: string
                  description: Alias for `phone`; raw ID or full JID
                  example: "120363144038483540"
            examples:
              fullJid:
                summary: Full newsletter JID
                value:
                  phone: "120363144038483540@newsletter"
              rawId:
                summary: Raw newsletter ID
                value:
                  newsletterId: "120363144038483540"
      responses:
        200:
          description: Newsletter unfollowed successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Unfollowed"
                  jid: "120363144038483540@newsletter"
  /newsletter/react:
    post:
      tags:
        - Newsletter
      summary: React to a newsletter message
      description: |
        Sends or removes a reaction on a WhatsApp newsletter/channel message.

        Required inputs:
        - Newsletter identifier: `phone`, `jid`, or `newsletterId`
        - Newsletter message server ID: `serverId`

        Reaction fields:
        - `body`: reaction emoji/value
        - `reaction`: alias for `body`
        - Use `remove` to clear a previous reaction

        Server ID aliases accepted:
        - `serverId`
        - `messageServerId`
        - `newsletterMessageServerId`

        Notes:
        - This endpoint uses the newsletter-specific reaction API from whatsmeow.
        - `serverId` is the newsletter message server ID, not the normal WhatsApp message ID.
        - Only available for `whatsmeow` sessions.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Newsletter JID or raw newsletter ID
                  example: "120363144038483540@newsletter"
                jid:
                  type: string
                  description: Alias for `phone`
                newsletterId:
                  type: string
                  description: Alias for `phone`
                body:
                  type: string
                  description: Reaction emoji/value or `remove`
                  example: "👍"
                reaction:
                  type: string
                  description: Alias for `body`
                  example: "👍"
                id:
                  type: string
                  description: Optional custom ID for the reaction event itself
                  example: "3EB06F9067F80BAB89FF"
                messageId:
                  type: string
                  description: Alias for `id`
                  example: "3EB06F9067F80BAB89FF"
                serverId:
                  type: integer
                  description: Newsletter message server ID
                  example: 481
                messageServerId:
                  type: integer
                  description: Alias for `serverId`
                  example: 481
                newsletterMessageServerId:
                  type: integer
                  description: Alias for `serverId`
                  example: 481
              required:
                - serverId
            examples:
              sendReaction:
                summary: Send a reaction
                value:
                  phone: "120363144038483540@newsletter"
                  body: "👍"
                  serverId: 481
              removeReaction:
                summary: Remove a reaction
                value:
                  phone: "120363144038483540@newsletter"
                  reaction: "remove"
                  serverId: 481
      responses:
        200:
          description: Newsletter reaction sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "3EB06F9067F80BAB89FF"
                  jid: "120363144038483540@newsletter"
                  serverId: 481
                  reaction: "👍"
  /newsletter/send/text:
    post:
      tags:
        - Newsletter
      summary: Send a text message to a newsletter
      description: |
        Publishes a text message to a WhatsApp newsletter/channel.

        This endpoint reuses the same payload shape as `/chat/send/text`, but the destination must be a newsletter JID.

        Notes:
        - `phone` must be a full `@newsletter` JID.
        - Only available for `whatsmeow` sessions.
        - The logged-in account must have permission to post in the target channel (typically admin/owner).
        - `check=true` is ignored for newsletter JIDs.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageText'
            examples:
              simple:
                summary: Simple newsletter post
                value:
                  phone: "120363144038483540@newsletter"
                  body: "Weekly update: new feature rollout is live."
              customId:
                summary: Newsletter post with custom ID
                value:
                  phone: "120363144038483540@newsletter"
                  body: "Pinned note for subscribers."
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  linkPreview: true
      responses:
        200:
          description: Newsletter message sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /newsletter/send/image:
    post:
      tags:
        - Newsletter
      summary: Send an image to a newsletter
      description: |
        Publishes an image message to a WhatsApp newsletter/channel.

        Accepted `image` inputs:
        - Base64 data URL or raw base64
        - Direct HTTPS URL
        - Binary upload via `multipart/form-data`

        Newsletter-specific behavior:
        - When destination is `@newsletter`, media is uploaded using whatsmeow's newsletter upload flow.
        - The logged-in account must have permission to post in the target channel.
        - Only available for `whatsmeow` sessions.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageImage'
            examples:
              base64:
                summary: Base64 newsletter image
                value:
                  phone: "120363144038483540@newsletter"
                  image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
                  caption: "New banner for this week"
              url:
                summary: Newsletter image from URL
                value:
                  phone: "120363144038483540@newsletter"
                  image: "https://example.com/newsletter/banner.jpg"
                  caption: "Release banner"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - image
              properties:
                phone:
                  type: string
                  description: Newsletter JID with `@newsletter`
                image:
                  type: string
                  format: binary
                  description: Image file
                caption:
                  type: string
                fileName:
                  type: string
                id:
                  type: string
                mimeType:
                  type: string
                imageQualityHD:
                  type: boolean
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Newsletter image sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /newsletter/send/document:
    post:
      tags:
        - Newsletter
      summary: Send a document to a newsletter
      description: |
        Publishes a document/attachment message to a WhatsApp newsletter/channel.

        Accepted `document` inputs:
        - Base64 data URL or raw base64
        - Direct HTTPS URL
        - Binary upload via `multipart/form-data`

        Notes:
        - For base64 payloads, `fileName` is required.
        - When destination is `@newsletter`, media is uploaded using whatsmeow's newsletter upload flow.
        - Only available for `whatsmeow` sessions.
        - The logged-in account must have permission to post in the target channel.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageDocument'
            examples:
              base64:
                summary: Base64 newsletter document
                value:
                  phone: "120363144038483540@newsletter"
                  document: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmo..."
                  fileName: "newsletter-update.pdf"
                  caption: "PDF edition"
              url:
                summary: Newsletter document from URL
                value:
                  phone: "120363144038483540@newsletter"
                  document: "https://example.com/files/newsletter-update.pdf"
                  fileName: "newsletter-update.pdf"
                  caption: "Attachments for subscribers"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - document
              properties:
                phone:
                  type: string
                  description: Newsletter JID with `@newsletter`
                document:
                  type: string
                  format: binary
                  description: Document file
                fileName:
                  type: string
                caption:
                  type: string
                id:
                  type: string
                mimeType:
                  type: string
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Newsletter document sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /newsletter/send/video:
    post:
      tags:
        - Newsletter
      summary: Send a video to a newsletter
      description: |
        Publishes a video message to a WhatsApp newsletter/channel.

        Accepted `video` inputs:
        - Base64 data URL or raw base64
        - Direct HTTPS URL
        - Binary upload via `multipart/form-data`

        Notes:
        - When destination is `@newsletter`, media is uploaded using whatsmeow's newsletter upload flow.
        - Only available for `whatsmeow` sessions.
        - The logged-in account must have permission to post in the target channel.
        - Videos larger than the configured limit may fall back to document send behavior, like the normal `/chat/send/video` flow.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageVideo'
            examples:
              base64:
                summary: Base64 newsletter video
                value:
                  phone: "120363144038483540@newsletter"
                  video: "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y..."
                  caption: "Product teaser"
              url:
                summary: Newsletter video from URL
                value:
                  phone: "120363144038483540@newsletter"
                  video: "https://example.com/videos/teaser.mp4"
                  caption: "Launch teaser"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - video
              properties:
                phone:
                  type: string
                  description: Newsletter JID with `@newsletter`
                video:
                  type: string
                  format: binary
                  description: Video file
                caption:
                  type: string
                fileName:
                  type: string
                id:
                  type: string
                mimeType:
                  type: string
                viewOnce:
                  type: boolean
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Newsletter video sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /webhook:
    get:
      tags:
        - Webhook
      summary: List all webhooks
      description: |
        Gets all configured webhooks and their subscribed events. Supports multiple webhooks per user.

        ## Webhook

        The following _webhook_ endpoints are used to get or set the webhook that will be called whenever a message or event is received. 
        
        **Event Categories:**
        * **Messages**: Message, AutomationMessage (text/ads/media automations), AutomationMessageReaction (reactions), UndecryptableMessage, Receipt, MediaRetry, ReadReceipt
        * **Groups & Contacts**: GroupInfo, JoinedGroup, Picture, BlocklistChange, Blocklist  
        * **Connection**: Connected, Disconnected, ConnectFailure, KeepAliveRestored, KeepAliveTimeout, LoggedOut, etc.
        * **Presence**: Presence, ChatPresence
        * **Calls**: CallOffer, CallAccept, CallTerminate, CallOfferNotice, CallRelayLatency
        * **Sync**: AppState, AppStateSyncComplete, HistorySync, OfflineSyncCompleted, OfflineSyncPreview
        * **Privacy**: PrivacySettings, PushNameSetting, UserAbout
        * **Newsletter**: NewsletterJoin, NewsletterLeave, NewsletterMuteChange, NewsletterLiveUpdate
        * **Other**: IdentityChange, CATRefreshError, FBMessage, QR, PairSuccess, PairError
        * **All** (subscribes to all event types)
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  - id: "abc123"
                    url: "https://webhook1.example.net"
                    events:
                      - "Message"
                      - "ReadReceipt"
                    headers:
                      Authorization: "Bearer token-123"
                      X-API-Key: "secret-key"
                  - id: "def456"
                    url: "https://webhook2.example.net"
                    events:
                      - "All"

    post:
      tags:
        - Webhook
      summary: Create new webhook
      description: |
        Creates a new webhook that will be used to POST information when messages are received and configures the events to subscribe to. Supports multiple webhooks per user.

        ## Webhook

        The following _webhook_ endpoints are used to get or set the webhook that will be called whenever a message or event is received. 
        
        **Event Categories:**
        * **Messages**: Message, AutomationMessage (text/ads/media automations), AutomationMessageReaction (reactions), UndecryptableMessage, Receipt, MediaRetry, ReadReceipt
        * **Groups & Contacts**: GroupInfo, JoinedGroup, Picture, BlocklistChange, Blocklist  
        * **Connection**: Connected, Disconnected, ConnectFailure, KeepAliveRestored, KeepAliveTimeout, LoggedOut, etc.
        * **Presence**: Presence, ChatPresence
        * **Calls**: CallOffer, CallAccept, CallTerminate, CallOfferNotice, CallRelayLatency
        * **Sync**: AppState, AppStateSyncComplete, HistorySync, OfflineSyncCompleted, OfflineSyncPreview
        * **Privacy**: PrivacySettings, PushNameSetting, UserAbout
        * **Newsletter**: NewsletterJoin, NewsletterLeave, NewsletterMuteChange, NewsletterLiveUpdate
        * **Other**: IdentityChange, CATRefreshError, FBMessage, QR, PairSuccess, PairError
        * **All** (subscribes to all event types)
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/WebhookSet'
            example:
              url: "https://webhook1.example.net/fzap"
              webhookUrl: "https://legacy.example.net/webhook"
              events:
                - "Message"
                - "ReadReceipt"
                - "Presence"
                - "chatwoot_message_updated"
              headers:
                Authorization: "Bearer token-123"
                X-API-Key: "secret-key"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "abc123"
                  url: "https://example.net/webhook"
                  events:
                    - "Message"
                    - "ReadReceipt"
                  headers:
                    Authorization: "Bearer token-123"
                    X-API-Key: "secret-key"
  /webhook/{id}:
    delete:
      tags:
        - Webhook
      summary: Delete specific webhook
      description: Removes a specific webhook by ID
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Webhook ID to delete
          schema:
            type: string
            example: "abc123"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Webhook deleted successfully"
        404:
          description: Webhook not found
    put:
      tags:
        - Webhook
      summary: Update specific webhook
      description: |
        Updates a specific webhook URL and events by ID.

        ## Multiple Webhooks Support

        The system supports multiple webhooks per user. Each webhook has a unique ID and can subscribe to different event types.
        
        **Event Categories:**
        * **Messages**: Message, AutomationMessage (text/ads/media automations), AutomationMessageReaction (reactions), UndecryptableMessage, Receipt, MediaRetry, ReadReceipt
        * **Groups & Contacts**: GroupInfo, JoinedGroup, Picture, BlocklistChange, Blocklist  
        * **Connection**: Connected, Disconnected, ConnectFailure, KeepAliveRestored, KeepAliveTimeout, LoggedOut, etc.
        * **Presence**: Presence, ChatPresence
        * **Calls**: CallOffer, CallAccept, CallTerminate, CallOfferNotice, CallRelayLatency
        * **Sync**: AppState, AppStateSyncComplete, HistorySync, OfflineSyncCompleted, OfflineSyncPreview
        * **Privacy**: PrivacySettings, PushNameSetting, UserAbout
        * **Newsletter**: NewsletterJoin, NewsletterLeave, NewsletterMuteChange, NewsletterLiveUpdate
        * **Other**: IdentityChange, CATRefreshError, FBMessage, QR, PairSuccess, PairError
        * **All** (subscribes to all event types)
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Webhook ID to update
          schema:
            type: string
            example: "abc123"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/WebhookUpdate'
            example:
              url: "https://updated.example.net/webhook"
              webhookUrl: "https://updated.example.net/legacy-hook"
              events:
                - "Message"
                - "ReadReceipt"
                - "Presence"
                - "chatwoot_all"
              headers:
                Authorization: "Bearer token-123"
                X-API-Key: "secret-key"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  id: "abc123"
                  url: "https://updated.example.net/webhook"
                  events:
                    - "Message"
                    - "ReadReceipt"
                    - "Presence"
                  headers:
                    Authorization: "Bearer token-123"
                    X-API-Key: "secret-key"
        404:
          description: Webhook not found
  /admin/download-links/stats:
    get:
      tags:
        - Admin
      summary: Get download links statistics
      description: |
        Returns statistics about temporary download links.

        **Metrics:**
        - Total active links
        - Downloaded count
        - Expired count (pending cleanup)
        - Total storage used

        Works independently of Chatwoot integration.
      security:
        - AdminAuth: []
      responses:
        200:
          description: Download links statistics
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  total_links: 15
                  downloaded_count: 8
                  expired_count: 2
                  total_bytes: 5242880
                  total_mb: 5.0
  /admin/download-links/cleanup:
    post:
      tags:
        - Admin
      summary: Manually cleanup expired download links
      description: |
        Forces immediate cleanup of expired download links and their files.

        **Automatic cleanup runs:**
        - Every 30 minutes (dedicated routine)
        - Daily at 3:00 AM (general cleanup)

        This endpoint allows manual cleanup on demand.

        Works independently of Chatwoot integration.
      security:
        - AdminAuth: []
      responses:
        200:
          description: Cleanup completed successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  links_removed: 5
                  bytes_freed: 1048576
                  mb_freed: 1.0
  /session/connect:
    post:
      tags:
        - Session
      summary: Connect to WhatsApp servers
      description: |
        Initiates connection to WhatsApp servers.

        ## Normal Mode (whatsmeow)
        If there is no previous session created, or if the session was reset/logged out before, the instance enters the QR/pairing flow.

        The QR retrieval flow is:
        1. Call `POST /session/connect`
        2. Wait for a successful response with `loggedIn: false`
        3. Poll [GET /session/qr](#/Session/get_session_qr) until `data.QRCode` is non-empty
        4. Render the returned value directly as an image source because it is a full `data:image/png;base64,...` string
        5. After the QR is scanned, confirm the login with [GET /session/status](#/Session/get_session_status)

        Important behavior for integrations:
        - `POST /session/connect` starts the WhatsApp websocket, but the QR is generated asynchronously
        - Because of that, the first calls to `GET /session/qr` may still return `data.QRCode: ""`
        - A successful connect response with `connected: true` and `loggedIn: false` means the instance is ready and waiting for QR scan or phone pairing
        - If the QR expires or the websocket is closed, you must call `POST /session/connect` again before requesting another QR

        If immediate is set to false, the action waits 10 seconds to retrieve actual connection status from WhatsApp, otherwise it returns immediately.

        When setting immediate to true you should check for actual connection status after a few seconds via the [status](#/Session/get_session_status) API call as your connection might fail if the session was closed from another device.

        ## Cloud API Mode (WABA)
        To connect via WhatsApp Business API (Meta Cloud API), include `providerType: "cloudapi"` along with your `phoneNumberId` and `accessToken` from Meta Business Manager. No QR code scan is required.

        **Required WABA fields:**
        - `providerType`: `"cloudapi"`
        - `phoneNumberId`: Phone Number ID from Meta Business Manager
        - `accessToken`: Permanent or temporary access token from Meta

        **Optional WABA fields:**
        - `appSecret`: App Secret for webhook signature validation (recommended)
        - `webhookVerifyToken`: Deprecated. Ignored when sent. The server always generates or reuses the stored token.

        On success, the response includes the `webhookUrl` and `webhookVerifyToken` that must be configured in Meta Business Manager to receive incoming messages.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Connect'
            examples:
              whatsmeow:
                summary: Normal mode (whatsmeow / QR code)
                value:
                  immediate: true
              cloudapi:
                summary: Cloud API mode (WABA / Meta)
                value:
                  providerType: "cloudapi"
                  phoneNumberId: "123456789012345"
                  accessToken: "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  appSecret: "abc123def456"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                whatsmeow:
                  summary: Normal mode - waiting for QR/pairing
                  value:
                    code: 200
                    success: true
                    data:
                      webhooks:
                        - "https://some.site/webhook?request=parameter"
                      jid: ""
                      events: "All"
                      providerType: "whatsmeow"
                      connected: true
                      loggedIn: false
                      details: "Connected. Waiting for QR/pairing."
                cloudapi:
                  summary: Cloud API mode - connected immediately
                  value:
                    code: 200
                    success: true
                    data:
                      success: true
                      providerType: "cloudapi"
                      connected: true
                      loggedIn: true
                      jid: "5511987654321@s.whatsapp.net"
                      phoneInfo:
                        displayPhoneNumber: "+55 11 98765-4321"
                        verifiedName: "Empresa X"
                        phoneNumberId: "123456789012345"
                      webhookUrl: "https://yourapp.com/webhook/meta/user_token_xyz"
                      webhookVerifyToken: "fzap_wvt_a1b2c3d4e5f6"
                      details: "Connected via WhatsApp Cloud API"
  /session/disconnect:
    post:
      tags:
        - Session
      summary: Disconnect from WhatsApp servers
      description: |
        Closes the current runtime connection to WhatsApp servers.

        For `whatsmeow`, the persisted device session is kept, so a later `connect` usually reuses the previous login without a new QR scan.

        For `cloudapi`, credentials remain saved and the instance is simply marked as disconnected.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Disconnected successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "Disconnected"
  /session/reset:
    post:
      tags:
        - Session
      summary: Reset WhatsApp session
      description: |
        Force-resets the session by disconnecting and clearing persisted session state.
        After reset, a new QR/pairing flow is required.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Session reset successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Session reset successfully"
        500:
          description: Failed to reset session
  /session/logout:
    post:
      tags:
        - Session
      summary: Log out from WhatsApp
      description: |
        For `whatsmeow`, closes the connection and logs the device out. The next `connect` requires QR scan or pairing again.

        For `cloudapi`, this currently behaves like `disconnect`: saved Cloud API credentials are kept and the instance is marked as disconnected.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Logout/disconnect result
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                whatsmeow:
                  summary: Logged out from a whatsmeow session
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Logged out"
                cloudapi:
                  summary: Cloud API instance is only disconnected
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Disconnected"
  /session/status:
    get:
      tags:
        - Session
      summary: Gets connection and session status
      description: |
        Gets status from connection, including websocket connection and logged in status (session).

        When the instance uses **Cloud API (WABA)** mode, the response includes an extra `cloudapi` block with the phone number ID, masked credentials, webhook verify token, and the webhook URL to configure in Meta Business Manager.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                whatsmeow:
                  summary: Normal mode (whatsmeow)
                  value:
                    code: 200
                    success: true
                    data:
                      id: "bec45bb93cbd24cbec32941ec3c93a12"
                      name: "My WhatsApp Instance"
                      connected: true
                      loggedIn: true
                      providerType: "whatsmeow"
                      token: "d030sl9aDL39sl3075zz"
                      jid: "5491155551122@s.whatsapp.net"
                      webhooks:
                        - "https://some.domain/webhook"
                      events: "All"
                      proxyUrl: ""
                      qrCode: ""
                      proxyConfig:
                        enabled: false
                        proxyUrl: ""
                      s3Config:
                        enabled: false
                        endpoint: ""
                        region: ""
                        bucket: ""
                        accessKey: "***"
                        pathStyle: false
                        publicUrl: ""
                        mediaDelivery: ""
                        retentionDays: 0
                      metadata:
                        cliente: "Empresa X"
                        crm_id: "abc123"
                cloudapi:
                  summary: Cloud API mode (WABA)
                  value:
                    code: 200
                    success: true
                    data:
                      id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
                      name: "WABA Instance"
                      connected: true
                      loggedIn: true
                      providerType: "cloudapi"
                      token: "waba_token_xyz"
                      jid: "5511987654321@s.whatsapp.net"
                      webhooks:
                        - "https://some.domain/webhook"
                      events: "All"
                      proxyUrl: ""
                      qrCode: ""
                      proxyConfig:
                        enabled: false
                        proxyUrl: ""
                      s3Config:
                        enabled: false
                        endpoint: ""
                        region: ""
                        bucket: ""
                        accessKey: "***"
                        pathStyle: false
                        publicUrl: ""
                        mediaDelivery: ""
                        retentionDays: 0
                      metadata:
                        cliente: "Empresa X"
                        crm_id: "abc123"
                      cloudapi:
                        phoneNumberId: "123456789012345"
                        accessToken: "***"
                        webhookVerifyToken: "fzap_wvt_a1b2c3d4e5f6"
                        appSecret: "***"
                        webhookUrl: "https://yourapp.com/webhook/meta/waba_token_xyz"
  /session/metadata:
    patch:
      tags:
        - Session
      summary: Update instance metadata
      description: |
        Replaces the metadata of the authenticated instance. Accessible by instance token (regular users and folder users).

        **Rules:**
        - Object values are allowed up to **3 levels** of nesting
        - Maximum total size: **16 KB**
        - Replaces existing metadata entirely (not a merge)
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - metadata
              properties:
                metadata:
                  type: object
                  description: New metadata object. Replaces existing metadata.
                  additionalProperties: true
            examples:
              simple:
                summary: Simple key-value pairs
                value:
                  metadata:
                    cliente: "Empresa X"
                    crm_id: "abc123"
                    ativo: true
              nested:
                summary: Nested object (up to 3 levels)
                value:
                  metadata:
                    cliente: "Empresa X"
                    config:
                      env: "producao"
                      plano: "premium"
              clear:
                summary: Clear all metadata
                value:
                  metadata: {}
      responses:
        200:
          description: Metadata updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  metadata:
                    cliente: "Empresa X"
                    crm_id: "abc123"
        400:
          description: Invalid payload or validation error
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              examples:
                missing_field:
                  summary: metadata field missing
                  value:
                    code: 400
                    success: false
                    error: "metadata field is required"
                depth_exceeded:
                  summary: Nesting depth exceeded
                  value:
                    code: 400
                    success: false
                    error: "metadata exceeds maximum depth of 3 levels"
  /session/pairphone:
    post:
      tags:
        - Session
      summary: Get pairing code by phone
      description: |
        Returns the linking code to enter in the WhatsApp client when pairing by phone number instead of scanning a QR code.

        This is an alternative to `GET /session/qr` for instances already started with `POST /session/connect`.

        Notes:
        - The instance must already have an active websocket session created by `POST /session/connect`
        - If the instance is already logged in, pairing is rejected
        - The response field is `data.LinkingCode` (uppercase `L` and `C`)
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Pairphone'
            example:
              phone: "5511987654321"
      responses:
        200:
          description: Linking code generated
          content:
            application/json:
              schema:
                $ref: '#/definitions/PairphoneResponse'
              example:
                  code: 200
                  success: true
                  data:
                    LinkingCode: "9H3J-H3J8"
        400:
          description: Invalid request or instance already paired
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              examples:
                missing_phone:
                  summary: Missing phone in payload
                  value:
                    code: 400
                    success: false
                    error: "missing Phone in Payload"
                already_paired:
                  summary: Instance already logged in
                  value:
                    code: 400
                    success: false
                    error: "already paired"
        500:
          description: Session not initialized yet
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 500
                success: false
                error: "no session"
  /session/qr:
    get:
      tags:
        - Session
      summary: Gets QR code for scanning
      description: |
        Returns the current QR code for a WhatsApp Web session started with `POST /session/connect`.

        The response field is `data.QRCode` (uppercase `Q`, `R`, `C`) and contains a complete `data:image/png;base64,...` string that can be rendered directly in an `<img>` tag.

        Prerequisites:
        - The instance must use the default `whatsmeow` provider
        - `POST /session/connect` must have been called first
        - The instance must be connected but not logged in yet

        Important behavior:
        - QR generation is asynchronous, so the endpoint may briefly return `data.QRCode: ""` while WhatsApp is still emitting the first code
        - Once the QR is scanned successfully, the QR is cleared and the instance becomes logged in
        - If the QR times out, the session is closed and you must call `POST /session/connect` again to start a new QR flow

        Recommended integration flow:
        1. Call `POST /session/connect`
        2. Poll `GET /session/qr` every few seconds
        3. Stop polling when `data.QRCode` is non-empty and render it
        4. After scan, use `GET /session/status` to confirm `loggedIn: true`
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: QR code available
          content:
            application/json:
              schema:
                $ref: '#/definitions/QRResponse'
              examples:
                pending_generation:
                  summary: Session connected but first QR not stored yet
                  value:
                    code: 200
                    success: true
                    data:
                      QRCode: ""
                qr_available:
                  summary: QR ready to render
                  value:
                    code: 200
                    success: true
                    data:
                      QRCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAABlBMVEX///8AAABVwtN+AAAEw0lEQVR42uyZPa7zqhaGX0ThLmsCkZlGCktMKaU76FxmSkgUmQZWJkA6CuT3avlLvrNvvRMX9x6KXWQ/UhCsn2cR/Lv+v5YhudQ6njEs1bBjqGYDwlJJpoOAArtUbK4Pi5jN3qPAlCkstcAeBazMUaoj78RpxGW4yWYzWVfmzwFLlLX4O+VkkucN5tFDOxiIAvfoA/X4uVQ4sgUcCBTYCG7AEGGKvbdrBabQ8OOyvg3ovm4ynqfLXJ9rvi+307ie5vm/gvZXgK6BLC7fo5hiG4KwW7b6I/2+DJi1+ybVFQyx6o6bbKPVDCyjTwcBZB9uevBtAEafhiosCFH/4kNA8i1gg02B3KxezGbzEjUCDgIwYppR3SNdgtY3H0M1j8xFzCscvg/8uQvZAB9piidv1RXfZhbHdAwAlzsCNCaJDdMF4WQeeSGACZ8BMNl4FZYJA7j2YalPPhhngetHAaZPcyBg2wyYdAk0fKQ5yPja5PcBzTZW4uxJ2bTGwmxnu/BH4vwSgEsYItcCH+VZJt/AYhmHatbXdX8d2JvaTVzxCVW2aVhqheXSqvnR9b4L6AoUx3zX+jZd5rDB5jbLuv0txd8GRs+liuv+TsKloQWujxxRYf5s8gOA7fMVK9PQuDtMNCx2ibIdCMCy1s0yQU6Od9bqim1BuzoOAgzTHOiKv0d5Mt+XClN8DBxN/wxg2G2DbDYNJExCqE+Ne8poXoLxdUA/w5VrnxBQ9fjlqaJMwWgPAzLjtfKRW4A21ojnStX0dX2d5PeB0fawu2pChcuM4bk+tLmbMn0GMJslb5ptDXySbb5W1+0SyVcJOgRIQxSc7X0RUSvGs2DSeaz4gwCMNi/7XNACZc0KbPBtruv2KQA+DVFladBvt4xywhmh1Xd2fx8wzGTUltqCWrHWgqL7Jg8E0hSiFJfbUJ/Fpx3L1OHsVR8+APgoZMclUKvcft2+zTBrwjHArosim4ZcfW4Y4lVWnYXg2A8C9C5aEFXDoEJzmXFyfZoH/p0Wvw7oXoZbNQ823ase1wk2DQ3u7XK/BkzOqovwpM68Ko+jUyPFu6F8H4DvqsAuaUMZJ6+azjTPdS32KMBkLnpQ3VPnbsZgiktALW91/wDQEV5V7gT4JT6L62GRzeV0EDDC7rVFax2ZW6Aa6V5h/FEAgBlSbLrMVScU1s09+jxwG/9q87cB/Yxw3acBsk2Yw+nPf9Y1p88ARlNPtvPkF3LlPQYp8MtSx/FtpF8H4DNrZd8fOtTOxJSzXdo/c/fXAbN2DLeKs1dxHeEZZVWaju/3h18CcDk3qePZpllglDZ89MCq8nIQoDPAVaPi3iAFFwS1xjjr+HcYwD+hri216vBZzQbbZsE44RhAp+sQxfTpApGCoV1NOfsl4pX+nwC65a1uLnkK9TSuVTOhaQ4cBOzvtDcZXU5Bdl28SrF9HqrZJhwD7O/VsZpi7xSz7pXW6ahQ1/dB/RrYf2QhLBmr1lNINVRZfw9BBwArc4SszGlWWd2fxB9cFvJQYKnUUWAgV22y5v1e/ffHpiOAqMLCiOpymwNGtxvk9s8mfwcU2CiydqvJbdKuSX0K8a/KHQDsMQkyeVbtISFif8mRcfwRtF8F/l3/O+s/AQAA///lM0dZSaTeTQAAAABJRU5ErkJggg=="
        500:
          description: Session not ready for QR retrieval
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              examples:
                no_session:
                  summary: Connect was not called yet
                  value:
                    code: 500
                    success: false
                    error: "no session"
                not_connected:
                  summary: Websocket is not connected
                  value:
                    code: 500
                    success: false
                    error: "not connected"
                already_logged_in:
                  summary: Instance is already paired
                  value:
                    code: 500
                    success: false
                    error: "already logged in"
  /session/establish-session:
    post:
      tags:
        - Session
      summary: Establish session with contact
      description: |
        Triggers device discovery for a target WhatsApp JID so Signal sessions can be established before sending messages.

        The request must contain a full WhatsApp JID such as `5511987654321@s.whatsapp.net`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                userJID:
                  type: string
                  description: Full WhatsApp JID of the target contact
                  example: "5511987654321@s.whatsapp.net"
              required:
                - userJID
      responses:
        200:
          description: Session established successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "User devices discovered - Signal sessions established"
                    targetJid: "5511987654321@s.whatsapp.net"
                    discoveredDevices:
                      - "5511987654321:1@s.whatsapp.net"
                    deviceCount: 1
                    timestamp: 1712140800
  /session/force-session:
    post:
      tags:
        - Session
      summary: Force session via message
      description: |
        Forces Signal session establishment by sending and then revoking a temporary message to the target JID.

        The request must contain a full WhatsApp JID such as `5511987654321@s.whatsapp.net`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                targetJID:
                  type: string
                  description: Full WhatsApp JID of the target contact
                  example: "5511987654321@s.whatsapp.net"
              required:
                - targetJID
      responses:
        200:
          description: Session forced successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "Session-forcing message sent and deleted"
                    targetJid: "5511987654321@s.whatsapp.net"
                    messageId: "3EB01234567890ABCDE"
                    timestamp: 1712140800
                    theory: "Temporary message should force Signal session establishment"
                    nextStep: "Session should now be established - try sending a message"
  /session/proxy:
    post:
      tags:
        - Session
      summary: Set Proxy Configuration
      description: |
        Sets or disables the proxy configuration for the user.
        Provide `enabled: true` with `proxyUrl` to save a proxy, or `enabled: false` to clear the current configuration.

        Supported schemes are `http`, `https`, and `socks5`.

        This endpoint cannot be used while a `whatsmeow` client is connected.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                proxyUrl:
                  type: string
                  description: Proxy URL in format "http://host:port" or "socks5://user:pass@host:port"
                enabled:
                  type: boolean
                  description: Whether to enable or disable the proxy
              required:
                - enabled
            examples:
              enable:
                summary: Enable a proxy
                value:
                  proxyUrl: "socks5://user:pass@proxy.local:1080"
                  enabled: true
              disable:
                summary: Disable the saved proxy
                value:
                  enabled: false
      responses:
        "200":
          description: Proxy configured successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                enable:
                  summary: Proxy enabled
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Proxy configured successfully"
                      proxyUrl: "socks5://user:pass@host:port"
                disable:
                  summary: Proxy disabled
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Proxy disabled successfully"
        "400":
          description: Bad Request
        "500":
          description: Internal Server Error
  /session/bindAddress:
    post:
      tags:
        - Session
      summary: Set Bind Address Configuration
      description: |
        Sets or disables the local outbound bind address for the user.
        Provide `enabled: true` with `bindAddress` to save a local IPv4 or IPv6 address, or `enabled: false` to clear the current configuration.

        The address must already be configured on the host/container network. This endpoint cannot be used while a `whatsmeow` client is connected.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                bindAddress:
                  type: string
                  description: Local IPv4 or IPv6 address used as net.Dialer.LocalAddr
                enabled:
                  type: boolean
                  description: Whether to enable or disable the bind address
              required:
                - enabled
            examples:
              enable:
                summary: Enable a bind address
                value:
                  bindAddress: "2001:db8:abcd:1234::10"
                  enabled: true
              disable:
                summary: Disable the saved bind address
                value:
                  enabled: false
      responses:
        "200":
          description: Bind address configured successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                enable:
                  summary: Bind address enabled
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Bind address configured successfully"
                      bindAddress: "2001:db8:abcd:1234::10"
                disable:
                  summary: Bind address disabled
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Bind address disabled successfully"
        "400":
          description: Bad Request
        "500":
          description: Internal Server Error
  /session/bindAddress/options:
    get:
      tags:
        - Session
      summary: List Bind Address Options
      description: |
        Lists local IPv4 and IPv6 addresses visible to the FZAP process that can be used as `bindAddress` candidates.
        Loopback, link-local, multicast, and down interfaces are excluded.
      security:
        - ApiKeyAuth: []
      responses:
        "200":
          description: Local bind address candidates
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  count: 2
                  addresses:
                    - address: "192.0.2.10"
                      family: "ipv4"
                      interfaceName: "eth0"
                    - address: "2001:db8:abcd:1234::10"
                      family: "ipv6"
                      interfaceName: "eth0"
        "500":
          description: Internal Server Error
  /session/bindAddress/test:
    post:
      tags:
        - Session
      summary: Test Bind Address Connection
      description: |
        Tests whether the configured or supplied `bindAddress` can open an outbound HTTP connection.
        The response includes `observedIp` when the public IP lookup endpoint returns one.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                bindAddress:
                  type: string
                  description: Local IPv4 or IPv6 address to test. If omitted, the saved bindAddress is used.
                proxyUrl:
                  type: string
                  description: Optional proxy URL to combine with the bind address during the test.
            example:
              bindAddress: "2001:db8:abcd:1234::10"
      responses:
        "200":
          description: Bind address test result
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  success: true
                  details: "Bind address connection successful"
                  bindAddress: "2001:db8:abcd:1234::10"
                  observedIp: "2001:db8:abcd:1234::10"
                  statusCode: 200
                  proxyEnabled: false
        "400":
          description: Bad Request
  /session/proxy/test:
    post:
      tags:
        - Session
      summary: Test Proxy Connection
      description: |
        Tests connectivity through a proxy.

        If `proxyUrl` is sent in the request body, that value is tested.
        If the request body is empty, the endpoint falls back to the proxy saved for the current instance.

        The legacy request field `proxy_url` is also accepted.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                proxyUrl:
                  type: string
                  description: Proxy URL to test (e.g. "http://host:port" or "socks5://user:pass@host:port")
                  example: "http://proxy.example.com:8080"
            examples:
              explicit:
                summary: Test an explicit proxy URL
                value:
                  proxyUrl: "http://proxy.example.com:8080"
              saved:
                summary: Test the saved proxy configuration
                value: {}
      responses:
        200:
          description: Proxy test completed
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              examples:
                success:
                  summary: Proxy connection successful
                  value:
                    code: 200
                    success: true
                    data:
                      details: "Proxy connection successful"
                      proxyUrl: "http://proxy.example.com:8080"
                      proxyType: "http"
                      statusCode: 200
                failed_connection:
                  summary: Proxy reachable check failed
                  value:
                    code: 200
                    success: false
                    error: "Proxy connection failed: dial tcp 203.0.113.10:8080: i/o timeout"
                    details: "Unable to connect through the specified proxy"
        400:
          description: Invalid proxy URL, missing saved config, or invalid request body
  /session/proxy/rotation:
    get:
      tags:
        - Session
      summary: Get proxy rotation configuration
      description: Returns the current proxy rotation settings for the authenticated instance.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Proxy rotation configuration
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  enabled: true
                  proxyList:
                    - "http://proxy1.example.com:8080"
                    - "socks5://user:pass@proxy2.example.com:1080"
                  mode: "interval"
                  intervalSeconds: 3600
                  randomStart: "01:00"
                  randomEnd: "03:00"
                  fixedTimes:
                    - "09:00"
                    - "15:00"
                  currentIndex: 0
                  lastRotatedAt: "2026-03-04T21:10:00Z"
                  nextRotationAt: "2026-03-04T22:10:00Z"
    post:
      tags:
        - Session
      summary: Save proxy rotation configuration
      description: |
        Creates or updates automatic proxy rotation settings.

        If `mode` is invalid or omitted, it defaults to `interval`.
        If `intervalSeconds` is `0` or negative, it defaults to `3600`.
        If `randomStart`/`randomEnd` are empty, they default to `01:00` and `03:00`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                proxyList:
                  type: array
                  items:
                    type: string
                mode:
                  type: string
                  enum: [interval, random_range, fixed_times]
                intervalSeconds:
                  type: integer
                  description: Used when mode is `interval`.
                randomStart:
                  type: string
                  description: Start time (HH:MM) used when mode is `random_range`.
                randomEnd:
                  type: string
                  description: End time (HH:MM) used when mode is `random_range`.
                fixedTimes:
                  type: array
                  description: List of times (HH:MM) used when mode is `fixed_times`.
                  items:
                    type: string
            example:
              enabled: true
              proxyList:
                - "http://proxy1.example.com:8080"
                - "http://proxy2.example.com:8080"
              mode: "interval"
              intervalSeconds: 1800
              randomStart: "01:00"
              randomEnd: "03:00"
              fixedTimes: []
      responses:
        200:
          description: Proxy rotation config saved
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Proxy rotation config saved"
        400:
          description: Could not decode payload
    delete:
      tags:
        - Session
      summary: Delete proxy rotation configuration
      description: Removes proxy rotation config and stops scheduler for the authenticated instance.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Proxy rotation config deleted
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Proxy rotation config deleted"
  /session/proxy/rotation/rotate-now:
    post:
      tags:
        - Session
      summary: Trigger immediate proxy rotation
      description: Forces an immediate proxy switch based on current rotation configuration.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Rotation triggered
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Proxy rotation triggered"
        400:
          description: Rotation not possible with current config
        503:
          description: Rotation scheduler unavailable
  /session/s3/config:
    post:
      tags:
        - Session
      summary: Configure S3 Storage
      description: |
        Configures S3 storage settings for the user to store media files.
        Supports AWS S3, MinIO, Backblaze B2, and other S3-compatible services.
        When enabled, media files will be uploaded to S3 and can be accessed via public URLs.

        The backend stores the supplied fields even when `enabled` is `false`, but an effective S3 setup normally requires at least endpoint, region, bucket, access key, and secret key.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/S3Config'
            example:
              enabled: true
              endpoint: "https://s3.amazonaws.com"
              region: "us-east-1"
              bucket: "my-whatsapp-media"
              accessKey: "AKIAIOSFODNN7EXAMPLE"
              secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              pathStyle: false
              publicUrl: "https://cdn.example.com"
              mediaDelivery: "both"
              retentionDays: 30
      responses:
        200:
          description: S3 configuration saved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "S3 configuration saved successfully"
                    enabled: true
        400:
          description: Bad Request
        500:
          description: Internal Server Error
    get:
      tags:
        - Session
      summary: Get S3 Configuration
      description: Retrieves the current S3 storage configuration for the user.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: S3 configuration retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    enabled: true
                    endpoint: "https://s3.amazonaws.com"
                    region: "us-east-1"
                    bucket: "my-bucket"
                    accessKey: "***"
                    pathStyle: false
                    publicUrl: ""
                    mediaDelivery: "both"
                    retentionDays: 30
        500:
          description: Internal Server Error
    delete:
      tags:
        - Session
      summary: Delete S3 Configuration
      description: Removes the S3 storage configuration for the user and reverts to default base64 media delivery.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: S3 configuration deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "S3 configuration deleted successfully"
        500:
          description: Internal Server Error
  /session/s3/test:
    post:
      tags:
        - Session
      summary: Test S3 Connection
      description: |
        Tests S3 connectivity for the current instance.

        If a saved S3 configuration exists and is enabled, that configuration is used.
        Otherwise, you can send a request body with the configuration to test without saving it first.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                endpoint:
                  type: string
                  example: "https://s3.amazonaws.com"
                region:
                  type: string
                  example: "us-east-1"
                bucket:
                  type: string
                  example: "my-whatsapp-media"
                accessKey:
                  type: string
                  example: "AKIAIOSFODNN7EXAMPLE"
                secretKey:
                  type: string
                  example: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                pathStyle:
                  type: boolean
                  example: false
                publicUrl:
                  type: string
                  example: "https://cdn.example.com"
                retentionDays:
                  type: integer
                  example: 30
            examples:
              saved:
                summary: Test saved enabled configuration
                value: {}
              unsaved:
                summary: Test an unsaved configuration
                value:
                  endpoint: "https://s3.amazonaws.com"
                  region: "us-east-1"
                  bucket: "my-whatsapp-media"
                  accessKey: "AKIAIOSFODNN7EXAMPLE"
                  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  pathStyle: false
      responses:
        200:
          description: S3 connection test successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                  code: 200
                  success: true
                  data:
                    details: "S3 connection test successful"
                    bucket: "my-bucket"
                    region: "us-east-1"
        400:
          description: Invalid request, DNS/TLS error, region mismatch, or invalid bucket name
        403:
          description: S3 credentials are invalid or do not have permission to access the bucket
        404:
          description: S3 bucket not found
        502:
          description: Could not connect to the S3 endpoint
        504:
          description: Timed out while connecting to S3
        500:
          description: S3 connection test failed
  /session/s3/status:
    get:
      tags:
        - Session
      summary: Get S3 Configuration Status
      description: Checks if S3 is configured (similar to Chatwoot check).
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Status retrieved
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  configured: true
                  status: "configured"
  /session/call-rejection/config:
    get:
      tags:
        - Session
      summary: Get Call Rejection Configuration
      description: Retrieves the current call rejection settings for the instance. If no custom message is saved, the backend returns the localized default message.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Call rejection configuration retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  success:
                    type: boolean
                  config:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                      message:
                        type: string
              example:
                code: 200
                success: true
                config:
                  enabled: true
                  message: "Sorry, I'm unable to take calls right now. Please send a message instead."
        404:
          description: User not found
    post:
      tags:
        - Session
      summary: Configure Call Rejection Settings
      description: |
        Enables or disables automatic call rejection and sets the message to send when rejecting calls.

        If `message` is empty or omitted, the backend stores the localized default rejection message.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                  description: Enable or disable automatic call rejection
                  example: true
                message:
                  type: string
                  description: Custom message to send when rejecting calls
                  example: "Sorry, I'm unable to take calls right now. Please send a message instead."
              required:
                - enabled
      responses:
        200:
          description: Call rejection settings saved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  success:
                    type: boolean
                  message:
                    type: string
                  config:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                      message:
                        type: string
              example:
                code: 200
                success: true
                message: "call rejection config saved successfully"
                config:
                  enabled: true
                  message: "Sorry, I'm unable to take calls right now. Please send a message instead."
        400:
          description: Invalid request body
  /user/info:
    post:
      tags:
        - User
      summary: Get detailed user information
      description: |
        Returns WhatsApp user info enriched with locally stored contact data.
        Accepts phone numbers or full JIDs; numbers without `@` are normalized to `@s.whatsapp.net`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Checkuser'
            example:
              phone:
                - "5511988776655"
                - "5511987654321@s.whatsapp.net"


      responses:
        200:
          description: Detailed user info returned
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    users:
                      "5511987654321@s.whatsapp.net":
                        verifiedName:
                          details:
                            verifiedName: "Company SA"
                        status: "online"
                        pictureId: "1582328807"
                        devices:
                          - "5511987654321@s.whatsapp.net"
                        lid: "2:ABcDeFgH123456789@lid"
                        found: true
                        firstName: "John"
                        fullName: "John Doe"
                        pushName: "John"
                        businessName: "Company SA"
                        redactedPhone: "+54*****3934"
                      "5511987000000@s.whatsapp.net":
                        verifiedName: null
                        status: ""
                        pictureId: ""
                        devices: []
                        lid: ""
                        found: false
  /user/check:
    post:
      tags:
        - User
      summary: Check if numbers are on WhatsApp
      description: |
        Checks if the provided phone numbers or JIDs are registered on WhatsApp and enriches the result with contact info when available.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Checkuser'
            example:
              phone:
                - "5511987654321"
                - "5511987654321@s.whatsapp.net"


      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    users:
                      - query: "5491155553934"
                        isInWhatsapp: true
                        jid: "5491155553934@s.whatsapp.net"
                        verifiedName: "Company Name"
                        found: true
                        firstName: "John"
                        fullName: "John Doe"
                        pushName: "John"
                        businessName: "Company Name"
                        redactedPhone: "+54*****3934"
                      - query: "5511987654321"
                        isInWhatsapp: false
                        jid: "5511987654321@s.whatsapp.net"
                        verifiedName: ""
                        found: false
  /user/presence:
    post:
      tags:
        - User
      summary: Send user global presence
      description: Sends user presence Available or Unavailable
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/UserPresence'
            example:
              type: "available"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    details: "Presence set successfully"
        400:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
                example:
                  code: 400
                  success: false
                  error: "Invalid presence type. Allowed values: 'available', 'unavailable'"
  /user/avatar:
    post:
      tags:
        - User
      summary: Get profile picture info with public download link
      description: |
        Retrieves profile picture metadata (full or preview) and returns a public download URL cached on disk.
        The original WhatsApp URL is also returned for direct download.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Checkavatar'
            example:
              phone: "5511987654321"
              preview: false


      responses:
        200:
          description: Profile picture info
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    url: "https://pps.whatsapp.net/v/t61.24694-24/227295214_112447507729487_4643695328050510566_n.jpg?stp=dst-jpg_s96x96&ccb=11-4&oh=ja432434a91e8f41d86d341bx889c217&oe=543222A4"
                    id: "1645308319"
                    type: "preview"
                    directPath: "/v/t61.24694-24/227295214_112447507729487_4643695328050510566_n.jpg?stp=dst-jpg_s96x96&ccb=11-4&oh=ja432434a91e8f41d86d341ba889c217&oe=543222A4"
                    publicDownloadUrl: "https://api.example.com/avatars/USERID_hash_preview.jpg"
                    isEncrypted: false
  /user/contacts:
    get:
      tags:
        - User
      summary: Gets all contacts for the account
      description: Returns the complete contact list from the local store, including business/name fields and redacted phone when available.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    "5511987654321@s.whatsapp.net":
                      found: true
                      firstName: "Ana"
                      fullName: "Ana Paula"
                      pushName: "FOP2"
                      businessName: ""
                      redactedPhone: "+54*****3333"
                    "5511987000000@s.whatsapp.net":
                      found: true
                      firstName: ""
                      fullName: ""
                      pushName: "Asternic"
                      businessName: ""
                      redactedPhone: ""
  /user/contact:
    get:
      tags:
        - User
      summary: Get a single contact by JID
      description: Returns contact info (name, pushName, businessName) for a specific WhatsApp JID from the local store.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: contactId
          in: query
          required: true
          description: WhatsApp JID or phone number (e.g. 5511987654321 or 5511987654321@s.whatsapp.net)
          schema:
            type: string
            example: "5511987654321"
      responses:
        200:
          description: Contact info retrieved
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  found: true
                  jid: "5511987654321@s.whatsapp.net"
                  fullName: "Ana Paula"
                  firstName: "Ana"
                  pushName: "FOP2"
                  businessName: ""
        400:
          description: Missing or invalid contactId
        500:
          description: No active session or store error
  /user/block:
    post:
      tags:
        - User
      summary: Block a contact
      description: Blocks a WhatsApp contact so they cannot send you messages.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the contact to block
                  example: "5511987654321"
            example:
              phone: "5511987654321"
      responses:
        200:
          description: Contact blocked successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  success: true
        400:
          description: Missing or invalid phone
        500:
          description: No active session or block operation failed
  /user/unblock:
    post:
      tags:
        - User
      summary: Unblock a contact
      description: Unblocks a previously blocked WhatsApp contact.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - phone
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the contact to unblock
                  example: "5511987654321"
            example:
              phone: "5511987654321"
      responses:
        200:
          description: Contact unblocked successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  success: true
        400:
          description: Missing or invalid phone
        500:
          description: No active session or unblock operation failed
  /user/lid/get:
    get:
      tags:
        - User
      summary: Convert JID/Phone to LID format
      description: Converts a WhatsApp JID (phone@s.whatsapp.net) to LID format using whatsmeow's native mapping system
      security:
        - ApiKeyAuth: []
      parameters:
        - name: phone
          in: query
          required: true
          description: Full JID (phone@s.whatsapp.net) to convert to LID. Include @s.whatsapp.net when sending plain numbers.
          schema:
            type: string
            example: "5511987654321@s.whatsapp.net"
      responses:
        200:
          description: LID conversion successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    jid: "5511987654321@s.whatsapp.net"
                    lid: "2:ABcDeFgH123456789@lid"
        400:
          description: Bad request - missing or invalid JID format
        404:
          description: LID not found for provided JID
    post:
      tags:
        - User
      summary: Convert JID/Phone to LID format (POST)
      description: Converts a WhatsApp JID (phone@s.whatsapp.net) to LID format using JSON payload
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Full JID (phone@s.whatsapp.net) to convert
                  example: "5511987654321@s.whatsapp.net"
              required:
                - phone
            example:
              phone: "5511987654321@s.whatsapp.net"
      responses:
        200:
          description: LID conversion successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    jid: "5511987654321@s.whatsapp.net"
                    lid: "2:ABcDeFgH123456789@lid"
        400:
          description: Bad request - missing or invalid JSON/JID format
        404:
          description: LID not found for provided JID
  /user/lid/reverse:
    get:
      tags:
        - User
      summary: Convert LID to JID/Phone format
      description: Converts a WhatsApp LID back to JID format using whatsmeow's native mapping system
      security:
        - ApiKeyAuth: []
      parameters:
        - name: lid
          in: query
          required: true
          description: LID to convert to JID
          schema:
            type: string
            example: "2:ABcDeFgH123456789@lid"
      responses:
        200:
          description: JID conversion successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    lid: "2:ABcDeFgH123456789@lid"
                    jid: "5511987654321@s.whatsapp.net"
        400:
          description: Bad request - missing or invalid LID format
        404:
          description: JID not found for provided LID
    post:
      tags:
        - User
      summary: Convert LID to JID/Phone format (POST)
      description: Converts a WhatsApp LID back to JID format using JSON payload
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                lid:
                  type: string
                  description: LID to convert to JID
                  example: "2:ABcDeFgH123456789@lid"
              required:
                - lid
            example:
              lid: "2:ABcDeFgH123456789@lid"
      responses:
        200:
          description: JID conversion successful
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    lid: "2:ABcDeFgH123456789@lid"
                    jid: "5511987654321@s.whatsapp.net"
        400:
          description: Bad request - missing or invalid JSON/LID format
        404:
          description: JID not found for provided LID
  /user/lid/list:
    get:
      tags:
        - User
      summary: List LID mappings information
      description: Provides information about LID mapping functionality (whatsmeow doesn't expose a direct listing method)
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: LID mapping information
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    message: "LID mappings listing not available"
                    note: "whatsmeow library does not provide a direct method to list all LID mappings"
                    info: "Use /user/lid/get to convert a specific JID to LID, or /user/lid/reverse to convert LID to JID"
  /user/privacy/settings:
    get:
      tags:
        - User
      summary: Get Privacy Settings
      description: Retrieves the current WhatsApp privacy settings for the user account using the native WhatsApp values.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Privacy settings retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    groupAdd: "contacts"
                    lastSeen: "contacts"
                    status: "contacts"
                    profile: "contacts"
                    readReceipts: "all"
                    callAdd: "known"
                    online: "match_last_seen"
        500:
          description: Failed to retrieve privacy settings
    put:
      tags:
        - User
      summary: Update Privacy Settings
      description: Updates one or more WhatsApp privacy settings. Values use the native WhatsApp options.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                groupAdd:
                  type: string
                  description: Who can add you to groups (all, contacts, contact_blacklist, none)
                  example: "all"
                lastSeen:
                  type: string
                  description: Who can see your last seen (all, contacts, contact_blacklist, none)
                  example: "contacts"
                status:
                  type: string
                  description: Who can see your status updates (all, contacts, contact_blacklist, none)
                  example: "contacts"
                profile:
                  type: string
                  description: Who can see your profile photo (all, contacts, contact_blacklist, none)
                  example: "contacts"
                readReceipts:
                  type: string
                  description: Read receipts visibility (all, none)
                  example: "all"
                callAdd:
                  type: string
                  description: Who can call you (all, known)
                  example: "known"
                online:
                  type: string
                  description: Who can see you online (all, match_last_seen)
                  example: "match_last_seen"
            example:
              groupAdd: "contacts"
              lastSeen: "contacts"
              status: "contacts"
              profile: "contacts"
              readReceipts: "all"
              callAdd: "known"
              online: "match_last_seen"
      responses:
        200:
          description: Privacy settings updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    success: true
                    updated:
                      lastSeen: "contacts"
                      online: "match_last_seen"
                    message: "All privacy settings updated successfully"
        400:
          description: Invalid privacy settings
  /user/profile/name:
    get:
      tags:
        - User
      summary: Get Profile Push Name
      description: Returns the current account push name configured for outgoing messages.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Push name returned successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    success: true
                    pushName: "John Doe"
    put:
      tags:
        - User
      summary: Set Profile Push Name
      description: Updates the current account push name (display name shown to recipients).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                pushName:
                  type: string
                  description: New push name to set.
                  example: "John Doe"
                name:
                  type: string
                  description: Alias for pushName (backward-compatible alternative field).
                  example: "John Doe"
              oneOf:
                - required: [pushName]
                - required: [name]
            example:
              pushName: "John Doe"
      responses:
        200:
          description: Push name updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    success: true
                    message: "Push name updated successfully"
                    pushName: "John Doe"
        400:
          description: Missing or invalid push name
  /user/profile/avatar:
    put:
      tags:
        - User
      summary: Set Profile Avatar
      description: Updates the current account profile avatar (JPEG required). Accepts URL, base64 (data URL/raw), or binary upload.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                image:
                  type: string
                  description: Image payload (HTTP(S) URL, data:image/...;base64,..., or raw base64). Must resolve to JPEG.
                  example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
              required:
                - image
            example:
              image: "https://example.com/avatar.jpg"
          multipart/form-data:
            schema:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                  format: binary
                  description: JPEG image file
      responses:
        200:
          description: Profile avatar updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    success: true
                    message: "Profile avatar updated successfully"
                    pictureId: "1741300912"
        400:
          description: Invalid payload, URL download failure, or image format
  /user/profile/status:
    put:
      tags:
        - User
      summary: Set Profile Status/About
      description: Updates the user's profile status (about) text.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  description: New status/about text (max 139 characters)
                  example: "Available for work 24/7"
              required:
                - status
            example:
              status: "Available for projects and support"
      responses:
        200:
          description: Profile status updated successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    success: true
                    message: "Status message updated successfully"
                    status: "Available for work 24/7"
        400:
          description: Invalid status text
  /chat/delete:
    post:
      tags:
        - Chat 
      summary: Deletes a message sent by user
      description: |
        Deletes a message previously sent by the same user.

        **Cloud API limitation:** this endpoint is not supported by the current Cloud API implementation and returns `501 Not Implemented`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DeleteMessage'
            example:
              phone: "5511987654321"
              id: "AABBCC11223344"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Deleted"
                  id: "AABBCC11223344"
                  timestamp: 1713459372
        501:
          description: Cloud API delete is not implemented in this version
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 501
                success: false
                error: "CloudAPI delete is not supported in this implementation"
  /chat/markread:
    post:
      tags:
        - Chat 
      summary: Marks a message as read
      description: Marks one or more received messages as read
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/Markread'
            example:
              id:
                - "AABBCC11223344"
                - "BBCCDD22334455"
              chat: "5491155553934@s.whatsapp.net"
              sender: "5491155553934@s.whatsapp.net"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Messages marked as read"
  /chat/mark-all-read:
    post:
      tags:
        - Chat
      summary: Mark all messages in chat as read
      description: Marks all messages in a specific chat/conversation as read.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the chat
                  example: "5511987654321"
              required:
                - phone
            example:
              phone: "5511987654321@s.whatsapp.net"
      responses:
        200:
          description: All messages marked as read
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "All messages marked as read"
  /chat/archive:
    post:
      tags:
        - Chat
      summary: Archive or unarchive a chat
      description: Archives or unarchives a specific conversation.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the chat
                  example: "5511987654321"
                archive:
                  type: boolean
                  description: Archive (true) or unarchive (false)
                  example: true
              required:
                - phone
                - archive
            example:
              phone: "5511987654321"
              archive: true
      responses:
        200:
          description: Chat archived/unarchived successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Chat archived successfully"
  /chat/pin:
    post:
      tags:
        - Chat
      summary: Pin or unpin a chat
      description: Pins or unpins a conversation to the top of the chat list.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the chat
                  example: "5511987654321"
                pin:
                  type: boolean
                  description: Pin (true) or unpin (false)
                  example: true
              required:
                - phone
                - pin
            example:
              phone: "5511987654321"
              pin: true
      responses:
        200:
          description: Chat pinned/unpinned successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Chat pinned successfully"
  /chat/mute:
    post:
      tags:
        - Chat
      summary: Mute or unmute a chat
      description: Mutes or unmutes notifications for a specific conversation.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone:
                  type: string
                  description: Phone number or JID of the chat
                  example: "5511987654321"
                mute:
                  type: boolean
                  description: Mute (true) or unmute (false)
                  example: true
                duration:
                  type: integer
                  description: Mute duration in seconds (0 for forever)
                  example: 0
              required:
                - phone
                - mute
            example:
              phone: "5511987654321"
              mute: true
              duration: 0
      responses:
        200:
          description: Chat muted/unmuted successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Chat muted successfully"
  /chat/react:
    post:
      tags:
        - Chat 
      summary: Reacts to a message
      description: |
        Sends a reaction to a message. `phone`, `body`, and `id` are required.

        To react to your own message, prefix the **message id** with `me:`. To remove a reaction, send `body: "remove"`.

        For group chats (`@g.us`), when reacting to a message from another participant, send `participant`
        with the original sender JID (or phone, which is normalized to JID by the server).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/ReactionText'
            example:
              phone: "5511987654321"
              body: "<3"
              id: "me:3EB06F9067F80BAB89FF"
          x-codeSamples:
            - lang: JSON
              label: Group reaction
              source: |
                {
                  "phone": "120363417042313103@g.us",
                  "body": "🔥",
                  "id": "3EB06F9067F80BAB89FF",
                  "participant": "5511987654321@s.whatsapp.net"
                }

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "3EB06F9067F80BAB89FF"
                  timestamp: 1713459372
  # Os endpoints de PIX (/chat/send/pix), Carousel (/chat/send/carousel) e License (/license/*) 
  # são para uso interno do dashboard e permanecem propositalmente não documentados na spec pública.
  
  /chat/send/text:
    post:
      tags:
        - Chat
      summary: Sends a text message
      description: |
        Sends a text message with optional typing delay, link preview, and mentions.

        **Required fields:**
        - phone: Destination phone number or group JID
        - body: Message text content

        **Optional features:**
        - id: Custom message ID (auto-generated if omitted)
        - delay: Typing indicator delay in milliseconds, or `true` for automatic typing delay
        - linkPreview: Enable automatic link preview for URLs (default false)
        - mentionAll: Mention all group members (groups only, default false)
        - contextInfo: For replies and mentions in normal mode (`whatsmeow`)
          - stanzaId: ID of the message being replied to
          - participant: JID of who wrote the original message
          - mentionedJid: Array of JIDs to mention individually
        - stanzaId: Reply target in Cloud API mode

        **Examples:**
        - Simple message: Just phone and body
        - With typing: Add delay
        - Reply: Add contextInfo with stanzaId and participant
        - Mention specific users: Add contextInfo.mentionedJid array
        - Mention all in group: Set mentionAll to true (phone must be a group JID)
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageText'
            examples:
              normal:
                summary: Normal mode (whatsmeow)
                value:
                  phone: "5511987654321"
                  body: "Hello! This is a test message."
                  check: true
                  delay: 2000
                  linkPreview: false
                  mentionAll: false
              cloudapi:
                summary: Cloud API mode (WABA)
                value:
                  phone: "5511987654321"
                  body: "Hello from WhatsApp Business API!"
                  linkPreview: true
              cloudapiReply:
                summary: Cloud API — reply to a message
                value:
                  phone: "5511987654321"
                  body: "Thanks for reaching out!"
                  stanzaId: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/edit:
    post:
      tags:
        - Chat
      summary: Edits a previously sent message
      description: |
        Edits a message already sent by the same user. Provide the chat `phone`, the original message `id`, and the new `body`.

        **Cloud API limitation:** this endpoint is not supported by the current Cloud API implementation and returns `501 Not Implemented`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                  description: The ID of the message to edit
                  example: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                phone:
                  type: string
                  description: The destination chat phone number or JID
                  example: "5511987654321"
                body:
                  type: string
                  description: New message content
                  example: "This is the updated message"
              required:
                - id
                - phone
                - body
            example:
              id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
              phone: "5511987654321"
              body: "Updated message content"
      responses:
        200:
          description: Message edited successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
        400:
          description: Invalid parameters or message not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 400
                success: false
                error: "Invalid message ID or new content"
        501:
          description: Cloud API edit is not implemented in this version
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 501
                success: false
                error: "CloudAPI edit is not supported in this implementation"
  /chat/send/image:
    post:
      tags:
        - Chat
      summary: Sends an image/picture message
      description: |
        Sends an image message. The `image` field accepts:
        - Base64 data URL (`data:image/...;base64,...`) or raw base64
        - Direct HTTPS URLs (server downloads with caching)
        - Binary upload via `multipart/form-data`
        - `imageQualityHD` to override image quality per request (`true` = HD, `false` = standard)

        Files larger than 64 MB are sent as documents automatically.
        GIFs are converted to MP4 with `gifPlayback=true` for compatibility.

        **⚠️ Cloud API (WABA) limitation:** Only publicly accessible HTTPS URLs are supported. Base64 and binary upload are not accepted.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageImage'
            examples:
              base64:
                summary: Base64 data URL (whatsmeow only)
                value:
                  phone: "5511987654321"
                  image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
                  caption: "Sample photo"
                  imageQualityHD: false
                  check: true
              url:
                summary: HTTPS URL (whatsmeow)
                value:
                  phone: "5511987654321"
                  image: "https://example.com/image.jpg"
                  caption: "Image via URL"
                  imageQualityHD: true
                  mentionAll: false
              cloudapi:
                summary: Cloud API (WABA) — URL required
                value:
                  phone: "5511987654321"
                  image: "https://example.com/image.jpg"
                  caption: "Image via Cloud API"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - image
              properties:
                phone:
                  type: string
                  description: "Destination phone number or JID"
                image:
                  type: string
                  format: binary
                  description: "Image file (JPEG, PNG, GIF, etc.)"
                caption:
                  type: string
                  description: "Optional caption"
                fileName:
                  type: string
                  description: "File name (used if sent as document)"
                id:
                  type: string
                mimeType:
                  type: string
                  description: "Force MIME type (e.g. image/png)"
                imageQualityHD:
                  type: boolean
                  description: "Override HD quality for this message (`true` HD, `false` standard). If omitted, uses IMAGE_QUALITY_HD"
                check:
                  type: boolean
                  description: "Validate JID via IsOnWhatsApp before sending"
                mentionAll:
                  type: boolean
                  description: "Mention all group participants"
                viewOnce:
                  type: boolean
                  description: "Send as view-once"
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/audio:
    post:
      tags:
        - Chat
      summary: Sends an audio message or PTT (voice message) with waveform and recording presence
      description: |
        Sends an audio message with WhatsApp PTT (Push-to-Talk) support. The `audio` field accepts:
        - Base64 (`data:audio/...;base64,...`) or raw base64
        - Direct HTTPS URLs (server downloads and caches)
        - Binary upload via `multipart/form-data`

        **⚠️ Cloud API (WABA) limitation:** Only publicly accessible HTTPS URLs are supported. Base64 and PTT conversion are not available in Cloud API mode.

        **PTT Features (v1.9.3+):**
        - `ptt=true`: Force conversion to OGG Opus voice message
        - **Waveform**: Automatic 64-byte waveform generation
        - **Duration**: Automatic duration calculation
        - **Recording presence**: Use `delay` to simulate recording before sending

        **Delay Parameter:**
        - `delay=3000`: Fixed 3-second delay (recording presence)
        - `delay=true`: Use actual audio duration
        - `delay=false`: No delay (default)
        - Only works when `ptt=true`

        Files larger than 64 MB are sent as documents automatically.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageAudio'
            examples:
              pttWithDelay:
                summary: PTT with recording presence — whatsmeow only
                value:
                  phone: "5511987654321"
                  audio: "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2..."
                  ptt: true
                  delay: 3000
              base64:
                summary: Base64 PTT — whatsmeow only
                value:
                  phone: "5511987654321"
                  audio: "data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAAOyyzP..."
                  ptt: true
              url:
                summary: HTTPS URL (whatsmeow)
                value:
                  phone: "5511987654321"
                  audio: "https://example.com/audio.mp3"
                  check: true
              cloudapi:
                summary: Cloud API (WABA) — URL required
                value:
                  phone: "5511987654321"
                  audio: "https://example.com/audio.mp3"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - audio
              properties:
                phone:
                  type: string
                  description: "Destination phone number or JID"
                audio:
                  type: string
                  format: binary
                  description: "Audio file (MP3, OGG, WAV, etc.)"
                caption:
                  type: string
                  description: "Caption used if audio is sent as document"
                id:
                  type: string
                check:
                  type: boolean
                  description: "Validate JID via IsOnWhatsApp before sending"
                mentionAll:
                  type: boolean
                  description: "Mention all group participants"
                ptt:
                  type: boolean
                  description: "Force audio conversion to voice message"
                delay:
                  oneOf:
                    - type: integer
                    - type: boolean
                  description: "Delay before sending (ms, true for duration, or false)"
                viewOnce:
                  type: boolean
                  description: "Send as view-once (only works when ptt=true)"
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/document:
    post:
      tags:
        - Chat
      summary: Sends a document message
      description: |
        Sends any document or attachment. The `document` field accepts:
        - Base64 data URL (`data:application/...;base64,...`) or raw base64
        - Direct HTTPS URLs (download with caching and size validation)
        - Binary upload via `multipart/form-data`

        For base64 payloads, `fileName` is required. For uploads or URLs, the name is detected automatically.

        **⚠️ Cloud API (WABA) limitation:** Only publicly accessible HTTPS URLs are supported. Base64 and binary upload are not accepted.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageDocument'
            examples:
              base64:
                summary: Base64 data URL (whatsmeow only)
                value:
                  phone: "5511987654321"
                  document: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmo..."
                  fileName: "proposal.pdf"
                  caption: "Important document"
                  check: true
              url:
                summary: HTTPS URL (whatsmeow)
                value:
                  phone: "5511987654321"
                  document: "https://example.com/reports/report.pdf"
                  caption: "Report from storage"
                  mentionAll: false
              cloudapi:
                summary: Cloud API (WABA) — URL required
                value:
                  phone: "5511987654321"
                  document: "https://example.com/reports/report.pdf"
                  fileName: "report.pdf"
                  caption: "Report"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - document
              properties:
                phone:
                  type: string
                  description: "Destination phone number or JID"
                document:
                  type: string
                  format: binary
                  description: "Document file"
                fileName:
                  type: string
                  description: "File name (auto-detected if omitted)"
                caption:
                  type: string
                  description: "Optional caption"
                id:
                  type: string
                mimeType:
                  type: string
                  description: "Force MIME type"
                check:
                  type: boolean
                  description: "Validate JID via IsOnWhatsApp before sending"
                mentionAll:
                  type: boolean
                  description: "Mention all group participants"
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/template:
    post:
      tags:
        - Chat
      summary: Sends a pre-approved template message (Cloud API only)
      description: |
        **⚠️ This endpoint is only available for Cloud API (Meta Business API).**

        Sends pre-approved WhatsApp Business templates. You must create and get templates
        approved in Meta Business Manager before using them.

        ## Not available for normal mode
        If you're using normal mode (whatsmeow), this endpoint will return an error.
        For buttons in normal mode, use `/chat/send/buttons` with `mode=buttons` or `mode=interactive`.

        ## Payload formats
        Supports two payload formats:
        - **Flat format**: `templateName`, `languageCode`, `components` at root level
        - **Nested format**: `template.name`, `template.language.code`, `template.components`

        ## How variables are filled
        Template placeholders are filled by `components[].parameters` in positional order.
        The API does **not** replace `{{1}}`, `{{2}}` by parsing the text body itself.

        Example for a template body like:
        `Olá {{1}}, seu pedido {{2}} foi aprovado.`

        Send:
        ```json
        {
          "components": [
            {
              "type": "body",
              "parameters": [
                { "type": "text", "text": "João" },
                { "type": "text", "text": "PED-123" }
              ]
            }
          ]
        }
        ```

        Mapping:
        - `{{1}}` → first parameter
        - `{{2}}` → second parameter

        ## Button types in templates
        Pre-approved templates can include URL, call, quick reply, copy code, and flow buttons.
        These are configured when creating the template in Meta Business Manager.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageTemplateCloudAPI'
            examples:
              simpleTemplate:
                summary: Simple template (hello_world)
                value:
                  phone: "5511987654321"
                  templateName: "hello_world"
                  languageCode: "en_US"
              flatFormat:
                summary: Flat format with parameters
                value:
                  phone: "5511987654321"
                  templateName: "order_update"
                  languageCode: "pt_BR"
                  components:
                    - type: "body"
                      parameters:
                        - type: "text"
                          text: "João"
                        - type: "text"
                          text: "ORD-12345"
              nestedFormat:
                summary: Nested format with header image and button
                value:
                  phone: "5511987654321"
                  template:
                    name: "order_confirmation"
                    language:
                      code: "en_US"
                    components:
                      - type: "header"
                        parameters:
                          - type: "image"
                            image:
                              link: "https://example.com/order-image.jpg"
                      - type: "body"
                        parameters:
                          - type: "text"
                            text: "John"
                      - type: "button"
                        sub_type: "url"
                        index: "0"
                        parameters:
                          - type: "text"
                            text: "order123"
              bodyOnlyThreeVars:
                summary: Body placeholders filled in order
                value:
                  phone: "5511987654321"
                  templateName: "appointment_reminder"
                  languageCode: "pt_BR"
                  components:
                    - type: "body"
                      parameters:
                        - type: "text"
                          text: "Maria"
                        - type: "text"
                          text: "08/04/2026 14:30"
                        - type: "text"
                          text: "Clínica Centro"
              quickReplyButton:
                summary: Quick reply button template
                value:
                  phone: "5511987654321"
                  templateName: "confirm_attendance"
                  languageCode: "pt_BR"
                  components:
                    - type: "body"
                      parameters:
                        - type: "text"
                          text: "Marcos"
                    - type: "button"
                      sub_type: "quick_reply"
                      index: "0"
                      parameters:
                        - type: "payload"
                          payload: "CONFIRM_ATTENDANCE"
              headerDocumentAndBody:
                summary: Header document plus body variables
                value:
                  phone: "5511987654321"
                  templateName: "invoice_delivery"
                  languageCode: "en_US"
                  components:
                    - type: "header"
                      parameters:
                        - type: "document"
                          document:
                            link: "https://example.com/invoices/invoice-1001.pdf"
                            filename: "invoice-1001.pdf"
                    - type: "body"
                      parameters:
                        - type: "text"
                          text: "John"
                        - type: "text"
                          text: "INV-1001"
              namedParamsWithUrlButton:
                summary: Named placeholders + URL button (Meta Cloud API native format)
                value:
                  to: "5511999999999"
                  template:
                    name: "appointment_reminder_named"
                    language:
                      code: "pt_BR"
                    components:
                      - type: "body"
                        parameters:
                          - type: "text"
                            parameter_name: "nome_paciente"
                            text: "Maria Silva"
                          - type: "text"
                            parameter_name: "agendamento"
                            text: "dia 20/05 às 10:00, consulta com Dr. Carlos"
                          - type: "text"
                            parameter_name: "endereco_mapa"
                            text: "📍 Rua das Flores, 100 - Centro, São Paulo"
                      - type: "button"
                        sub_type: "url"
                        index: "1"
                        parameters:
                          - type: "text"
                            text: "ABC123XYZ"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/templates:
    get:
      tags:
        - Chat
      summary: Lists approved WABA templates with inferred variable slots (Cloud API only)
      description: |
        **⚠️ This endpoint is only available for Cloud API (Meta Business API).**

        Returns the approved templates for the authenticated WABA account.

        Each template includes:
        - raw `components` returned by Meta
        - inferred `variables`, which describe where your integration can insert parameters

        The `variables` array is intended to help clients build `/chat/send/template`
        payloads without manually parsing each template definition.

        ## What is inferred
        Variable groups are returned whenever the server can infer parameters safely from
        the approved template definition:
        - `BODY` text placeholders like `{{1}}`, `{{2}}`
        - `HEADER` text placeholders like `{{1}}`
        - `HEADER` media formats (`IMAGE`, `VIDEO`, `DOCUMENT`) as a single required media parameter
        - `BUTTON` URL placeholders found in dynamic button URLs

        ## How to map to `/chat/send/template`
        Use each variable group to build the matching component in the send payload:
        - `component=BODY` -> `{ "type": "body", "parameters": [...] }`
        - `component=HEADER` -> `{ "type": "header", "parameters": [...] }`
        - `component=BUTTON` -> `{ "type": "button", "sub_type": "...", "index": "0", "parameters": [...] }`

        For button groups, `buttonIndex` is the 0-based index expected in the send payload.
        For text placeholders, `slots[].index` matches the placeholder number (`{{1}}`, `{{2}}`, ...).
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/TemplatesListResponse'
              examples:
                templatesWithVariables:
                  summary: Approved templates with inferred variable groups
                  value:
                    code: 200
                    success: true
                    data:
                      templates:
                        - name: "order_update"
                          language: "pt_BR"
                          status: "APPROVED"
                          components:
                            - type: "HEADER"
                              format: "IMAGE"
                            - type: "BODY"
                              text: "Olá {{1}}, seu pedido {{2}} foi enviado."
                            - type: "BUTTONS"
                              buttons:
                                - type: "URL"
                                  text: "Rastrear pedido"
                                  url: "https://example.com/orders/{{1}}"
                          variables:
                            - component: "HEADER"
                              format: "IMAGE"
                              source: "media"
                              slots:
                                - index: 1
                                  parameterType: "image"
                                  required: true
                            - component: "BODY"
                              format: "TEXT"
                              source: "text"
                              slots:
                                - index: 1
                                  placeholder: "{{1}}"
                                  parameterType: "text"
                                  required: true
                                - index: 2
                                  placeholder: "{{2}}"
                                  parameterType: "text"
                                  required: true
                            - component: "BUTTON"
                              subType: "url"
                              buttonIndex: 0
                              label: "Rastrear pedido"
                              source: "url"
                              slots:
                                - index: 1
                                  placeholder: "{{1}}"
                                  parameterType: "text"
                                  required: true
  /chat/send/video:
    post:
      tags:
        - Chat
      summary: Sends a video message
      description: |
        Sends a video message. The `video` field accepts:
        - Base64 data URL (`data:video/...;base64,...`) or raw base64
        - Direct HTTPS URLs (download with caching and size validation)
        - Binary upload via `multipart/form-data`

        Files larger than 64 MB are sent as documents automatically.
        Thumbnails are generated automatically when not provided.

        **⚠️ Cloud API (WABA) limitation:** Only publicly accessible HTTPS URLs are supported. Base64 and binary upload are not accepted.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageVideo'
            examples:
              base64:
                summary: Base64 data URL (whatsmeow only)
                value:
                  phone: "5511987654321"
                  video: "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y..."
                  caption: "Demo video"
                  check: true
              url:
                summary: HTTPS URL (whatsmeow)
                value:
                  phone: "5511987654321"
                  video: "https://example.com/video.mp4"
                  caption: "Video via URL"
                  mentionAll: false
              cloudapi:
                summary: Cloud API (WABA) — URL required
                value:
                  phone: "5511987654321"
                  video: "https://example.com/video.mp4"
                  caption: "Video via Cloud API"
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - video
              properties:
                phone:
                  type: string
                  description: "Destination phone number or JID"
                video:
                  type: string
                  format: binary
                  description: "Video file (MP4/3GPP)"
                caption:
                  type: string
                  description: "Optional caption"
                fileName:
                  type: string
                  description: "File name for document fallback"
                id:
                  type: string
                mimeType:
                  type: string
                  description: "Force MIME type"
                jpegThumbnail:
                  type: string
                  format: binary
                  description: "Optional JPEG thumbnail override"
                check:
                  type: boolean
                  description: "Validate JID via IsOnWhatsApp before sending"
                mentionAll:
                  type: boolean
                  description: "Mention all group participants"
                viewOnce:
                  type: boolean
                  description: "Send as view-once"
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/sticker:
    post:
      tags:
        - Chat 
      summary: Sends a sticker message
      description: |
        Sends a sticker message. The `sticker` field accepts:
        - Base64 data URL (`data:image/...;base64,...`) or raw base64
        - Direct HTTPS URLs (server downloads with caching)
        - Binary upload via `multipart/form-data`
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageSticker'
            examples:
              base64:
                summary: Base64 data URL
                value:
                  phone: "5511987654321"
                  sticker: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAw..."
                  check: true
              url:
                summary: Download via HTTPS
                value:
                  phone: "5511987654321"
                  sticker: "https://example.com/sticker.webp"
                  mentionAll: false
          multipart/form-data:
            schema:
              type: object
              required:
                - phone
                - sticker
              properties:
                phone:
                  type: string
                  description: "Destination phone number or JID"
                sticker:
                  type: string
                  format: binary
                  description: "Sticker file (preferably image/webp)"
                id:
                  type: string
                mimeType:
                  type: string
                  description: "Force MIME type (e.g. image/webp)"
                check:
                  type: boolean
                  description: "Validate JID via IsOnWhatsApp before sending"
                mentionAll:
                  type: boolean
                  description: "Mention all group participants"
                pngThumbnail:
                  type: string
                  description: "Optional PNG thumbnail in base64"
                contextInfo:
                  type: string
                  description: "JSON-encoded ContextInfo object"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372



  /chat/send/location:
    post:
      tags:
        - Chat
      summary: Sends a location message
      description: |
        Sends a location message with coordinates, name, address, and URL.

        **Enhanced in v1.9.1:**
        - Address field supports literal line breaks
        - URL field for links (website, maps, etc) in normal mode
        - contextInfo supports replies and mentions in normal mode
        - Cloud API replies use top-level `stanzaId`

        **Cloud API note:** the current Cloud API implementation ignores the `url` field for this endpoint.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageLocation'
            example:
              phone: "5511987654321"
              name: "Eiffel Tower"
              address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France"
              url: "https://www.toureiffel.paris/"
              latitude: 48.858370
              longitude: 2.294481
              check: true

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/contact:
    post:
      tags:
        - Chat 
      summary: Sends a contact message
      description: |
        Sends a contact message.

        **Normal mode (`whatsmeow`):**
        - `vcard` is required.
        - Missing VCARD fields are auto-filled (`VERSION`, `N`, `FN`, `TEL;waid`).

        **Cloud API mode:**
        - The current implementation builds a structured contact from `name` and optional `contactPhone`.
        - If `contactPhone` is omitted and `vcard` is present, the first `TEL`/`waid` found in the VCARD is used.
        - Replies use top-level `stanzaId`.

        **Normal mode replies/mentions:** use `contextInfo`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageContact'
            examples:
              normal:
                summary: Normal mode (VCARD required)
                value:
                  phone: "5511987654321"
                  name: "Leidy Rodrigues"
                  id: "ABCDABCD1234"
                  vcard: "BEGIN:VCARD\nVERSION:3.0\nN:Rodrigues;Leidy;;;\nFN:Leidy Rodrigues\nORG:Decor Studio;\nTITLE:Decoradora\nEMAIL;type=INTERNET;type=WORK;type=pref:leidy@example.com\nTEL;type=CELL;type=VOICE;waid=5511987654321:+55 11 8765-4321\nURL:https://example.com\nEND:VCARD"
                  contextInfo:
                    stanzaId: "3EB06F9067F80BAB89FF"
                    participant: "5511987654321@s.whatsapp.net"
                  check: true
              cloudapi:
                summary: Cloud API mode (structured contact)
                value:
                  phone: "5511987654321"
                  name: "Leidy Rodrigues"
                  vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:Leidy Rodrigues\nTEL;type=CELL;type=VOICE;waid=5511987654321:+55 11 8765-4321\nEND:VCARD"
                  stanzaId: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
  /chat/send/buttons:
    post:
      tags:
        - Chat
      summary: Sends button-based messages
      description: |
        Sends button-based messages in two modes:
        - `buttons` (default): ButtonsMessage.
        - `interactive`: NativeFlow (quick reply, URL, call, copy).

        ## Cloud API Limitation ⚠️
        **Cloud API only supports quick reply buttons in this endpoint (max 3).**
        For URL, call, or copy buttons in Cloud API mode, you must use `/chat/send/template`
        with a pre-approved WhatsApp Business template that includes those button types.

        Notes:
        - When `mode` is omitted, `buttons` is used.
        - Maximum of 3 buttons.
        - `buttonId` is optional; if omitted, it is generated (`btn-1`, `btn-2`, ...).
        - With media (`image`/`video`), the header is the media; `title`/`text` are combined into the caption.
        - Without media, `title` becomes the header (if different from `text`), `text` is the body, and `footer` is shown normally.
        - **WhatsApp Web/Desktop may not render mixed `quick_reply` + `url`/`call`/`copy` buttons in `interactive` mode (mobile only).**
        - In normal mode (`whatsmeow`), `contextInfo` supports replies and mentions.
        - In Cloud API mode, replies use top-level `stanzaId`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageButtons'
            examples:
              buttons:
                summary: ButtonsMessage (whatsmeow)
                value:
                  phone: "5511987654321"
                  title: "Choose an option"
                  text: "See the options below"
                  footer: "Optional footer"
                  contextInfo:
                    stanzaId: "3EB06F9067F80BAB89FF"
                    participant: "5511987654321@s.whatsapp.net"
                  image: "https://example.com/photo.jpg"
                  buttons:
                    - buttonId: "opt1"
                      buttonText: "Option 1"
                    - buttonText: "Option 2 (auto ID)"
              interactive:
                summary: NativeFlow (whatsmeow)
                value:
                  phone: "5511987654321"
                  mode: "interactive"
                  title: "Copy, open link, or call"
                  footer: "Choose an action"
                  buttons:
                    - buttonId: "copy1"
                      buttonText: "Copy code"
                      type: "copy"
                      copyCode: "any text or code to copy"
                    - buttonId: "link1"
                      buttonText: "Open website"
                      type: "url"
                      url: "https://example.com"
                    - buttonId: "call1"
                      buttonText: "Call support"
                      type: "call"
                      phoneNumber: "+5511987654321"
              cloudapi:
                summary: Cloud API (WABA) — quick reply only (max 3)
                value:
                  phone: "5511987654321"
                  text: "Which option do you prefer?"
                  footer: "Choose below"
                  stanzaId: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
                  buttons:
                    - buttonId: "opt_a"
                      buttonText: "Option A"
                    - buttonId: "opt_b"
                      buttonText: "Option B"
                    - buttonId: "opt_c"
                      buttonText: "Option C"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
                  warning: "WhatsApp Web/Desktop does not render mixed quick reply + URL/Call/Copy buttons in interactive mode; only mobile clients show them."
        403:
          description: Feature unavailable for current license in normal mode
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 403
                success: false
                error: "Recurso indisponível para o plano atual"
  /chat/send/list:
    post:
      tags:
        - Chat
      summary: Sends a List message
      description: |
        Sends a List message.

        Notes:
        - At least one of `desc`, `text`, or `description` is required.
        - In Cloud API mode, replies use top-level `stanzaId`.
        - In normal mode (`whatsmeow`), this feature may return `403` when the current license does not include buttons/list support.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessageList'
            example:
              phone: "5511987654321"
              buttonText: "Choose"
              text: "Choose an option"
              title: "Daily menu"
              footer: "24h support"
              sections:
                - title: "Drinks"
                  rows:
                    - rowId: "coffee"
                      title: "Coffee"
                      desc: "Hot"
                    - rowId: "juice"
                      title: "Juice"
                      desc: "Fresh"
                - title: "Snacks"
                  rows:
                    - rowId: "grill"
                      title: "Grilled sandwich"
                      desc: "Toasted bread"
              id: "LIST-12345"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Sent"
                  id: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
                  timestamp: 1713459372
        403:
          description: Feature unavailable for current license in normal mode
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 403
                success: false
                error: "Recurso indisponível para o plano atual"
  /chat/send/poll:
    post:
      tags:
        - Chat
      summary: Sends a Poll to some group
      description: |
        Sends a poll message. `group` should contain the group JID (e.g. `120363312246943103@g.us`).

        **Cloud API limitation:** this endpoint is not supported by the current Cloud API implementation and returns `501 Not Implemented`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/MessagePoll'
            example:
              group: "120363417042313103@g.us"
              header: "What's your favorite color?"
              options:
                - "Red"
                - "Blue"
                - "Green"
              id: "POLL123456"
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/MessageSentResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Poll sent successfully"
                  id: "POLL123456"
        501:
          description: Cloud API poll is not implemented in this version
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 501
                success: false
                error: "CloudAPI poll is not supported in this implementation"
  /chat/downloadimage:
    post:
      tags:
        - Chat
      summary: Downloads Image from message
      description: |
        Downloads an Image from a message and returns it Base64 encoded or as a temporary download link.

        **Two modes:**
        - `generateLink: false` (default): Returns base64 encoded data
        - `generateLink: true`: Returns temporary download link (expires in 30 minutes)

        **Note:** Works independently of Chatwoot integration.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DownloadImage'
            examples:
              base64Mode:
                summary: Base64 mode (default)
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "image/jpeg"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 123456
              linkMode:
                summary: Temporary link mode
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "image/jpeg"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 123456
                  generateLink: true

      responses:
        200:
          description: Response (varies based on generateLink)
          content:
            application/json:
              schema:
                oneOf:
                  - type: object
                    description: Base64 response
                  - type: object
                    description: Link response
              examples:
                base64Response:
                  summary: Base64 mode response
                  value:
                    code: 200
                    success: true
                    data:
                      data: "data:image/jpeg;base64,iVBORw0KGgoA5CYII...="
                      mimeType: "image/jpeg"
                linkResponse:
                  summary: Link mode response
                  value:
                    code: 200
                    success: true
                    data:
                      mimeType: "image/jpeg"
                      fileSize: 245678
                      downloadUrl: "https://your-domain.com/download/a1b2c3d4e5f6..."
                      expiresAt: "2025-11-13T01:25:24Z"
                      expiresInMin: 30
  /chat/downloadvideo:
    post:
      tags:
        - Chat
      summary: Downloads Video from message
      description: |
        Downloads a Video from a message. Returns base64 by default, or temporary download link if `generateLink: true` (expires in 30 minutes).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DownloadImage'
            examples:
              base64Mode:
                summary: Base64 mode (default)
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "video/mp4"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 234567
              linkMode:
                summary: Temporary link mode
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "video/mp4"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 234567
                  generateLink: true

      responses:
        200:
          description: Response (base64 or download link)
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    data: "data:video/mp4;base64,iVBORw0KGgoA5CYII...="
                    mimeType: "video/mp4"
  /chat/downloaddocument:
    post:
      tags:
        - Chat
      summary: Downloads Document from message
      description: |
        Downloads a Document from a message. Returns base64 by default, or temporary download link if `generateLink: true` (expires in 30 minutes).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DownloadImage'
            examples:
              base64Mode:
                summary: Base64 mode (default)
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "application/pdf"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 123456
              linkMode:
                summary: Temporary link mode
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "application/pdf"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 123456
                  generateLink: true

      responses:
        200:
          description: Response (base64 or download link)
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    data: "data:application/pdf;base64,iVBORw0KGgoA5CYII...="
                    mimeType: "application/pdf"
  /chat/downloadaudio:
    post:
      tags:
        - Chat
      summary: Downloads Audio from message
      description: |
        Downloads an Audio from a message. Returns base64 by default, or temporary download link if `generateLink: true` (expires in 30 minutes).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DownloadImage'
            examples:
              base64Mode:
                summary: Base64 mode (default)
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "audio/ogg"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 98765
              linkMode:
                summary: Temporary link mode
                value:
                  url: "https://mmg.whatsapp.net/..."
                  directPath: "/v/..."
                  mediaKey: "..."
                  mimeType: "audio/ogg"
                  fileEncSha256: "..."
                  fileSha256: "..."
                  fileLength: 98765
                  generateLink: true

      responses:
        200:
          description: Response (base64 or download link)
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
                example:
                  code: 200
                  success: true
                  data:
                    data: "data:audio/ogg;base64,iVBORw0KGgoA5CYII...="
                    mimeType: "audio/ogg"
  /download/{token}:
    get:
      tags:
        - Downloads
      summary: Public temporary download link
      description: |
        **Public endpoint** - No authentication required. Token is the authorization.

        Serves a temporary download file created by any of the download endpoints with `generateLink: true`.

        **Features:**
        - No authentication required (token validates access)
        - Direct file download with proper Content-Disposition headers
        - Expires after 30 minutes (configurable)
        - Automatic cleanup of expired files
        - Returns HTTP 404 if token not found
        - Returns HTTP 410 (Gone) if link expired

        **Independent of Chatwoot** - Works with or without Chatwoot integration.
      parameters:
        - name: token
          in: path
          required: true
          description: Unique download token (32 character hex string)
          schema:
            type: string
            example: a1b2c3d4e5f67890abcdef1234567890
      responses:
        200:
          description: File download
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
          headers:
            Content-Type:
              description: MIME type of the file
              schema:
                type: string
                example: image/jpeg
            Content-Disposition:
              description: Filename for download
              schema:
                type: string
                example: 'attachment; filename="image_1699876543.jpg"'
            Content-Length:
              description: File size in bytes
              schema:
                type: integer
                example: 245678
        404:
          description: Download link not found
          content:
            text/plain:
              schema:
                type: string
                example: Download link not found or expired
        410:
          description: Download link expired
          content:
            text/plain:
              schema:
                type: string
                example: Download link expired
  /chat/presence:
    post:
      tags:
        - Chat 
      summary: Sets chat presence
      description: Sends presence state (composing or paused). Optional media can be set to audio to indicate recording.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/ChatPresence'
            example:
              phone: "5511987654321"
              state: "composing"
              media: "audio"

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Chat presence set successfully"
  /status/send-text:
    post:
      tags:
        - Status
      summary: Send text status/story
      description: Publishes a text status with customizable colors and fonts. Status messages are visible for 24 hours.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: Text content of the status
                  example: "Hello from Fzap"
                backgroundColor:
                  type: string
                  description: Background color in hex format (#RGB or #RRGGBB)
                  example: "#4267B2"
                textColor:
                  type: string
                  description: Text color in hex format (#RGB or #RRGGBB)
                  example: "#FFFFFF"
                font:
                  type: integer
                  description: Font type (0-5)
                  example: 0
                id:
                  type: string
                  description: Optional custom message ID
                  example: "3EB0B430C46D8F7D8B52"
              required:
                - text
      responses:
        200:
          description: Status sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Status sent"
                  timestamp: 1234567890
                  id: "3EB0B430C46D8F7D8B52"
  /status/send-image:
    post:
      tags:
        - Status
      summary: Send image status/story
      description: Publishes an image status with optional caption. The `image` field auto-detects HTTP(S) URL, base64 data URL, or raw base64 payload.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                  description: Image payload (HTTP(S) URL, data:image/...;base64,..., or raw base64)
                  example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                caption:
                  type: string
                  description: Optional caption
                  example: "Beautiful sunset"
                mimeType:
                  type: string
                  description: MIME type (auto-detected if omitted)
                  example: "image/jpeg"
                id:
                  type: string
                  description: Optional custom message ID
                  example: "3EB0B430C46D8F7D8B52"
            examples:
              dataUrl:
                summary: Base64 data URL
                value:
                  image: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                  caption: "Beautiful sunset"
              url:
                summary: HTTP(S) URL
                value:
                  image: "https://picsum.photos/800/600"
                  caption: "Image from URL"
              rawBase64:
                summary: Raw base64
                value:
                  image: "/9j/4AAQSkZJRgABAQEAYABgAAD..."
                  caption: "Image from raw base64"
          multipart/form-data:
            schema:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                  format: binary
                  description: Image file (JPEG, PNG, GIF, WEBP, etc.)
                caption:
                  type: string
                  description: Optional caption
                mimeType:
                  type: string
                  description: MIME type override (auto-detected if omitted)
                id:
                  type: string
                  description: Optional custom message ID
      responses:
        200:
          description: Status sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Status sent"
                  timestamp: 1234567890
                  id: "3EB0B430C46D8F7D8B52"
  /status/send-video:
    post:
      tags:
        - Status
      summary: Send video status/story
      description: Publishes a video status with optional caption. The `video` field auto-detects HTTP(S) URL, base64 data URL, or raw base64 payload.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - video
              properties:
                video:
                  type: string
                  description: Video payload (HTTP(S) URL, data:video/...;base64,..., or raw base64)
                  example: "data:video/mp4;base64,AAAAIGZ0eXBpc29t..."
                caption:
                  type: string
                  description: Optional caption
                  example: "Check this out"
                mimeType:
                  type: string
                  description: MIME type (auto-detected if omitted)
                  example: "video/mp4"
                id:
                  type: string
                  description: Optional custom message ID
                  example: "3EB0B430C46D8F7D8B52"
            examples:
              dataUrl:
                summary: Base64 data URL
                value:
                  video: "data:video/mp4;base64,AAAAIGZ0eXBpc29t..."
                  caption: "Check this out"
              url:
                summary: HTTP(S) URL
                value:
                  video: "https://example.com/video.mp4"
                  caption: "Video from URL"
              rawBase64:
                summary: Raw base64
                value:
                  video: "AAAAIGZ0eXBpc29tAAACAGlzb21pc28y..."
                  caption: "Video from raw base64"
          multipart/form-data:
            schema:
              type: object
              required:
                - video
              properties:
                video:
                  type: string
                  format: binary
                  description: Video file
                caption:
                  type: string
                  description: Optional caption
                mimeType:
                  type: string
                  description: MIME type override (auto-detected if omitted)
                id:
                  type: string
                  description: Optional custom message ID
      responses:
        200:
          description: Status sent successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Status sent"
                  timestamp: 1234567890
                  id: "3EB0B430C46D8F7D8B52"
  /status/delete:
    post:
      tags:
        - Status
      summary: Delete status/story
      description: Deletes a previously published status using its message ID.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: string
                  description: Message ID of the status to delete
                  example: "3EB0B430C46D8F7D8B52"
              required:
                - id
      responses:
        200:
          description: Status deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Status deleted"
                  timestamp: 1234567890
                  id: "3EB0B430C46D8F7D8B52"
  /group/create:
    post:
      tags:
        - Group
      summary: Create a new WhatsApp group
      description: Creates a new WhatsApp group with the specified name and participants.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/CreateGroup'
            example:
              name: "My New Group"
              participants:
                - "5491155553934"
                - "5511987654321@s.whatsapp.net"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  announceVersionId: "1234567890"
                  disappearingTimer: 0
                  groupCreated: "2023-12-01T10:00:00Z"
                  isAnnounce: false
                  isEphemeral: false
                  isLocked: false
                  jid: "120363123456789@g.us"
                  name: "My New Group"
                  nameSetAt: "2023-12-01T10:00:00Z"
                  nameSetBy: "5491155554444@s.whatsapp.net"
                  ownerJid: "5491155554444@s.whatsapp.net"
                  participantVersionId: "1234567890"
                  participants:
                    - isAdmin: true
                      isSuperAdmin: true
                      jid: "5491155554444@s.whatsapp.net"
                    - isAdmin: false
                      isSuperAdmin: false
                      jid: "5491155553333@s.whatsapp.net"
  /group/locked:
    post:
      tags:
        - Group
      summary: Set group locked status
      description: Configures whether only admins can modify group info (locked) or all participants can modify (unlocked).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupLocked'
            example:
              groupJid: "120362023605733675@g.us"
              locked: true
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group locked setting updated successfully"
  /group/ephemeral:
    post:
      tags:
        - Group
      summary: Set disappearing timer for group messages
      description: Configures ephemeral/disappearing messages for the group. Messages will automatically disappear after the specified duration.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupEphemeral'
            example:
              groupJid: "120362023605733675@g.us"
              duration: "24h"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Disappearing timer set successfully"
  /group/photo/remove:
    post:
      tags:
        - Group
      summary: Remove group photo
      description: Removes the current photo/image from the specified WhatsApp group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/RemoveGroupPhoto'
            example:
              groupJid: "120362023605733675@g.us"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group photo removed successfully"
  /group/list:
    get:
      tags:
        - Group 
      summary: List subscribed groups
      description: Returns complete list of subscribed groups
      security:
        - ApiKeyAuth: []

      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  groups:
                    - announceVersionId: "1650572126123738"
                      disappearingTimer: 0
                      groupCreated: "2022-04-21T17:15:26-03:00"
                      isAnnounce: false
                      isEphemeral: false
                      isLocked: false
                      jid: "120362023605733675@g.us"
                      name: "Super Group"
                      nameSetAt: "2022-04-21T17:15:26-03:00"
                      nameSetBy: "5491155554444@s.whatsapp.net"
                      ownerJid: "5491155554444@s.whatsapp.net"
                      participantVersionId: "1650234126145738"
                      participants:
                        - isAdmin: true
                          isSuperAdmin: true
                          jid: "5491155554444@s.whatsapp.net"
                        - isAdmin: false
                          isSuperAdmin: false
                          jid: "5491155553333@s.whatsapp.net"
                        - isAdmin: false
                          isSuperAdmin: false
                          jid: "5491155552222@s.whatsapp.net"
                      topic: ""
                      topicId: ""
                      topicSetAt: "0001-01-01T00:00:00Z"
                      topicSetBy: ""
  /community/list:
    get:
      tags:
        - Community
      summary: List joined communities (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Returns only groups flagged as community parent (`isParent=true`).
      x-beta: true
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  communities:
                    - jid: "120363500000000001@g.us"
                      name: "Central Community"
                      isParent: true
                      linkedParentJid: ""
                      isDefaultSubGroup: false
  /community/info:
    get:
      tags:
        - Community
      summary: Get community info (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Returns detailed info for a community JID (must be a parent community).
      x-beta: true
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: communityJid
          schema:
            type: string
          required: true
          description: Community JID (`@g.us`)
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
  /community/create:
    post:
      tags:
        - Community
      summary: Create community (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.

        Creates a WhatsApp community (`isParent=true`).

        **Important:** Community creation is only available for **personal WhatsApp accounts**.
        Business accounts (WhatsApp Business) cannot create communities and will receive a `400` error.

        The community is created without participants first, then participants are added
        in a separate step to avoid WhatsApp protocol errors. Optional settings (announce,
        locked, joinApprovalRequired) are applied after creation.

        Community names are limited to **25 characters**.
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/CreateCommunity'
            example:
              name: "Central Community"
              participants:
                - "549115550001@s.whatsapp.net"
              announce: false
              locked: false
              joinApprovalRequired: false
              defaultMembershipApprovalMode: "request_required"
      responses:
        200:
          description: Community created successfully
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
        400:
          description: |
            Bad request. Possible causes:
            - Business account attempting to create a community (only personal accounts allowed)
            - Community name exceeds 25 characters
            - Invalid participant JID format
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
  /community/update:
    post:
      tags:
        - Community
      summary: Update community (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Updates community settings (name/topic/announce/locked/joinApprovalRequired).
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/UpdateCommunity'
            example:
              communityJid: "120363500000000001@g.us"
              name: "Central Community Official"
              topic: "Official community space"
              announce: true
              locked: true
              joinApprovalRequired: true
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community updated successfully"
                  updated:
                    - "name"
                    - "topic"
    patch:
      tags:
        - Community
      summary: Update community (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Updates community settings (name/topic/announce/locked/joinApprovalRequired).
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/UpdateCommunity'
            example:
              communityJid: "120363500000000001@g.us"
              name: "Central Community Official"
              topic: "Official community space"
              announce: true
              locked: true
              joinApprovalRequired: true
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community updated successfully"
                  updated:
                    - "name"
                    - "topic"
  /community/delete:
    post:
      tags:
        - Community
      summary: Delete community (leave) (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Leaves the community for the current account. WhatsApp does not expose a global hard-delete operation in this API flow.
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DeleteCommunity'
            example:
              communityJid: "120363500000000001@g.us"
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community deleted successfully for current account"
                  note: "WhatsApp API performs leave operation (not global hard delete)"
    delete:
      tags:
        - Community
      summary: Delete community (leave) (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Leaves the community for the current account. WhatsApp does not expose a global hard-delete operation in this API flow.
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/DeleteCommunity'
            example:
              communityJid: "120363500000000001@g.us"
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community deleted successfully for current account"
                  note: "WhatsApp API performs leave operation (not global hard delete)"
  /community/subgroups:
    get:
      tags:
        - Community
      summary: List community subgroups (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Returns linked subgroups for a community.
      x-beta: true
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: communityJid
          schema:
            type: string
          required: true
          description: Community JID (`@g.us`)
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  subGroups:
                    - jid: "120363500000000002@g.us"
                      name: "Commercial Team"
                      isDefaultSubGroup: false
  /community/participants:
    get:
      tags:
        - Community
      summary: List linked community participants (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Returns participant JIDs linked across the community structure.
      x-beta: true
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: communityJid
          schema:
            type: string
          required: true
          description: Community JID (`@g.us`)
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  participants:
                    - "549115550001@s.whatsapp.net"
                    - "549115550002@s.whatsapp.net"
  /community/link:
    post:
      tags:
        - Community
      summary: Link group to community (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Links an existing child group to a community parent group.
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/CommunityLinkGroup'
            example:
              parentJid: "120363500000000001@g.us"
              childJid: "120363500000000002@g.us"
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community group linked successfully"
  /community/unlink:
    post:
      tags:
        - Community
      summary: Unlink group from community (Beta)
      description: |
        **Beta:** Community endpoints are currently in beta testing and may change.
        Unlinks a child group from a community parent group.
      x-beta: true
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/CommunityLinkGroup'
            example:
              parentJid: "120363500000000001@g.us"
              childJid: "120363500000000002@g.us"
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Community group unlinked successfully"
  /group/invitelink:
    get:
      tags:
        - Group 
      summary: Get Group Invite Link
      description: Gets the invite link for a group, optionally resetting it to create a new/different one
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: groupJid
          schema:
            type: string
          required: true
          description: The JID of the group to retrieve information from
        - in: query
          name: reset
          schema:
            type: boolean
          required: false
          description: Whether to revoke the old invite link and generate a new one (default is false)
      responses:
        200:
          description: Successfull response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  inviteLink: "https://chat.whatsapp.com/HffXhYmzzyJGec61oqMXiz"
  /group/info:
    get:
      tags:
        - Group 
      summary: Gets group information
      description: Retrieves information about a specific group
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: groupJid
          schema:
            type: string
          required: true
          description: The JID of the group to retrieve information from
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  announceVersionId: "1650572126123738"
                  disappearingTimer: 0
                  groupCreated: "2022-04-21T17:15:26-03:00"
                  isAnnounce: false
                  isEphemeral: false
                  isLocked: false
                  jid: "120362023605733675@g.us"
                  name: "Super Group"
                  nameSetAt: "2022-04-21T17:15:26-03:00"
                  nameSetBy: "5491155554444@s.whatsapp.net"
                  ownerJid: "5491155554444@s.whatsapp.net"
                  participantVersionId: "1650234126145738"
                  participants:
                    - isAdmin: true
                      isSuperAdmin: true
                      jid: "5491155554444@s.whatsapp.net"
                    - isAdmin: false
                      isSuperAdmin: false
                      jid: "5491155553333@s.whatsapp.net"
                    - isAdmin: false
                      isSuperAdmin: false
                      jid: "5491155552222@s.whatsapp.net"
                  topic: ""
                  topicId: ""
                  topicSetAt: "0001-01-01T00:00:00Z"
                  topicSetBy: ""
  /group/photo:
    post:
      tags:
        - Group 
      summary: Changes group photo
      description: |
        Allows you to change a group photo/image. Returns the Picture ID number.
        Accepts URL, base64 (data URL/raw), or binary upload.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupPhoto'
            examples:
              dataUrl:
                summary: Base64 data URL
                value:
                  groupJid: "120362023605733675@g.us"
                  image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
              url:
                summary: HTTP(S) URL
                value:
                  groupJid: "120362023605733675@g.us"
                  image: "https://example.com/group-photo.jpg"
          multipart/form-data:
            schema:
              type: object
              required:
                - groupJid
                - image
              properties:
                groupJid:
                  type: string
                  description: Group JID
                image:
                  type: string
                  format: binary
                  description: JPEG image file for group photo
 
      responses:
        200:
          description: Response
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group photo set successfully"
                  pictureId: "1222332123"
  /group/leave:
    post:
      tags:
        - Group
      summary: Leave a WhatsApp group
      description: Removes the authenticated user from the specified group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupLeave'
            example:
              groupJid: "120362023605733675@g.us"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Left group successfully"
  /group/name:
    post:
      tags:
        - Group
      summary: Change group name
      description: Updates the name of the specified WhatsApp group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupName'
            example:
              groupJid: "120362023605733675@g.us"
              name: "New Group Name"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group name set successfully"
  /group/topic:
    post:
      tags:
        - Group
      summary: Set group topic/description
      description: Updates the topic or description of the specified WhatsApp group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupTopic'
            example:
              groupJid: "120362023605733675@g.us"
              topic: "Group description and rules"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group topic set successfully"
  /group/announce:
    post:
      tags:
        - Group
      summary: Set group announce mode
      description: Enables or disables "announce" mode (admin-only messages) for the specified group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupAnnounce'
            example:
              groupJid: "120362023605733675@g.us"
              announce: true
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Group announce mode set successfully"
  /group/join:
    post:
      tags:
        - Group
      summary: Join a WhatsApp group via invite code
      description: Joins the WhatsApp group using the given invite code.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupJoin'
            example:
              code: "AbCdEfGhIjKlMnOp"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Joined group successfully"
  /group/inviteinfo:
    post:
      tags:
        - Group
      summary: Get information about a group invite code
      description: Returns details about a WhatsApp group given an invite code.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/GroupInviteInfo'
            example:
              code: "AbCdEfGhIjKlMnOp"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  inviteInfo:
                    groupName: "Test Group"
                    groupJid: "120363312246943103@g.us"
  /group/updateparticipants:
    post:
      tags:
        - Group
      summary: Add, remove, promote or demote participants from a group
      description: Adds or removes participants from the specified WhatsApp group.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/UpdateGroupParticipants'
            example:
              groupJid: "120362023605733675@g.us"
              action: "add"
              phone:
                - "5511988776655@s.whatsapp.net"
                - "5511987654321@s.whatsapp.net"
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/definitions/SuccessResponse'
              example:
                code: 200
                success: true
                data:
                  details: "Participants updated successfully"

  /paid-traffic/leads:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] List paid traffic leads"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Returns leads captured from Click-to-WhatsApp ads. Each item already includes the contact identifiers
        captured from WhatsApp (`chatJid`, `senderJid`, `senderLid`, `senderPhone`, `pushName`) and the available
        ad attribution fields (`adId`, `campaignId`, `campaignName`, `adSetId`, `adSetName`, `adName`, `adCtwaClid`).

        Search behavior mirrors the backend implementation:
        - `q` is the preferred free-text parameter.
        - `search` is accepted as a legacy alias when `q` is omitted.
        - Search currently matches `pushName`, `senderPhone`, `messageText`, `adTitle`, `adBody`,
          `adSourceApp`, `adId` and `adCtwaClid`.
        - Search does not currently match `senderJid`, `senderLid` or `chatJid`.

        Default ordering is by newest `messageTimestamp` first.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: q
          in: query
          description: Preferred free-text search term.
          schema:
            type: string
        - name: search
          in: query
          description: Legacy alias for `q`.
          schema:
            type: string
        - name: date_from
          in: query
          description: Include leads with `messageTimestamp` on or after this instant. Accepts `YYYY-MM-DD` or RFC3339.
          schema:
            type: string
            example: "2026-03-01"
        - name: date_to
          in: query
          description: Include leads with `messageTimestamp` on or before this instant. Accepts `YYYY-MM-DD` or RFC3339.
          schema:
            type: string
            example: "2026-03-18"
        - name: campaign
          in: query
          description: Filter by campaign name or campaign ID after Graph API enrichment.
          schema:
            type: string
        - name: adset
          in: query
          description: Filter by ad set name or ad set ID after Graph API enrichment.
          schema:
            type: string
        - name: creative
          in: query
          description: Filter by creative/ad name, original ad title or ad ID.
          schema:
            type: string
        - name: limit
          in: query
          description: Page size. Values above 200 are clamped to 200 by the backend.
          schema:
            type: integer
            default: 50
            maximum: 200
        - name: offset
          in: query
          description: Pagination offset.
          schema:
            type: integer
            default: 0
        - name: sort
          in: query
          description: Sort key. Supported values are `date`, `contact`, `message`, `ad`, `source`, `ctwa_clid` and `created`.
          schema:
            type: string
            enum: [date, contact, message, ad, source, ctwa_clid, created]
            default: date
        - name: order
          in: query
          description: Sort order. Invalid values fall back to `DESC`.
          schema:
            type: string
            enum: [ASC, DESC]
            default: DESC
      responses:
        200:
          description: Paid traffic leads retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/PaidTrafficLeadsResponse'
              example:
                code: 200
                success: true
                data:
                  items:
                    - messageId: "wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSN0I5Q0Y4QzQ2QzM1RkE4AA=="
                      userId: "bec45bb93cbd24cbec32941ec3c93a12"
                      chatJid: "5511999999999@s.whatsapp.net"
                      senderJid: "5511999999999@s.whatsapp.net"
                      senderLid: "123456789012345@lid"
                      senderPhone: "5511999999999"
                      pushName: "Maria Ads"
                      messageText: "Oi, quero mais informacoes"
                      messageTimestamp: "2026-03-18T12:34:56Z"
                      adTitle: "Campanha Abril"
                      adBody: "Clique para falar no WhatsApp"
                      adSourceApp: "facebook"
                      adId: "120209999999990001"
                      adSourceUrl: "https://www.facebook.com/ads/click?..."
                      adSourceType: "ad"
                      adMediaUrl: "https://lookaside.fbsbx.com/..."
                      adOriginalImageUrl: "https://lookaside.fbsbx.com/..."
                      adThumbnailUrl: "https://lookaside.fbsbx.com/..."
                      adCtwaClid: "ARAkq89example"
                      adThumbnailMime: "image/jpeg"
                      adThumbnailBase64: "/9j/4AAQSkZJRgABAQAAAQABAAD..."
                      adName: "Criativo 01"
                      adSetId: "120209999999990002"
                      adSetName: "Ad Set Brasil"
                      campaignId: "120209999999990003"
                      campaignName: "Campanha Brasil"
                      adGraphEnrichedAt: "2026-03-18T12:35:12Z"
                      createdAt: "2026-03-18T12:34:57Z"
                  total: 1
                  limit: 50
                  offset: 0
                  hasMore: false
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license (FZAP-...)
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 403
                success: false
                error: "This feature requires a monthly subscription license"

  /paid-traffic/stats:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Get paid traffic statistics"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Returns the full paid traffic analytics payload used by the dashboard, including:
        - all-time counters (`total`, `today`, `thisWeek`, `thisMonth`)
        - the selected analysis period metadata (`periodLabel`, `periodFrom`, `periodTo`)
        - enrichment summary
        - conversion summary
        - daily series
        - top campaigns, ad sets and creatives
        - Meta cost sync information when ad insights are available

        Backend behavior:
        - `week_start` accepts `sunday` or `monday` and defaults to `sunday`.
        - `period` accepts `today`, `7d`, `30d` or `custom` and defaults to `30d`.
        - For `period=custom`, `date_from` and `date_to` must be in `YYYY-MM-DD`.
        - `refresh_costs=1` forces a new Graph API sync for ad insights before calculating cost metrics.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: week_start
          in: query
          description: Defines how `thisWeek` is calculated.
          schema:
            type: string
            enum: [monday, sunday]
            default: sunday
        - name: period
          in: query
          description: Analysis period for analytics sections.
          schema:
            type: string
            enum: [today, 7d, 30d, custom]
            default: 30d
        - name: date_from
          in: query
          description: Required only for `period=custom`. Format `YYYY-MM-DD`.
          schema:
            type: string
            example: "2026-03-01"
        - name: date_to
          in: query
          description: Required only for `period=custom`. Format `YYYY-MM-DD`.
          schema:
            type: string
            example: "2026-03-18"
        - name: refresh_costs
          in: query
          description: Set to `1` to force a refresh of Meta ad cost insights before computing cost metrics.
          schema:
            type: string
            enum: ["1"]
      responses:
        200:
          description: Paid traffic analytics retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/PaidTrafficStatsResponse'
              example:
                code: 200
                success: true
                data:
                  total: 218
                  today: 6
                  thisWeek: 28
                  thisMonth: 74
                  weekStart: "sunday"
                  sourceBreakdown:
                    - sourceApp: "facebook"
                      count: 160
                      percentage: 73.39
                    - sourceApp: "instagram"
                      count: 58
                      percentage: 26.61
                  periodLabel: "30d"
                  periodFrom: "2026-02-18"
                  periodTo: "2026-03-18"
                  periodTotal: 74
                  previousPeriodTotal: 51
                  growthRate: 45.1
                  enrichment:
                    enriched: 62
                    pending: 9
                    error: 3
                    enrichmentRate: 83.78
                  leadsWithConversion: 11
                  conversionRate: 14.86
                  totalConversionValue: 5420.75
                  conversionsFailed: 2
                  daily:
                    - date: "2026-03-16"
                      count: 5
                    - date: "2026-03-17"
                      count: 8
                    - date: "2026-03-18"
                      count: 6
                  topCampaigns:
                    - id: "120209999999990003"
                      name: "Campanha Brasil"
                      count: 19
                      conversions: 4
                      conversionRate: 21.05
                      totalValue: 1980.0
                      spend: 620.5
                      spendWithConversion: 450.0
                      spendWithoutConversion: 170.5
                      roas: 3.19
                      roi: 2.19
                  topAdsets:
                    - id: "120209999999990002"
                      name: "Ad Set Brasil"
                      campaignId: "120209999999990003"
                      campaignName: "Campanha Brasil"
                      count: 19
                      conversions: 4
                      totalValue: 1980.0
                      spend: 620.5
                      spendWithConversion: 450.0
                      spendWithoutConversion: 170.5
                      roas: 3.19
                      roi: 2.19
                  topCreatives:
                    - id: "120209999999990001"
                      name: "Criativo 01"
                      campaignId: "120209999999990003"
                      campaignName: "Campanha Brasil"
                      adsetId: "120209999999990002"
                      adsetName: "Ad Set Brasil"
                      count: 19
                      convertedLeads: 4
                      conversions: 4
                      totalValue: 1980.0
                      spend: 620.5
                      spendWithoutConversion: 170.5
                      impressions: 12987
                      costPerLead: 32.66
                      costPerConversion: 155.13
                      conversionRate: 21.05
                      roas: 3.19
                      roi: 2.19
                      lastSyncedAt: "2026-03-18T13:05:00Z"
                  conversionsByType:
                    - eventName: "Purchase"
                      count: 6
                      totalValue: 4420.75
                    - eventName: "QualifiedLead"
                      count: 5
                      totalValue: 1000
                  costs:
                    totalSpend: 1820.4
                    spendWithConversion: 1215.7
                    spendWithoutConversion: 604.7
                    roas: 2.98
                    roi: 1.98
                    costPerLead: 24.6
                    costPerConversion: 165.49
                    trackedAds: 13
                    adsWithConversion: 5
                    adsWithoutConversion: 4
                    lastSyncedAt: "2026-03-18T13:05:00Z"
                    syncStatus: "fresh"
                    syncFailures: 0
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license (FZAP-...)
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
              example:
                code: 403
                success: false
                error: "This feature requires a monthly subscription license"

  /paid-traffic/leads/export:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Export paid traffic leads to CSV"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Downloads the same lead dataset available in `GET /paid-traffic/leads`, but as CSV.
        The endpoint reuses the same filtering and sorting rules as the JSON listing endpoint.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: search
          in: query
          schema:
            type: string
        - name: date_from
          in: query
          schema:
            type: string
        - name: date_to
          in: query
          schema:
            type: string
        - name: campaign
          in: query
          schema:
            type: string
        - name: adset
          in: query
          schema:
            type: string
        - name: creative
          in: query
          schema:
            type: string
        - name: sort
          in: query
          schema:
            type: string
            enum: [date, contact, message, ad, source, ctwa_clid, created]
        - name: order
          in: query
          schema:
            type: string
            enum: [ASC, DESC]
      responses:
        200:
          description: CSV file with paid traffic leads.
          content:
            text/csv:
              schema:
                type: string
                format: binary
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /paid-traffic/config:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Get paid traffic configuration"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Returns the saved paid traffic configuration for the authenticated user.
        If the user has no persisted configuration yet, the backend still returns HTTP 200 with a default object:
        empty Graph fields, `displayCurrency=BRL` and `autoEnrichEnabled=true`.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Paid traffic configuration retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/PaidTrafficConfigResponse'
              example:
                code: 200
                success: true
                data:
                  userId: "bec45bb93cbd24cbec32941ec3c93a12"
                  fbGraphAccessToken: ""
                  fbPixelId: ""
                  fbPageId: ""
                  displayCurrency: "BRL"
                  autoEnrichEnabled: true
                  leadsOnlyMode: false
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
    post:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Save paid traffic configuration"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Saves or updates the paid traffic configuration for the authenticated user.
        Notes:
        - `userId` from the request body is ignored; the authenticated user is always used.
        - `displayCurrency` is normalized server-side and falls back to `BRL` when unsupported.
        - When `setupChatwootCAPI=true`, the backend also attempts to provision the Chatwoot CAPI integration.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/PaidTrafficConfigSaveRequest'
            example:
              fbGraphAccessToken: "EAABsbCS1..."
              fbPixelId: "123456789012345"
              fbPageId: "112233445566778"
              displayCurrency: "BRL"
              autoEnrichEnabled: true
              leadsOnlyMode: false
              setupChatwootCAPI: true
      responses:
        200:
          description: Configuration saved successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/PaidTrafficConfigSaveResponse'
              example:
                code: 200
                success: true
                data:
                  config:
                    userId: "bec45bb93cbd24cbec32941ec3c93a12"
                    fbGraphAccessToken: "EAABsbCS1..."
                    fbPixelId: "123456789012345"
                    fbPageId: "112233445566778"
                    displayCurrency: "BRL"
                    autoEnrichEnabled: true
                    leadsOnlyMode: false
                    setupChatwootCAPI: true
                    createdAt: "2026-03-18T13:00:00Z"
                    updatedAt: "2026-03-18T13:00:00Z"
                  capiSetup:
                    success: true
        400:
          description: Invalid request body.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /paid-traffic/leads/{id}/enrich:
    post:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Manually enrich a lead"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Performs a synchronous Graph API enrichment for a single lead identified by `messageId`.
        The lead must already have an `adId` (`ad_source_id`) stored; otherwise the request fails with HTTP 400.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Lead `messageId`.
          schema:
            type: string
      responses:
        200:
          description: Enrichment attempted successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/PaidTrafficEnrichmentResponse'
              example:
                code: 200
                success: true
                data:
                  adId: "120209999999990001"
                  adName: "Criativo 01"
                  adSetId: "120209999999990002"
                  adSetName: "Ad Set Brasil"
                  campaignId: "120209999999990003"
                  campaignName: "Campanha Brasil"
                  enrichedAt: "2026-03-18T12:35:12Z"
                  enrichError: null
        400:
          description: Lead has no `adId` or cannot be enriched with current configuration.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Lead not found.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /paid-traffic/leads/{id}/send-conversion:
    post:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Send conversion event to Meta"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Sends one conversion event to Meta Conversions API for the lead identified by `messageId`.

        Validation enforced by the backend:
        - `eventName` must be one of the supported conversion event names.
        - `eventTime` must not be in the future.
        - Meta rejects events older than 7 days, and the backend enforces the same rule.
        - For `Purchase`, `currency` and a positive `value` are required.
        - At least one non-empty field must be present in `userData`.
        - The lead must contain `adCtwaClid`; organic leads cannot be sent.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Lead `messageId`.
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/SendConversionRequest'
            example:
              eventName: "Purchase"
              eventTime: 1773837600
              currency: "BRL"
              value: 249.9
              saveCache: true
              userData:
                phone: "5511999999999"
                email: "maria@example.com"
                firstName: "Maria"
                city: "Sao Paulo"
                state: "SP"
                country: "BR"
      responses:
        200:
          description: Conversion request processed. Inspect `data.success` and `data.event.status` for Meta delivery result.
          content:
            application/json:
              schema:
                $ref: '#/definitions/SendConversionResponse'
              example:
                code: 200
                success: true
                data:
                  success: true
                  isDuplicate: false
                  event:
                    id: "bec45bb93cbd24cbec32941ec3c93a12_wamid.HBgM..._1773837610"
                    userId: "bec45bb93cbd24cbec32941ec3c93a12"
                    leadMessageId: "wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSN0I5Q0Y4QzQ2QzM1RkE4AA=="
                    eventName: "Purchase"
                    eventTime: 1773837600
                    fbEventId: "evt_bec45bb93cbd24cbec32941ec3c93a12_wamid.HBgM..._Purchase"
                    fbPixelId: "123456789012345"
                    fbPageId: "112233445566778"
                    ctwaClid: "ARAkq89example"
                    phoneHash: "1c7f6e..."
                    emailHash: "9f86d0..."
                    fnHash: "2c26b4..."
                    lnHash: ""
                    dbHash: ""
                    ctHash: "6b51d4..."
                    stHash: "8f14e4..."
                    zpHash: ""
                    countryHash: "7c222f..."
                    currency: "BRL"
                    value: 249.9
                    fbResponse: "{\"events_received\":1}"
                    fbTraceId: "A1B2C3D4"
                    sentAt: "2026-03-18T13:00:10Z"
                    status: "success"
                    errorMessage: ""
                    createdAt: "2026-03-18T13:00:10Z"
        400:
          description: Validation error, missing Meta config, missing CTWA CLID, or invalid event payload.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Lead not found or paid traffic config not found.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
  /paid-traffic/leads/{id}/conversion-history:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Get conversion history for a lead"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Returns previously stored conversion events for the lead identified by `messageId`,
        newest first, including joined campaign/ad attribution fields when available.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Lead `messageId`.
          schema:
            type: string
      responses:
        200:
          description: Conversion history retrieved
          content:
            application/json:
              schema:
                $ref: '#/definitions/ConversionHistoryResponse'
              example:
                code: 200
                success: true
                data:
                  events:
                    - id: "evt_001"
                      userId: "bec45bb93cbd24cbec32941ec3c93a12"
                      leadMessageId: "wamid.HBgM..."
                      eventName: "QualifiedLead"
                      eventTime: 1773837500
                      fbEventId: "evt_bec45_qualified"
                      fbPixelId: "123456789012345"
                      fbPageId: "112233445566778"
                      ctwaClid: "ARAkq89example"
                      sentAt: "2026-03-18T12:59:00Z"
                      status: "success"
                      errorMessage: ""
                      createdAt: "2026-03-18T12:59:00Z"
                      adCampaignName: "Campanha Brasil"
                      adAdsetName: "Ad Set Brasil"
                      adName: "Criativo 01"
                  total: 1
        400:
          description: Missing `messageId` path parameter.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to retrieve conversion history.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
  # Intentionally omitted from OpenAPI:
  # `/paid-traffic/leads/{id}/user-data-cache`
  # Do not re-add this endpoint or its payload schemas to the public OpenAPI document.

  /paid-traffic/conversion-events:
    get:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] List all conversion events"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Returns up to 100 most recent conversion events for the authenticated user, ordered by `sentAt` descending.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Conversion events retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ConversionEventListResponse'
              example:
                code: 200
                success: true
                data:
                  events:
                    - id: "evt_001"
                      userId: "bec45bb93cbd24cbec32941ec3c93a12"
                      leadMessageId: "wamid.HBgM..."
                      eventName: "Purchase"
                      eventTime: 1773837600
                      fbEventId: "evt_bec45_purchase"
                      fbPixelId: "123456789012345"
                      fbPageId: "112233445566778"
                      ctwaClid: "ARAkq89example"
                      currency: "BRL"
                      value: 249.9
                      sentAt: "2026-03-18T13:00:10Z"
                      status: "success"
                      errorMessage: ""
                      createdAt: "2026-03-18T13:00:10Z"
                  total: 1
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to retrieve events.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
  /paid-traffic/test-conversion:
    post:
      tags:
        - Paid Traffic
      summary: "[SUBSCRIPTION ONLY] Send test conversion event"
      description: |
        ⚠️ This endpoint requires a monthly subscription license (`FZAP-...`).

        Sends a minimal `ViewContent` event to validate the saved Meta CAPI configuration.
        No request body is required. The backend uses the saved Pixel ID, Page ID and Graph access token.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Test conversion sent
          content:
            application/json:
              schema:
                $ref: '#/definitions/TestConversionResponse'
              example:
                code: 200
                success: true
                data:
                  success: true
                  message: "Test event sent successfully"
                  fbTraceId: "A1B2C3D4"
        400:
          description: Missing/invalid configuration or Meta send failure.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        401:
          description: Missing or invalid user token.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Forbidden - Requires monthly subscription license.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Paid traffic configuration not found.
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/bots:
    post:
      tags:
        - Typebot
      summary: Create a Typebot bot configuration
      description: |
        Creates a bot configuration for the authenticated user.
        Bot names are unique per user.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotBotCreateRequest'
            example:
              name: "Sales Assistant"
              description: "Handles pre-sales conversations"
              typebotUrl: "https://bot.example.com"
              typebotId: "flow-id-123"
              triggerType: "keyword"
              triggerOperator: "contains"
              triggerValue: "pricing"
              expireMinutes: 30
              keywordFinish: "stop"
              debounceMs: 1500
              ignoreJids: "[\"120363000000000000@g.us\"]"
              listeningFromMe: false
              stopBotFromMe: true
              splitMessages: true
              timePerCharMs: 0
              keepOpen: false
      responses:
        201:
          description: Bot created
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotBotResponse'
        400:
          description: Invalid payload or validation error
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        409:
          description: A bot with the same name already exists
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to create bot
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
    get:
      tags:
        - Typebot
      summary: List Typebot bot configurations
      description: Returns all bot configurations for the authenticated user.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Bot list
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotBotsResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to list bots
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/bots/{id}:
    get:
      tags:
        - Typebot
      summary: Get a Typebot bot configuration
      description: Returns a single bot configuration by ID.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Bot configuration ID
      responses:
        200:
          description: Bot found
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotBotResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
    put:
      tags:
        - Typebot
      summary: Update a Typebot bot configuration
      description: |
        Updates a bot configuration by ID.
        Send a complete payload for boolean/integer fields to avoid unintended resets.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Bot configuration ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotBotUpdateRequest'
            example:
              enabled: true
              name: "Sales Assistant"
              description: "Updated description"
              typebotUrl: "https://bot.example.com"
              typebotId: "flow-id-123"
              triggerType: "all"
              triggerOperator: "equals"
              triggerValue: ""
              expireMinutes: 45
              keywordFinish: "stop"
              debounceMs: 1000
              ignoreJids: "[]"
              listeningFromMe: false
              stopBotFromMe: true
              splitMessages: true
              timePerCharMs: 0
              keepOpen: false
      responses:
        200:
          description: Bot updated
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotBotResponse'
        400:
          description: Invalid payload or validation error
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to update bot
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
    delete:
      tags:
        - Typebot
      summary: Delete a Typebot bot configuration
      description: Deletes a bot configuration by ID.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Bot configuration ID
      responses:
        200:
          description: Bot deleted
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotDeleteResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to delete bot
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/settings:
    post:
      tags:
        - Typebot
      summary: Save Typebot default settings
      description: Updates default Typebot behavior for the authenticated user.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotSettingsUpdateRequest'
            example:
              fallbackConfigId: "4b72c4a6-0da2-4f68-9632-588de4264709"
              globalEnabled: true
      responses:
        200:
          description: Settings saved
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotSettingsResponse'
        400:
          description: Invalid JSON
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to save settings
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
    get:
      tags:
        - Typebot
      summary: Get Typebot default settings
      description: |
        Returns default settings for the authenticated user.
        If no settings were saved yet, default values are returned.
      security:
        - ApiKeyAuth: []
      responses:
        200:
          description: Settings retrieved
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotSettingsResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/sessions/start:
    post:
      tags:
        - Typebot
      summary: Start a Typebot session for a contact
      description: |
        Starts a Typebot session and forwards `variables` to Typebot as `prefilledVariables`.
        Any existing session for the same contact is replaced.

        For automatic session start (triggered by incoming WhatsApp messages), the backend sends:
        - `contactJid`
        - `contactName`
        - `messageText`
        - `contactLid` (only when available)

        Note: in this manual endpoint, those values are only sent if you include them in `variables`.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotStartSessionRequest'
            example:
              botId: "4b72c4a6-0da2-4f68-9632-588de4264709"
              contactJid: "5511999999999@s.whatsapp.net"
              variables:
                contactJid: "5511999999999@s.whatsapp.net"
                contactName: "Maria"
                messageText: "Hello, I want pricing details"
                contactLid: "2:abc123def456@lid"
      responses:
        200:
          description: Session started
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotStartSessionResponse'
        400:
          description: Invalid payload
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to start session
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/sessions/{id}/status:
    post:
      tags:
        - Typebot
      summary: Change Typebot session status
      description: |
        Updates a session status.
        Accepted values: `active`, `paused`, `completed`.
        When `completed`, the session is removed.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Session ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotSessionStatusRequest'
            example:
              status: "paused"
      responses:
        200:
          description: Session status updated
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotSessionStatusResponse'
        400:
          description: Invalid payload or status
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Session not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to update session
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/sessions/{botId}:
    get:
      tags:
        - Typebot
      summary: List sessions for a Typebot bot
      description: Returns all sessions linked to a bot configuration.
      security:
        - ApiKeyAuth: []
      parameters:
        - name: botId
          in: path
          required: true
          schema:
            type: string
          description: Bot configuration ID
      responses:
        200:
          description: Session list
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotSessionsResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to list sessions
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

  /typebot/ignore:
    post:
      tags:
        - Typebot
      summary: Add or remove an ignored JID for a bot
      description: |
        Manages the ignored JID list for a bot configuration.
        Use `action=add` to append and `action=remove` to remove.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/definitions/TypebotIgnoreRequest'
            example:
              botId: "4b72c4a6-0da2-4f68-9632-588de4264709"
              jid: "120363000000000000@g.us"
              action: "add"
      responses:
        200:
          description: Ignore list updated
          content:
            application/json:
              schema:
                $ref: '#/definitions/TypebotIgnoreResponse'
        400:
          description: Invalid payload
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        403:
          description: Typebot feature unavailable for current license or access denied
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        404:
          description: Bot not found
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'
        500:
          description: Failed to update ignore list
          content:
            application/json:
              schema:
                $ref: '#/definitions/ErrorResponse'

definitions:
  User:

    type: object
    properties:
      id:
        type: string
        example: 4e4942c7dee1deef99ab8fd9f7350de5
      name:
        type: string
        example: John Doe
      token:
        type: string
        example: "1234ABCD"
      webhook:
        type: string
        example: "https://webhook.site/1234567890"
      events:
        type: string
        example: "All"
      proxyConfig:
        type: object
        properties:
          enabled:
            type: boolean
            example: true
          proxyUrl:
            type: string
            example: "https://serverproxy.com:9080"
      s3Config:
        type: object
        properties:
          enabled:
            type: boolean
            example: true
          endpoint:
            type: string
            example: "https://s3.amazonaws.com"
          region:
            type: string
            example: "us-east-1"
          bucket:
            type: string
            example: "my-bucket"
          accessKey:
            type: string
            example: "***"
          pathStyle:
            type: boolean
            example: true
          publicUrl:
            type: string
            example: "https://s3.amazonaws.com"
          mediaDelivery:
            type: string
            example: "both"
          retentionDays:
            type: integer
            example: 30

  CreateUser:
    type: object
    required:
      - name
      - token
    properties:
      name:
        type: string
        description: "User name"
        example: "John Doe"
      token:
        type: string
        description: "Unique user token for authentication"
        example: "1234ABCD"
      expiration:
        type: integer
        description: "Optional expiration value stored with the user record"
        example: 0
      bindAddress:
        type: string
        description: "Optional local IPv4 or IPv6 address to bind outbound WhatsApp connections"
        example: "2001:db8:abcd:1234::10"
      proxyConfig:
        type: object
        properties:
          enabled:
            type: boolean
            example: true
            description: "Enable proxy for the user (default false)"
          proxyUrl:
            type: string
            example: "https://serverproxy.com:9080"
            description: "Proxy URL (socks5://user:pass@host:port or http://host:port)"
      s3Config:
        type: object
        properties:
          enabled:
            type: boolean
            example: true
            description: "Enable S3 for the user (default false)"
          endpoint:
            type: string
            example: "https://s3.amazonaws.com"
          region:
            type: string
            example: "us-east-1"
          bucket:
            type: string
            example: "my-bucket"
          accessKey:
            type: string
            example: "1234567890"
          secretKey:
            type: string
            example: "1234567890"
          pathStyle:
            type: boolean
            example: true
            description: "Enable path style (default false)"
          publicUrl:
            type: string
            example: "https://s3.amazonaws.com"
            description: "Public URL for media"
          mediaDelivery:
            type: string
            example: "both"
            description: "Media delivery type (default both)"
          retentionDays:
            type: integer
            example: 30
            description: "Retention days (default 30)"
      metadata:
        type: object
        description: "Optional arbitrary JSON object stored with the user"
        additionalProperties: true
        example:
          cliente: "Empresa X"
          crm_id: "abc123"
    example:
      name: "John Doe"
      token: "1234ABCD"
      expiration: 0
      bindAddress: ""
      proxyConfig:
        enabled: false
        proxyUrl: ""
      s3Config:
        enabled: false
      metadata:
        cliente: "Empresa X"
        crm_id: "abc123"

  ChatwootConfig:
    type: object
    required:
      - accountId
      - url
    properties:
      enabled:
        type: boolean
        example: true
      url:
        type: string
        description: "Required. Chatwoot instance URL."
        example: "https://app.chatwoot.com"
      accountId:
        type: string
        description: "Required. Chatwoot account ID."
        example: "12345"
      token:
        type: string
        description: "Conditionally required when creating a new config or when `enabled=true`."
        example: "cw_api_token_abc"
      nameInbox:
        type: string
        example: "WhatsApp Inbox"
      chatwootInboxId:
        type: integer
        example: 42
      signMsg:
        type: boolean
        example: true
      signMsgAgentBot:
        type: boolean
        description: "When true, also signs outgoing messages sent by the Chatwoot Agent Bot."
        example: true
      signDelimiter:
        type: string
        example: "\\n--"
      reopenConversation:
        type: boolean
        example: true
      conversationPending:
        type: boolean
        example: false
      mergeBrazilContacts:
        type: boolean
        example: true
      preserveExistingContactName:
        type: boolean
        description: "When true, only updates the contact name in Chatwoot if it is empty or still matches the phone number."
        example: true
      ignoreJids:
        type: string
        example: "120363043611111111@g.us"
      ignoreGroups:
        type: boolean
        example: false
      importHistory:
        type: boolean
        description: "Enables importing WhatsApp message history into Chatwoot when database access is configured."
        example: true
      chatwootHistoryDaysLimit:
        type: integer
        description: "Maximum number of past days to import. Use 0 to import all available history."
        example: 30
      enableTypingIndicator:
        type: boolean
        example: true
      transcriptionEnabled:
        type: boolean
        example: true
      transcriptionProvider:
        type: string
        description: "Used with `transcriptionEnabled`. Supported values include `openai` and `groq`."
        example: "openai"
      openaiApiKey:
        type: string
        description: "Required when `transcriptionEnabled=true` and `transcriptionProvider=openai`."
        example: "sk-xxxxxxxx"
      openaiModel:
        type: string
        example: "whisper-1"
      openaiApiBaseUrl:
        type: string
        example: "https://api.openai.com/v1"
      groqApiKey:
        type: string
        description: "Required when `transcriptionEnabled=true` and `transcriptionProvider=groq`."
        example: "gsk-xxxxxxxx"
      groqModel:
        type: string
        example: "distil-whisper"
      groqApiBaseUrl:
        type: string
        example: "https://api.groq.com/openai/v1"
      proxyUrl:
        type: string
        example: "http://proxy.internal:8080"
      chatwootDbEnabled:
        type: boolean
        example: true
      chatwootDbHost:
        type: string
        description: "Required to use Chatwoot DB-based features when `chatwootDbEnabled=true`."
        example: "chatwoot-db.internal"
      chatwootDbPort:
        type: integer
        description: "Required to use Chatwoot DB-based features when `chatwootDbEnabled=true`."
        example: 5432
      chatwootDbName:
        type: string
        description: "Required to use Chatwoot DB-based features when `chatwootDbEnabled=true`."
        example: "chatwoot_production"
      chatwootDbUser:
        type: string
        description: "Required to use Chatwoot DB-based features when `chatwootDbEnabled=true`."
        example: "chatwoot"
      chatwootDbPass:
        type: string
        description: "Required to use Chatwoot DB-based features when `chatwootDbEnabled=true`."
        example: "supersecret"
      messageDeliveryTimeoutSeconds:
        type: integer
        example: 45
      deleteMessageOnRevoke:
        type: boolean
        description: "When true (default), deletes the message from Chatwoot when it is revoked/deleted on WhatsApp. When false, sends a notification instead."
        example: true

  ChatwootConfigResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              status:
                type: string
                example: "success"
              message:
                type: string
                example: "Chatwoot configuration saved successfully"
              webhookUrl:
                type: string
                example: "http://localhost:8080/chatwoot/webhook/USER_TOKEN"

  ChatwootStatusResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              configured:
                type: boolean
                example: true
              enabled:
                type: boolean
                example: true
              connected:
                type: boolean
                example: true
              stats:
                type: object
                properties:
                  messagesSent:
                    type: integer
                    example: 150
                  activeConversations:
                    type: integer
                    example: 5
                  lastSync:
                    type: string
                    format: date-time
                    example: "2024-12-25T10:30:00Z"
              messageQueues:
                type: object
                properties:
                  activeQueues:
                    type: integer
                    example: 3
                  totalQueued:
                    type: integer
                    example: 12
                  queueDetails:
                    type: object
                    additionalProperties:
                      type: integer
                    example:
                      "5491155553934@s.whatsapp.net": 5
                      "5511987654321@s.whatsapp.net": 4
                      "5491155553936@s.whatsapp.net": 3

  TypebotNullableString:
    type: object
    properties:
      string:
        type: string
        example: "4b72c4a6-0da2-4f68-9632-588de4264709"
      valid:
        type: boolean
        example: true

  TypebotNullableTime:
    type: object
    properties:
      time:
        type: string
        format: date-time
        example: "2026-02-13T14:10:00Z"
      valid:
        type: boolean
        example: true

  TypebotBotCreateRequest:
    type: object
    required:
      - name
      - typebotUrl
      - typebotId
    properties:
      name:
        type: string
        description: Bot display name (must be unique per user)
        example: "Sales Assistant"
      description:
        type: string
        example: "Handles pre-sales conversations"
      typebotUrl:
        type: string
        description: Base URL of your Typebot instance
        example: "https://bot.example.com"
      typebotId:
        type: string
        description: Typebot flow identifier
        example: "flow-id-123"
      triggerType:
        type: string
        enum:
          - all
          - keyword
          - none
        default: all
      triggerOperator:
        type: string
        enum:
          - equals
          - contains
          - startsWith
          - endsWith
          - regex
        default: equals
      triggerValue:
        type: string
        description: Required when triggerType is keyword
      expireMinutes:
        type: integer
        minimum: 0
        default: 0
      keywordFinish:
        type: string
        description: Optional keyword to end session flow
      debounceMs:
        type: integer
        minimum: 0
        default: 0
      ignoreJids:
        type: string
        description: JSON-encoded array of JIDs to ignore (stored as string)
        example: "[\"120363000000000000@g.us\"]"
      listeningFromMe:
        type: boolean
        default: false
      stopBotFromMe:
        type: boolean
        default: true
      splitMessages:
        type: boolean
        default: true
      timePerCharMs:
        type: integer
        minimum: 0
        default: 0
      keepOpen:
        type: boolean
        default: false

  TypebotBotUpdateRequest:
    type: object
    description: Send complete boolean/integer fields to avoid accidental resets.
    properties:
      enabled:
        type: boolean
      name:
        type: string
      description:
        type: string
      typebotUrl:
        type: string
      typebotId:
        type: string
      triggerType:
        type: string
        enum:
          - all
          - keyword
          - none
      triggerOperator:
        type: string
        enum:
          - equals
          - contains
          - startsWith
          - endsWith
          - regex
      triggerValue:
        type: string
      expireMinutes:
        type: integer
        minimum: 0
      keywordFinish:
        type: string
      debounceMs:
        type: integer
        minimum: 0
      ignoreJids:
        type: string
        description: JSON-encoded array of JIDs to ignore (stored as string)
      listeningFromMe:
        type: boolean
      stopBotFromMe:
        type: boolean
      splitMessages:
        type: boolean
      timePerCharMs:
        type: integer
        minimum: 0
      keepOpen:
        type: boolean

  TypebotBotConfig:
    type: object
    properties:
      id:
        type: string
        example: "4b72c4a6-0da2-4f68-9632-588de4264709"
      userId:
        type: string
        example: "bec45bb93cbd24cbec32941ec3c93a12"
      enabled:
        type: boolean
        example: true
      name:
        type: string
        example: "Sales Assistant"
      description:
        type: string
        example: "Handles pre-sales conversations"
      typebotUrl:
        type: string
        example: "https://bot.example.com"
      typebotId:
        type: string
        example: "flow-id-123"
      triggerType:
        type: string
        enum:
          - all
          - keyword
          - none
      triggerOperator:
        type: string
        enum:
          - equals
          - contains
          - startsWith
          - endsWith
          - regex
      triggerValue:
        type: string
      expireMinutes:
        type: integer
        example: 30
      keywordFinish:
        type: string
        example: "stop"
      debounceMs:
        type: integer
        example: 1500
      ignoreJids:
        type: string
        description: JSON-encoded array of ignored JIDs
        example: "[\"120363000000000000@g.us\"]"
      listeningFromMe:
        type: boolean
        example: false
      stopBotFromMe:
        type: boolean
        example: true
      splitMessages:
        type: boolean
        example: true
      timePerCharMs:
        type: integer
        example: 0
      keepOpen:
        type: boolean
        example: false
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  TypebotSettingsUpdateRequest:
    type: object
    properties:
      fallbackConfigId:
        type: string
        description: Bot config ID used as fallback
      globalEnabled:
        type: boolean
        description: Global Typebot on/off switch for this user

  TypebotSettings:
    type: object
    properties:
      userId:
        type: string
      fallbackConfigId:
        $ref: '#/definitions/TypebotNullableString'
      globalEnabled:
        type: boolean
        example: true
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  TypebotStartSessionRequest:
    type: object
    required:
      - botId
      - contactJid
    properties:
      botId:
        type: string
        description: Typebot config ID
      contactJid:
        type: string
        description: Contact JID that will own the session
        example: "5511999999999@s.whatsapp.net"
      variables:
        type: object
        description: |
          Key/value map forwarded to Typebot `prefilledVariables`.
          Automatic start (from incoming WhatsApp message) sends:
          - `contactJid`
          - `contactName`
          - `messageText`
          - `contactLid` (when available)
        additionalProperties:
          type: string

  TypebotSessionStatusRequest:
    type: object
    required:
      - status
    properties:
      status:
        type: string
        enum:
          - active
          - paused
          - completed

  TypebotIgnoreRequest:
    type: object
    required:
      - botId
      - jid
      - action
    properties:
      botId:
        type: string
      jid:
        type: string
        description: Contact or group JID to add/remove from ignore list
      action:
        type: string
        enum:
          - add
          - remove

  TypebotSession:
    type: object
    properties:
      id:
        type: string
      userId:
        type: string
      configId:
        type: string
      typebotSessionId:
        type: string
      contactJid:
        type: string
      contactLid:
        $ref: '#/definitions/TypebotNullableString'
      status:
        type: string
        enum:
          - active
          - paused
          - completed
      prefilledVars:
        type: string
        description: JSON-encoded prefilled variables payload
      lastInteraction:
        type: string
        format: date-time
      expiresAt:
        $ref: '#/definitions/TypebotNullableTime'
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  TypebotBotResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/TypebotBotConfig'

  TypebotBotsResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: array
            items:
              $ref: '#/definitions/TypebotBotConfig'

  TypebotDeleteResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              status:
                type: string
                example: "deleted"

  TypebotSettingsResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/TypebotSettings'

  TypebotStartSessionResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              session:
                $ref: '#/definitions/TypebotSession'
              messages:
                type: array
                items:
                  type: string

  TypebotSessionStatusResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              status:
                type: string
                enum:
                  - active
                  - paused
                  - completed

  TypebotSessionsResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: array
            items:
              $ref: '#/definitions/TypebotSession'

  TypebotIgnoreResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              ignoreJids:
                type: array
                items:
                  type: string

  S3Config:
    type: object
    required:
      - enabled
    properties:
      enabled:
        type: boolean
        example: true
      endpoint:
        type: string
        description: Endpoint URL. Required in practice when `enabled` is `true`.
        example: "https://s3.amazonaws.com"
      region:
        type: string
        description: Region. Required in practice when `enabled` is `true`.
        example: "us-east-1"
      bucket:
        type: string
        description: Bucket name. Required in practice when `enabled` is `true`.
        example: "my-whatsapp-media"
      accessKey:
        type: string
        description: Access key. Required in practice when `enabled` is `true`.
        example: "AKIAIOSFODNN7EXAMPLE"
      secretKey:
        type: string
        description: Secret key. Required in practice when `enabled` is `true`.
        example: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      pathStyle:
        type: boolean
        example: false
      publicUrl:
        type: string
        example: "https://cdn.example.com"
      mediaDelivery:
        type: string
        enum: ["base64", "s3", "both"]
        description: Delivery mode for media URLs/content. Defaults to `base64` when omitted.
        example: "both"
      retentionDays:
        type: integer
        example: 30

  SuccessResponse:
    type: object
    properties:
      code:
        type: integer
        example: 200
      success:
        type: boolean
        example: true
      data:
        type: object

  QRResponse:
    type: object
    properties:
      code:
        type: integer
        example: 200
      success:
        type: boolean
        example: true
      data:
        $ref: '#/definitions/QRResponseData'

  QRResponseData:
    type: object
    properties:
      QRCode:
        type: string
        description: "Current QR code as a full data URL (`data:image/png;base64,...`). An empty string means the websocket is connected but WhatsApp has not emitted the first QR yet."
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."

  PairphoneResponse:
    type: object
    properties:
      code:
        type: integer
        example: 200
      success:
        type: boolean
        example: true
      data:
        $ref: '#/definitions/PairphoneResponseData'

  PairphoneResponseData:
    type: object
    properties:
      LinkingCode:
        type: string
        description: "Linking code returned by WhatsApp for the phone pairing flow."
        example: "9H3J-H3J8"

  ErrorResponse:
    type: object
    properties:
      code:
        type: integer
        example: 400
      success:
        type: boolean
        example: false
      error:
        type: string
        example: "Invalid request"

  MessageSentResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              id:
                type: string
                description: "WhatsApp message ID"
                example: "90B2F8B13FAC8A9CF6B06E99C7834DC5"
              timestamp:
                type: integer
                format: int64
                description: "Unix timestamp (seconds)"
                example: 1713459372
              details:
                type: string
                example: "Sent"
              warning:
                type: string
                description: "Optional warning message (e.g., client rendering limitations)."

  DeleteUser:
    type: object
    properties:
      id:
        type: string
        example: 4e4942c7dee1deef99ab8fd9f7350de5

  DeleteMessage:
    type: object
    required:
      - phone
      - id
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      id:
        type: string
        description: "Message ID to delete"
        example: "AABBCC11223344"

  Markread:
    type: object
    required:
      - id
      - chat
    properties:
      id:
        type: array
        description: "Message IDs to mark as read"
        items:
          type: string
        example:
          - "AABBCC11223344"
          - "BBCCDD22334455"
      chat:
        type: string
        description: "Chat JID"
        example: "5491155553934@s.whatsapp.net"
      sender:
        type: string
        description: "Sender JID (optional)"
        example: "5491155553934@s.whatsapp.net"

  WebhookSet:
    type: object
    required:
      - url
    properties:
      url:
        type: string
        description: "Webhook URL"
        example: "https://webhook1.example.net/fzap"
      webhookUrl:
        type: string
        description: "Legacy webhook URL field"
        example: "https://webhook1.example.net/fzap"
      events:
        type: array
        description: "Subscribed event types"
        items:
          type: string
        example:
          - "Message"
          - "ReadReceipt"
      headers:
        type: object
        description: "Optional custom HTTP headers sent together with the webhook request"
        additionalProperties:
          type: string
        example:
          Authorization: "Bearer token-123"
          X-API-Key: "secret-key"

  WebhookUpdate:
    type: object
    required:
      - url
    properties:
      url:
        type: string
        description: "Webhook URL"
        example: "https://updated.example.net/webhook"
      webhookUrl:
        type: string
        description: "Legacy webhook URL field"
        example: "https://updated.example.net/webhook"
      events:
        type: array
        description: "Subscribed event types"
        items:
          type: string
        example:
          - "Message"
          - "ReadReceipt"
          - "Presence"
      headers:
        type: object
        description: "Optional custom HTTP headers sent together with the webhook request"
        additionalProperties:
          type: string
        example:
          Authorization: "Bearer token-123"
          X-API-Key: "secret-key"

  GroupPhoto:
    type: object
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      image:
        type: string
        description: "Image payload (HTTP(S) URL, data:image/...;base64,..., or raw base64). JPEG required by WhatsApp."
        example: "data:image/jpeg;base64,Akd9300..."

  GroupInfo:
    type: object
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"

  GroupInviteLink:
    type: object
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      reset:
        type: boolean
        example: false

  CreateGroup:
    type: object
    required:
      - name
      - participants
    properties:
      name:
        type: string
        description: "Group name"
        example: "My New Group"
      participants:
        type: array
        description: "Participant phone numbers or JIDs"
        items:
          type: string
        example:
          - "5511988776655"
          - "5511987654321@s.whatsapp.net"

  GroupLocked:
    type: object
    required:
      - groupJid
      - locked
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      locked:
        type: boolean
        description: "Allow only admins to edit group info"
        example: true

  GroupEphemeral:
    type: object
    required:
      - groupJid
      - duration
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      duration:
        type: string
        description: "Disappearing timer duration"
        enum: ["24h", "7d", "90d", "off"]
        example: "24h"

  RemoveGroupPhoto:
    type: object
    required:
      - groupJid
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"

  GroupLeave:
    type: object
    required:
      - groupJid
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"

  GroupName:
    type: object
    required:
      - groupJid
      - name
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      name:
        type: string
        description: "New group name"
        example: "New Group Name"

  GroupTopic:
    type: object
    required:
      - groupJid
      - topic
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      topic:
        type: string
        description: "Group topic or description"
        example: "Group description and rules"

  GroupAnnounce:
    type: object
    required:
      - groupJid
      - announce
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      announce:
        type: boolean
        description: "Enable announce mode (admins-only messages)"
        example: true

  CommunityLinkGroup:
    type: object
    required:
      - parentJid
      - childJid
    properties:
      parentJid:
        type: string
        description: "Community parent JID"
        example: "120363500000000001@g.us"
      childJid:
        type: string
        description: "Child group JID"
        example: "120363500000000002@g.us"

  CreateCommunity:
    type: object
    required:
      - name
    properties:
      name:
        type: string
        description: "Community name (max 25 characters)"
        maxLength: 25
        example: "Central Community"
      participants:
        type: array
        description: "Optional participant JIDs. Participants are added after community creation in a separate step to avoid protocol errors."
        items:
          type: string
        example:
          - "549115550001@s.whatsapp.net"
      announce:
        type: boolean
        description: "Community announce mode (applied after creation)"
        example: false
      locked:
        type: boolean
        description: "Only admins can edit community info (applied after creation)"
        example: false
      joinApprovalRequired:
        type: boolean
        description: "Require admin approval for joins (applied after creation)"
        example: false
      defaultMembershipApprovalMode:
        type: string
        description: "Default membership approval mode for the parent community. Defaults to `request_required` if not specified."
        example: "request_required"
        default: "request_required"

  UpdateCommunity:
    type: object
    required:
      - communityJid
    properties:
      communityJid:
        type: string
        description: "Community JID"
        example: "120363500000000001@g.us"
      name:
        type: string
        description: "New community name"
        example: "Central Community Official"
      topic:
        type: string
        description: "Community topic/description"
        example: "Official community space"
      announce:
        type: boolean
        description: "Community announce mode"
        example: true
      locked:
        type: boolean
        description: "Only admins can edit community info"
        example: true
      joinApprovalRequired:
        type: boolean
        description: "Require admin approval for joins"
        example: true

  DeleteCommunity:
    type: object
    required:
      - communityJid
    properties:
      communityJid:
        type: string
        description: "Community JID"
        example: "120363500000000001@g.us"

  GroupJoin:
    type: object
    required:
      - code
    properties:
      code:
        type: string
        description: "Invite code"
        example: "AbCdEfGhIjKlMnOp"

  GroupInviteInfo:
    type: object
    required:
      - code
    properties:
      code:
        type: string
        description: "Invite code"
        example: "AbCdEfGhIjKlMnOp"

  UpdateGroupParticipants:
    type: object
    required:
      - groupJid
      - action
      - phone
    properties:
      groupJid:
        type: string
        example: "120362023605733675@g.us"
      action:
        type: string
        enum: [add, remove, promote, demote]
        example: "add"
      phone:
        type: array
        description: "Participant phone numbers or JIDs"
        items:
          type: string
        example:
          - "5511988776655@s.whatsapp.net"
          - "5511987654321@s.whatsapp.net"

  Connect:
    type: object
    properties:
      immediate:
        type: boolean
        description: "When false, waits about 10 seconds before returning; when true, returns as soon as bootstrap starts."
        example: true
      providerType:
        type: string
        description: "Connection provider. Omit or use `whatsmeow` for QR/pairing mode; use `cloudapi` for Meta Cloud API."
        enum: ["whatsmeow", "cloudapi"]
        example: "cloudapi"
      phoneNumberId:
        type: string
        description: "Meta Cloud API Phone Number ID. Required when `providerType` is `cloudapi`."
        example: "123456789012345"
      accessToken:
        type: string
        description: "Meta Cloud API access token. Required when `providerType` is `cloudapi`."
        example: "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      appSecret:
        type: string
        description: "Meta App Secret used for webhook signature validation."
        example: "abc123def456"
      webhookVerifyToken:
        type: string
        description: "Deprecated. Accepted for backward compatibility but ignored by the backend."
        deprecated: true
        example: "legacy-token-ignored"

  Pairphone:
    type: object
    required:
      - phone
    properties:
      phone:
        type: string
        description: "Phone number to pair with"
        example: "5511987654321"

  DownloadImage:
    type: object
    required:
      - url
      - mediaKey
      - mimeType
      - fileSha256
      - fileLength
    properties:
      url:
        type: string
        description: "WhatsApp media URL"
      directPath:
        type: string
        description: "WhatsApp media direct path"
      mediaKey:
        type: string
        description: "Media encryption key (base64 or byte array)"
      mimeType:
        type: string
        description: "MIME type of the media"
        example: "image/jpeg"
      fileEncSha256:
        type: string
        description: "Encrypted file SHA256 hash"
      fileSha256:
        type: string
        description: "File SHA256 hash"
      fileLength:
        type: number
        description: "File size in bytes"
        example: 123456
      generateLink:
        type: boolean
        description: "Generate a temporary download link instead of base64 (30 minute expiry)"
        default: false
        example: true

  ChatPresence:
    type: object
    required:
      - phone
      - state
    properties:
      phone:
        type: string
        example: "5511987654321"
      state:
        type: string
        example: "composing"
      media:
        type: string
        example: "audio"

  Checkuser:
    type: object
    required:
      - phone
    properties:
      phone:
        type: array
        minItems: 1
        description: "List of phone numbers or JIDs to verify"
        items:
          type: string
        example:
          - "5511988776655"
          - "5511987654321@s.whatsapp.net"

  Checkavatar:
    type: object
    required:
      - phone
    properties:
      phone:
        type: string
        description: "WhatsApp phone number or JID"
        example: "5511987654321"
      preview:
        type: boolean
        description: "Return a preview thumbnail when true; otherwise the full image"
        default: false

  UserPresence:
    type: object
    required:
      - type
    properties:
      type:
        type: string
        example: "available"

  ContextInfo:
    type: object
    description: "Context metadata used by whatsmeow send endpoints for replies, mentions, and forwarded-message markers."
    properties:
      stanzaId:
        type: string
        description: "Message ID being replied to"
        example: "3EB06F9067F80BAB89FF"
      participant:
        type: string
        description: "Participant JID for group replies"
        example: "5511987654321@s.whatsapp.net"
      mentionedJid:
        type: array
        description: "List of mentioned JIDs"
        items:
          type: string
        example:
          - "5511987654321@s.whatsapp.net"
          - "5491155554936@s.whatsapp.net"
      isForwarded:
        type: boolean
        description: "Marks the outbound message as forwarded when supported by the provider"
        example: true
      forwardingScore:
        type: integer
        minimum: 1
        description: "Forward count metadata used by WhatsApp when `isForwarded=true`"
        example: 1

  MessageContact:
    type: object
    required:
      - phone
      - name
    properties:
      phone:
        type: string
        example: "5511987654321"
      name:
        type: string
        example: "John"
      id:
        type: string
        example: "ABCDABCD1234"
      vcard:
        type: string
        description: "VCARD string; required in normal mode (`whatsmeow`). Missing fields are auto-filled (VERSION, N, FN, TEL;waid). In Cloud API mode, if `contactPhone` is omitted, the first TEL/waid found here is used to populate the shared contact phone."
        example: "BEGIN:VCARD\nVERSION:3.0\nN:Rodrigues;Leidy;;;\nFN:Leidy Rodrigues\nORG:Decor Studio;\nTITLE:Decoradora\nEMAIL;type=INTERNET;type=WORK;type=pref:leidy@example.com\nTEL;type=CELL;type=VOICE;waid=556581583405:+55 65 8158-3405\nURL:https://example.com\nEND:VCARD"
      contactPhone:
        type: string
        description: "Optional phone number for the shared contact in Cloud API mode. Ignored in normal mode. If omitted in Cloud API mode, the first phone found in `vcard` is used when available."
        example: "5511987654321"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode. In normal mode, use `contextInfo.stanzaId` together with `contextInfo.participant`."
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'

  MessageLocation:
    type: object
    required:
      - phone
      - latitude
      - longitude
    properties:
      phone:
        type: string
        example: "5511987654321"
      name:
        type: string
        description: "Location name"
        example: "Eiffel Tower"
      address:
        type: string
        description: "Full address (supports literal \\n line breaks)"
        example: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France"
      url:
        type: string
        description: "Associated URL (site, maps, etc). Supported in normal mode; ignored by the current Cloud API implementation."
        example: "https://www.toureiffel.paris/"
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      latitude:
        type: number
        format: float
        description: "Latitude coordinate"
        example: 48.858370
      longitude:
        type: number
        format: float
        description: "Longitude coordinate"
        example: 2.294481
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'

  ReactionText:
    type: object
    required:
      - phone
      - body
      - id
    properties:
      phone:
        type: string
        example: "5511987654321"
      body:
        type: string
        example: "<3"
      id:
        type: string
        example: "me:3EB06F9067F80BAB89FF"
      participant:
        type: string
        description: "Required for group reactions when the target message is not from you. Accepts JID or phone."
        example: "5511987654321@s.whatsapp.net"

  MessagePoll:
    type: object
    required:
      - group
      - header
      - options
    properties:
      group:
        type: string
        example: "120363417042313103@g.us"
      header:
        type: string
        example: "What's your favorite color"
      options:
        type: array
        description: "Options for the poll"
        items:
          type: string
        example:
          - "Red"
          - "Blue"
      id:
        type: string
        example: "3EB06F9067F80BAB89FF"

  MessageList:
    type: object
    required:
      - buttonText
      - phone
    anyOf:
      - required: [desc]
      - required: [text]
      - required: [description]
    properties:
      phone:
        type: string
        example: "5511987654321"
        description: "Destination phone or JID (group or user)"
      buttonText:
        type: string
        example: "Click here"
      desc:
        type: string
        example: "This is a list"
        description: "Description of the list (aliases: text, description)"
      text:
        type: string
        example: "Choose an option"
        description: "Alias for desc"
      description:
        type: string
        example: "Choose an option"
        description: "Alias for desc"
      topText:
        type: string
        example: "This is a list"
        description: "Title of the list (alias: title)"
      title:
        type: string
        example: "Daily menu"
        description: "Alias for topText"
      footerText:
        type: string
        example: "This is a footer text"
        description: "Footer (alias: footer)"
      footer:
        type: string
        example: "24h support"
        description: "Alias for footerText"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      sections:
        type: array
        description: "Preferred format: multiple sections with rows"
        items:
          type: object
          properties:
            title:
              type: string
              example: "Menu"
            rows:
              type: array
              items:
                type: object
                properties:
                  title:
                    type: string
                    example: "Option 1"
                  desc:
                    type: string
                    example: "Description"
                  rowId:
                    type: string
                    example: "opt-1"
      list:
        type: array
        description: "Legacy flat list; server wraps into a single section automatically"
        items:
          type: object
          properties:
            title:
              type: string
              example: "menu button 1"
            desc:
              type: string
              example: "long description"
            rowId:
              type: string
              example: "1"
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false

  MessageButtons:
    type: object
    required:
      - phone
      - buttons
    anyOf:
      - required: [title]
      - required: [text]
      - required: [caption]
    properties:
      phone:
        type: string
        example: "5511987654321"
      title:
        type: string
        example: "Choose an option"
        description: "Use title or text; without media, title becomes header if different from text"
      text:
        type: string
        example: "Choose an option"
        description: "Main body text; if empty, title is used"
      caption:
        type: string
        example: "Caption shown with media"
      id:
        type: string
        example: "ABCDABCD1234"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      mode:
        type: string
        enum: [interactive, buttons]
        example: "buttons"
        description: "interactive (NativeFlow) or buttons (ButtonsMessage). Default: buttons"
      footer:
        type: string
        example: "Optional footer"
      header:
        type: string
        example: "Simple header"
      image:
        type: string
        example: "https://example.com/photo.jpg"
      video:
        type: string
        example: "https://example.com/video.mp4"
      mimeType:
        type: string
        example: "image/jpeg"
      fileName:
        type: string
        example: "photo.jpg"
      contextInfo:
        $ref: '#/definitions/ContextInfo'
      buttons:
        type: array
        description: "Up to 3 buttons. If buttonId is omitted, it is generated automatically."
        items:
          type: object
          properties:
            buttonId:
              type: string
              example: "opt1"
            buttonText:
              type: string
              example: "Option 1"
            type:
              type: string
              enum: [quickReply, url, call, copy]
              example: "quickReply"
              description: "For NativeFlow: quickReply (default), url, call, or copy"
            url:
              type: string
              example: "https://example.com"
            phoneNumber:
              type: string
              example: "+5511987654321"
            copyCode:
              type: string
              example: "1234"
            copyCodeText:
              type: string
              description: "Text shown for the copy button (alias for display_text)"
              example: "Copy Code"

  MessageTemplateCloudAPI:
    type: object
    description: |
      Cloud API template message payload. **Requires pre-approved WhatsApp Business template.**
      Supports two formats: flat (templateName/languageCode at root) or nested (template object).

      The recipient can be specified as `phone` or `to` (Meta Cloud API native field — both are equivalent).

      ## Numeric placeholders (positional)
      Templates with `{{1}}`, `{{2}}`, … use positional parameters:
      ```json
      {
        "components": [
          {
            "type": "body",
            "parameters": [
              { "type": "text", "text": "João" },
              { "type": "text", "text": "PED-123" }
            ]
          }
        ]
      }
      ```

      ## Named placeholders
      Templates with `{{nome_paciente}}`, `{{agendamento}}`, … require `parameter_name`
      matching the placeholder name exactly:
      ```json
      {
        "components": [
          {
            "type": "body",
            "parameters": [
              { "type": "text", "parameter_name": "nome_paciente", "text": "Larissa" },
              { "type": "text", "parameter_name": "agendamento", "text": "dia 12/04 às 14:00" }
            ]
          }
        ]
      }
      ```

      ## Header image
      ```json
      {
        "components": [
          {
            "type": "header",
            "parameters": [
              { "type": "image", "image": { "link": "https://example.com/banner.jpg" } }
            ]
          }
        ]
      }
      ```

      ## URL button variable
      ```json
      {
        "components": [
          {
            "type": "button",
            "sub_type": "url",
            "index": "0",
            "parameters": [
              { "type": "text", "text": "abc123" }
            ]
          }
        ]
      }
      ```
    properties:
      phone:
        type: string
        description: "Destination phone number (alias: `to`)"
        example: "5511987654321"
      to:
        type: string
        description: "Destination phone number — Meta Cloud API native field, equivalent to `phone`"
        example: "5511987654321"
      templateName:
        type: string
        description: "Name of the pre-approved template (flat format)"
        example: "order_update"
      languageCode:
        type: string
        description: "Template language code (flat format)"
        example: "pt_BR"
      components:
        type: array
        description: "Template components with parameters (flat format)"
        items:
          $ref: '#/definitions/TemplateComponent'
      template:
        type: object
        description: "Template configuration (nested format, alternative to flat)"
        properties:
          name:
            type: string
            description: "Name of the pre-approved template"
            example: "order_confirmation"
          language:
            type: object
            properties:
              code:
                type: string
                description: "Language code (e.g., pt_BR, en_US, es_LATAM)"
                example: "pt_BR"
          components:
            type: array
            description: "Template components with parameters"
            items:
              $ref: '#/definitions/TemplateComponent'
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "TPL-123"
      stanzaId:
        type: string
        description: "Message ID to reply to (quote)"
        example: "3EB0123456789"

  TemplatesListResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              templates:
                type: array
                items:
                  $ref: '#/definitions/ApprovedTemplateInfo'

  ApprovedTemplateInfo:
    type: object
    properties:
      name:
        type: string
        description: "Approved template name"
        example: "order_update"
      language:
        type: string
        description: "Template language code"
        example: "pt_BR"
      status:
        type: string
        description: "Approval status returned by Meta"
        example: "APPROVED"
      components:
        type: array
        description: "Raw approved component definitions returned by Meta"
        items:
          $ref: '#/definitions/ApprovedTemplateComponent'
      variables:
        type: array
        description: |
          Inferred variable groups derived from the approved template definition.

          This metadata helps clients know where they can inject parameters when calling
          `/chat/send/template`.
        items:
          $ref: '#/definitions/TemplateVariableGroup'

  ApprovedTemplateComponent:
    type: object
    description: |
      Raw component definition returned by Meta for an approved template.

      Common values:
      - `HEADER`
      - `BODY`
      - `FOOTER`
      - `BUTTONS`
    properties:
      type:
        type: string
        description: "Component type as returned by Meta"
        example: "BODY"
      text:
        type: string
        description: "Component text when applicable"
        example: "Olá {{1}}, seu pedido {{2}} foi enviado."
      format:
        type: string
        description: "Header format when applicable"
        example: "IMAGE"
      buttons:
        type: array
        description: "Button definitions for `BUTTONS` components"
        items:
          $ref: '#/definitions/ApprovedTemplateButton'

  ApprovedTemplateButton:
    type: object
    properties:
      type:
        type: string
        description: "Button type as returned by Meta"
        example: "URL"
      text:
        type: string
        description: "Button label"
        example: "Rastrear pedido"
      phone_number:
        type: string
        description: "Phone number for call buttons"
        example: "551140028922"
      url:
        type: string
        description: "Dynamic URL for URL buttons, including placeholders when present"
        example: "https://example.com/orders/{{1}}"

  TemplateVariableGroup:
    type: object
    description: |
      Inferred variable metadata for an approved template component.

      Use this structure to decide which `components[].parameters` must be sent to
      `/chat/send/template`.
    properties:
      component:
        type: string
        enum: [HEADER, BODY, BUTTON]
        description: "Logical component that accepts variables"
        example: "BODY"
      format:
        type: string
        description: "Format for header/body groups when relevant"
        example: "TEXT"
      subType:
        type: string
        description: "Button subtype for button groups"
        example: "url"
      buttonIndex:
        type: integer
        description: "0-based button index to use as `components[].index` when sending"
        example: 0
      label:
        type: string
        description: "Human-readable label for button groups"
        example: "Rastrear pedido"
      source:
        type: string
        description: "Where the variable inference came from"
        enum: [text, media, url]
        example: "text"
      slots:
        type: array
        description: "Ordered slots that must be filled when sending the template"
        items:
          $ref: '#/definitions/TemplateVariableSlot'

  TemplateVariableSlot:
    type: object
    description: |
      One inferred variable slot from an approved template.

      For text placeholders, `index` matches the placeholder number such as `{{1}}`.
      For header media, the slot usually represents the single required media parameter.
    properties:
      index:
        type: integer
        description: "Placeholder or slot index"
        example: 1
      placeholder:
        type: string
        description: "Original placeholder when applicable"
        example: "{{1}}"
      parameterType:
        type: string
        description: "Parameter type expected in `/chat/send/template`"
        enum: [text, image, video, document]
        example: "text"
      required:
        type: boolean
        description: "Whether the parameter is required"
        example: true

  TemplateComponent:
    type: object
    description: |
      Template component for Cloud API.

      Supported component types in this API:
      - `header`: usually media parameters like `image`, `video`, or `document`
      - `body`: text placeholders such as `{{1}}`, `{{2}}`
      - `button`: button variables for URL, quick reply, copy code, flow, etc.

      The `parameters` array must follow the order expected by the approved template.
    properties:
      type:
        type: string
        enum: [header, body, button]
        description: "Component type"
        example: "body"
      sub_type:
        type: string
        enum: [url, quick_reply, phone_number, copy_code, flow]
        description: "Button sub-type (only for type=button)"
        example: "url"
      index:
        type: string
        description: "Button index (only for type=button, 0-based)"
        example: "0"
      parameters:
        type: array
        description: |
          Parameters to fill template placeholders for this component.

          Examples:
          - `body` with `Olá {{1}}, pedido {{2}}` → send two text parameters in this order
          - `header` media → usually send one `image`, `video`, or `document` parameter
          - `button` URL → send the variable expected by the button at the given `index`
        items:
          $ref: '#/definitions/TemplateParameter'

  TemplateParameter:
    type: object
    description: |
      Parameter for a template placeholder.

      The valid shape depends on `type`:
      - `text`: use `text`. For named placeholders (e.g. `{{nome_paciente}}`), also include `parameter_name`.
      - `image`: use `image.link`
      - `video`: use `video.link`
      - `document`: use `document.link` and optionally `document.filename`
      - `payload`: use `payload` for quick reply button payloads

      **Named vs numeric placeholders:**
      Templates with numeric placeholders (`{{1}}`, `{{2}}`, …) use positional parameters.
      Templates with named placeholders (`{{nome_paciente}}`, `{{agendamento}}`, …) require
      `parameter_name` matching the placeholder name, in addition to `text`.
    properties:
      type:
        type: string
        enum: [text, image, video, document, payload, currency, date_time]
        description: "Parameter type"
        example: "text"
      parameter_name:
        type: string
        description: |
          For templates with named placeholders (e.g. `{{nome_paciente}}`), this field
          must match the placeholder name exactly. Omit for numeric placeholders (`{{1}}`).
        example: "nome_paciente"
      text:
        type: string
        description: "Text value (for type=text)"
        example: "João"
      payload:
        type: string
        description: "Button payload (for quick_reply buttons)"
        example: "CONFIRM_ORDER"
      image:
        type: object
        description: "Image parameters (for type=image)"
        properties:
          link:
            type: string
            example: "https://example.com/image.jpg"
      video:
        type: object
        description: "Video parameters (for type=video)"
        properties:
          link:
            type: string
            example: "https://example.com/video.mp4"
      document:
        type: object
        description: "Document parameters (for type=document)"
        properties:
          link:
            type: string
            example: "https://example.com/doc.pdf"
          filename:
            type: string
            example: "invoice.pdf"

  MessageText:
    type: object
    required:
      - phone
      - body
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      body:
        type: string
        description: "Text message body"
        example: "How you doin"
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode. In normal mode, replies use `contextInfo.stanzaId` together with `contextInfo.participant`."
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      delay:
        oneOf:
          - type: integer
            minimum: 0
          - type: boolean
        description: "Delay to simulate typing (ms, true for auto, or false)"
        example: 2000
      linkPreview:
        type: boolean
        description: "Enable automatic link preview (default false)"
        example: false
      mentionAll:
        type: boolean
        description: "Mention all group members (groups only, default false)"
        example: false
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      body: "How you doin"
      id: "ABCDABCD1234"
      delay: true
      linkPreview: false
      mentionAll: false
      check: true
      noEcho: false
      contextInfo:
        stanzaId: "3EB06F9067F80BAB89FF"
        participant: "5511987654321@s.whatsapp.net"
        mentionedJid:
          - "5511987654321@s.whatsapp.net"
        isForwarded: true
        forwardingScore: 1

  MessageImage:
    type: object
    required:
      - phone
      - image
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      image:
        type: string
        description: "Image content (data URL/base64/raw base64/HTTPS URL)"
        example: "https://cdn.example.com/img/photo.jpg"
      caption:
        type: string
        description: "Optional caption for the image"
        example: "Photo caption"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      fileName:
        type: string
        description: "File name (used when image is sent as document)"
        example: "photo.jpg"
      mimeType:
        type: string
        description: "Force MIME type (e.g. image/png, image/jpeg)"
        example: "image/jpeg"
      imageQualityHD:
        type: boolean
        description: "Override HD quality for this message (`true` HD, `false` standard). If omitted, uses IMAGE_QUALITY_HD"
        example: false
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      mentionAll:
        type: boolean
        description: "Mention all group participants"
        example: false
      viewOnce:
        type: boolean
        description: "Send as view-once"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      image: "https://cdn.example.com/img/photo.jpg"
      caption: "Campaign photo"
      mimeType: "image/jpeg"
      imageQualityHD: false
      mentionAll: false
      check: true
      noEcho: false
      contextInfo:
        stanzaId: "3EB06F9067F80BAB89FF"
        participant: "5511987654321@s.whatsapp.net"
        isForwarded: true
        forwardingScore: 1

  MessageAudio:
    type: object
    required:
      - phone
      - audio
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      audio:
        type: string
        description: |
          Audio content. Accepts:
          - Base64 data URL (data:audio/[format];base64,...)
          - Raw base64 (no prefix)
          - Direct HTTPS URL (server downloads and validates)
        example: "https://example.com/audio.mp3"
      caption:
        type: string
        description: "Caption used only if audio is sent as document"
        example: "Important audio message"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      id:
        type: string
        example: "ABCDABCD1234"
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      mentionAll:
        type: boolean
        description: "Mention all group members"
        example: false
      ptt:
        type: boolean
        description: "Force voice message conversion (OGG/Opus)"
        example: true
      delay:
        oneOf:
          - type: integer
            minimum: 0
            maximum: 300000
          - type: boolean
        description: "Delay before sending audio (ms, true to use duration, or false)"
        example: 3000
      viewOnce:
        type: boolean
        description: "Send as view-once (only works when ptt=true)"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      audio: "https://example.com/audio.mp3"
      ptt: true
      delay: true
      check: true
      mentionAll: false
      noEcho: false
      contextInfo:
        stanzaId: "3EB06F9067F80BAB89FF"
        participant: "5511987654321@s.whatsapp.net"
        isForwarded: true
        forwardingScore: 1

  MessageVideo:
    type: object
    required:
      - phone
      - video
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      video:
        type: string
        description: "Video content (data URL/base64/raw base64/HTTPS URL)"
        example: "https://videos.example.com/demo.mp4"
      caption:
        type: string
        description: "Optional caption for the video"
        example: "Campaign video"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      fileName:
        type: string
        description: "File name (used when video is sent as document)"
        example: "campaign.mp4"
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      jpegThumbnail:
        type: string
        description: "Base64 thumbnail override"
        example: "AA00D010"
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      mentionAll:
        type: boolean
        description: "Mention all group participants"
        example: false
      viewOnce:
        type: boolean
        description: "Send as view-once"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      video: "https://videos.example.com/demo.mp4"
      caption: "Campaign video"
      mentionAll: false
      check: true
      noEcho: false
      contextInfo:
        stanzaId: "3EB06F9067F80BAB89FF"
        participant: "5511987654321@s.whatsapp.net"
        isForwarded: true
        forwardingScore: 1

  MessageSticker:
    type: object
    required:
      - phone
      - sticker
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      sticker:
        type: string
        description: "Sticker content (data URL/base64/raw base64/HTTPS URL)"
        example: "data:image/webp;base64,iVBORw0"
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      mimeType:
        type: string
        description: "Force MIME type (e.g. image/webp)"
        example: "image/webp"
      pngThumbnail:
        type: string
        description: "Optional PNG thumbnail in base64"
        example: "AA00D010"
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      mentionAll:
        type: boolean
        description: "Mention all group participants"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      sticker: "data:image/webp;base64,iVBORw0..."
      id: "ABCDABCD1234"
      check: true
      noEcho: false
      contextInfo:
        stanzaId: "3EB06F9067F80BAB89FF"
        participant: "5511987654321@s.whatsapp.net"
        isForwarded: true
        forwardingScore: 1

  MessageDocument:
    type: object
    required:
      - phone
      - document
    properties:
      phone:
        type: string
        description: "Destination phone number or JID"
        example: "5511987654321"
      document:
        type: string
        description: "Document content (data URL/base64/raw base64/HTTPS URL)"
        example: "https://storage.example.com/docs/report.pdf"
      fileName:
        type: string
        description: "File name (required for base64/raw payloads)"
        example: "report.pdf"
      caption:
        type: string
        description: "Optional caption for the document"
        example: "Monthly report"
      stanzaId:
        type: string
        description: "Reply target in Cloud API mode"
        example: "wamid.HBgLNTUxMTk4NzY1NDMyMRUCABIYFjNFQjBEMzZBNkQ4MDhGMkFFQTVCNEEA"
      id:
        type: string
        description: "Custom message ID (auto-generated if omitted)"
        example: "ABCDABCD1234"
      mentionAll:
        type: boolean
        description: "Mention all group members"
        example: false
      check:
        type: boolean
        description: "Validate JID via IsOnWhatsApp before sending (default false)"
        example: false
      noEcho:
        type: boolean
        description: "If true, suppresses the synthetic CRM event for this message (default false)"
        example: false
      mimeType:
        type: string
        description: "Force MIME type (e.g. application/pdf)"
        example: "application/pdf"
      contextInfo:
        $ref: '#/definitions/ContextInfo'
    example:
      phone: "5511987654321"
      document: "https://storage.example.com/docs/report.pdf"
      fileName: "report.pdf"
      caption: "Monthly report"
      mentionAll: false
      check: true
      noEcho: false
      contextInfo:
        isForwarded: true
        forwardingScore: 1

  PaidTrafficLeadsResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/PaidTrafficLeadsData'

  PaidTrafficLeadsData:
    type: object
    properties:
      items:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficLead'
      total:
        type: integer
        description: Total number of matching records before pagination.
      limit:
        type: integer
        description: Applied page size.
      offset:
        type: integer
        description: Applied pagination offset.
      hasMore:
        type: boolean
        description: Whether there are more rows after the current page.

  PaidTrafficLead:
    type: object
    properties:
      messageId:
        type: string
        description: WhatsApp message ID used as the lead identifier in paid traffic endpoints.
      userId:
        type: string
        description: Authenticated user/instance owner ID.
      chatJid:
        type: string
        description: Chat JID where the lead message was received.
      senderJid:
        type: string
        description: Sender JID when available.
      senderLid:
        type: string
        description: WhatsApp LID identifier when available.
      senderPhone:
        type: string
        description: Normalized phone number extracted from the lead event.
      pushName:
        type: string
        description: Push name observed on the incoming message.
      messageText:
        type: string
        description: Extracted text body from the lead message.
      messageTimestamp:
        type: string
        format: date-time
        description: Timestamp of the original WhatsApp message in UTC.
      adTitle:
        type: string
        description: Ad title extracted directly from the referral payload.
      adBody:
        type: string
        description: Ad body extracted directly from the referral payload.
      adSourceApp:
        type: string
        description: Origin app reported by WhatsApp referral metadata, usually `facebook` or `instagram`.
      adId:
        type: string
        description: Ad identifier (`ad_source_id`) used for Graph API enrichment and cost syncing.
      adSourceUrl:
        type: string
        description: Original referral URL if provided by WhatsApp/Meta.
      adSourceType:
        type: string
        description: Source type from the referral payload.
      adMediaUrl:
        type: string
        description: Media URL associated with the ad.
      adOriginalImageUrl:
        type: string
        description: Original image URL associated with the ad.
      adThumbnailUrl:
        type: string
        description: Thumbnail URL associated with the ad.
      adCtwaClid:
        type: string
        description: Click-to-WhatsApp CLID required for Meta conversion attribution.
      adThumbnailMime:
        type: string
        description: MIME type of the stored thumbnail.
      adThumbnailBase64:
        type: string
        description: Thumbnail content stored as base64.
      adName:
        type: string
        description: Creative/ad name retrieved from Graph API enrichment.
      adSetId:
        type: string
        description: Ad set ID retrieved from Graph API enrichment.
      adSetName:
        type: string
        description: Ad set name retrieved from Graph API enrichment.
      campaignId:
        type: string
        description: Campaign ID retrieved from Graph API enrichment.
      campaignName:
        type: string
        description: Campaign name retrieved from Graph API enrichment.
      adGraphEnrichedAt:
        type: string
        format: date-time
        description: UTC timestamp when Graph API enrichment last succeeded.
      adGraphError:
        type: string
        description: Last enrichment error message, if any.
      createdAt:
        type: string
        format: date-time
        description: Record creation timestamp in UTC.

  PaidTrafficStatsResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/PaidTrafficStats'

  PaidTrafficStats:
    type: object
    properties:
      total:
        type: integer
        description: Total number of captured paid traffic leads for the authenticated user.
      today:
        type: integer
        description: Leads captured since UTC start of day.
      thisWeek:
        type: integer
        description: Leads captured since the selected week start.
      thisMonth:
        type: integer
        description: Leads captured since UTC start of month.
      weekStart:
        type: string
        description: Week start mode used by the backend (`sunday` or `monday`).
      sourceBreakdown:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficSourceBreakdown'
      periodLabel:
        type: string
        description: Active analytics period (`today`, `7d`, `30d` or `custom`).
      periodFrom:
        type: string
        format: date
        description: Inclusive UTC start date of the active analytics period.
      periodTo:
        type: string
        format: date
        description: Inclusive UTC end date of the active analytics period.
      periodTotal:
        type: integer
        description: Total leads in the active analytics period.
      previousPeriodTotal:
        type: integer
        description: Total leads in the immediately previous comparison period.
      growthRate:
        type: number
        format: double
        description: Relative variation between the current period and the previous period, in percent.
      enrichment:
        $ref: '#/definitions/PaidTrafficEnrichmentSummary'
      leadsWithConversion:
        type: integer
        description: Number of distinct leads in the period with at least one successful conversion event.
      conversionRate:
        type: number
        format: double
        description: Percentage of leads in the period with at least one successful conversion event.
      totalConversionValue:
        type: number
        format: double
        description: Sum of successful conversion values in the period.
      conversionsFailed:
        type: integer
        description: Number of failed conversion event attempts in the period.
      daily:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficDailyLeadCount'
      topCampaigns:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficCampaignStat'
      topAdsets:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficAdsetStat'
      topCreatives:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficCreativeStat'
      conversionsByType:
        type: array
        items:
          $ref: '#/definitions/PaidTrafficConversionTypeStat'
      costs:
        $ref: '#/definitions/PaidTrafficCostSummary'

  PaidTrafficSourceBreakdown:
    type: object
    properties:
      sourceApp:
        type: string
      count:
        type: integer
      percentage:
        type: number
        format: double

  PaidTrafficDailyLeadCount:
    type: object
    properties:
      date:
        type: string
        format: date
      count:
        type: integer

  PaidTrafficEnrichmentSummary:
    type: object
    properties:
      enriched:
        type: integer
      pending:
        type: integer
      error:
        type: integer
      enrichmentRate:
        type: number
        format: double

  PaidTrafficCampaignStat:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      count:
        type: integer
      conversions:
        type: integer
      conversionRate:
        type: number
        format: double
      totalValue:
        type: number
        format: double
      spend:
        type: number
        format: double
      spendWithConversion:
        type: number
        format: double
      spendWithoutConversion:
        type: number
        format: double
      roas:
        type: number
        format: double
      roi:
        type: number
        format: double

  PaidTrafficAdsetStat:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      campaignId:
        type: string
      campaignName:
        type: string
      count:
        type: integer
      conversions:
        type: integer
      totalValue:
        type: number
        format: double
      spend:
        type: number
        format: double
      spendWithConversion:
        type: number
        format: double
      spendWithoutConversion:
        type: number
        format: double
      roas:
        type: number
        format: double
      roi:
        type: number
        format: double

  PaidTrafficCreativeStat:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      campaignId:
        type: string
      campaignName:
        type: string
      adsetId:
        type: string
      adsetName:
        type: string
      count:
        type: integer
      convertedLeads:
        type: integer
      conversions:
        type: integer
      totalValue:
        type: number
        format: double
      spend:
        type: number
        format: double
      spendWithoutConversion:
        type: number
        format: double
      impressions:
        type: integer
        format: int64
      costPerLead:
        type: number
        format: double
      costPerConversion:
        type: number
        format: double
      conversionRate:
        type: number
        format: double
      roas:
        type: number
        format: double
      roi:
        type: number
        format: double
      lastSyncedAt:
        type: string
        format: date-time

  PaidTrafficConversionTypeStat:
    type: object
    properties:
      eventName:
        type: string
      count:
        type: integer
      totalValue:
        type: number
        format: double

  PaidTrafficCostSummary:
    type: object
    properties:
      totalSpend:
        type: number
        format: double
      spendWithConversion:
        type: number
        format: double
      spendWithoutConversion:
        type: number
        format: double
      roas:
        type: number
        format: double
      roi:
        type: number
        format: double
      costPerLead:
        type: number
        format: double
      costPerConversion:
        type: number
        format: double
      trackedAds:
        type: integer
      adsWithConversion:
        type: integer
      adsWithoutConversion:
        type: integer
      lastSyncedAt:
        type: string
        format: date-time
      syncStatus:
        type: string
        description: Insight sync status. Typical values are `fresh`, `cached`, `partial`, `token_missing` or `no_ads`.
      syncFailures:
        type: integer

  PaidTrafficConfig:
    type: object
    properties:
      userId:
        type: string
      fbGraphAccessToken:
        type: string
        description: Meta Graph API access token used for ad enrichment and cost sync.
      fbPixelId:
        type: string
        description: Meta Pixel ID used for conversion events.
      fbPageId:
        type: string
        description: Meta Page ID sent with conversion payloads when configured.
      displayCurrency:
        type: string
        description: Currency code normalized by the backend. Supported values include `BRL`, `USD`, `EUR`, `GBP`, `MXN`, `ARS`, `COP`, `CLP`, `PEN` and `JPY`.
      autoEnrichEnabled:
        type: boolean
        description: Whether newly captured leads should be enriched asynchronously through Graph API.
      leadsOnlyMode:
        type: boolean
        description: Dashboard display mode focused on lead-generation metrics instead of sales metrics.
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time
      setupChatwootCAPI:
        type: boolean
        description: Transient write-only flag that asks the backend to run Chatwoot CAPI setup after saving.

  PaidTrafficConfigResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/PaidTrafficConfig'

  PaidTrafficConfigSaveRequest:
    type: object
    properties:
      fbGraphAccessToken:
        type: string
      fbPixelId:
        type: string
      fbPageId:
        type: string
      displayCurrency:
        type: string
      autoEnrichEnabled:
        type: boolean
      leadsOnlyMode:
        type: boolean
      setupChatwootCAPI:
        type: boolean

  PaidTrafficConfigSaveResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              config:
                $ref: '#/definitions/PaidTrafficConfig'
              capiSetup:
                type: object
                description: Present only when `setupChatwootCAPI=true` and Chatwoot provisioning was attempted.

  PaidTrafficEnrichmentResult:
    type: object
    properties:
      adId:
        type: string
        nullable: true
      adName:
        type: string
        nullable: true
      adSetId:
        type: string
        nullable: true
      adSetName:
        type: string
        nullable: true
      campaignId:
        type: string
        nullable: true
      campaignName:
        type: string
        nullable: true
      enrichedAt:
        type: string
        format: date-time
        nullable: true
      enrichError:
        type: string
        nullable: true

  PaidTrafficEnrichmentResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/definitions/PaidTrafficEnrichmentResult'

  SendConversionRequest:
    type: object
    required:
      - eventName
      - eventTime
      - userData
    properties:
      eventName:
        type: string
        enum: [LeadSubmitted, Purchase, InitiateCheckout, AddToCart, ViewContent, OrderCreated, OrderShipped, OrderDelivered, OrderCanceled, OrderReturned, CartAbandoned, QualifiedLead, RatingProvided, ReviewProvided]
      eventTime:
        type: integer
        format: int64
        description: Unix timestamp in seconds.
      currency:
        type: string
        description: Required when `eventName=Purchase`.
      value:
        type: number
        format: double
        description: Required and must be greater than zero when `eventName=Purchase`.
      userData:
        type: object
        description: Clear-text user-data fields. The backend normalizes and hashes these fields before sending to Meta.
        properties:
          email:
            type: string
          phone:
            type: string
          firstName:
            type: string
          lastName:
            type: string
          dateOfBirth:
            type: string
          city:
            type: string
          state:
            type: string
          zipCode:
            type: string
          country:
            type: string
        additionalProperties:
          type: string
      saveCache:
        type: boolean
        description: When true, persists normalized clear-text and hash fields into `user_data_cache`.

  ConversionEvent:
    type: object
    properties:
      id:
        type: string
      userId:
        type: string
      leadMessageId:
        type: string
      eventName:
        type: string
      eventTime:
        type: integer
        format: int64
      fbEventId:
        type: string
      fbPixelId:
        type: string
      fbPageId:
        type: string
      ctwaClid:
        type: string
      phoneHash:
        type: string
      emailHash:
        type: string
      fnHash:
        type: string
      lnHash:
        type: string
      dbHash:
        type: string
      ctHash:
        type: string
      stHash:
        type: string
      zpHash:
        type: string
      countryHash:
        type: string
      currency:
        type: string
      value:
        type: number
        format: double
      fbResponse:
        type: string
      fbTraceId:
        type: string
      sentAt:
        type: string
        format: date-time
      status:
        type: string
        description: Delivery status recorded by the backend (`pending`, `success` or `failed`).
      errorMessage:
        type: string
      createdAt:
        type: string
        format: date-time
      adCampaignName:
        type: string
      adAdsetName:
        type: string
      adName:
        type: string

  SendConversionResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              success:
                type: boolean
                description: Result of the Meta delivery attempt inside the successful HTTP response.
              isDuplicate:
                type: boolean
                description: Whether a successful event with the same name already existed for this lead.
              event:
                $ref: '#/definitions/ConversionEvent'
              error:
                type: string

  ConversionHistoryResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              events:
                type: array
                items:
                  $ref: '#/definitions/ConversionEvent'
              total:
                type: integer

  ConversionEventListResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              events:
                type: array
                items:
                  $ref: '#/definitions/ConversionEvent'
              total:
                type: integer

  TestConversionResponse:
    allOf:
      - $ref: '#/definitions/SuccessResponse'
      - type: object
        properties:
          data:
            type: object
            properties:
              success:
                type: boolean
              message:
                type: string
              fbTraceId:
                type: string

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: token
      description: "Token do usuário (definido na tabela users do banco de dados)"
    AdminAuth:
      type: apiKey
      in: header
      name: Authorization
      description: "Token de administrador (definido em .env como ADMIN_TOKEN)"

security:
  - ApiKeyAuth: []
