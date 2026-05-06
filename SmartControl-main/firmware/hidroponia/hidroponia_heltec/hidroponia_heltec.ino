#include <Arduino.h>
#include <ArduinoOTA.h>
#include <U8g2lib.h>
#include <WebServer.h>
#include <WiFi.h>

#include "../shared/ap_manager.h"
#include "../shared/command_manager.h"
#include "../shared/device_manager.h"
#include "../shared/hardware_manager.h"
#include "../shared/heartbeat_manager.h"
#include "../shared/mqtt_manager.h"
#include "../shared/relay_manager.h"
#include "../shared/storage_manager.h"
#include "../shared/web_dashboard.h"
#include "../shared/wifi_manager.h"

#define OLED_RST 16
#define RELAY_BOMBA 2
#define RELAY_OXIGENADOR 17

using namespace SmartControl;

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, OLED_RST, 15, 4);

const HardwareProfile HARDWARE = {
  "heltec_esp32_lora_hydroponics",
  "smartcontrol-hidroponia-2.0.0",
  "ESP32 LoRa",
  "Heltec ESP32 LoRa",
  true,
  "smarthidroponia",
  "SmartControl-Heltec",
  "hydroponics,relay,timer,local_dashboard,ap,sta,mqtt,ota,lora_ready,oled",
  "hydroponics",
  "hydroponics",
  "SC-HYDRO",
  "smartcontrol.mqtt.v1"
};

WebServer server(80);
DeviceConfig config;
StorageManager storageManager;
RelayManager relayManager(config, {RELAY_BOMBA, RELAY_OXIGENADOR, true});
ApManager apManager(config);
WifiManager wifiManager(config, apManager, HARDWARE);
MqttManager mqttManager(config, relayManager, HARDWARE);
CommandManager commandManager(config, relayManager, storageManager, mqttManager);
WebDashboard webDashboard(server, config, HARDWARE, relayManager, storageManager, apManager, wifiManager, mqttManager);
HeartbeatManager localHeartbeat(60000UL);

unsigned long lastDisplayUpdate = 0;

void handleSmartControlCommand(JsonObject payload, const String& requestId, const String& command, bool configTopic) {
  commandManager.handle(payload, requestId, command, configTopic);
}

void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);

  u8g2.setCursor(0, 9);
  u8g2.print(config.deviceName.substring(0, 21));

  u8g2.setCursor(0, 21);
  u8g2.print(wifiManager.connected() ? "STA " : "AP  ");
  u8g2.print(wifiManager.connected() ? wifiManager.staIp() : apManager.ip().toString());

  u8g2.drawHLine(0, 25, 128);
  u8g2.setCursor(0, 39);
  u8g2.print("Bomba: ");
  u8g2.print(config.pump ? "ON" : "OFF");
  u8g2.setCursor(70, 39);
  u8g2.print("O2: ");
  u8g2.print(config.oxygenator ? "ON" : "OFF");

  u8g2.setCursor(0, 53);
  if (config.automatic) {
    unsigned long rem = relayManager.remainingSeconds();
    char timerText[16];
    snprintf(timerText, sizeof(timerText), "Auto %02lu:%02lu", rem / 60UL, rem % 60UL);
    u8g2.print(timerText);
  } else {
    u8g2.print("Manual offline/local");
  }

  u8g2.sendBuffer();
}

void setupOta() {
  ArduinoOTA.setHostname(HARDWARE.otaHostname);
  ArduinoOTA.onStart([]() {
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.setCursor(0, 12);
    u8g2.print("Atualizando OTA...");
    u8g2.sendBuffer();
  });
  ArduinoOTA.begin();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  u8g2.begin();

  storageManager.begin();
  storageManager.load(config);
  applyHardwareDefaults(config, HARDWARE);
  relayManager.begin();

  wifiManager.begin();
  setupOta();

  mqttManager.begin(handleSmartControlCommand);
  webDashboard.begin();
  updateDisplay();

  Serial.println("SmartControl Heltec pronto");
  Serial.print("AP: ");
  Serial.print(config.apSsid);
  Serial.print(" / ");
  Serial.println(apManager.ip());
  if (wifiManager.connected()) {
    Serial.print("STA: ");
    Serial.println(wifiManager.staIp());
  }
}

void loop() {
  ArduinoOTA.handle();
  wifiManager.loop();
  webDashboard.loop();
  mqttManager.loop();
  relayManager.loop();

  if (millis() - lastDisplayUpdate > 500UL) {
    lastDisplayUpdate = millis();
    updateDisplay();
  }

  if (relayManager.consumeStatusDirty()) {
    storageManager.save(config);
    mqttManager.publishStatus();
  }

  if (localHeartbeat.ready()) {
    mqttManager.publishStatus("heartbeat");
  }
}
