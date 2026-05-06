#pragma once

#include <Arduino.h>
#include "hardware_manager.h"

namespace SmartControl {

struct DeviceConfig {
  String deviceName = "Hidroponia SmartControl";
  String deviceId = "hidroponia01";
  String deviceUuid = "";
  String deviceType = "hydroponics";
  String category = "hydroponics";
  String protocol = "smartcontrol.mqtt.v1";
  String deviceToken = "";

  String wifiSsid = "";
  String wifiPass = "";

  String apSsid = "";
  String apPassword = "";

  String mqttBroker = "";
  String mqttUser = "";
  String mqttPass = "";
  String mqttTopic = "";

  bool automatic = true;
  bool pump = true;
  bool oxygenator = true;
  uint16_t tOnMin = 10;
  uint16_t tOffMin = 10;
};

inline void sanitizeConfig(DeviceConfig& config) {
  config.deviceName.trim();
  config.deviceId.trim();
  config.deviceUuid.trim();
  config.deviceType.trim();
  config.category.trim();
  config.protocol.trim();
  config.deviceToken.trim();
  config.wifiSsid.trim();
  config.apSsid.trim();
  config.apPassword.trim();
  config.mqttBroker.trim();
  config.mqttUser.trim();
  config.mqttPass.trim();
  config.mqttTopic.trim();

  if (!config.deviceName.length()) config.deviceName = "Hidroponia SmartControl";
  if (!config.deviceId.length()) config.deviceId = defaultDeviceId();
  if (!config.deviceUuid.length()) config.deviceUuid = defaultDeviceUuid("SC-HYDRO");
  if (!config.deviceType.length()) config.deviceType = "hydroponics";
  if (!config.category.length()) config.category = "hydroponics";
  if (!config.protocol.length()) config.protocol = "smartcontrol.mqtt.v1";
  if (!config.apSsid.length()) config.apSsid = defaultApSsid();
  if (config.apPassword.length() < 8) config.apPassword = defaultApPassword();
  if (config.tOnMin < 1) config.tOnMin = 10;
  if (config.tOffMin < 1) config.tOffMin = 10;
  if (config.tOnMin > 1440) config.tOnMin = 1440;
  if (config.tOffMin > 1440) config.tOffMin = 1440;
  if (!config.mqttTopic.length()) config.mqttTopic = "smartcontrol/cliente/projeto/" + config.deviceId;
}

inline void applyHardwareDefaults(DeviceConfig& config, const HardwareProfile& hardware) {
  if (!config.category.length() || config.category == "generic") config.category = hardware.category;
  if (!config.deviceType.length() || config.deviceType == "generic") config.deviceType = hardware.deviceType;
  if (!config.protocol.length()) config.protocol = hardware.protocol;
  if (!config.deviceUuid.length()) config.deviceUuid = defaultDeviceUuid(hardware.devicePrefix);
  sanitizeConfig(config);
}

inline String boolText(bool value) {
  return value ? "true" : "false";
}

inline String htmlEscape(const String& value) {
  String escaped = value;
  escaped.replace("&", "&amp;");
  escaped.replace("<", "&lt;");
  escaped.replace(">", "&gt;");
  escaped.replace("\"", "&quot;");
  escaped.replace("'", "&#39;");
  return escaped;
}

}  // namespace SmartControl
