#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt_manager.h"
#include "relay_manager.h"
#include "storage_manager.h"

namespace SmartControl {

class CommandManager {
 public:
  CommandManager(DeviceConfig& cfg, RelayManager& relays, StorageManager& store, MqttManager& mqtt)
      : config(cfg), relayManager(relays), storage(store), mqttManager(mqtt) {}

  void handle(JsonObject data, const String& requestId, const String& command, bool configTopic) {
    String cmd = command;
    if (configTopic && (!cmd.length() || cmd == "set_config")) cmd = "set_config";

    if (isDuplicateRequest(requestId)) {
      Serial.print("[SmartControl] Comando duplicado ignorado: ");
      Serial.println(requestId);
      mqttManager.publishAck(requestId, cmd, true, "duplicate_ignored");
      mqttManager.publishStatus();
      return;
    }
    rememberRequest(requestId);

    if (cmd == "set_config") {
      applyConfig(data, requestId, cmd);
      return;
    }

    if (cmd == "set_auto") {
      bool enabled = data.containsKey("enabled") ? data["enabled"].as<bool>() : data["automatic"].as<bool>();
      relayManager.setAutomatic(enabled);
      storage.save(config);
      mqttManager.publishAck(requestId, cmd, true);
      mqttManager.publishStatus();
      return;
    }

    if (cmd == "set_timers") {
      applyTimers(data, requestId, cmd);
      return;
    }

    if (cmd == "set_relay") {
      if (config.automatic) {
        mqttManager.publishAck(requestId, cmd, false, "automatic_mode_locked");
        return;
      }

      String relay = data["relay"] | "";
      bool value = data["value"] | false;
      if (!relayManager.setRelay(relay, value)) {
        mqttManager.publishAck(requestId, cmd, false, "invalid_relay");
        return;
      }

      storage.save(config);
      mqttManager.publishAck(requestId, cmd, true);
      mqttManager.publishStatus();
      return;
    }

    if (cmd == "request_status") {
      mqttManager.publishAck(requestId, cmd, true);
      mqttManager.publishStatus();
      return;
    }

    if (cmd == "factory_reset") {
      bool confirm = data["confirm"] | false;
      if (!confirm) {
        mqttManager.publishAck(requestId, cmd, false, "missing_confirm");
        return;
      }
      mqttManager.publishAck(requestId, cmd, true, "restarting");
      mqttManager.publishAvailability("offline");
      storage.factoryReset();
      delay(700);
      ESP.restart();
    }

    mqttManager.publishAck(requestId, cmd, false, "unknown_command");
  }

 private:
  DeviceConfig& config;
  RelayManager& relayManager;
  StorageManager& storage;
  MqttManager& mqttManager;
  String lastRequestId = "";
  unsigned long lastRequestAt = 0;

  bool isDuplicateRequest(const String& requestId) const {
    return requestId.length() &&
           requestId == lastRequestId &&
           millis() - lastRequestAt < 20000UL;
  }

  void rememberRequest(const String& requestId) {
    if (!requestId.length()) return;
    lastRequestId = requestId;
    lastRequestAt = millis();
  }

  void applyConfig(JsonObject data, const String& requestId, const String& command) {
    bool changed = false;

    if (data.containsKey("enabled") || data.containsKey("automatic")) {
      bool enabled = data.containsKey("enabled") ? data["enabled"].as<bool>() : data["automatic"].as<bool>();
      relayManager.setAutomatic(enabled);
      changed = true;
    }

    if (data.containsKey("tOn") || data.containsKey("tOff")) {
      uint16_t onMin = data.containsKey("tOn") ? data["tOn"].as<uint16_t>() : config.tOnMin;
      uint16_t offMin = data.containsKey("tOff") ? data["tOff"].as<uint16_t>() : config.tOffMin;
      if (!relayManager.setTimers(onMin, offMin)) {
        mqttManager.publishAck(requestId, command, false, "invalid_timer");
        return;
      }
      changed = true;
    }

    if (data.containsKey("device_name")) {
      config.deviceName = data["device_name"].as<String>();
      changed = true;
    }

    if (data.containsKey("device_uuid")) {
      config.deviceUuid = data["device_uuid"].as<String>();
      changed = true;
    }

    if (data.containsKey("device_type")) {
      config.deviceType = data["device_type"].as<String>();
      changed = true;
    }

    if (data.containsKey("category")) {
      config.category = data["category"].as<String>();
      changed = true;
    }

    if (data.containsKey("protocol")) {
      config.protocol = data["protocol"].as<String>();
      changed = true;
    }

    if (!changed) {
      mqttManager.publishAck(requestId, command, false, "empty_config");
      return;
    }

    sanitizeConfig(config);
    storage.save(config);
    mqttManager.publishAck(requestId, command, true);
    mqttManager.publishStatus();
  }

  void applyTimers(JsonObject data, const String& requestId, const String& command) {
    uint16_t onMin = data.containsKey("tOn") ? data["tOn"].as<uint16_t>() : config.tOnMin;
    uint16_t offMin = data.containsKey("tOff") ? data["tOff"].as<uint16_t>() : config.tOffMin;
    if (!relayManager.setTimers(onMin, offMin)) {
      mqttManager.publishAck(requestId, command, false, "invalid_timer");
      return;
    }
    storage.save(config);
    mqttManager.publishAck(requestId, command, true);
    mqttManager.publishStatus();
  }
};

}  // namespace SmartControl
