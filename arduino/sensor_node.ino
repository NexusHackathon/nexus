#include <WiFi.h>
#include <SPI.h>
#include <LoRa.h>

// Sensor node: reads gas and magnet values, scans WiFi for suspicious cameras, and sends LoRa payloads.

// Pins
const int MAGNET_PIN = 35;
const int SENSOR_PIN = 32;

// Sensor readings
volatile int   current_magnet_value = 0;
volatile float current_gas          = 0.0;

// Data from the Pi side: SDR RSSI and YOLO alert flag.
volatile float sdr_rssi   = -120.0; 
volatile int   yolo_alert = 0; 
String         serialBuffer = "";

// WiFi scan counters for suspicious cameras.
volatile int wifi_cam_zero   = 0;
volatile int wifi_cam_nearby = 0;
volatile int wifi_cam_far    = 0;
volatile int wifi_cam_total  = 0;
SemaphoreHandle_t wifiDataMutex;

const char* suspiciousMAC[] = {
  "CC:50:E3","A0:C6:EC","C0:C9:E3","F4:CB:52",
  "34:CE:00","8C:AA:B5","00:14:22","A4:C1:38","AA:42:A1"
};
const int numMAC = 9;
const char* suspiciousSSID[] = {"cam","ipc","tuya","v720","spy","camera"};
const int numSSID = 6;

// Parse JSON fragments arriving from the Pi over Serial.
void parseSerialFromPi() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      
      // Update the maximum observed RSSI value.
      int rssiIdx = serialBuffer.indexOf("\"rssi\":");
      if (rssiIdx >= 0) {
        int valStart = rssiIdx + 7;
        String rssiString = serialBuffer.substring(valStart, serialBuffer.indexOf(',', valStart));
        float incoming_rssi = rssiString.toFloat();
        if (incoming_rssi > sdr_rssi) {
            sdr_rssi = incoming_rssi; 
        }
      }

      // Latch the YOLO alert when the incoming payload says so.
      int yoloIdx = serialBuffer.indexOf("\"yolo\":");
      if (yoloIdx >= 0) {
        int valStart = yoloIdx + 7;
        int incoming_yolo = serialBuffer.substring(valStart, serialBuffer.indexOf('}', valStart)).toInt();
        if (incoming_yolo == 1) {
            yolo_alert = 1;
        }
      }
      
      serialBuffer = ""; 
    } else {
      serialBuffer += c;
    }
  }
}

// Scan WiFi networks on Core 0 and classify suspicious camera devices by RSSI.
void wifiScanTask(void* parameter) {
  for (;;) {
    WiFi.scanNetworks(true, false, false, 60);
    int n = WIFI_SCAN_RUNNING;
    while (n == WIFI_SCAN_RUNNING) {
      vTaskDelay(100 / portTICK_PERIOD_MS);
      n = WiFi.scanComplete();
    }

    int zeroDist = 0, nearby = 0, farAway = 0;
    if (n > 0) {
      for (int i = 0; i < n; i++) {
        String ssidStr = WiFi.SSID(i);
        ssidStr.toLowerCase();
        String macStr = WiFi.BSSIDstr(i).substring(0, 8);
        macStr.toUpperCase();

        bool isSuspicious = false;
        for (int k = 0; k < numMAC  && !isSuspicious; k++)
          if (macStr == suspiciousMAC[k]) isSuspicious = true;
        for (int j = 0; j < numSSID && !isSuspicious; j++)
          if (ssidStr.indexOf(suspiciousSSID[j]) >= 0) isSuspicious = true;

        if (isSuspicious) {
          int rssi = WiFi.RSSI(i);
          if (rssi > -50)       zeroDist++;  
          else if (rssi > -75)  nearby++;    
          else                  farAway++;   
        }
      }
    }
    WiFi.scanDelete();

    xSemaphoreTake(wifiDataMutex, portMAX_DELAY);
    wifi_cam_zero   = zeroDist;
    wifi_cam_nearby = nearby;
    wifi_cam_far    = farAway;
    wifi_cam_total  = zeroDist + nearby + farAway;
    xSemaphoreGive(wifiDataMutex);

    vTaskDelay(30000 / portTICK_PERIOD_MS); 
  }
}

// Sampling and transmission setup.
const int NUM_READINGS = 10;
int  readings[NUM_READINGS] = {0};
int  readIndex = 0;
long total     = 0;

unsigned long lastMagnetRead = 0;
unsigned long lastSensorRead = 0;
unsigned long lastLoRaSend   = 0;

void setup() {
  Serial.begin(115200);
  pinMode(MAGNET_PIN, INPUT);
  analogReadResolution(12);

  wifiDataMutex = xSemaphoreCreateMutex();

  // Keep WiFi in station mode for scanning only.
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(); 

  // Configure the LoRa radio pins and frequency.
  LoRa.setPins(5, 14, 2);
  LoRa.begin(868E6);

  xTaskCreatePinnedToCore(
    wifiScanTask, "WifiScanTask",
    4096, NULL, 1, NULL, 0
  );
}

// Main loop on Core 1: read sensors, parse Pi updates, and send LoRa packets.
void loop() {
  parseSerialFromPi();

  if (millis() - lastMagnetRead > 50) {
    lastMagnetRead = millis();
    current_magnet_value = analogRead(MAGNET_PIN);
  }

  if (millis() - lastSensorRead > 20) {
    lastSensorRead = millis();
    total -= readings[readIndex];
    readings[readIndex] = analogRead(SENSOR_PIN);
    total += readings[readIndex];
    readIndex = (readIndex + 1) % NUM_READINGS;
    current_gas = (float)(total / NUM_READINGS);
  }

  if (millis() - lastLoRaSend > 5000) {
    lastLoRaSend = millis();

    String payload = "{";
    payload += "\"gas\":"   + String(current_gas)          + ",";
    payload += "\"mag\":"   + String(current_magnet_value) + ",";
    payload += "\"rssi\":"  + String(sdr_rssi)             + ","; 
    payload += "\"yolo\":"  + String(yolo_alert)           + ","; 
    
    xSemaphoreTake(wifiDataMutex, portMAX_DELAY);
    payload += "\"c_z\":" + String(wifi_cam_zero)   + ",";
    payload += "\"c_n\":" + String(wifi_cam_nearby) + ",";
    payload += "\"c_f\":" + String(wifi_cam_far);
    xSemaphoreGive(wifiDataMutex);

    payload += "}";

    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.println(">>> SENT LORA PACKET: " + payload);

    sdr_rssi = 0.0; 
    yolo_alert = 0; 
  }
}