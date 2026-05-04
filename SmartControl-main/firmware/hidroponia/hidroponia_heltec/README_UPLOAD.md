# Upload firmware Heltec ESP32 LoRa V2

Abra este arquivo no Arduino IDE:

```text
hidroponia_heltec.ino
```

## Placa

Use uma destas opcoes, conforme aparecer no seu Arduino IDE:

- `Heltec WiFi LoRa 32(V2)`
- `Heltec WiFi LoRa 32`
- `ESP32 Dev Module` como alternativa para teste

## Bibliotecas

Instale pelo Library Manager:

- `WiFiManager`
- `PubSubClient`
- `ArduinoJson`
- `U8g2`

As demais fazem parte do core ESP32:

- `WiFi`
- `WiFiClientSecure`
- `WebServer`
- `LittleFS`
- `ArduinoOTA`
- `ESPmDNS`

## Upload

1. Conecte o Heltec via USB.
2. Selecione a porta COM.
3. Baud upload: `921600` ou `115200` se falhar.
4. Clique em Upload.
5. Abra o Serial Monitor em `115200`.

Primeiro boot:

1. Conecte no Wi-Fi `ESP_Hidroponia`.
2. Configure sua rede Wi-Fi.
3. Acesse `http://smarthidroponia.local/settings`.
4. Preencha MQTT:
   - Broker: `mqtts://SEU_BROKER:8883`
   - Usuario
   - Senha
   - Topico base: `smartcontrol/cliente/projeto/hidroponia01`
   - ID: `hidroponia01`
   - Token: opcional
5. Salve e aguarde reiniciar.

O Serial Monitor deve mostrar:

```text
Conectando MQTT em ...
MQTT SmartControl conectado.
```

Se aparecer `Falha MQTT, state=...`, revise broker, porta, usuario, senha e ACL.
