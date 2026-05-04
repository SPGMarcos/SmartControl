# SmartControl Backend

Backend Node.js para ponte MQTT Cloud -> Supabase -> Dashboard.

## Comandos

```bash
npm install
npm start
```

## Endpoints

- `GET /health`
- `GET /api/devices/:id/topics`
- `GET /api/devices/:id/state`
- `GET /api/devices/:id/logs`
- `POST /api/command`
- `POST /api/devices/:id/config`
- `POST /api/devices/:id/request-status`

Em producao, use `REQUIRE_AUTH=true`. O frontend envia o JWT Supabase em `Authorization: Bearer <token>`.

## Variaveis

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
MQTT_URL=mqtts://seu-broker:8883
MQTT_USERNAME=smartcontrol-backend
MQTT_PASSWORD=senha-forte
MQTT_CLIENT_ID=smartcontrol-backend
MQTT_REJECT_UNAUTHORIZED=true
MQTT_REQUIRE_DEVICE_TOKEN=false
CORS_ORIGIN=https://seu-usuario.github.io
REQUIRE_AUTH=true
PORT=4000
```

## MQTT

O backend assina:

```text
smartcontrol/+/+/+/status
smartcontrol/+/+/+/telemetry
smartcontrol/+/+/+/heartbeat
smartcontrol/+/+/+/ack
smartcontrol/+/+/+/availability
smartcontrol/+/+/+/config
```

E publica:

```text
smartcontrol/{cliente}/{projeto}/{device_id}/cmd
smartcontrol/{cliente}/{projeto}/{device_id}/config
```

O modulo de hidroponia aceita `set_auto`, `set_relay`, `set_timers`, `request_status` e `factory_reset`.
