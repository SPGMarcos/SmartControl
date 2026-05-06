#pragma once

#include <Arduino.h>
#include <WiFi.h>

namespace SmartControl {

struct HardwareProfile {
  const char* module;
  const char* firmware;
  const char* hardware;
  const char* model;
  bool lora;
  const char* mdns;
  const char* otaHostname;
  const char* capabilities;
  const char* category = "generic";
  const char* deviceType = "generic";
  const char* devicePrefix = "SC-DEVICE";
  const char* protocol = "smartcontrol.mqtt.v1";
};

inline String chipSuffix() {
  String suffix = String((uint32_t)ESP.getEfuseMac(), HEX);
  suffix.toUpperCase();
  if (suffix.length() > 4) suffix = suffix.substring(suffix.length() - 4);
  return suffix;
}

inline String defaultDeviceId() {
  return "smartcontrol-" + chipSuffix();
}

inline String defaultDeviceUuid(const String& prefix = "SC-DEVICE") {
  return prefix + "-" + chipSuffix();
}

inline String defaultApSsid() {
  return "SmartControl-" + chipSuffix();
}

inline String defaultApPassword() {
  return "SC" + chipSuffix() + "2026";
}

inline String macAddress() {
  return WiFi.macAddress();
}

}  // namespace SmartControl
