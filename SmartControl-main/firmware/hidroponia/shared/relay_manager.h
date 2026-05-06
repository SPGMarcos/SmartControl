#pragma once

#include <Arduino.h>
#include "device_manager.h"

namespace SmartControl {

struct RelayPins {
  uint8_t pump;
  uint8_t oxygenator;
  bool activeLow = true;
};

class RelayManager {
 public:
  RelayManager(DeviceConfig& cfg, RelayPins relayPins) : config(cfg), pins(relayPins) {}

  void begin() {
    pinMode(pins.pump, OUTPUT);
    pinMode(pins.oxygenator, OUTPUT);
    applyOutputs();
    phaseStartedAt = millis();
  }

  void setAutomatic(bool enabled) {
    config.automatic = enabled;
    phaseStartedAt = millis();
    if (enabled) {
      config.oxygenator = true;
      config.pump = true;
    }
    applyOutputs();
  }

  bool setRelay(const String& relay, bool value) {
    if (config.automatic) return false;
    if (relay == "pump" || relay == "v1") {
      config.pump = value;
    } else if (relay == "oxygenator" || relay == "v2") {
      config.oxygenator = value;
    } else {
      return false;
    }
    applyOutputs();
    return true;
  }

  bool setTimers(uint16_t onMin, uint16_t offMin) {
    if (onMin < 1 || offMin < 1 || onMin > 1440 || offMin > 1440) return false;

    const unsigned long elapsed = elapsedSeconds();
    config.tOnMin = onMin;
    config.tOffMin = offMin;

    const unsigned long newInterval = currentIntervalSeconds();
    if (config.automatic && elapsed > 0 && elapsed < newInterval) {
      phaseStartedAt = millis() - (elapsed * 1000UL);
    } else if (config.automatic && elapsed >= newInterval) {
      phaseStartedAt = millis() - (newInterval * 1000UL);
    }

    return true;
  }

  void loop() {
    if (!config.automatic) return;

    const unsigned long intervalMs = currentIntervalSeconds() * 1000UL;
    if (intervalMs == 0) return;

    if (millis() - phaseStartedAt >= intervalMs) {
      config.pump = !config.pump;
      config.oxygenator = true;
      phaseStartedAt = millis();
      applyOutputs();
      statusDirty = true;
    }
  }

  bool consumeStatusDirty() {
    bool dirty = statusDirty;
    statusDirty = false;
    return dirty;
  }

  unsigned long remainingSeconds() const {
    if (!config.automatic) return 0;
    const unsigned long interval = currentIntervalSeconds();
    const unsigned long elapsed = elapsedSeconds();
    return elapsed >= interval ? 0 : interval - elapsed;
  }

  unsigned long elapsedSeconds() const {
    return (millis() - phaseStartedAt) / 1000UL;
  }

  void applyOutputs() {
    writeRelay(pins.pump, config.pump);
    writeRelay(pins.oxygenator, config.oxygenator);
  }

 private:
  DeviceConfig& config;
  RelayPins pins;
  unsigned long phaseStartedAt = 0;
  bool statusDirty = false;

  unsigned long currentIntervalSeconds() const {
    return (unsigned long)(config.pump ? config.tOnMin : config.tOffMin) * 60UL;
  }

  void writeRelay(uint8_t pin, bool enabled) {
    const uint8_t active = pins.activeLow ? LOW : HIGH;
    const uint8_t inactive = pins.activeLow ? HIGH : LOW;
    digitalWrite(pin, enabled ? active : inactive);
  }
};

}  // namespace SmartControl
