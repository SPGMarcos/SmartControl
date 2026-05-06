# SmartControl OS

Base modular compartilhada para firmwares SmartControl.

Objetivos:

- manter dashboards locais, AP Mode, OTA, MQTT e automacoes rodando offline;
- padronizar identificacao, capabilities, heartbeat e topicos MQTT;
- permitir novas classes como hidroponia, irrigacao, estufa, iluminacao, caixas d'agua e reles genericos;
- preservar compatibilidade com os sketches atuais em `firmware/hidroponia`.

Estrutura:

- `core/`: fachada principal do runtime.
- `wifi/`: conexao STA, fallback AP e reconexao.
- `mqtt/`: MQTT, LWT, heartbeat, backoff e status.
- `ota/`: contrato de OTA local/remoto.
- `webserver/`: servidor HTTP local.
- `ap_mode/`: AP/captive portal.
- `storage/`: Preferences/estado local.
- `device_manager/`: identidade, UUID, classe e protocolo.
- `sensors/`: ponto de extensao para sensores.
- `actuators/`: reles, valvulas, bombas, dimmers.
- `integrations/`: adaptadores externos.
- `dashboard/`: dashboard local reutilizavel.
- `security/`: validacao, tokens e politicas locais.
- `heartbeat/`: timers internos de saude.
- `logging/`: logs locais/remotos.

Os headers atuais de hidroponia continuam sendo a implementacao ativa para nao quebrar dispositivos existentes. Novos firmwares devem importar `core/SmartControlOS.h` e escolher os modulos necessarios.
