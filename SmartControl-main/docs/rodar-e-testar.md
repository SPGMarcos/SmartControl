# Rodar e testar o SmartControl

## 1. Frontend local

```powershell
cd "C:\Users\Marcos\Desktop\Projetos Finalizados\SmartControl\SmartControl-main"
npm install
npm run build
npm run serve:dist
```

Abra:

```text
http://127.0.0.1:4173/SmartControl/
```

## 2. Backend local

Crie `backend/.env` usando `backend/.env.example`.

```powershell
cd "C:\Users\Marcos\Desktop\Projetos Finalizados\SmartControl\SmartControl-main\backend"
npm install
npm start
```

Teste:

```text
http://localhost:4000/health
```

Precisa retornar `mqtt_connected: true` depois que o broker aceitar as credenciais.

## 3. Banco Supabase

No SQL Editor do Supabase, execute:

```text
SmartControl-main/supabase/smartcontrol_iot_schema.sql
```

Depois crie uma conta pelo site, entre no dashboard e cadastre o dispositivo:

- tipo: `Hidroponia inteligente`
- hardware: `Heltec ESP32 LoRa - Hidroponia SmartControl`
- ID: `hidroponia01`
- topico base: `smartcontrol/cliente/projeto/hidroponia01`

## 4. Firmware

Abra no Arduino IDE:

```text
SmartControl-main/firmware/hidroponia/hidroponia_heltec/hidroponia_heltec.ino
```

Instale bibliotecas:

- `WiFiManager`
- `PubSubClient`
- `ArduinoJson`
- `U8g2`

Placa:

- `Heltec WiFi LoRa 32(V2)`

Depois do upload, configure:

```text
http://smarthidroponia.local/settings
```

MQTT:

```text
Broker: mqtts://SEU_BROKER:8883
Usuario: usuario do dispositivo
Senha: senha do dispositivo
Topico base: smartcontrol/cliente/projeto/hidroponia01
ID: hidroponia01
Token: token copiado do cadastro no SmartControl, opcional no primeiro teste
```

## 5. Teste fim a fim

1. Backend `/health` com `mqtt_connected: true`.
2. ESP32 Serial Monitor com `MQTT SmartControl conectado.`
3. Supabase `devices.last_state` preenchido.
4. Dashboard mostra dispositivo online.
5. Clique `Sincronizar status`.
6. Teste modo automatico, tempo ON/OFF, bomba e oxigenador.

No modo automatico, bomba e oxigenador continuam respeitando a trava local atual. Comando manual de rele e negado enquanto o modo automatico estiver ligado.
