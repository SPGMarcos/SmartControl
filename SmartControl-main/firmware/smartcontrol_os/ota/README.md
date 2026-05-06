# OTA

Contrato do SmartControl OS para OTA local e remoto.

- OTA local permanece ativo pelo `ArduinoOTA` nos firmwares atuais.
- OTA remoto deve ser tratado por backend/manifesto versionado antes de atualizar grupos.
- Rollback deve ser implementado por particoes OTA em firmwares que adotarem o fluxo remoto.
