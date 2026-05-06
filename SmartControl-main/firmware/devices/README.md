# Device Classes

Classes oficiais que herdam o SmartControl OS:

- `hydroponics`: bombas, oxigenador, timer ON/OFF, sensores de cultivo.
- `irrigation`: zonas, valvulas, bomba e agenda.
- `greenhouse`: ambiente, ventilacao, nebulizacao, temperatura e umidade.
- `water_tank`: nivel, bomba, boia/sensores e protecoes.
- `lighting`: reles, dimmer e cenas.
- `generic_relay`: reles genericos com dashboard local.

Os dispositivos em producao permanecem em `firmware/hidroponia`. Novas classes devem usar `firmware/smartcontrol_os/core/SmartControlOS.h`.
