#include <Arduino.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <WiFiManager.h>
#include <LittleFS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <ESPmDNS.h>
#include <string.h>

// --- Hardware Heltec V2 ---
#define OLED_RST 16
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, OLED_RST, 15, 4);
#define RELAY_BOMBA 2       
#define RELAY_OXIGENADOR 17 

// --- OBJETOS GLOBAIS ---
WebServer server(80);
WiFiClient plainWifiClient;
WiFiClientSecure secureWifiClient;
PubSubClient mqttClient(plainWifiClient);

// --- Variáveis de Controle ---
bool trava24h = true; 
bool v1 = true, v2 = true;
int tOnMin = 10, tOffMin = 10; 
unsigned long ultimoTempoBomba = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastMqttHeartbeat = 0;
String mBroker, mUser, mPass;
String mTopic = "smartcontrol/cliente/projeto/hidroponia01";
String mDeviceId = "hidroponia01";
String mDeviceToken = "";
String mqttHost = "";
uint16_t mqttPort = 1883;
bool mqttUseTls = false;

const char* SMARTCONTROL_MODULE = "heltec_esp32_lora_hydroponics";
const char* SMARTCONTROL_FIRMWARE = "smartcontrol-hidroponia-1.0.0";
const char* SMARTCONTROL_HARDWARE = "Heltec ESP32 LoRa V2";

// --- Persistência (LittleFS) ---
void saveSettings() {
    File f = LittleFS.open("/config.txt", "w");
    if (f) {
        f.println(trava24h); 
        f.println(tOnMin); 
        f.println(tOffMin);
        f.println(mBroker); 
        f.println(mUser); 
        f.println(mPass); 
        f.println(mTopic);
        f.println(mDeviceId);
        f.println(mDeviceToken);
        f.close();
        Serial.println("Configuracoes salvas!");
    }
}

void loadSettings() {
    if (LittleFS.exists("/config.txt")) {
        File f = LittleFS.open("/config.txt", "r");
        if (f) {
            trava24h = f.readStringUntil('\n').toInt();
            tOnMin = f.readStringUntil('\n').toInt();
            tOffMin = f.readStringUntil('\n').toInt();
            mBroker = f.readStringUntil('\n'); mBroker.trim();
            mUser = f.readStringUntil('\n'); mUser.trim();
            mPass = f.readStringUntil('\n'); mPass.trim();
            mTopic = f.readStringUntil('\n'); mTopic.trim();
            if (f.available()) { mDeviceId = f.readStringUntil('\n'); mDeviceId.trim(); }
            if (f.available()) { mDeviceToken = f.readStringUntil('\n'); mDeviceToken.trim(); }
            if (tOnMin <= 0) tOnMin = 10; 
            if (tOffMin <= 0) tOffMin = 10;
            if (!mDeviceId.length()) mDeviceId = "hidroponia01";
            if (!mTopic.length()) mTopic = "smartcontrol/cliente/projeto/" + mDeviceId;
            f.close();
        }
    }
}

// --- Display OLED ---
void updateDisplay() {
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.setCursor(0, 8);
    u8g2.print("IP: "); u8g2.print(WiFi.localIP().toString());
    u8g2.setCursor(0, 18);
    u8g2.print("smarthidroponia.local"); 
    u8g2.drawHLine(0, 21, 128);
    
    u8g2.setFont(u8g2_font_unifont_t_symbols);
    u8g2.setCursor(0, 36);
    u8g2.print(v1 ? "ON  " : "OFF "); u8g2.drawGlyph(40, 36, 0x2614);
    u8g2.setFont(u8g2_font_6x10_tf); u8g2.print(" BOMBA");
    
    u8g2.setFont(u8g2_font_unifont_t_symbols);
    u8g2.setCursor(0, 50);
    u8g2.print(v2 ? "ON  " : "OFF "); u8g2.drawGlyph(40, 50, 0x2605);
    u8g2.setFont(u8g2_font_6x10_tf); u8g2.print(" OXIGEN");
    
    if (trava24h) {
        long restante = ((v1 ? tOnMin : tOffMin) * 60) - ((millis() - ultimoTempoBomba) / 1000);
        if (restante < 0) restante = 0;
        u8g2.drawFrame(0, 53, 128, 11);
        u8g2.setCursor(35, 62);
        u8g2.printf("%02d:%02d", (int)(restante / 60), (int)(restante % 60));
    } else { 
        u8g2.setCursor(35, 62); 
        u8g2.print("MANUAL"); 
    }
    u8g2.sendBuffer();
}

// --- Integracao MQTT SmartControl ---
long calcularRestante() {
    long restante = ((v1 ? tOnMin : tOffMin) * 60) - ((millis() - ultimoTempoBomba) / 1000);
    return restante < 0 ? 0 : restante;
}

String smartControlBaseTopic() {
    String base = mTopic;
    base.trim();
    if (!base.length()) base = "smartcontrol/cliente/projeto/" + mDeviceId;
    while (base.endsWith("/")) base.remove(base.length() - 1);

    const char* suffixes[] = {"/cmd", "/status", "/telemetry", "/config", "/heartbeat", "/ack", "/availability"};
    for (const char* suffix : suffixes) {
        if (base.endsWith(suffix)) {
            base.remove(base.length() - strlen(suffix));
            break;
        }
    }

    return base;
}

void parseMqttBrokerConfig() {
    mqttHost = mBroker;
    mqttHost.trim();
    mqttUseTls = false;
    mqttPort = 1883;

    if (!mqttHost.length()) return;

    if (mqttHost.startsWith("mqtts://") || mqttHost.startsWith("ssl://")) mqttUseTls = true;

    int schemeIndex = mqttHost.indexOf("://");
    if (schemeIndex >= 0) mqttHost = mqttHost.substring(schemeIndex + 3);

    int slashIndex = mqttHost.indexOf('/');
    if (slashIndex >= 0) mqttHost = mqttHost.substring(0, slashIndex);

    int portIndex = mqttHost.lastIndexOf(':');
    if (portIndex > 0) {
        mqttPort = (uint16_t)mqttHost.substring(portIndex + 1).toInt();
        mqttHost = mqttHost.substring(0, portIndex);
    } else if (mqttUseTls) {
        mqttPort = 8883;
    }

    if (mqttPort == 8883) mqttUseTls = true;
}

void publishJson(const String& suffix, JsonDocument& doc, bool retained = false) {
    if (!mqttClient.connected()) return;

    char buffer[1024];
    size_t length = serializeJson(doc, buffer);
    String topic = smartControlBaseTopic() + "/" + suffix;
    mqttClient.publish(topic.c_str(), (const uint8_t*)buffer, length, retained);
}

void publishAvailability(const char* status) {
    StaticJsonDocument<256> doc;
    doc["protocol"] = "smartcontrol.mqtt.v1";
    doc["device_id"] = mDeviceId;
    if (mDeviceToken.length()) doc["device_token"] = mDeviceToken;
    doc["module"] = SMARTCONTROL_MODULE;
    doc["status"] = status;
    doc["uptime_ms"] = millis();
    publishJson("availability", doc, true);
}

void publishStatus(const char* eventType = "status") {
    StaticJsonDocument<768> doc;
    doc["protocol"] = "smartcontrol.mqtt.v1";
    doc["device_id"] = mDeviceId;
    if (mDeviceToken.length()) doc["device_token"] = mDeviceToken;
    doc["module"] = SMARTCONTROL_MODULE;
    doc["firmware_version"] = SMARTCONTROL_FIRMWARE;
    doc["hardware_version"] = SMARTCONTROL_HARDWARE;
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["mdns"] = "smarthidroponia.local";
    doc["online"] = true;
    doc["t24"] = trava24h;
    doc["v1"] = v1;
    doc["v2"] = v2;
    doc["tOn"] = tOnMin;
    doc["tOff"] = tOffMin;
    doc["rem"] = calcularRestante();
    doc["uptime_ms"] = millis();

    publishJson(eventType, doc, strcmp(eventType, "status") == 0);
}

void publishAck(const String& requestId, const String& command, bool accepted, const String& reason = "ok") {
    StaticJsonDocument<384> doc;
    doc["protocol"] = "smartcontrol.mqtt.v1";
    doc["device_id"] = mDeviceId;
    if (mDeviceToken.length()) doc["device_token"] = mDeviceToken;
    doc["request_id"] = requestId;
    doc["command"] = command;
    doc["accepted"] = accepted;
    doc["reason"] = reason;
    doc["uptime_ms"] = millis();
    publishJson("ack", doc, false);
}

void applyAutomaticMode(bool enabled) {
    if (enabled && !trava24h) {
        digitalWrite(RELAY_OXIGENADOR, LOW);
        v2 = true;
        delay(1000);
        digitalWrite(RELAY_BOMBA, LOW);
        v1 = true;
        ultimoTempoBomba = millis();
    }
    trava24h = enabled;
}

bool applyRemoteConfig(JsonObject data, String requestId, String command) {
    bool changed = false;

    if (data.containsKey("enabled") || data.containsKey("automatic")) {
        bool enabled = data.containsKey("enabled") ? data["enabled"].as<bool>() : data["automatic"].as<bool>();
        applyAutomaticMode(enabled);
        changed = true;
    }

    if (data.containsKey("tOn") || data.containsKey("tOff")) {
        int newOn = data.containsKey("tOn") ? data["tOn"].as<int>() : tOnMin;
        int newOff = data.containsKey("tOff") ? data["tOff"].as<int>() : tOffMin;

        if (newOn < 1 || newOff < 1 || newOn > 1440 || newOff > 1440) {
            publishAck(requestId, command, false, "invalid_timer");
            return false;
        }

        tOnMin = newOn;
        tOffMin = newOff;
        changed = true;
    }

    if (changed) {
        saveSettings();
        publishAck(requestId, command, true);
        publishStatus();
    } else {
        publishAck(requestId, command, false, "empty_config");
    }

    return changed;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error) return;

    String requestId = doc["request_id"] | "";
    String command = doc["command"] | "";
    String incomingDeviceId = doc["device_id"] | "";
    String topicText = String(topic);
    bool configTopic = topicText.endsWith("/config");

    if (incomingDeviceId.length() && incomingDeviceId != mDeviceId) return;

    JsonObject data = doc["payload"].is<JsonObject>() ? doc["payload"].as<JsonObject>() : doc.as<JsonObject>();
    if (configTopic && (!command.length() || command == "set_config")) {
        applyRemoteConfig(data, requestId, "set_config");
        return;
    }

    if (command == "set_auto") {
        bool enabled = data["enabled"] | false;
        applyAutomaticMode(enabled);
        saveSettings();
        publishAck(requestId, command, true);
        publishStatus();
        return;
    }

    if (command == "set_timers") {
        applyRemoteConfig(data, requestId, command);
        return;
    }

    if (command == "set_relay") {
        if (trava24h) {
            publishAck(requestId, command, false, "automatic_mode_locked");
            return;
        }

        String relay = data["relay"] | "";
        bool value = data["value"] | false;

        if (relay == "pump") {
            v1 = value;
            digitalWrite(RELAY_BOMBA, v1 ? LOW : HIGH);
        } else if (relay == "oxygenator") {
            v2 = value;
            digitalWrite(RELAY_OXIGENADOR, v2 ? LOW : HIGH);
        } else {
            publishAck(requestId, command, false, "invalid_relay");
            return;
        }

        saveSettings();
        publishAck(requestId, command, true);
        publishStatus();
        return;
    }

    if (command == "request_status") {
        publishAck(requestId, command, true);
        publishStatus();
        return;
    }

    if (command == "factory_reset") {
        bool confirm = data["confirm"] | false;
        if (!confirm) {
            publishAck(requestId, command, false, "missing_confirm");
            return;
        }

        publishAck(requestId, command, true, "restarting");
        publishAvailability("offline");
        delay(500);
        LittleFS.format();
        WiFiManager wm;
        wm.resetSettings();
        delay(1000);
        ESP.restart();
    }

    publishAck(requestId, command, false, "unknown_command");
}

void reconnectMQTT() {
    if (!mBroker.length() || mqttClient.connected()) return;
    if (millis() - lastMqttReconnectAttempt < 5000) return;
    lastMqttReconnectAttempt = millis();

    parseMqttBrokerConfig();
    if (!mqttHost.length()) return;

    if (mqttUseTls) {
        secureWifiClient.setInsecure(); // Troque por CA raiz para producao com validacao TLS completa.
        mqttClient.setClient(secureWifiClient);
    } else {
        mqttClient.setClient(plainWifiClient);
    }

    mqttClient.setServer(mqttHost.c_str(), mqttPort);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);

    String clientId = "SmartControl-" + mDeviceId + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    String baseTopic = smartControlBaseTopic();
    String willTopic = baseTopic + "/availability";
    const char* user = mUser.length() ? mUser.c_str() : nullptr;
    const char* pass = mPass.length() ? mPass.c_str() : nullptr;

    Serial.print("Conectando MQTT em ");
    Serial.print(mqttHost);
    Serial.print(":");
    Serial.print(mqttPort);
    Serial.print(" topico ");
    Serial.println(baseTopic);

    if (mqttClient.connect(clientId.c_str(), user, pass, willTopic.c_str(), 1, true, "{\"status\":\"offline\"}")) {
        mqttClient.subscribe((baseTopic + "/cmd").c_str(), 1);
        mqttClient.subscribe((baseTopic + "/config").c_str(), 1);
        publishAvailability("online");
        publishStatus();
        Serial.println("MQTT SmartControl conectado.");
    } else {
        Serial.print("Falha MQTT, state=");
        Serial.println(mqttClient.state());
    }
}

void smartControlMqttLoop() {
    reconnectMQTT();
    mqttClient.loop();

    if (mqttClient.connected() && millis() - lastMqttHeartbeat > 15000) {
        lastMqttHeartbeat = millis();
        publishStatus("heartbeat");
    }
}

// --- Dashboard HTML Principal ---
const char htmlPage[] PROGMEM = R"=====(
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { background:#0a0a0a; color:#e1e1e1; font-family:sans-serif; padding:15px; display:flex; flex-direction:column; align-items:center; }
        .container { width:100%; max-width:600px; }
        .logo { text-align:center; margin-top: 20px;}
        .logo svg { width:55px; height:55px; fill:#007aff; }
        .title { text-align:center; font-weight:bold; font-size:20px; margin-bottom:30px; color:#fff; letter-spacing: 2px;}
        .card { background:#1c1c1e; border-radius:15px; padding:25px; margin-bottom:15px; box-shadow:0 10px 25px rgba(0,0,0,0.5); }
        h2 { font-size:11px; color:#555; text-transform:uppercase; margin:0 0 20px 0; letter-spacing:1.5px; }
        .row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .label-group { display:flex; align-items:center; gap:15px; }
        .icon { width:24px; height:24px; fill:#007aff; }
        .switch { position:relative; width:54px; height:30px; }
        .switch input { opacity:0; width:0; height:0; }
        .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#3e3e42; transition:.4s; border-radius:30px; }
        .slider:before { position:absolute; content:""; height:24px; width:24px; left:3px; bottom:3px; background:#fff; transition:.4s; border-radius:50%; }
        input:checked + .slider { background:#34c759; }
        input:checked + .slider:before { transform:translateX(24px); }
        input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }
        .adjust-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
        .adjust-box { background:#2c2c2e; padding:12px; border-radius:12px; border: 1px solid #3e3e42; }
        .adjust-box label { display:block; font-size:10px; color:#aeaeb2; margin-bottom:8px; text-transform:uppercase; }
        .input-group input { background:#1c1c1e; border:1px solid #007aff; color:#fff; padding:12px 5px; border-radius:8px; width:100%; text-align:center; font-size:18px; box-sizing: border-box; outline:none;}
        .timer-box { background:#007aff15; padding:15px; border-radius:12px; text-align:center; margin-top:15px; border: 1px solid #007aff33; }
        .timer-val { font-size:26px; color:#fff; font-weight:bold; font-family:monospace; }
        .config-link { text-align:center; color:#555; font-size:13px; margin-top:25px; cursor:pointer; text-decoration:none; display:block;}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo"><svg viewBox="0 0 24 24"><path d="M12,3L2,12H5V20H11V14H13V20H19V12H22L12,3Z"/></svg></div>
        <div class="title">SMARTCONTROL</div>
        <div class="card">
            <h2>CONTROLE DE FLUXO</h2>
            <div class="row">
                <div class="label-group"><svg class="icon" viewBox="0 0 24 24"><path d="M12,2A10,10 0 1,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 1,1 20,12A8,8 0 0,1 12,20M11,11V6H13V11H18V13H13V18H11V13H6V11H11Z"/></svg><span>Modo Automático</span></div>
                <label class="switch"><input type="checkbox" id="t24" onchange="update('t24', this.checked)"><span class="slider"></span></label>
            </div>
            <div id="autoControls" style="display:none;">
                <div class="adjust-container">
                    <div class="adjust-box"><label>Tempo ON (Min)</label><div class="input-group"><input type="number" inputmode="numeric" id="tOn" onblur="update('tOn', this.value)"></div></div>
                    <div class="adjust-box"><label>Tempo OFF (Min)</label><div class="input-group"><input type="number" inputmode="numeric" id="tOff" onblur="update('tOff', this.value)"></div></div>
                </div>
                <div class="timer-box"><div id="statusLabel" style="font-size:11px; margin-bottom:5px; text-transform:uppercase;">...</div><div id="clock" class="timer-val">00:00</div></div>
            </div>
            <div style="margin-top:20px; border-top: 1px solid #2c2c2e; padding-top: 20px;">
                <div class="row">
                    <div class="label-group"><svg class="icon" viewBox="0 0 24 24"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg><span>Bomba d'Água</span></div>
                    <label class="switch"><input type="checkbox" id="v1" onchange="update('v1', this.checked)"><span class="slider"></span></label>
                </div>
                <div class="row">
                    <div class="label-group"><svg class="icon" viewBox="0 0 24 24"><path d="M12,14A4,4 0 1,1 8,10A4,4 0 0,1 12,14M17,10A3,3 0 1,1 14,7A3,3 0 0,1 17,10M12,6A2,2 0 1,1 10,4A2,2 0 0,1 12,6Z"/></svg><span>Oxigenador (24h)</span></div>
                    <label class="switch"><input type="checkbox" id="v2" onchange="update('v2', this.checked)"><span class="slider"></span></label>
                </div>
            </div>
            <a href="/settings" class="config-link">⚙️ CONFIGURAÇÕES AVANÇADAS</a>
        </div>
    </div>
    <script>
        function update(k,v){ fetch(`/set?${k}=${v}`); }
        function load(){ 
            fetch('/status').then(r=>r.json()).then(d=>{ 
                document.getElementById('t24').checked=d.t24; 
                document.getElementById('v1').checked=d.v1; 
                document.getElementById('v2').checked=d.v2;
                document.getElementById('v1').disabled = d.t24;
                document.getElementById('v2').disabled = d.t24;
                if(document.activeElement.id !== 'tOn') document.getElementById('tOn').value = d.tOn;
                if(document.activeElement.id !== 'tOff') document.getElementById('tOff').value = d.tOff;
                if(d.t24){
                    document.getElementById('autoControls').style.display = 'block';
                    let min = Math.floor(d.rem / 60); let sec = d.rem % 60;
                    document.getElementById('clock').innerText = (min<10?'0':'')+min + ':' + (sec<10?'0':'')+sec;
                    document.getElementById('statusLabel').innerText = d.v1 ? "BOMBA LIGADA (ON)" : "BOMBA EM REPOUSO (OFF)";
                    document.getElementById('statusLabel').style.color = d.v1 ? "#34c759" : "#ff9500";
                } else { 
                    document.getElementById('autoControls').style.display = 'none'; 
                }
            }); 
        }
        window.onload=load; 
        setInterval(load,1000);
    </script>
</body>
</html>
)=====";

void setup() {
    Serial.begin(115200);
    u8g2.begin();
    LittleFS.begin(true);
    loadSettings();
    
    pinMode(RELAY_BOMBA, OUTPUT); 
    pinMode(RELAY_OXIGENADOR, OUTPUT);
    digitalWrite(RELAY_BOMBA, v1 ? LOW : HIGH); 
    digitalWrite(RELAY_OXIGENADOR, v2 ? LOW : HIGH);
    
    WiFiManager wm; 
    wm.autoConnect("ESP_Hidroponia");

    if (MDNS.begin("smarthidroponia")) {
        MDNS.addService("http", "tcp", 80);
    }
    
    ArduinoOTA.setHostname("SmartControl-Hidroponia");
    ArduinoOTA.onStart([]() { 
        u8g2.clearBuffer(); 
        u8g2.print("Atualizando..."); 
        u8g2.sendBuffer(); 
    });
    ArduinoOTA.begin();

    server.on("/", [](){ 
        server.send(200, "text/html", htmlPage); 
    });
    
    server.on("/status", [](){
        long restante = calcularRestante();
        String json = "{\"device_id\":\""+mDeviceId+"\",\"module\":\""+String(SMARTCONTROL_MODULE)+"\",\"firmware_version\":\""+String(SMARTCONTROL_FIRMWARE)+"\",\"ip\":\""+WiFi.localIP().toString()+"\",\"mac\":\""+WiFi.macAddress()+"\",\"mdns\":\"smarthidroponia.local\",\"mqtt\":"+String(mqttClient.connected()?"true":"false")+",\"t24\":"+String(trava24h?"true":"false")+",\"v1\":"+String(v1?"true":"false")+",\"v2\":"+String(v2?"true":"false")+",\"rem\":"+String(restante)+",\"tOn\":"+String(tOnMin)+",\"tOff\":"+String(tOffMin)+"}";
        server.send(200, "application/json", json);
    });

    server.on("/set", [](){
        if (server.hasArg("t24")) { 
            bool novoT24 = (server.arg("t24") == "true"); 
            if (novoT24 && !trava24h) {
                digitalWrite(RELAY_OXIGENADOR, LOW); v2 = true;
                delay(1000);
                digitalWrite(RELAY_BOMBA, LOW); v1 = true;
                ultimoTempoBomba = millis();
            }
            trava24h = novoT24; 
        }
        if (server.hasArg("tOn")) { tOnMin = server.arg("tOn").toInt(); }
        if (server.hasArg("tOff")) { tOffMin = server.arg("tOff").toInt(); }
        if (server.hasArg("v1") && !trava24h) { v1 = (server.arg("v1") == "true"); digitalWrite(RELAY_BOMBA, v1 ? LOW : HIGH); }
        if (server.hasArg("v2") && !trava24h) { v2 = (server.arg("v2") == "true"); digitalWrite(RELAY_OXIGENADOR, v2 ? LOW : HIGH); }
        saveSettings(); 
        publishStatus();
        server.send(200, "text/plain", "OK");
    });

    server.on("/settings", [](){
        String h = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'><style>";
        h += "body{background:#0a0a0a;color:#fff;font-family:sans-serif;padding:15px;display:flex;flex-direction:column;align-items:center;}";
        h += ".container{width:100%;max-width:600px;}";
        h += ".card{background:#1c1c1e;border-radius:15px;padding:25px;margin-bottom:15px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}";
        h += "h2{text-align:center;font-weight:bold;font-size:18px;margin-bottom:25px;letter-spacing:1.5px;text-transform:uppercase;}";
        h += "label{display:block;font-size:11px;color:#555;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;}";
        h += "input{width:100%;padding:14px;margin-bottom:20px;background:#2c2c2e;border:1px solid #3e3e42;color:#fff;border-radius:10px;font-size:16px;box-sizing:border-box;outline:none;transition:0.3s;}";
        h += "input:focus{border-color:#007aff;}";
        h += ".btn{width:100%;padding:16px;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;text-transform:uppercase;letter-spacing:1px;transition:0.3s;}";
        h += ".btn-save{background:#007aff;color:#fff;margin-top:10px;}";
        h += ".btn-save:active{transform:scale(0.98);background:#0056b3;}";
        h += ".btn-reset{background:#ff3b3015;color:#ff3b30;border:1px solid #ff3b3033;margin-top:15px;}";
        h += ".btn-reset:active{background:#ff3b3033;}";
        h += ".back{display:block;text-align:center;margin-top:25px;color:#555;text-decoration:none;font-size:13px;}";
        h += "</style></head><body><div class='container'><div class='card'>";
        h += "<h2>Ajustes MQTT</h2><form action='/save_mqtt' method='POST'>";
        h += "<label>Broker MQTT:</label><input name='b' value='" + mBroker + "' placeholder='mqtts://cluster.sua-conta:8883'>";
        h += "<label>Usuário:</label><input name='u' value='" + mUser + "'>";
        h += "<label>Senha:</label><input type='password' name='p' value='" + mPass + "'>";
        h += "<label>Tópico base:</label><input name='t' value='" + mTopic + "' placeholder='smartcontrol/cliente/projeto/hidroponia01'>";
        h += "<label>ID do dispositivo:</label><input name='d' value='" + mDeviceId + "' placeholder='hidroponia01'>";
        h += "<label>Token do dispositivo (opcional):</label><input name='k' value='" + mDeviceToken + "'>";
        h += "<button type='submit' class='btn btn-save'>SALVAR E REINICIAR</button></form>";
        h += "<button class='btn btn-reset' onclick='if(confirm(\"Resetar tudo?\")) window.location.href=\"/factory_reset\"'>RESTAURAR PADRÃO DE FÁBRICA</button>";
        h += "</div><a href='/' class='back'>← Voltar ao Painel</a></div></body></html>";
        server.send(200, "text/html", h);
    });

    server.on("/save_mqtt", HTTP_POST, [](){
        mBroker = server.arg("b"); mUser = server.arg("u"); mPass = server.arg("p"); mTopic = server.arg("t");
        if (server.hasArg("d")) { mDeviceId = server.arg("d"); mDeviceId.trim(); }
        if (server.hasArg("k")) { mDeviceToken = server.arg("k"); mDeviceToken.trim(); }
        if (!mDeviceId.length()) mDeviceId = "hidroponia01";
        if (!mTopic.length()) mTopic = "smartcontrol/cliente/projeto/" + mDeviceId;
        saveSettings(); 
        server.send(200, "text/plain", "Configuracoes Salvas! Reiniciando..."); 
        delay(2000); ESP.restart();
    });

    server.on("/factory_reset", [](){
        server.send(200, "text/plain", "Resetando... O dispositivo reiniciara em modo AP.");
        LittleFS.format(); WiFiManager wm; wm.resetSettings();
        delay(2000); ESP.restart();
    });

    server.begin();
}

void loop() {
    ArduinoOTA.handle();
    server.handleClient();
    smartControlMqttLoop();
    if (millis() - lastDisplayUpdate > 500) { lastDisplayUpdate = millis(); updateDisplay(); }
    if (trava24h) {
        unsigned long intervalo = (v1 ? tOnMin : tOffMin) * 60000UL;
        if (millis() - ultimoTempoBomba >= intervalo) {
            ultimoTempoBomba = millis(); v1 = !v1; 
            digitalWrite(RELAY_BOMBA, v1 ? LOW : HIGH);
            publishStatus();
        }
    }
}
