# Arquitetura SmartControl em producao gratuita

Atualizado em 2026-05-04.

## Visao geral

Fluxo real implementado:

```text
Heltec ESP32 LoRa V2 - hidroponia
  -> MQTT Cloud Broker
  -> Backend Node.js no Render
  -> Supabase Auth + Postgres + Realtime
  -> Dashboard React/Vite no GitHub Pages
```

O firmware continua local-first. A dashboard embarcada, `/status`, `/set`, `/settings`, WiFiManager, OTA, OLED, LittleFS, mDNS e automacao local nao foram removidos. A nuvem entra como uma camada adicional para comando remoto e telemetria.

## Estrutura atual do repositorio

O projeto React/Vite esta hoje em `SmartControl-main/`. Para evitar uma migracao grande e arriscada de pastas, o workflow de GitHub Pages foi colocado na raiz do repositorio e compila `SmartControl-main` diretamente.

Arquivos principais:

- Frontend: `SmartControl-main/src`
- Backend: `SmartControl-main/backend`
- Schema Supabase: `SmartControl-main/supabase/smartcontrol_iot_schema.sql`
- Firmware repo: `SmartControl-main/firmware/hidroponia/hidroponia_heltec.ino`
- Firmware de trabalho local: `Fimware/Painel_hidroponia_V5/Painel_hidroponia_V5.ino`
- Workflow GitHub Pages: `.github/workflows/deploy.yml`

## Frontend no GitHub Pages

Configuracao feita:

- `vite.config.js` usa `VITE_BASE_PATH`, depois o nome do repositorio no GitHub Actions, e por fim `/SmartControl/`.
- `npm run build` gera `dist/index.html` e `dist/404.html`.
- `404.html` evita erro em refresh de rotas como `/SmartControl/dashboard`.
- O workflow usa `actions/upload-pages-artifact` e `actions/deploy-pages`.

No GitHub:

1. Repository Settings -> Pages.
2. Source: `GitHub Actions`.
3. Actions secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL`
4. Push na branch `main`.

URL esperada:

```text
https://SEU_USUARIO.github.io/SmartControl/
```

Se o nome do repositorio mudar, o workflow ajusta `VITE_BASE_PATH` automaticamente.

## Backend no Render Free

Use Render como caminho recomendado sem custo inicial. Railway pode servir para testes, mas em 2026 o plano gratuito/credito varia por conta; para "sem gastar", Render e mais previsivel.

Render:

1. New -> Web Service.
2. Conectar o repositorio GitHub.
3. Root Directory: `SmartControl-main/backend`
4. Runtime: Node.
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Instance Type: Free.

Variaveis:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
MQTT_URL=mqtts://seu-broker:8883
MQTT_USERNAME=smartcontrol-backend
MQTT_PASSWORD=senha-forte-backend
MQTT_CLIENT_ID=smartcontrol-backend
MQTT_STATUS_TOPICS=smartcontrol/+/+/+/status,smartcontrol/+/+/+/telemetry,smartcontrol/+/+/+/heartbeat,smartcontrol/+/+/+/ack,smartcontrol/+/+/+/availability,smartcontrol/+/+/+/config,smartcontrol/pairing/+/announce
MQTT_REJECT_UNAUTHORIZED=true
MQTT_REQUIRE_DEVICE_TOKEN=false
CORS_ORIGIN=https://SEU_USUARIO.github.io
REQUIRE_AUTH=true
PORT=4000
```

Depois do deploy, teste:

```text
https://SEU_BACKEND.onrender.com/health
```

Observacao: Render Free dorme apos inatividade. O primeiro comando depois de um tempo pode demorar cerca de um minuto.

## Supabase Free

1. Criar projeto no Supabase.
2. SQL Editor -> executar `SmartControl-main/supabase/smartcontrol_iot_schema.sql`.
3. Authentication -> URL Configuration:
   - Site URL: `https://SEU_USUARIO.github.io/SmartControl/`
   - Redirect URL: `https://SEU_USUARIO.github.io/SmartControl/login?reset_password=true`
4. Settings -> API:
   - Frontend usa `Project URL` e `anon public`.
   - Backend usa `service_role`, nunca no frontend.

Tabelas criadas:

- `projects`
- `devices`
- `sensors`
- `logs`

RLS fica ativa. Usuarios so acessam seus proprios projetos, dispositivos, sensores e logs.

## MQTT Cloud gratuito

Opcao A recomendada: EMQX Cloud Serverless

1. Criar deployment Serverless.
2. Definir spend limit `0`, quando disponivel, para consumir apenas a quota gratuita.
3. Criar credencial para o backend:
   - usuario: `smartcontrol-backend`
   - permissao: subscribe/publish em `smartcontrol/#`
4. Criar credencial para o dispositivo:
   - usuario: `hidroponia01`
   - permissao publish:
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/status`
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/heartbeat`
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/ack`
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/availability`
   - permissao subscribe:
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/cmd`
     - `smartcontrol/CLIENTE/PROJETO/hidroponia01/config`
5. Usar MQTT TLS na porta `8883`.

Opcao B: HiveMQ Cloud

O site oficial da HiveMQ em 2026 mostra planos fully-managed pagos e um link "Start Free". Use HiveMQ apenas se, dentro do console, aparecer um cluster gratuito/trial suficiente para seus testes sem cartao ou sem cobranca. As ACLs e credenciais sao equivalentes ao modelo acima.

Topico base oficial:

```text
smartcontrol/{cliente}/{projeto}/hidroponia01
```

Topicos derivados:

```text
smartcontrol/{cliente}/{projeto}/hidroponia01/cmd
smartcontrol/{cliente}/{projeto}/hidroponia01/status
smartcontrol/{cliente}/{projeto}/hidroponia01/config
smartcontrol/{cliente}/{projeto}/hidroponia01/heartbeat
smartcontrol/{cliente}/{projeto}/hidroponia01/ack
smartcontrol/{cliente}/{projeto}/hidroponia01/availability
```

## Firmware Heltec

Bibliotecas usadas:

- `WiFiManager`
- `PubSubClient`
- `ArduinoJson`
- `LittleFS`
- `ArduinoOTA`
- `ESPmDNS`
- `U8g2`

Configure no painel local:

```text
http://smarthidroponia.local/settings
```

Campos:

- Broker MQTT: `mqtts://SEU_CLUSTER:8883`
- Usuario: usuario MQTT do dispositivo
- Senha: senha MQTT do dispositivo
- Topico base: `smartcontrol/CLIENTE/PROJETO/hidroponia01`
- ID do dispositivo: `hidroponia01`
- Token: o mesmo cadastrado no SmartControl, opcional no primeiro teste

Depois de salvar, o ESP32 reinicia, conecta ao broker, assina `cmd` e `config`, publica `availability=online`, publica `status` e envia `heartbeat` a cada 15 segundos.

## Cadastro do dispositivo

No dashboard:

1. Adicionar dispositivo.
2. Hardware: `Heltec ESP32 LoRa - Hidroponia SmartControl`.
3. Tipo: `Hidroponia inteligente`.
4. ID: `hidroponia01`.
5. Projeto: `Hidroponia inteligente`.
6. Broker MQTT: endpoint do broker.
7. Topico: deixar vazio para gerar automaticamente, ou informar o topico base exato.
8. Copiar o token gerado para o painel local do ESP32 se quiser validar token no backend.

## Teste fim a fim

1. Supabase: executar o schema.
2. Broker: criar credenciais e ACL.
3. Backend: publicar no Render e abrir `/health`.
4. GitHub Pages: configurar secrets e publicar.
5. Dashboard: criar conta, cadastrar `hidroponia01`.
6. ESP32: abrir `/settings`, salvar MQTT e aguardar reinicio.
7. Dashboard: abrir o dispositivo e clicar `Sincronizar status`.
8. Verificar no Supabase:
   - `devices.connection_status = online`
   - `devices.last_state` atualizado
   - `logs` recebendo `mqtt_status`, `mqtt_heartbeat`, `command_sent` e `mqtt_ack`

Teste manual MQTT:

```json
{
  "protocol": "smartcontrol.mqtt.v1",
  "device_id": "hidroponia01",
  "command": "request_status",
  "payload": {}
}
```

Publique em:

```text
smartcontrol/CLIENTE/PROJETO/hidroponia01/cmd
```

O ESP32 deve responder em:

```text
smartcontrol/CLIENTE/PROJETO/hidroponia01/ack
smartcontrol/CLIENTE/PROJETO/hidroponia01/status
```

## Crescimento futuro

Quando sair do teste gratuito:

- Migrar backend para instancia paga sem sleep.
- Trocar `secureWifiClient.setInsecure()` por CA raiz do broker no firmware.
- Ativar `MQTT_REQUIRE_DEVICE_TOKEN=true`.
- Criar credenciais MQTT automaticamente por dispositivo via API do broker.
- Separar definitivamente `frontend/`, `backend/` e `firmware/` se quiser uma estrutura de monorepo mais limpa.
