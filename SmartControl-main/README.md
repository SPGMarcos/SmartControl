# SmartControl

SmartControl é uma plataforma de automação IoT profissional com dashboard web, integração Supabase e arquitetura preparada para MQTT em nuvem.

## Arquitetura

- Dispositivos físicos (ESP32, ESP8266, ESP-01, ESP32 LoRa, relés e sensores)
- Broker MQTT em nuvem (EMQX Cloud, HiveMQ Cloud ou similar)
- Backend Node.js com rotas de comando e integração MQTT
- Supabase para autenticação, persistência de dispositivos, projetos e logs
- Dashboard web React com visual premium preto, branco, cinza e roxo escuro

## Frontend

O frontend usa React + Vite e já está integrado ao Supabase para login, cadastro de dispositivos e dashboard.

Para executar:

1. Configure `.env` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_BACKEND_URL`
2. Execute `npm install`
3. Execute `npm run dev`

## Backend

O backend está em `backend/` e fornece uma API de integração MQTT para enviar comandos remotos e gravar logs no Supabase.

Para executar:

1. Entre em `backend/`
2. Copie `.env.example` para `.env`
3. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MQTT_URL`, `MQTT_USERNAME` e `MQTT_PASSWORD`
4. Execute `npm install`
5. Execute `npm run dev`

## Notas

- A implementação mantém a estrutura atual do projeto e adiciona suporte a cadastro de dispositivos com MAC, firmware, token e broker MQTT
- O dashboard agora tem navegação para página de detalhe de dispositivo
- O backend Node.js está preparado para usar um broker MQTT em nuvem com autenticação e logs
