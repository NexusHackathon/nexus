#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WebServer.h>

// LoRa gateway: receives payloads from the sensor node and serves the latest JSON over HTTP.
const char* ssid = "WIFI_NAME"; 
const char* password = "WIFI_PASSWORD"; 

WebServer server(80);

// Cached sensor payload returned to the Python client.
String latestJsonData = "{\"gas\":0,\"mag\":2500,\"rssi\":0.0,\"yolo\":0,\"c_z\":0,\"c_n\":0,\"c_f\":0}";

void setup() {
  Serial.begin(9600);
  while (!Serial);

  // Initialize the LoRa radio on the shared pin mapping.
  LoRa.setPins(5, 14, 2); 
  if (!LoRa.begin(868E6)) { 
    Serial.println("Starting LoRa failed!");
    while (1);
  }
  
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n>>> WiFi Connected! <<<");
  Serial.print("IP Address for Python: ");
  Serial.println(WiFi.localIP()); 

  // Expose the latest payload to any local client that polls /data.
  server.on("/data", []() {
    server.send(200, "application/json", latestJsonData);
  });
  
  server.begin();
}

void loop() {
  server.handleClient();

  // Read any incoming LoRa packet and store the latest JSON string.
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incomingJson = "";
    while (LoRa.available()) {
      incomingJson += (char)LoRa.read();
    }
    latestJsonData = incomingJson;
    Serial.println("New Data: " + incomingJson);
  }
}