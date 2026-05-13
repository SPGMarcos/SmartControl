# SmartControl Backend ⚙️🌐

Backend Node.js responsável pela comunicação entre dispositivos MQTT, banco Supabase e dashboard SmartControl.

Esta API atua como ponte central entre:

- ESP32 LoRa
- MQTT Cloud
- Supabase
- Dashboard Web

# 📌 Visão Geral

O backend do **SmartControl** foi desenvolvido para centralizar a comunicação entre os dispositivos IoT e a plataforma web.

Sua função principal é:

✅ Receber dados MQTT  
✅ Processar comandos  
✅ Armazenar estados no Supabase  
✅ Sincronizar dispositivos em tempo real  
✅ Fornecer endpoints para o dashboard  

A arquitetura foi criada para ser:

- Escalável
- Modular
- Segura
- Compatível com múltiplos dispositivos
- Preparada para automações avançadas

# ⚙️ Arquitetura

## Fluxo principal

```text
ESP32 LoRa
      ↓
MQTT Broker
      ↓
Backend Node.js
      ↓
Supabase
      ↓
Dashboard SmartControl
```

# 🚀 Tecnologias utilizadas

## Backend

- Node.js
- Express

## Comunicação

- MQTT
- WebSocket
- HTTP REST API

## Banco de dados

- Supabase
- PostgreSQL

## Segurança

- JWT
- Middleware de autenticação
- CORS configurável

# 🔧 Funcionalidades

## 🔹 Comunicação MQTT

- Assinatura automática de tópicos
- Publicação de comandos
- Heartbeat
- ACK de comandos
- Availability online/offline

## 🔹 Integração Supabase

- Registro de dispositivos
- Logs de eventos
- Histórico de estados
- Armazenamento de telemetria

## 🔹 API REST

- Controle de dispositivos
- Consulta de estados
- Consulta de logs
- Envio de comandos
- Configuração remota

## 🔹 Segurança

- Autenticação JWT
- Controle de origem (CORS)
- Middleware de proteção
- Tokens de autenticação

# 📂 Estrutura do backend

```text
backend/

├── src/
├── routes/
├── services/
├── mqtt/
├── middleware/
├── utils/
├── .env
└── package.json
```

# 🚀 Instalação

## Instalar dependências

```bash
npm install
```

## Iniciar servidor

```bash
npm start
```

# 🌐 Endpoints da API

## Status da API

```http
GET /health
```

## Consultar tópicos MQTT do dispositivo

```http
GET /api/devices/:id/topics
```

## Consultar estado do dispositivo

```http
GET /api/devices/:id/state
```

## Consultar logs do dispositivo

```http
GET /api/devices/:id/logs
```

## Enviar comando para dispositivo

```http
POST /api/command
```

## Atualizar configuração do dispositivo

```http
POST /api/devices/:id/config
```

## Solicitar status do dispositivo

```http
POST /api/devices/:id/request-status
```

# 🔐 Autenticação

Em produção, utilize:

```env
REQUIRE_AUTH=true
```

O frontend envia o JWT Supabase utilizando:

```http
Authorization: Bearer <token>
```

# 🔑 Variáveis de ambiente

## Arquivo `.env`

```env
SUPABASE_URL=https://seu-projeto.supabase.co

SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

MQTT_URL=mqtts://seu-broker:8883

MQTT_USERNAME=smartcontrol-backend

MQTT_PASSWORD=senha-forte

MQTT_CLIENT_ID=smartcontrol-backend

MQTT_REJECT_UNAUTHORIZED=true

MQTT_REQUIRE_DEVICE_TOKEN=false

CORS_ORIGIN=https://seu-usuario.github.io

REQUIRE_AUTH=true

PORT=4000
```

# 📡 Comunicação MQTT

## Tópicos assinados pelo backend

```text
smartcontrol/+/+/+/status

smartcontrol/+/+/+/telemetry

smartcontrol/+/+/+/heartbeat

smartcontrol/+/+/+/ack

smartcontrol/+/+/+/availability

smartcontrol/+/+/+/config
```

## Tópicos publicados pelo backend

```text
smartcontrol/{cliente}/{projeto}/{device_id}/cmd

smartcontrol/{cliente}/{projeto}/{device_id}/config
```

# 🌱 Comandos suportados pelo módulo de hidroponia

## Controle automático

```text
set_auto
```

Ativa ou desativa o modo automático.

## Controle de relés

```text
set_relay
```

Controla bomba, oxigenador e outros dispositivos.

## Configuração de temporizadores

```text
set_timers
```

Define ciclos automáticos ON/OFF.

## Solicitação de status

```text
request_status
```

Solicita sincronização completa do estado atual.

## Reset de fábrica

```text
factory_reset
```

Restaura configurações padrão do dispositivo.

# 🛡️ Segurança

✅ JWT integrado com Supabase  
✅ Middleware de autenticação  
✅ CORS configurável  
✅ MQTT seguro com TLS  
✅ Controle de origem  
✅ Estrutura preparada para ACLs MQTT  

# 📈 Próximos passos

- WebSocket em tempo real
- Sistema multiusuário
- Notificações push
- Dashboard analítica
- Logs avançados
- Monitoramento remoto expandido
- Integração com IA
- Failover MQTT

# 🌍 Aplicações

- Hidroponia
- Irrigação inteligente
- Automação residencial
- Controle de bombas
- Monitoramento remoto
- Controle LoRa
- Estufas inteligentes

# 🔗 Projeto

## GitHub Pages

https://spgmarcos.github.io/SmartControl

# 👨‍💻 Autor

## Marcos Gabriel Ferreira Miranda

Desenvolvedor IoT | Automação Residencial e Agrícola

ESP32 • MQTT • LoRa • Node.js

Fundador da SmartControl

📍 Belo Horizonte - MG
