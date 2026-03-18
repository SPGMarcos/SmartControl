# 🌐 SmartControl
Interface Web para Monitoramento e Controle de Soluções IoT

Dashboard responsivo de alta performance para visualização e interação com ecossistemas de automação baseados em ESP8266/ESP32, com suporte a MQTT e integração com Home Assistant.

🔗 Página do Projeto: spgmarcos.github.io/SmartControl/

<div align="center">
  <img src="https://github.com/user-attachments/assets/765d36a1-53f3-4fbd-bec5-aa16c9f197ff"" width="400" alt="Dashboard de Irrigação">
</div>

## 📌 Visão Geral
O SmartControl é o hub visual de controle para dispositivos IoT. Este repositório reúne o frontend da aplicação, desenvolvido para atuar como o painel de comando central de automações residenciais e agrícolas. O foco principal é a entrega de dados de sensores e o controle de atuadores com baixa latência e alta disponibilidade.

O sistema irá permitir:

- Monitorar sensores (umidade, temperatura, presença) em tempo real.

- Acionar atuadores (relés, motores, válvulas) via interface web.

- Visualizar o estado dos dispositivos integrados ao Home Assistant.

- Acessar o controle total de qualquer dispositivo (Mobile, Tablet ou PC).

## 🎯 Objetivos do Projeto
Desenvolver uma interface de controle IoT que seja:

- Cloud-Independent: Capaz de operar em rede local ou via web sem dependência de serviços de terceiros.

- Leve e Veloz: Carregamento instantâneo para dispositivos de hardware limitado.

- Universal: Acessível via navegador, eliminando a necessidade de instalação de apps.

- Escalável: Estrutura pronta para receber novos módulos e diferentes tipos de sensores.

## 🧠 Arquitetura do Sistema
      Usuário (Navegador)
      ↓
      Interface Web (GitHub Pages / Local)
      ↓
      Comunicação (Fetch API / MQTT / REST)
      ↓
      Microcontrolador (ESP8266 / ESP32)
      ↓
      Sensores e Atuadores (Hardware)

## 🔌 Compatibilidade de Hardware
- Microcontroladores: ESP8266 (NodeMCU/Wemos) e ESP32.

- Protocolos: HTTP/HTTPS, WebSockets e MQTT.

- Integrações: Home Assistant, Node-RED e Brokers MQTT (Mosquitto/HiveMQ).

## ⚙️ Principais Funcionalidades
### 1. Dashboard Interativo

- Widgets dinâmicos para visualização de telemetria.

- Botões com feedback visual de estado (On/Off).

- Layout adaptável para modo escuro (Dark Theme).

### 2. Monitoramento Real-time

- Atualização de dados via AJAX/Fetch para evitar o recarregamento da página.

- Sistema de pooling configurável para leitura de sensores de solo e ambiente.

### 3. Controle de Atuadores

- Interface otimizada para acionamento de relés de potência.

- Sincronização de estado: a interface reflete o estado real do hardware.

### 4. Acessibilidade e Portabilidade

- Hospedagem via GitHub Pages, garantindo acesso global.

- Design Mobile-First focado na experiência do usuário em campo ou em casa.

## 🌐 Interface Web
A interface foi projetada para ser robusta e visualmente limpa, utilizando as melhores práticas de frontend moderno:

- HTML5 & CSS3: Layouts em Flexbox e Grid para responsividade total.

- JavaScript (ES6+): Lógica assíncrona para comunicação com o hardware.

- Design Moderno: Componentes intuitivos e paleta de cores focada em legibilidade.

## 🛡️ Estabilidade e Segurança
- Validação de Dados: Filtros no frontend para garantir que apenas comandos válidos sejam enviados ao ESP.

- Operação Local: Suporte a endereços mDNS (.local) para controle em redes internas sem internet.

- Tratamento de Erros: Feedback ao usuário em caso de perda de conexão com o dispositivo.

## 📊 Diferenciais Técnicos
-  Interface desacoplada (funciona com diversos firmwares)

-  Deploy automatizado via GitHub Pages

-  Código otimizado para SEO e performance

-  Estrutura modular fácil de personalizar

## 👨‍💻 Autor
Marcos Gabriel Ferreira Miranda 

IoT Developer | Automação Residencial e Agrícola

Belo Horizonte - MG
