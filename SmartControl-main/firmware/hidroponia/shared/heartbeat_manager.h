#pragma once

#include <Arduino.h>

namespace SmartControl {

class HeartbeatManager {
 public:
  explicit HeartbeatManager(unsigned long intervalMs = 30000UL) : interval(intervalMs) {}

  bool ready() {
    if (millis() - lastRun < interval) return false;
    lastRun = millis();
    return true;
  }

  void reset() {
    lastRun = millis();
  }

 private:
  unsigned long interval;
  unsigned long lastRun = 0;
};

}  // namespace SmartControl
