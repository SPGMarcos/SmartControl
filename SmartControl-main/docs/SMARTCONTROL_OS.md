# SmartControl OS - Arquitetura IoT

## Objetivo

O SmartControl OS e a base modular para firmwares, backend e dashboards SmartControl. Ele preserva o funcionamento atual dos dispositivos em producao e cria contratos para crescer com novas classes, hardwares e integracoes externas.

## Contrato do Dispositivo

Todo dispositivo deve publicar:

```json
{
  "protocol": "smartcontrol.mqtt.v1",
  "uuid": "SC-HYDRO-0001",
  "device_id": "hidroponia01",
  "type": "hydroponics",
  "category": "hydroponics",
  "firmware_version": "smartcontrol-hidroponia-2.0.0",
  "hardware": "ESP32",
  "model": "ESP32 DevKit",
  "lora": false,
  "capabilities": {
    "relay": true,
    "timer": true,
    "local_dashboard": true,
    "ap": true,
    "mqtt": true,
    "ota": true
  }
}
```

Heltec LoRa deve declarar:

```json
{
  "hardware": "ESP32 LoRa",
  "model": "Heltec ESP32 LoRa",
  "lora": true
}
```

ESP32 padrao deve declarar:

```json
{
  "hardware": "ESP32",
  "model": "ESP32 DevKit",
  "lora": false
}
```

## Topicos MQTT

Raiz padrao:

```text
smartcontrol/{cliente}/{projeto}/{device_id}
```

Sufixos:

- `/status`: estado retido mais recente.
- `/heartbeat`: presenca periodica.
- `/telemetry`: sensores.
- `/cmd`: comandos cloud -> dispositivo.
- `/config`: configuracao cloud -> dispositivo.
- `/ack`: confirmacao do dispositivo.
- `/availability`: LWT online/offline retido.

## Presenca

Online:

- `status`, `heartbeat`, `telemetry`, `ack` ou `availability=online` recentes.
- backend atualiza `last_heartbeat` apenas em eventos online.

Offline:

- `availability=offline` via LWT.
- timeout real de heartbeat pelo backend.

Isso evita falso positivo quando o dispositivo esta vivo localmente, mas perdeu MQTT/cloud.

## Firmware

Pasta canonica:

```text
firmware/smartcontrol_os/
  core/
  wifi/
  mqtt/
  ota/
  webserver/
  ap_mode/
  storage/
  device_manager/
  sensors/
  actuators/
  integrations/
  dashboard/
  security/
  heartbeat/
  logging/
```

Os firmwares existentes continuam em `firmware/hidroponia` para manter compatibilidade. A pasta `smartcontrol_os` exporta os mesmos modulos como contrato oficial para novos firmwares.

## Backend

Novos managers:

- `Device Registry`: classe, identidade canonica e capabilities.
- `Device Presence Manager`: online/offline, LWT, heartbeat e timeout.
- `Integration Manager`: registro inicial de Alexa, Google Home, Tuya, ESPHome, Home Assistant, MQTT generico e cameras IP.
- `OTA Manager`: descritor de OTA local/remoto.

## Evolucao Recomendada

1. Migrar novos firmwares para `firmware/smartcontrol_os/core/SmartControlOS.h`.
2. Criar plugins por classe em `firmware/devices/{classe}`.
3. Evoluir dashboard local para componentes JS/CSS reutilizaveis mantendo o visual atual.
4. Adicionar manifests OTA versionados por grupo.
5. Ativar adaptadores externos com credenciais criptografadas por usuario.
