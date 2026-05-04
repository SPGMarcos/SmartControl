# SmartControl no GitHub Pages

## 1. Supabase

No Supabase, copie:

- Project URL
- anon public key
- service_role key

Execute no SQL Editor:

```text
SmartControl-main/supabase/smartcontrol_iot_schema.sql
```

Em Authentication > URL Configuration:

```text
Site URL:
https://spgmarcos.github.io/SmartControl/

Redirect URLs:
https://spgmarcos.github.io/SmartControl/login?reset_password=true
```

## 2. Backend no Render

Crie um Web Service:

```text
Repository: SPGMarcos/SmartControl
Root Directory: SmartControl-main/backend
Build Command: npm install
Start Command: npm start
```

Variaveis no Render:

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
MQTT_URL=mqtts://ff967c06.ala.us-east-1.emqxsl.com:8883
MQTT_USERNAME=smartcontrol-backend
MQTT_PASSWORD=SENHA_DO_BACKEND_NO_EMQX
MQTT_CLIENT_ID=smartcontrol-backend
MQTT_STATUS_TOPICS=smartcontrol/+/+/+/status,smartcontrol/+/+/+/telemetry,smartcontrol/+/+/+/heartbeat,smartcontrol/+/+/+/ack,smartcontrol/+/+/+/availability,smartcontrol/+/+/+/config
MQTT_REJECT_UNAUTHORIZED=true
MQTT_REQUIRE_DEVICE_TOKEN=false
CORS_ORIGIN=https://spgmarcos.github.io
REQUIRE_AUTH=true
PORT=4000
```

Teste:

```text
https://SEU_BACKEND.onrender.com/health
```

Precisa retornar `mqtt_connected: true`.

## 3. GitHub Secrets

No GitHub:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Crie:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_BACKEND_URL
```

Valores:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_PUBLIC_KEY
VITE_BACKEND_URL=https://SEU_BACKEND.onrender.com
```

## 4. GitHub Pages

No GitHub:

```text
Settings > Pages
Source: GitHub Actions
```

Depois faca push na branch `main`.

O workflow esta em:

```text
.github/workflows/deploy.yml
```

URL final:

```text
https://spgmarcos.github.io/SmartControl/
```

## 5. Teste final

1. Abra `https://spgmarcos.github.io/SmartControl/`.
2. Crie/login na conta.
3. Cadastre o dispositivo:
   - ID: `hidroponia01`
   - MAC: `A0:DD:6C:98:27:C8`
   - Broker: `mqtts://ff967c06.ala.us-east-1.emqxsl.com:8883`
   - Topico: `smartcontrol/marcos/hidroponia/hidroponia01`
4. Abra o dispositivo no dashboard.
5. Clique em sincronizar status.
