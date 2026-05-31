/**
 * Stealth WiFi Camera Radar Module
 * This module scans the 2.4GHz spectrum to detect hidden wireless cameras.
 * It filters raw WiFi data against a predefined database of suspicious
 * manufacturer MAC addresses (OUIs) and network SSID keywords.
 * Detected anomalies are evaluated using a weighted threat scoring system
 * based on hardware signature (70%), network name (5%), and signal strength
 * proximity (RSSI up to 25%). The system acts as a stealth radar, suppressing
 * innocent network noise and alerting only on verified threat profiles.
 */

#include "WiFi.h"

String knownOUIs[] = 
{
  "CC:50:E3", "A0:C6:EC", "C0:C9:E3", 
  "F4:CB:52", "34:CE:00",             
  "8C:AA:B5", "00:14:22", "A4:C1:38", 
  "AA:42:A1"  
}; 
int numOUIs = 9;

String suspiciousSSID[] = {"cam", "ipc", "tuya", "v720", "spy", "smart", "tapo", "GNET"};
int numSSID = 8; 

void setup() 
{
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(1000);
  Serial.println("Starting Stealth Camera Radar...");
}

void loop() 
{
  int n = WiFi.scanNetworks();
  
  int zeroDist = 0, nearby = 0, farAway = 0;
  int maxScore = 0;

  Serial.println("\n--- Scanning for Threats... ---");

  if (n > 0) 
  {
    for (int i = 0; i < n; ++i) 
    {
      int score = 0;
      bool isCamera = false; 
      
      int rssi = WiFi.RSSI(i);
      String ssid = WiFi.SSID(i);
      String ssidLower = ssid;
      ssidLower.toLowerCase();
      
      String fullMac = WiFi.BSSIDstr(i);
      fullMac.toUpperCase();
      String macPrefix = fullMac.substring(0, 8); 

      for (int k = 0; k < numOUIs; k++) 
      {
        if (macPrefix == knownOUIs[k]) 
        { 
          score += 70; 
          isCamera = true; 
          break; 
        }
      }

      for (int j = 0; j < numSSID; j++) 
      {
        if (ssidLower.indexOf(suspiciousSSID[j]) >= 0) 
        { 
          score += 5; 
          isCamera = true; 
          break; 
        }
      }

      if (isCamera) 
      {
        if (rssi > -35) { score += 25; zeroDist++; }      
        else if (rssi > -65) { nearby++; }               
        else { farAway++; }                              

        if (score > maxScore) maxScore = score;

        Serial.print("🚨 CAMERA DETECTED (WiFi Name): ");
        Serial.print(ssid.isEmpty() ? "Hidden_Network" : ssid);
        Serial.print(" | Location: ");
        
        if (rssi > -35) Serial.print("ZERO DISTANCE");
        else if (rssi > -65) Serial.print("NEARBY");
        else Serial.print("FAR AWAY");
        
        Serial.print(" | Score: ");
        Serial.println(score);
      }
    }
  } 
  else 
  {
    Serial.println("No networks found.");
  }

  Serial.print("[LIVE] Found: ");
  Serial.print(zeroDist + nearby + farAway);
  Serial.print(" Cameras (");
  Serial.print(zeroDist); Serial.print(" Zero, ");
  Serial.print(nearby); Serial.print(" Nearby, ");
  Serial.print(farAway); Serial.print(" Far Away) | ");
  Serial.print("Threat_Score:");
  Serial.println(maxScore);
  
  delay(4000); 
}