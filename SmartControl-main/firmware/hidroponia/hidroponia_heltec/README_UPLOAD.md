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

- `PubSubClient`
- `ArduinoJson`
- `U8g2`

As demais fazem parte do core ESP32:

- `WiFi`
- `WiFiClientSecure`
- `WebServer`
- `Preferences`
- `ArduinoOTA`
- `ESPmDNS`

## Upload

1. Conecte o Heltec via USB.
2. Selecione a porta COM.
3. Baud upload: `921600` ou `115200` se falhar.
4. Clique em Upload.
5. Abra o Serial Monitor em `115200`.

Primeiro boot:

1. Se nao houver Wi-Fi salvo, conecte no AP `SmartControl-XXXX`.
2. Acesse `http://192.168.4.1`.
3. Controle o dispositivo localmente ou configure Wi-Fi, senha do AP, nome e MQTT.
4. Preencha MQTT se quiser integrar com a cloud:
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

O controle local nao depende de MQTT nem internet: relés, modo automatico e timers
continuam funcionando pelo dashboard AP em `192.168.4.1`.
