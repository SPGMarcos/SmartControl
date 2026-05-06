#pragma once

#include <Arduino.h>
#include <ESPmDNS.h>
#include <WiFi.h>
#include "ap_manager.h"
#include "hardware_manager.h"

namespace SmartControl {

class WifiManager {
 public:
  WifiManager(DeviceConfig& cfg, ApManager& ap, const HardwareProfile& hw) : config(cfg), apManager(ap), hardware(hw) {}

  void begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);

    if (!config.wifiSsid.length()) {
      apManager.start();
      return;
    }

    WiFi.begin(config.wifiSsid.c_str(), config.wifiPass.c_str());
    const unsigned long startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000UL) {
      delay(250);
    }

    if (WiFi.status() == WL_CONNECTED) {
      startMdns();
    } else {
      WiFi.disconnect(false);
      apManager.start();
    }
  }

  void loop() {
    if (!config.wifiSsid.length()) return;

    if (WiFi.status() == WL_CONNECTED) {
      if (!mdnsStarted) startMdns();
      return;
    }

    if (!apManager.isActive()) {
      apManager.start();
    }

    if (millis() - lastReconnectAttemptAt > 30000UL) {
      lastReconnectAttemptAt = millis();
      WiFi.disconnect(false);
      WiFi.begin(config.wifiSsid.c_str(), config.wifiPass.c_str());
    }
  }

  bool connected() const {
    return WiFi.status() == WL_CONNECTED;
  }

  String staIp() const {
    return connected() ? WiFi.localIP().toString() : "";
  }

 private:
  DeviceConfig& config;
  ApManager& apManager;
  const HardwareProfile& hardware;
  unsigned long lastReconnectAttemptAt = 0;
  bool mdnsStarted = false;

  void startMdns() {
    if (MDNS.begin(hardware.mdns)) {
      MDNS.addService("http", "tcp", 80);
      mdnsStarted = true;
    }
  }
};

}  // namespace SmartControl
