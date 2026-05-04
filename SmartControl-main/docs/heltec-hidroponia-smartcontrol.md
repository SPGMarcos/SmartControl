# SmartControl + Heltec ESP32 LoRa Hidroponia

Este documento define o contrato oficial para transformar o firmware Heltec ESP32 LoRa de hidroponia em um dispositivo SmartControl integrado, mantendo o painel local embarcado, WiFiManager, OTA, LittleFS, OLED, mDNS e a automacao local existente.

## O que o firmware atual ja faz

- Controle fisico de dois reles: `RELAY_BOMBA` no GPIO 2 e `RELAY_OXIGENADOR` no GPIO 17.
- Modo automatico (`trava24h`) com ciclo `tOnMin`/`tOffMin`.
- Modo manual com acionamento de bomba e oxigenador.
- Dashboard local em `http://IP/` e `http://smarthidroponia.local/`.
- API local simples: `/status`, `/set`, `/settings`, `/save_mqtt`, `/factory_reset`.
- Persistencia em LittleFS, provisionamento Wi-Fi via WiFiManager e OTA.

## Arquitetura recomendada gratuita

- Frontend: GitHub Pages com Vite.
- Backend: Render Free rodando `backend/index.js`.
- Banco/Auth: Supabase Free.
- MQTT Cloud: EMQX Cloud Free ou HiveMQ Cloud Free com TLS, usuario e senha.
- Dispositivo: continua local primeiro, cloud como camada adicional.

## Identidade do dispositivo

Use estes campos no cadastro SmartControl:

- `module_type`: `heltec_esp32_lora_hydroponics`
- `type`: `hydroponics`
- `device_model`: `heltec_esp32_lora_hydroponics`
- `device_id`: exemplo `hidroponia01`
- `firmware_version`: exemplo `smartcontrol-hidroponia-1.0.0`
- `hardware_version`: `Heltec ESP32 LoRa V2`
- `mdns_hostname`: `smarthidroponia.local`
- `mac_address`: `WiFi.macAddress()`

## Topicos MQTT

Padrao base:

```text
smartcontrol/{cliente}/{projeto}/{device_id}
```

Topicos derivados:

```text
smartcontrol/{cliente}/{projeto}/{device_id}/cmd
smartcontrol/{cliente}/{projeto}/{device_id}/status
smartcontrol/{cliente}/{projeto}/{device_id}/telemetry
smartcontrol/{cliente}/{projeto}/{device_id}/heartbeat
smartcontrol/{cliente}/{projeto}/{device_id}/ack
smartcontrol/{cliente}/{projeto}/{device_id}/availability
smartcontrol/{cliente}/{projeto}/{device_id}/config
```

Exemplo real:

```text
smartcontrol/marcos/hidroponia/hidroponia01/cmd
smartcontrol/marcos/hidroponia/hidroponia01/status
smartcontrol/marcos/hidroponia/hidroponia01/heartbeat
```

## Payload de status do firmware

O firmware deve publicar o mesmo estado que hoje aparece em `/status`, somando identidade tecnica:

```json
{
  "device_id": "hidroponia01",
  "module": "heltec_esp32_lora_hydroponics",
  "firmware_version": "smartcontrol-hidroponia-1.0.0",
  "hardware_version": "Heltec ESP32 LoRa V2",
  "mac": "AA:BB:CC:DD:EE:FF",
  "ip": "192.168.1.80",
  "mdns": "smarthidroponia.local",
  "t24": true,
  "v1": true,
  "v2": true,
  "rem": 731,
  "tOn": 15,
  "tOff": 10,
  "uptime_ms": 1234567
}
```

## Comandos aceitos

Todos entram em `/cmd`:

```json
{ "command": "set_auto", "payload": { "enabled": true } }
{ "command": "set_relay", "payload": { "relay": "pump", "value": true } }
{ "command": "set_relay", "payload": { "relay": "oxygenator", "value": false } }
{ "command": "set_timers", "payload": { "tOn": 15, "tOff": 10 } }
{ "command": "request_status", "payload": {} }
{ "command": "factory_reset", "payload": { "confirm": true } }
```

Regra importante: quando `trava24h` estiver ativo, o firmware deve manter a regra atual e ignorar acionamento manual de bomba/oxigenador, respondendo por `/ack` que o comando foi negado pelo modo automatico.

## Endpoints backend

- `GET /health`: status do backend e conexao MQTT.
- `GET /api/devices/:id/topics`: retorna topicos calculados para o dispositivo.
- `POST /api/command`: publica comando validado em MQTT.
- `POST /api/devices/:id/request-status`: solicita sincronizacao do estado atual.

O frontend envia JWT Supabase no header `Authorization: Bearer <token>` quando disponivel. Em producao, defina `REQUIRE_AUTH=true` no backend.

## Alteracoes necessarias no firmware

1. Gerar identidade fixa usando MAC e `device_id`.
2. Adicionar `mqttClient.setServer(...)` depois de carregar as configuracoes MQTT.
3. Assinar `baseTopic + "/cmd"` ao conectar.
4. Publicar LWT/availability como `offline` e publicar `online` ao conectar.
5. Publicar `/heartbeat` a cada 15-30 segundos.
6. Publicar `/status` quando mudar modo, tempos ou estado dos reles.
7. Processar comandos JSON mantendo as travas atuais.
8. Enviar `/ack` com `request_id`, `command`, `accepted` e `reason`.

## Firmware integrado no repositorio

O sketch completo atualizado esta em:

```text
firmware/hidroponia/hidroponia_heltec.ino
```

Tambem foi atualizado o sketch local de trabalho em:

```text
../Fimware/Painel_hidroponia_V5/Painel_hidroponia_V5.ino
```

## Patch conceitual para referencia

```cpp
const char* MODULE_TYPE = "heltec_esp32_lora_hydroponics";
const char* FIRMWARE_VERSION = "smartcontrol-hidroponia-1.0.0";
String deviceId = "hidroponia01";
String baseTopic;

void buildTopics() {
  baseTopic = mTopic.length() ? mTopic : "smartcontrol/cliente/hidroponia/" + deviceId;
}

void publishStatus(const char* eventType = "status") {
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["module"] = MODULE_TYPE;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["hardware_version"] = "Heltec ESP32 LoRa V2";
  doc["mac"] = WiFi.macAddress();
  doc["ip"] = WiFi.localIP().toString();
  doc["mdns"] = "smarthidroponia.local";
  doc["t24"] = trava24h;
  doc["v1"] = v1;
  doc["v2"] = v2;
  doc["tOn"] = tOnMin;
  doc["tOff"] = tOffMin;
  doc["rem"] = calcularRestante();
  doc["uptime_ms"] = millis();

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish((baseTopic + "/" + eventType).c_str(), buffer, true);
}
```

O restante da automacao atual deve continuar igual: o loop local ainda decide a alternancia da bomba quando `trava24h` esta ativo. MQTT apenas altera configuracao/estado de forma validada e recebe o estado real de volta.
