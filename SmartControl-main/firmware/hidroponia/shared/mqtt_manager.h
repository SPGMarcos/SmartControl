#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>
#include <string.h>
#include "hardware_manager.h"
#include "relay_manager.h"

namespace SmartControl {

typedef void (*CommandHandler)(JsonObject payload, const String& requestId, const String& command, bool configTopic);

class MqttManager {
 public:
  MqttManager(DeviceConfig& cfg, RelayManager& relays, const HardwareProfile& hw)
      : config(cfg), relayManager(relays), hardware(hw), client(plainClient) {}

  void begin(CommandHandler handler) {
    commandHandler = handler;
    client.setCallback(staticCallback);
    client.setBufferSize(1536);
    client.setKeepAlive(45);
    client.setSocketTimeout(8);
    activeInstance = this;
  }

  void loop() {
    if (WiFi.status() != WL_CONNECTED) return;
    reconnect();
    client.loop();

    if (client.connected() && millis() - lastHeartbeatAt > 20000UL) {
      lastHeartbeatAt = millis();
      publishStatus("heartbeat");
    }
  }

  bool connected() const {
    return client.connected();
  }

  String baseTopic() const {
    String base = config.mqttTopic;
    base.trim();
    if (!base.length()) base = "smartcontrol/cliente/projeto/" + config.deviceId;
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

  void publishAvailability(const char* status) {
    StaticJsonDocument<384> doc;
    doc["protocol"] = protocolText();
    doc["uuid"] = config.deviceUuid;
    doc["device_id"] = config.deviceId;
    if (config.deviceToken.length()) doc["device_token"] = config.deviceToken;
    doc["module"] = hardware.module;
    doc["status"] = status;
    doc["reason"] = strcmp(status, "offline") == 0 ? "device_shutdown" : "connected";
    doc["uptime_ms"] = millis();
    publishJson("availability", doc, true);
  }

  void publishAck(const String& requestId, const String& command, bool accepted, const String& reason = "ok") {
    StaticJsonDocument<384> doc;
    doc["protocol"] = protocolText();
    doc["uuid"] = config.deviceUuid;
    doc["device_id"] = config.deviceId;
    if (config.deviceToken.length()) doc["device_token"] = config.deviceToken;
    doc["request_id"] = requestId;
    doc["command"] = command;
    doc["accepted"] = accepted;
    doc["reason"] = reason;
    doc["uptime_ms"] = millis();
    publishJson("ack", doc, false);
  }

  void publishStatus(const char* eventType = "status") {
    StaticJsonDocument<1536> doc;
    doc["protocol"] = protocolText();
    doc["uuid"] = config.deviceUuid;
    doc["device_id"] = config.deviceId;
    doc["type"] = config.deviceType;
    doc["category"] = config.category;
    if (config.deviceToken.length()) doc["device_token"] = config.deviceToken;
    doc["module"] = hardware.module;
    doc["firmware_version"] = hardware.firmware;
    doc["hardware_version"] = hardware.hardware;
    doc["hardware"] = hardware.hardware;
    doc["model"] = hardware.model;
    doc["modelo"] = hardware.model;
    doc["lora"] = hardware.lora;
    doc["capabilities_csv"] = hardware.capabilities;
    JsonObject capabilities = doc.createNestedObject("capabilities");
    appendCapabilities(capabilities);
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["ap_ip"] = WiFi.softAPIP().toString();
    doc["mdns"] = String(hardware.mdns) + ".local";
    doc["online"] = true;
    doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
    doc["mqtt_connected"] = client.connected();
    doc["t24"] = config.automatic;
    doc["v1"] = config.pump;
    doc["v2"] = config.oxygenator;
    doc["tOn"] = config.tOnMin;
    doc["tOff"] = config.tOffMin;
    doc["rem"] = relayManager.remainingSeconds();
    doc["elapsed"] = relayManager.elapsedSeconds();
    doc["sequence"] = ++statusSequence;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["heap"] = ESP.getFreeHeap();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["min_free_heap"] = ESP.getMinFreeHeap();
    doc["reset_reason"] = resetReasonText();
    doc["mqtt_state"] = client.state();
    doc["reconnect_delay_ms"] = reconnectDelayMs;
    doc["uptime_ms"] = millis();
    publishJson(eventType, doc, strcmp(eventType, "status") == 0);
  }

 private:
  DeviceConfig& config;
  RelayManager& relayManager;
  const HardwareProfile& hardware;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  PubSubClient client;
  CommandHandler commandHandler = nullptr;
  String mqttHost = "";
  uint16_t mqttPort = 1883;
  bool mqttUseTls = false;
  unsigned long lastReconnectAt = 0;
  unsigned long lastHeartbeatAt = 0;
  unsigned long reconnectDelayMs = 5000UL;
  uint32_t statusSequence = 0;
  bool pendingStatus = false;
  static MqttManager* activeInstance;

  bool publishJson(const String& suffix, JsonDocument& doc, bool retained) {
    if (!client.connected()) {
      if (suffix == "status" || suffix == "heartbeat" || suffix == "telemetry") pendingStatus = true;
      return false;
    }

    char buffer[1536];
    size_t length = serializeJson(doc, buffer);
    const String topic = baseTopic() + "/" + suffix;
    const bool ok = client.publish(topic.c_str(), (const uint8_t*)buffer, length, retained);
    if (!ok && (suffix == "status" || suffix == "heartbeat" || suffix == "telemetry")) pendingStatus = true;
    return ok;
  }

  void parseBroker() {
    mqttHost = config.mqttBroker;
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

  void reconnect() {
    if (!config.mqttBroker.length() || client.connected()) return;
    if (millis() - lastReconnectAt < reconnectDelayMs) return;
    lastReconnectAt = millis();

    parseBroker();
    if (!mqttHost.length()) return;

    if (mqttUseTls) {
      secureClient.setInsecure();
      client.setClient(secureClient);
    } else {
      client.setClient(plainClient);
    }

    client.setServer(mqttHost.c_str(), mqttPort);
    client.setKeepAlive(45);
    client.setSocketTimeout(8);

    const String clientId = "SmartControl-" + config.deviceId + "-" + chipSuffix();
    const String willTopic = baseTopic() + "/availability";
    const String willPayload = String("{\"protocol\":\"") +
                               protocolText() +
                               "\",\"uuid\":\"" + config.deviceUuid +
                               "\",\"device_id\":\"" + config.deviceId +
                               "\",\"status\":\"offline\",\"reason\":\"lwt\"}";
    const char* user = config.mqttUser.length() ? config.mqttUser.c_str() : nullptr;
    const char* pass = config.mqttPass.length() ? config.mqttPass.c_str() : nullptr;

    if (client.connect(clientId.c_str(), user, pass, willTopic.c_str(), 1, true, willPayload.c_str())) {
      reconnectDelayMs = 5000UL;
      client.subscribe((baseTopic() + "/cmd").c_str(), 1);
      client.subscribe((baseTopic() + "/config").c_str(), 1);
      publishAvailability("online");
      if (pendingStatus) pendingStatus = false;
      publishStatus();
    } else {
      reconnectDelayMs = min(reconnectDelayMs * 2UL, 120000UL);
    }
  }

  void appendCapabilities(JsonObject capabilities) {
    String list = hardware.capabilities;
    int start = 0;
    while (start < list.length()) {
      int comma = list.indexOf(',', start);
      if (comma < 0) comma = list.length();
      String item = list.substring(start, comma);
      item.trim();
      item.toLowerCase();
      if (item.length()) capabilities[item] = true;
      start = comma + 1;
    }
    capabilities["lora"] = hardware.lora;
  }

  const char* resetReasonText() const {
    switch (esp_reset_reason()) {
      case ESP_RST_POWERON: return "poweron";
      case ESP_RST_EXT: return "external";
      case ESP_RST_SW: return "software";
      case ESP_RST_PANIC: return "panic";
      case ESP_RST_INT_WDT: return "interrupt_watchdog";
      case ESP_RST_TASK_WDT: return "task_watchdog";
      case ESP_RST_WDT: return "watchdog";
      case ESP_RST_DEEPSLEEP: return "deepsleep";
      case ESP_RST_BROWNOUT: return "brownout";
      case ESP_RST_SDIO: return "sdio";
      default: return "unknown";
    }
  }

  const char* protocolText() const {
    return config.protocol.length() ? config.protocol.c_str() : hardware.protocol;
  }

  static void staticCallback(char* topic, byte* payload, unsigned int length) {
    if (activeInstance) activeInstance->handleMessage(topic, payload, length);
  }

  void handleMessage(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error) return;

    String requestId = doc["request_id"] | "";
    String command = doc["command"] | "";
    String incomingDeviceId = doc["device_id"] | "";
    if (incomingDeviceId.length() && incomingDeviceId != config.deviceId) return;

    String topicText = String(topic);
    bool configTopic = topicText.endsWith("/config");
    JsonObject data = doc["payload"].is<JsonObject>() ? doc["payload"].as<JsonObject>() : doc.as<JsonObject>();
    if (commandHandler) commandHandler(data, requestId, command, configTopic);
  }
};

MqttManager* MqttManager::activeInstance = nullptr;

}  // namespace SmartControl
