# SmartControl 🌱⚡

Sistema completo de automação IoT para hidroponia, irrigação e controle residencial, desenvolvido com ESP32, MQTT, Supabase, Node.js e dashboard web.



## 📌 Visão Geral

O **SmartControl** nasceu com o objetivo de criar uma plataforma profissional de automação residencial e agrícola, focada em:

- Confiabilidade
- Controle remoto
- Operação local
- Integração com automações inteligentes
- Expansibilidade

A ideia foi desenvolver um sistema capaz de:

✅ Controlar dispositivos remotamente  
✅ Funcionar mesmo sem internet  
✅ Integrar com Home Assistant  
✅ Operar via MQTT e LoRa  
✅ Centralizar tudo em um dashboard moderno  

Hoje a plataforma já permite controlar:

- Relés
- Bombas d’água
- Válvulas solenóides
- Iluminação
- Sistemas hidropônicos
- Sensores diversos



# 🎯 Objetivo

Desenvolver uma plataforma IoT que seja:

- Profissional
- Modular
- Escalável
- Independente de cloud proprietária
- Compatível com automação residencial e agrícola
- Fácil de configurar e instalar



# 🌱 O que o sistema faz

A plataforma SmartControl permite:

## 🔹 Automação agrícola

- Controle de irrigação
- Controle de circulação hidropônica
- Acionamento automático de válvulas
- Controle de iluminação para cultivo

## 🔹 Controle remoto

- Liga e desliga dispositivos em tempo real
- Controle via dashboard web
- Controle manual e automático
- Compatível com celular e desktop

## 🔹 Comunicação LoRa

- Controle remoto a longa distância
- Comunicação entre ESPs
- Ideal para áreas rurais e estufas

## 🔹 Integração com Home Assistant

- Compatível com MQTT
- Integração local
- Criação de automações inteligentes
- Monitoramento centralizado

## 🔹 Funcionamento local

- Continua funcionando offline
- Não depende totalmente de internet
- Maior confiabilidade operacional



# 🧠 Como funciona

O sistema utiliza ESP32 LoRa conectados ao MQTT Cloud.

O dashboard web se comunica com o backend Node.js, que gerencia os dispositivos, estados e integração com o banco Supabase.

Toda a lógica pode funcionar localmente ou integrada ao Home Assistant.



# ⚙️ Arquitetura

## Fluxo principal

```text
Usuário
   ↓
Dashboard SmartControl
   ↓
Backend Node.js
   ↓
MQTT Cloud
   ↓
ESP32 LoRa
   ↓
Relés / Sensores / Bombas / Válvulas
```



# 💻 Tecnologias utilizadas

## Frontend

- React
- Vite
- HTML5
- CSS3
- JavaScript

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

- ESP32
- ESP32 LoRa Heltec
- ESP8266



# 🔌 Hardware utilizado

- ESP32 LoRa Heltec
- ESP8266
- Módulos relé
- Válvulas solenóides
- Bombas d’água
- Sensores diversos
- Fontes de alimentação
- Display OLED integrado



# 📂 Estrutura do projeto

```text
SmartControl-main/

├── backend/        → Backend Node.js
├── frontend/       → Dashboard React/Vite
├── firmware/       → Firmwares ESP32 e ESP8266
├── supabase/       → Schema SQL
└── docs/           → Arquitetura e documentação
```



# 🚀 Deploy

## Backend

- Deploy via Render
- Integração com Supabase
- MQTT configurado via variáveis de ambiente

## Frontend

- Deploy via GitHub Pages
- CI/CD com GitHub Actions

## Banco de dados

Schema disponível em:

```text
supabase/smartcontrol_iot_schema.sql
```



# 🛡️ Confiabilidade

✅ Funcionamento local  
✅ MQTT leve e estável  
✅ Estrutura modular  
✅ Operação mesmo sem internet  
✅ Reconexão automática dos dispositivos  
✅ Firmware otimizada para estabilidade  



# ⚠️ Limitações atuais

- Alguns módulos ainda estão em desenvolvimento
- Parte das automações avançadas ainda depende do Home Assistant
- Interface continua recebendo melhorias constantes



# 📈 Próximos passos

- Dashboard mais avançada
- Controle completo via LoRa
- Mais sensores ambientais
- Sistema de notificações
- Controle por múltiplos usuários
- Firmware modular unificada
- IA para automações inteligentes



# 🌍 Aplicações

- Hidroponia
- Irrigação automática
- Estufas inteligentes
- Automação residencial
- Controle de iluminação
- Controle de bombas
- Automação rural



# 🔗 Projeto

## GitHub Pages

https://spgmarcos.github.io/SmartControl



# 👨‍💻 Autor

## Marcos Gabriel Ferreira Miranda

Desenvolvedor IoT | Automação Residencial e Agrícola

ESP32 • LoRa • MQTT • Home Assistant

Fundador da SmartControl

📍 Belo Horizonte - MG
