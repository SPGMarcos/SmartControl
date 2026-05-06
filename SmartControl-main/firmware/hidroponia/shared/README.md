# SmartControl Firmware Base

Arquitetura compartilhada para firmwares ESP32 SmartControl.

Modulos:

- `hardware_manager.h`: identidade de hardware, chip id, defaults de AP.
- `device_manager.h`: modelo de configuracao local e sanitizacao.
- `storage_manager.h`: persistencia em `Preferences`.
- `ap_manager.h`: Access Point local `SmartControl-XXXX`.
- `wifi_manager.h`: STA normal com fallback automatico para AP.
- `relay_manager.h`: reles, modo automatico e timer local offline.
- `mqtt_manager.h`: MQTT, status, heartbeat, LWT e comandos cloud.
- `web_dashboard.h`: dashboard local em `192.168.4.1`/IP STA.
- `heartbeat_manager.h`: temporizador reutilizavel para tarefas periodicas.
- `command_manager.h`: comandos MQTT padronizados.

Cada firmware deve declarar apenas perfil de hardware, pinos e recursos locais.
Toda logica critica continua rodando sem internet.
