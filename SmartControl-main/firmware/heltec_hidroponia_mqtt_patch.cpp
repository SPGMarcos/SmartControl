/*
  SmartControl Heltec ESP32 LoRa Hidroponia - patch MQTT Cloud

  Este arquivo nao substitui o firmware atual. Ele mostra os blocos que devem
  ser incorporados ao firmware existente para publicar status, heartbeat e
  receber comandos do backend SmartControl.
*/

#define SMARTCONTROL_MODULE "heltec_esp32_lora_hydroponics"
#define SMARTCONTROL_FIRMWARE "smartcontrol-hidroponia-1.0.0"

String scDeviceId = "hidroponia01";
String scBaseTopic;
unsigned long lastMqttHeartbeat = 0;

long calcularRestanteSmartControl() {
  long restante = ((v1 ? tOnMin : tOffMin) * 60) - ((millis() - ultimoTempoBomba) / 1000);
  return restante < 0 ? 0 : restante;
}

void smartControlBuildTopics() {
  scBaseTopic = mTopic.length() ? mTopic : "smartcontrol/cliente/hidroponia/" + scDeviceId;
  scBaseTopic.trim();
  while (scBaseTopic.endsWith("/")) scBaseTopic.remove(scBaseTopic.length() - 1);
}

void smartControlPublishJson(const String& suffix, JsonDocument& doc, bool retained = false) {
  if (!mqttClient.connected()) return;

  char buffer[768];
  serializeJson(doc, buffer);
  mqttClient.publish((scBaseTopic + "/" + suffix).c_str(), buffer, retained);
}

void smartControlPublishStatus(const char* eventType = "status") {
  StaticJsonDocument<768> doc;
  doc["device_id"] = scDeviceId;
  doc["module"] = SMARTCONTROL_MODULE;
  doc["firmware_version"] = SMARTCONTROL_FIRMWARE;
  doc["hardware_version"] = "Heltec ESP32 LoRa V2";
  doc["mac"] = WiFi.macAddress();
  doc["ip"] = WiFi.localIP().toString();
  doc["mdns"] = "smarthidroponia.local";
  doc["t24"] = trava24h;
  doc["v1"] = v1;
  doc["v2"] = v2;
  doc["tOn"] = tOnMin;
  doc["tOff"] = tOffMin;
  doc["rem"] = calcularRestanteSmartControl();
  doc["uptime_ms"] = millis();

  smartControlPublishJson(eventType, doc, true);
}

void smartControlAck(const String& requestId, const String& command, bool accepted, const String& reason = "ok") {
  StaticJsonDocument<384> doc;
  doc["device_id"] = scDeviceId;
  doc["request_id"] = requestId;
  doc["command"] = command;
  doc["accepted"] = accepted;
  doc["reason"] = reason;
  doc["at_ms"] = millis();

  smartControlPublishJson("ack", doc, false);
}

void smartControlHandleCommand(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<768> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) return;

  String requestId = doc["request_id"] | "";
  String command = doc["command"] | "";
  JsonObject data = doc["payload"].as<JsonObject>();

  if (command == "set_auto") {
    bool enabled = data["enabled"] | false;
    if (enabled && !trava24h) {
      digitalWrite(RELAY_OXIGENADOR, LOW);
      v2 = true;
      delay(1000);
      digitalWrite(RELAY_BOMBA, LOW);
      v1 = true;
      ultimoTempoBomba = millis();
    }
    trava24h = enabled;
    saveSettings();
    smartControlAck(requestId, command, true);
    smartControlPublishStatus();
    return;
  }

  if (command == "set_timers") {
    int newOn = data["tOn"] | tOnMin;
    int newOff = data["tOff"] | tOffMin;
    if (newOn < 1 || newOff < 1 || newOn > 1440 || newOff > 1440) {
      smartControlAck(requestId, command, false, "invalid_timer");
      return;
    }
    tOnMin = newOn;
    tOffMin = newOff;
    saveSettings();
    smartControlAck(requestId, command, true);
    smartControlPublishStatus();
    return;
  }

  if (command == "set_relay") {
    if (trava24h) {
      smartControlAck(requestId, command, false, "automatic_mode_locked");
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
      smartControlAck(requestId, command, false, "invalid_relay");
      return;
    }
    saveSettings();
    smartControlAck(requestId, command, true);
    smartControlPublishStatus();
    return;
  }

  if (command == "request_status") {
    smartControlAck(requestId, command, true);
    smartControlPublishStatus();
    return;
  }

  if (command == "factory_reset") {
    bool confirm = data["confirm"] | false;
    if (!confirm) {
      smartControlAck(requestId, command, false, "missing_confirm");
      return;
    }
    smartControlAck(requestId, command, true, "restarting");
    delay(500);
    LittleFS.format();
    WiFiManager wm;
    wm.resetSettings();
    delay(1000);
    ESP.restart();
  }

  smartControlAck(requestId, command, false, "unknown_command");
}

void smartControlMqttReconnect() {
  if (!mBroker.length() || mqttClient.connected()) return;

  smartControlBuildTopics();
  mqttClient.setServer(mBroker.c_str(), 1883);
  mqttClient.setCallback(smartControlHandleCommand);

  String clientId = "SmartControl-" + scDeviceId + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  String availabilityTopic = scBaseTopic + "/availability";

  if (mqttClient.connect(clientId.c_str(), mUser.c_str(), mPass.c_str(), availabilityTopic.c_str(), 1, true, "{\"status\":\"offline\"}")) {
    mqttClient.subscribe((scBaseTopic + "/cmd").c_str(), 1);
    StaticJsonDocument<128> online;
    online["device_id"] = scDeviceId;
    online["status"] = "online";
    smartControlPublishJson("availability", online, true);
    smartControlPublishStatus();
  }
}

void smartControlLoop() {
  smartControlMqttReconnect();
  mqttClient.loop();

  if (millis() - lastMqttHeartbeat > 15000) {
    lastMqttHeartbeat = millis();
    smartControlPublishStatus("heartbeat");
  }
}
