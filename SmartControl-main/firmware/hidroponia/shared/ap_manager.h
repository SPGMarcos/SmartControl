#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include "device_manager.h"

namespace SmartControl {

class ApManager {
 public:
  explicit ApManager(DeviceConfig& cfg) : config(cfg) {}

  bool start() {
    sanitizeConfig(config);
    WiFi.mode(WIFI_AP_STA);
    apActive = WiFi.softAP(config.apSsid.c_str(), config.apPassword.c_str());
    return apActive;
  }

  bool isActive() const {
    return apActive;
  }

  IPAddress ip() const {
    return WiFi.softAPIP();
  }

 private:
  DeviceConfig& config;
  bool apActive = false;
};

}  // namespace SmartControl
