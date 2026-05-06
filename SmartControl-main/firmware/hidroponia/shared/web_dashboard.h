#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <WiFi.h>
#include "ap_manager.h"
#include "hardware_manager.h"
#include "mqtt_manager.h"
#include "relay_manager.h"
#include "storage_manager.h"
#include "wifi_manager.h"

namespace SmartControl {

class WebDashboard {
 public:
  WebDashboard(
      WebServer& httpServer,
      DeviceConfig& cfg,
      const HardwareProfile& hw,
      RelayManager& relays,
      StorageManager& store,
      ApManager& ap,
      WifiManager& wifi,
      MqttManager& mqtt)
      : server(httpServer),
        config(cfg),
        hardware(hw),
        relayManager(relays),
        storage(store),
        apManager(ap),
        wifiManager(wifi),
        mqttManager(mqtt) {}

  void begin() {
    server.on("/", HTTP_GET, [this]() { sendDashboard(); });
    server.on("/settings", HTTP_GET, [this]() { sendDashboard(); });
    server.on("/status", HTTP_GET, [this]() { sendStatus(); });
    server.on("/set", HTTP_GET, [this]() { handleSet(); });
    server.on("/save", HTTP_POST, [this]() { handleSave(); });
    server.on("/factory_reset", HTTP_POST, [this]() { handleFactoryReset(); });
    server.onNotFound([this]() { server.send(404, "application/json", "{\"error\":\"not_found\"}"); });
    server.begin();
  }

  void loop() {
    server.handleClient();
  }

 private:
  WebServer& server;
  DeviceConfig& config;
  const HardwareProfile& hardware;
  RelayManager& relayManager;
  StorageManager& storage;
  ApManager& apManager;
  WifiManager& wifiManager;
  MqttManager& mqttManager;

  void sendStatus() {
    StaticJsonDocument<1024> doc;
    doc["device_name"] = config.deviceName;
    doc["device_id"] = config.deviceId;
    doc["uuid"] = config.deviceUuid;
    doc["type"] = config.deviceType;
    doc["category"] = config.category;
    doc["protocol"] = config.protocol;
    doc["module"] = hardware.module;
    doc["firmware_version"] = hardware.firmware;
    doc["hardware"] = hardware.hardware;
    doc["model"] = hardware.model;
    doc["modelo"] = hardware.model;
    doc["lora"] = hardware.lora;
    doc["capabilities"] = hardware.capabilities;
    doc["mac"] = WiFi.macAddress();
    doc["sta_ip"] = wifiManager.staIp();
    doc["ap_ip"] = apManager.ip().toString();
    doc["ap_ssid"] = config.apSsid;
    doc["wifi_ssid"] = config.wifiSsid;
    doc["wifi_connected"] = wifiManager.connected();
    doc["mqtt_connected"] = mqttManager.connected();
    doc["mdns"] = String(hardware.mdns) + ".local";
    doc["t24"] = config.automatic;
    doc["v1"] = config.pump;
    doc["v2"] = config.oxygenator;
    doc["tOn"] = config.tOnMin;
    doc["tOff"] = config.tOffMin;
    doc["rem"] = relayManager.remainingSeconds();
    doc["elapsed"] = relayManager.elapsedSeconds();
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["heap"] = ESP.getFreeHeap();
    doc["uptime_ms"] = millis();

    String body;
    serializeJson(doc, body);
    server.send(200, "application/json", body);
  }

  void handleSet() {
    bool changed = false;

    if (server.hasArg("t24")) {
      relayManager.setAutomatic(server.arg("t24") == "true" || server.arg("t24") == "1");
      changed = true;
    }

    uint16_t nextOn = config.tOnMin;
    uint16_t nextOff = config.tOffMin;
    bool timersChanged = false;
    if (server.hasArg("tOn")) {
      nextOn = (uint16_t)server.arg("tOn").toInt();
      timersChanged = true;
    }
    if (server.hasArg("tOff")) {
      nextOff = (uint16_t)server.arg("tOff").toInt();
      timersChanged = true;
    }
    if (timersChanged) {
      if (!relayManager.setTimers(nextOn, nextOff)) {
        server.send(400, "application/json", "{\"error\":\"invalid_timer\"}");
        return;
      }
      changed = true;
    }

    if (server.hasArg("v1")) {
      if (!relayManager.setRelay("pump", server.arg("v1") == "true" || server.arg("v1") == "1")) {
        server.send(409, "application/json", "{\"error\":\"automatic_mode_locked\"}");
        return;
      }
      changed = true;
    }

    if (server.hasArg("v2")) {
      if (!relayManager.setRelay("oxygenator", server.arg("v2") == "true" || server.arg("v2") == "1")) {
        server.send(409, "application/json", "{\"error\":\"automatic_mode_locked\"}");
        return;
      }
      changed = true;
    }

    if (changed) {
      storage.save(config);
      mqttManager.publishStatus();
    }

    server.send(200, "application/json", "{\"status\":\"ok\"}");
  }

  void handleSave() {
    DeviceConfig next = config;
    if (server.hasArg("device_name")) next.deviceName = server.arg("device_name");
    if (server.hasArg("device_id")) next.deviceId = server.arg("device_id");
    if (server.hasArg("device_uuid")) next.deviceUuid = server.arg("device_uuid");
    if (server.hasArg("device_type")) next.deviceType = server.arg("device_type");
    if (server.hasArg("category")) next.category = server.arg("category");
    if (server.hasArg("protocol")) next.protocol = server.arg("protocol");
    if (server.hasArg("device_token")) next.deviceToken = server.arg("device_token");
    if (server.hasArg("wifi_ssid")) next.wifiSsid = server.arg("wifi_ssid");
    if (server.hasArg("wifi_pass")) next.wifiPass = server.arg("wifi_pass");
    if (server.hasArg("ap_ssid")) next.apSsid = server.arg("ap_ssid");
    if (server.hasArg("ap_pass")) next.apPassword = server.arg("ap_pass");
    if (server.hasArg("mqtt_broker")) next.mqttBroker = server.arg("mqtt_broker");
    if (server.hasArg("mqtt_user")) next.mqttUser = server.arg("mqtt_user");
    if (server.hasArg("mqtt_pass")) next.mqttPass = server.arg("mqtt_pass");
    if (server.hasArg("mqtt_topic")) next.mqttTopic = server.arg("mqtt_topic");

    if (next.apPassword.length() > 0 && next.apPassword.length() < 8) {
      server.send(400, "text/plain", "A senha do AP deve ter pelo menos 8 caracteres.");
      return;
    }

    sanitizeConfig(next);
    config = next;
    storage.save(config);

    server.send(200, "text/html", savedPage("Configuracoes salvas. O dispositivo vai reiniciar para aplicar rede/AP."));
    delay(900);
    ESP.restart();
  }

  void handleFactoryReset() {
    storage.factoryReset();
    server.send(200, "text/html", savedPage("Padrao de fabrica restaurado. O AP sera recriado no proximo boot."));
    delay(900);
    ESP.restart();
  }

  String savedPage(const String& message) {
    String page = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
    page += "<style>body{margin:0;background:#0b0b0b;color:#fff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px}.card{max-width:520px;border:1px solid #2d1647;background:#111;border-radius:18px;padding:28px}p{color:#c9c2d8;line-height:1.6}</style>";
    page += "</head><body><div class='card'><h1>SmartControl</h1><p>" + htmlEscape(message) + "</p></div></body></html>";
    return page;
  }

  void sendDashboard() {
    String page = R"HTML(
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>SmartControl Local</title>
  <style>
    :root{--bg:#0a0a0a;--text:#f5f5f7;--muted:#aeaeb2;--card:#1c1c1e;--card2:#2c2c2e;--border:#3e3e42;--accent:#007aff;--ok:#34c759;--warn:#ff9500;--danger:#ff3b30}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;padding:15px;display:flex;justify-content:center}.wrap{width:100%;max-width:760px}.header{text-align:center;margin:18px 0 26px}.brand{font-size:22px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase}.pill{display:inline-flex;margin-top:10px;border:1px solid #007aff33;border-radius:999px;padding:8px 12px;color:var(--muted);font-size:13px;background:#007aff12}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:15px}.card{background:var(--card);border:1px solid var(--border);border-radius:15px;padding:22px;box-shadow:0 10px 25px rgba(0,0,0,.45)}.card h2{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin:0 0 18px}.row{display:flex;justify-content:space-between;gap:14px;align-items:center;margin:15px 0}.switch{position:relative;display:inline-block;width:54px;height:30px;flex:0 0 auto}.switch input{display:none}.slider{position:absolute;cursor:pointer;inset:0;background:#3e3e42;border-radius:30px;transition:.25s}.slider:before{content:"";position:absolute;width:24px;height:24px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s}input:checked+.slider{background:var(--ok)}input:checked+.slider:before{transform:translateX(24px)}input:disabled+.slider{opacity:.5;cursor:not-allowed}.timer{font:800 40px/1.1 ui-monospace,Consolas,monospace;color:#fff}.muted{color:var(--muted);line-height:1.45}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}label{display:block;font-size:11px;color:var(--muted);margin:8px 0 6px;text-transform:uppercase;letter-spacing:1px}input{width:100%;border:1px solid var(--border);border-radius:10px;background:var(--card2);color:var(--text);padding:13px;font-size:15px;outline:none}input:focus{border-color:var(--accent)}.btn{width:100%;border:0;border-radius:12px;background:var(--accent);color:#fff;padding:14px 16px;font-weight:800;cursor:pointer;text-transform:uppercase;letter-spacing:.6px}.btn.secondary{background:#2c2c2e}.btn.danger{background:#ff3b3015;color:#ff6961;border:1px solid #ff3b3033}.status{display:flex;flex-wrap:wrap;gap:8px}.status span{border:1px solid var(--border);border-radius:10px;padding:8px 10px;color:var(--muted);font-size:13px;background:var(--card2)}a{color:var(--accent)}.stack{display:grid;gap:14px}@media(max-width:560px){body{padding:10px}.grid{grid-template-columns:1fr}.timer{font-size:34px}.card{padding:18px}}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="header">
      <div><div class="brand">SmartControl Local</div><div id="deviceName" class="muted">Carregando...</div></div>
      <div class="pill">Acesse tambem: 192.168.4.1</div>
    </section>
    <section class="grid">
      <div class="card">
        <h2>Status</h2>
        <div class="status">
          <span id="wifi">Wi-Fi: ...</span><span id="mqtt">MQTT: ...</span><span id="ap">AP: ...</span>
        </div>
        <p class="muted" id="hardware">Hardware...</p>
      </div>
      <div class="card">
        <h2>Timer</h2>
        <div id="phase" class="muted">...</div>
        <div id="clock" class="timer">00:00</div>
      </div>
      <div class="card">
        <h2>Reles</h2>
        <div class="row"><strong>Modo automatico</strong><label class="switch"><input id="automatic" type="checkbox" onchange="setValue('t24',this.checked)"><span class="slider"></span></label></div>
        <div class="row"><strong>Bomba</strong><label class="switch"><input id="pump" type="checkbox" onchange="setValue('v1',this.checked)"><span class="slider"></span></label></div>
        <div class="row"><strong>Oxigenador</strong><label class="switch"><input id="oxygenator" type="checkbox" onchange="setValue('v2',this.checked)"><span class="slider"></span></label></div>
      </div>
      <div class="card">
        <h2>Tempos</h2>
        <div class="fields">
          <div><label>Tempo ON (min)</label><input id="tOn" type="number" min="1" max="1440" onblur="setValue('tOn',this.value)"></div>
          <div><label>Tempo OFF (min)</label><input id="tOff" type="number" min="1" max="1440" onblur="setValue('tOff',this.value)"></div>
        </div>
      </div>
      <form class="card stack" method="post" action="/save">
        <h2>Configuracoes locais</h2>
        <div class="fields">
          <div><label>Nome do dispositivo</label><input name="device_name" value=")HTML";
    page += htmlEscape(config.deviceName);
    page += R"HTML("></div>
          <div><label>ID do dispositivo</label><input name="device_id" value=")HTML";
    page += htmlEscape(config.deviceId);
    page += R"HTML("></div>
          <div><label>UUID SmartControl</label><input name="device_uuid" value=")HTML";
    page += htmlEscape(config.deviceUuid);
    page += R"HTML("></div>
          <div><label>Classe</label><input name="category" value=")HTML";
    page += htmlEscape(config.category);
    page += R"HTML("></div>
          <div><label>Tipo</label><input name="device_type" value=")HTML";
    page += htmlEscape(config.deviceType);
    page += R"HTML("></div>
          <div><label>SSID Wi-Fi</label><input name="wifi_ssid" value=")HTML";
    page += htmlEscape(config.wifiSsid);
    page += R"HTML("></div>
          <div><label>Senha Wi-Fi</label><input type="password" name="wifi_pass" value=")HTML";
    page += htmlEscape(config.wifiPass);
    page += R"HTML("></div>
          <div><label>SSID AP</label><input name="ap_ssid" value=")HTML";
    page += htmlEscape(config.apSsid);
    page += R"HTML("></div>
          <div><label>Senha AP (min. 8)</label><input type="password" name="ap_pass" value=")HTML";
    page += htmlEscape(config.apPassword);
    page += R"HTML("></div>
        </div>
        <h2>MQTT / Cloud</h2>
        <div class="fields">
          <div><label>Broker MQTT</label><input name="mqtt_broker" value=")HTML";
    page += htmlEscape(config.mqttBroker);
    page += R"HTML("></div>
          <div><label>Usuario MQTT</label><input name="mqtt_user" value=")HTML";
    page += htmlEscape(config.mqttUser);
    page += R"HTML("></div>
          <div><label>Senha MQTT</label><input type="password" name="mqtt_pass" value=")HTML";
    page += htmlEscape(config.mqttPass);
    page += R"HTML("></div>
          <div><label>Topico base</label><input name="mqtt_topic" value=")HTML";
    page += htmlEscape(config.mqttTopic);
    page += R"HTML("></div>
          <div><label>Protocolo</label><input name="protocol" value=")HTML";
    page += htmlEscape(config.protocol);
    page += R"HTML("></div>
          <div><label>Token do dispositivo</label><input name="device_token" value=")HTML";
    page += htmlEscape(config.deviceToken);
    page += R"HTML("></div>
        </div>
        <button class="btn" type="submit">Salvar configuracoes</button>
      </form>
      <form class="card" method="post" action="/factory_reset" onsubmit="return confirm('Restaurar padrao de fabrica?')">
        <h2>Manutencao</h2>
        <button class="btn danger" type="submit">Restaurar padrao de fabrica</button>
      </form>
    </section>
  </main>
  <script>
    function qs(id){return document.getElementById(id)}
    function setValue(k,v){fetch('/set?'+k+'='+encodeURIComponent(v)).then(load)}
    function fmt(s){s=Number(s||0);const m=Math.floor(s/60),r=s%60;return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0')}
    function load(){fetch('/status').then(r=>r.json()).then(d=>{
      qs('deviceName').textContent=d.device_name+' - '+d.device_id
      qs('wifi').textContent='Wi-Fi: '+(d.wifi_connected?'online':'offline')
      qs('mqtt').textContent='MQTT: '+(d.mqtt_connected?'online':'offline')
      qs('ap').textContent='AP: '+d.ap_ssid+' / '+d.ap_ip
      qs('hardware').textContent=d.hardware+' - '+d.model+' - '+d.uuid+' - RSSI '+d.wifi_rssi+' dBm'
      qs('automatic').checked=!!d.t24; qs('pump').checked=!!d.v1; qs('oxygenator').checked=!!d.v2
      qs('pump').disabled=!!d.t24; qs('oxygenator').disabled=!!d.t24
      if(document.activeElement!==qs('tOn')) qs('tOn').value=d.tOn
      if(document.activeElement!==qs('tOff')) qs('tOff').value=d.tOff
      qs('clock').textContent=fmt(d.rem)
      qs('phase').textContent=d.t24?(d.v1?'Bomba ligada':'Bomba em repouso'):'Modo manual'
    })}
    load(); setInterval(load,1000)
  </script>
</body>
</html>
)HTML";
    server.send(200, "text/html", page);
  }
};

}  // namespace SmartControl
