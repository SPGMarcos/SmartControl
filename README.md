# SmartControl

Plataforma IoT para automacao residencial e agricola, com dashboard React/Vite, backend Node.js, Supabase, MQTT Cloud e firmware Heltec ESP32 LoRa de hidroponia.

O codigo principal esta em [`SmartControl-main`](SmartControl-main).

Guia completo de producao gratuita:

- [`SmartControl-main/docs/arquitetura.md`](SmartControl-main/docs/arquitetura.md)

Fluxo implementado:

```text
Heltec ESP32 LoRa
  -> MQTT Cloud
  -> Backend Node.js
  -> Supabase
  -> Dashboard GitHub Pages
```

Firmware integrado:

- [`SmartControl-main/firmware/hidroponia/hidroponia_heltec.ino`](SmartControl-main/firmware/hidroponia/hidroponia_heltec.ino)

Deploy:

1. Execute o schema Supabase em `SmartControl-main/supabase/smartcontrol_iot_schema.sql`.
2. Configure MQTT Cloud com usuario/senha e ACL por topico.
3. Publique `SmartControl-main/backend` no Render.
4. Configure os secrets do GitHub Pages.
5. Ative Pages com source `GitHub Actions`.
6. Configure o ESP32 em `http://smarthidroponia.local/settings`.
