#include <Arduino.h>
#include <ArduinoOTA.h>
#include <WebServer.h>

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

#define RELAY_BOMBA 25
#define RELAY_OXIGENADOR 26

using namespace SmartControl;

const HardwareProfile HARDWARE = {
  "esp32_devkit_hydroponics",
  "smartcontrol-hidroponia-2.0.0",
  "ESP32",
  "ESP32 DevKit",
  false,
  "smartcontrol",
  "SmartControl-ESP32",
  "hydroponics,relay,timer,local_dashboard,ap,sta,mqtt,ota",
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

void handleSmartControlCommand(JsonObject payload, const String& requestId, const String& command, bool configTopic) {
  commandManager.handle(payload, requestId, command, configTopic);
}

void setupOta() {
  ArduinoOTA.setHostname(HARDWARE.otaHostname);
  ArduinoOTA.onStart([]() {
    Serial.println("SmartControl OTA iniciado");
  });
  ArduinoOTA.begin();
}

void setup() {
  Serial.begin(115200);
  delay(200);

  storageManager.begin();
  storageManager.load(config);
  applyHardwareDefaults(config, HARDWARE);
  relayManager.begin();

  wifiManager.begin();
  setupOta();

  mqttManager.begin(handleSmartControlCommand);
  webDashboard.begin();

  Serial.println("SmartControl ESP32 pronto");
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

  if (relayManager.consumeStatusDirty()) {
    storageManager.save(config);
    mqttManager.publishStatus();
  }

  if (localHeartbeat.ready()) {
    mqttManager.publishStatus("heartbeat");
  }
}
