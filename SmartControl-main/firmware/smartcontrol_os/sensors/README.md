# Sensors

Ponto de extensao para sensores ambientais, pH, EC, nivel, vazao, luminosidade e outros.

Cada sensor deve publicar telemetria no contrato:

```json
{
  "temperature": 0,
  "humidity": 0,
  "ph": 0,
  "ec": 0
}
```
