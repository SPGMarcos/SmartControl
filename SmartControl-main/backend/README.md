# SmartControl Backend

Este backend provê integração MQTT em nuvem para o SmartControl.

## Instalação

1. `cd backend`
2. `npm install`
3. Copie `.env.example` para `.env`
4. Preencha as variáveis de ambiente com as credenciais do Supabase e do broker MQTT

## Execução

- `npm run dev` - executa em modo de desenvolvimento com `nodemon`
- `npm start` - executa em modo de produção

## Endpoints principais

- `GET /health` - verifica se o backend está rodando
- `POST /api/command` - envia comando MQTT para um dispositivo cadastrado

## Fluxo de comando

1. O frontend chama `POST /api/command` com `device_id` e `command`
2. O backend busca o dispositivo no Supabase
3. O backend publica o comando no tópico MQTT configurado
4. O backend grava um log de evento no Supabase

## Observações

- Use broker MQTT com TLS/SSL e autenticação segura para produção
- O backend usa `SUPABASE_SERVICE_ROLE_KEY` para operações administrativas seguras
