# SmartControl

Plataforma web para automacao residencial e agricola com frontend React/Vite, backend Node.js, Supabase e MQTT Cloud. Esta versao esta preparada para testes reais gratuitos com o firmware Heltec ESP32 LoRa V2 de hidroponia.

## Arquitetura

```text
ESP32 Heltec LoRa
  -> MQTT Cloud Broker
  -> Backend Node.js
  -> Supabase
  -> Dashboard SmartControl no GitHub Pages
```

Hospedagem inicial recomendada:

- Frontend: GitHub Pages
- Backend: Render Free
- MQTT: EMQX Cloud Serverless com quota gratuita. HiveMQ somente se sua conta ainda mostrar opcao gratuita/trial.
- Banco/Auth: Supabase Free

O guia completo esta em [`docs/arquitetura.md`](docs/arquitetura.md).

## Desenvolvimento local

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Build GitHub Pages:

```bash
npm run build
```

O build gera `dist/index.html` e `dist/404.html` para evitar 404 ao recarregar rotas protegidas no GitHub Pages.

## Variaveis principais

Frontend (`.env`):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
VITE_BACKEND_URL=https://seu-backend.onrender.com
VITE_BASE_PATH=/SmartControl/
```

Backend (`backend/.env`):

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
MQTT_URL=mqtts://seu-broker:8883
MQTT_USERNAME=smartcontrol-backend
MQTT_PASSWORD=senha-forte
CORS_ORIGIN=https://seu-usuario.github.io
REQUIRE_AUTH=true
```

## Firmware hidroponia

Firmware integrado:

- [`firmware/hidroponia/hidroponia_heltec.ino`](firmware/hidroponia/hidroponia_heltec.ino)

Funcionalidades preservadas:

- dashboard HTML local
- bomba no GPIO 2
- oxigenador no GPIO 17
- modo automatico/manual
- temporizador ON/OFF
- WiFiManager
- OTA
- OLED
- LittleFS
- mDNS
- configuracao MQTT local
- reset de fabrica

Camada remota adicionada:

- `mqttClient.setServer()`
- `mqttClient.setCallback()`
- `reconnectMQTT()`
- `publishStatus()`
- assinatura de `cmd` e `config`
- heartbeat
- availability online/offline
- ACK de comandos

Topico base:

```text
smartcontrol/{cliente}/{projeto}/hidroponia01
```

## Schema Supabase

Execute:

```sql
-- SmartControl-main/supabase/smartcontrol_iot_schema.sql
```

Ele cria `projects`, `devices`, `sensors`, `logs`, indices, triggers e politicas RLS.

## Deploy

1. Execute o schema no Supabase.
2. Configure o broker MQTT e ACLs por dispositivo.
3. Publique `backend/` no Render.
4. Configure os secrets do GitHub Pages:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL`
5. Ative GitHub Pages com source `GitHub Actions`.
6. Grave o firmware no Heltec e configure MQTT em `http://smarthidroponia.local/settings`.
