# SmartControl 🌱⚡

Plataforma web para automação residencial e agrícola, desenvolvida com React/Vite, Node.js, Supabase, MQTT Cloud e firmware ESP32 LoRa para sistemas inteligentes de irrigação, hidroponia e automação remota.



# 📌 Visão Geral

O **SmartControl** é uma plataforma IoT desenvolvida para permitir o controle e monitoramento de dispositivos agrícolas e residenciais em tempo real.

A arquitetura foi projetada para ser:

✅ Modular  
✅ Escalável  
✅ Independente de cloud proprietária  
✅ Compatível com MQTT e Home Assistant  
✅ Funcional mesmo sem internet  

Esta versão já está preparada para testes reais utilizando:

- ESP32 Heltec LoRa V2
- MQTT Cloud
- Supabase
- Backend Node.js
- Dashboard React hospedada no GitHub Pages



# 🎯 Objetivo

Desenvolver uma plataforma de automação que permita:

- Controle remoto de dispositivos
- Monitoramento em tempo real
- Integração com sensores
- Operação local e remota
- Comunicação de longa distância via LoRa
- Dashboard moderna e responsiva



# ⚙️ Arquitetura

## Fluxo principal

```text
ESP32 Heltec LoRa
        ↓
MQTT Cloud Broker
        ↓
Backend Node.js
        ↓
Supabase
        ↓
Dashboard SmartControl
```



# ☁️ Hospedagem recomendada

## Frontend

- GitHub Pages

## Backend

- Render Free

## MQTT Broker

- EMQX Cloud Serverless
- HiveMQ (caso a conta ainda possua plano gratuito/trial)

## Banco de dados e autenticação

- Supabase Free



# 💻 Tecnologias utilizadas

## Frontend

- React
- Vite
- JavaScript
- HTML5
- CSS3

## Backend

- Node.js
- Express

## Banco de dados

- Supabase
- PostgreSQL

## Comunicação

- MQTT
- LoRa
- Wi-Fi

## Firmware

- ESP32 Heltec LoRa V2
- ESP8266
- Arduino Framework



# 🚀 Desenvolvimento local

## Frontend

```bash
npm install

npm run dev
```



## Backend

```bash
cd backend

npm install

cp .env.example .env

npm start
```



# 🏗️ Build para GitHub Pages

```bash
npm run build
```

O build gera automaticamente:

```text
dist/index.html
dist/404.html
```

Isso evita erros 404 ao atualizar páginas protegidas no GitHub Pages.



# 🔐 Variáveis de ambiente

## Frontend (.env)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon

VITE_BACKEND_URL=https://seu-backend.onrender.com

VITE_BASE_PATH=/SmartControl/
```



## Backend (backend/.env)

```env
SUPABASE_URL=https://seu-projeto.supabase.co

SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

MQTT_URL=mqtts://seu-broker:8883

MQTT_USERNAME=smartcontrol-backend

MQTT_PASSWORD=senha-forte

CORS_ORIGIN=https://seu-usuario.github.io

REQUIRE_AUTH=true
```



# 🌱 Firmware Hidroponia

## Firmware integrado

```text
firmware/hidroponia/hidroponia_heltec.ino
```



# 🔧 Funcionalidades do firmware

## Dashboard local

- Interface HTML embarcada
- Controle local sem internet

## Controle de dispositivos

- Bomba no GPIO 2
- Oxigenador no GPIO 17

## Modos de operação

- Modo automático
- Modo manual
- Temporizador ON/OFF

## Recursos embarcados

- WiFiManager
- OTA
- OLED integrado
- LittleFS
- mDNS
- Configuração MQTT local
- Reset de fábrica



# 📡 Camada remota MQTT

A camada MQTT adiciona:

✅ Comunicação remota  
✅ Controle em tempo real  
✅ Sincronização de estados  
✅ Monitoramento online/offline  



## Recursos MQTT implementados

- `mqttClient.setServer()`
- `mqttClient.setCallback()`
- `reconnectMQTT()`
- `publishStatus()`
- Assinatura de tópicos de comando
- Assinatura de tópicos de configuração
- Heartbeat
- Availability online/offline
- ACK de comandos



# 🛰️ Estrutura de tópicos MQTT

## Tópico base

```text
smartcontrol/{cliente}/{projeto}/hidroponia01
```



# 🗄️ Schema Supabase

Execute o schema disponível em:

```text
SmartControl-main/supabase/smartcontrol_iot_schema.sql
```

O schema cria automaticamente:

- Projects
- Devices
- Sensors
- Logs
- Índices
- Triggers
- Políticas RLS



# 🚀 Deploy

## 1. Banco Supabase

Execute o schema SQL no Supabase.



## 2. MQTT Broker

Configure:

- Usuários
- Senhas
- ACLs por dispositivo



## 3. Backend

Publique a pasta:

```text
backend/
```

No Render.



## 4. GitHub Pages

Configure os secrets:

```env
VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

VITE_BACKEND_URL
```

Ative o GitHub Pages utilizando GitHub Actions.



## 5. Firmware ESP32

Grave o firmware no ESP32 Heltec LoRa.

Depois configure o MQTT em:

```text
http://smarthidroponia.local/settings
```



# 🛡️ Confiabilidade

✅ Funcionamento local  
✅ Operação offline  
✅ Reconexão automática MQTT  
✅ Estrutura modular  
✅ Firmware estável  
✅ Controle remoto em tempo real  



# 📈 Próximos passos

- Dashboard mais avançada
- Controle completo via LoRa
- Sistema multiusuário
- Mais sensores ambientais
- Integração com IA
- Notificações inteligentes
- Histórico avançado de dados
- Aplicativo mobile



# 🌍 Aplicações

- Hidroponia
- Irrigação automática
- Estufas inteligentes
- Automação residencial
- Controle de iluminação
- Controle de bombas
- Monitoramento remoto agrícola



# 🔗 Projeto

## GitHub Pages

https://spgmarcos.github.io/SmartControl



# 👨‍💻 Autor

## Marcos Gabriel Ferreira Miranda

Desenvolvedor IoT | Automação Residencial e Agrícola

ESP32 • LoRa • MQTT • Home Assistant

Fundador da SmartControl

📍 Belo Horizonte - MG
