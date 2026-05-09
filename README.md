***SmartControl 🌱⚡

Sistema completo de automação IoT para hidroponia, irrigação e controle residencial, desenvolvido com ESP32 LoRa, MQTT, Supabase, Node.js e dashboard web.

Dashboard SmartControl
📌 Visão Geral

O SmartControl nasceu com o objetivo de criar uma plataforma profissional de automação residencial e agrícola, focada em confiabilidade, controle remoto e independência de serviços cloud proprietários.

A ideia foi desenvolver um sistema capaz de:

Controlar dispositivos remotamente
Funcionar localmente mesmo sem internet
Integrar automações avançadas
Ser expansível para diferentes aplicações
Centralizar tudo em um único dashboard

Hoje a plataforma já permite controlar relés, válvulas, bombas, iluminação e sistemas hidropônicos através de ESP32 LoRa integrados ao MQTT e ao Home Assistant.

🎯 Objetivo

Desenvolver uma plataforma IoT que seja:

Profissional
Modular
Expansível
Independente de cloud proprietária
Compatível com automação residencial e agrícola
Fácil de instalar e configurar
🌱 O que o sistema faz

A plataforma SmartControl permite:

Controle remoto de dispositivos
Automação de irrigação
Controle de bombas d’água
Acionamento de válvulas solenóides
Controle de iluminação
Monitoramento de sensores
Integração com Home Assistant
Comunicação via MQTT
Operação via LoRa para longas distâncias
Dashboard web responsiva
🧠 Como funciona

O sistema utiliza ESP32 LoRa conectados ao MQTT Cloud.

O dashboard web se comunica com o backend Node.js, que gerencia os dispositivos, estados e integração com o banco Supabase.

Toda a lógica pode funcionar localmente ou integrada ao Home Assistant.

Fluxo principal:

Usuário ↓ Dashboard SmartControl ↓ Backend Node.js ↓ MQTT Cloud ↓ ESP32 LoRa ↓ Relés / Sensores / Bombas / Válvulas

⚙️ Arquitetura
Estrutura principal

Heltec ESP32 LoRa ↓ MQTT Cloud ↓ Backend Node.js ↓ Supabase ↓ Dashboard React/Vite

🔧 Funcionalidades
Controle remoto
Liga e desliga dispositivos em tempo real
Controle via dashboard web
Controle manual e automático
Compatível com celular e desktop
Automação agrícola
Controle de irrigação
Controle de circulação hidropônica
Acionamento automático de válvulas
Controle de iluminação para cultivo
Comunicação LoRa
Controle remoto a longa distância
Comunicação entre ESPs
Ideal para áreas rurais e estufas
Integração com Home Assistant
Compatível com MQTT
Integração local
Criação de automações inteligentes
Monitoramento centralizado
Funcionamento local
Continua funcionando offline
Não depende totalmente de internet
Maior confiabilidade operacional
💻 Tecnologias utilizadas
Frontend
React
Vite
HTML5
CSS3
JavaScript
Backend
Node.js
Express
Banco de dados
Supabase
PostgreSQL
Comunicação
MQTT
LoRa
Wi‑Fi
Firmware
ESP32
ESP32 LoRa Heltec
ESP8266
🔌 Hardware utilizado
ESP32 LoRa Heltec
ESP8266
Módulos relé
Válvulas solenóides
Bombas d’água
Sensores diversos
Fontes de alimentação
Display OLED integrado
🔄 Lógica do sistema

O sistema segue uma lógica modular:

Os ESPs recebem comandos via MQTT
Os dispositivos são acionados pelos relés
Os estados retornam ao backend
O dashboard sincroniza em tempo real
O Home Assistant pode assumir automações mais avançadas
🛡️ Confiabilidade
Funcionamento local
MQTT leve e estável
Estrutura modular
Operação mesmo sem internet
Reconexão automática dos dispositivos
Firmware otimizada para estabilidade
📂 Estrutura do projeto

SmartControl-main/

backend/ → Backend Node.js

frontend/ → Dashboard React/Vite

firmware/ → Firmwares ESP32 e ESP8266

supabase/ → Schema SQL

docs/ → Arquitetura e documentação

🚀 Deploy
Backend
Deploy via Render
Integração com Supabase
MQTT configurado via variáveis de ambiente
Frontend
Deploy via GitHub Pages
CI/CD com GitHub Actions
Banco de dados
Schema disponível em:

supabase/smartcontrol_iot_schema.sql

⚠️ Limitações atuais
Alguns módulos ainda estão em desenvolvimento
Parte das automações avançadas ainda depende do Home Assistant
Interface continua recebendo melhorias constantes
📈 Próximos passos
Dashboard mais avançada
Controle completo via LoRa
Mais sensores ambientais
Sistema de notificações
Controle por múltiplos usuários
Firmware modular unificada
IA para automações inteligentes
🌍 Aplicações
Hidroponia
Irrigação automática
Estufas inteligentes
Automação residencial
Controle de iluminação
Controle de bombas
Automação rural
🔗 Projeto

GitHub Pages: https://spgmarcos.github.io/SmartControl

👨‍💻 Autor

Marcos Gabriel Ferreira Miranda

Desenvolvedor IoT | Automação Residencial e Agrícola |

ESP32 | LoRa | Home Assistant | MQTT |

Fundador da SmartControl

Belo Horizonte - MG
