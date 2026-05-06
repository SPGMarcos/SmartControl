#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include "device_manager.h"

namespace SmartControl {

class StorageManager {
 public:
  void begin() {
    prefs.begin("smartcontrol", false);
  }

  void load(DeviceConfig& config) {
    config.deviceName = prefs.getString("name", config.deviceName);
    config.deviceId = prefs.getString("device_id", config.deviceId);
    config.deviceUuid = prefs.getString("uuid", config.deviceUuid);
    config.deviceType = prefs.getString("type", config.deviceType);
    config.category = prefs.getString("category", config.category);
    config.protocol = prefs.getString("protocol", config.protocol);
    config.deviceToken = prefs.getString("token", config.deviceToken);
    config.wifiSsid = prefs.getString("wifi_ssid", config.wifiSsid);
    config.wifiPass = prefs.getString("wifi_pass", config.wifiPass);
    config.apSsid = prefs.getString("ap_ssid", config.apSsid);
    config.apPassword = prefs.getString("ap_pass", config.apPassword);
    config.mqttBroker = prefs.getString("mqtt_broker", config.mqttBroker);
    config.mqttUser = prefs.getString("mqtt_user", config.mqttUser);
    config.mqttPass = prefs.getString("mqtt_pass", config.mqttPass);
    config.mqttTopic = prefs.getString("mqtt_topic", config.mqttTopic);
    config.automatic = prefs.getBool("automatic", config.automatic);
    config.pump = prefs.getBool("pump", config.pump);
    config.oxygenator = prefs.getBool("oxygenator", config.oxygenator);
    config.tOnMin = prefs.getUShort("ton", config.tOnMin);
    config.tOffMin = prefs.getUShort("toff", config.tOffMin);
    sanitizeConfig(config);
  }

  void save(const DeviceConfig& config) {
    prefs.putString("name", config.deviceName);
    prefs.putString("device_id", config.deviceId);
    prefs.putString("uuid", config.deviceUuid);
    prefs.putString("type", config.deviceType);
    prefs.putString("category", config.category);
    prefs.putString("protocol", config.protocol);
    prefs.putString("token", config.deviceToken);
    prefs.putString("wifi_ssid", config.wifiSsid);
    prefs.putString("wifi_pass", config.wifiPass);
    prefs.putString("ap_ssid", config.apSsid);
    prefs.putString("ap_pass", config.apPassword);
    prefs.putString("mqtt_broker", config.mqttBroker);
    prefs.putString("mqtt_user", config.mqttUser);
    prefs.putString("mqtt_pass", config.mqttPass);
    prefs.putString("mqtt_topic", config.mqttTopic);
    prefs.putBool("automatic", config.automatic);
    prefs.putBool("pump", config.pump);
    prefs.putBool("oxygenator", config.oxygenator);
    prefs.putUShort("ton", config.tOnMin);
    prefs.putUShort("toff", config.tOffMin);
  }

  void factoryReset() {
    prefs.clear();
  }

 private:
  Preferences prefs;
};

}  // namespace SmartControl
