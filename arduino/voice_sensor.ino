/**
 * Acoustic Alert and Annunciation Module
 * This module controls an external hardware MP3 decoder via asynchronous 
 * serial communication (UART). By offloading audio processing to a dedicated 
 * DSP, it ensures that the main microcontroller's operational loop remains 
 * unblocked during threat detection events. The module transmits specific 
 * hexadecimal command frames to trigger pre-loaded audio alerts, serving 
 * as the primary acoustic warning system for verified security anomalies.
 */

HardwareSerial myMP3(2); 

byte playCommand[] = {0x7E, 0xFF, 0x06, 0x03, 0x00, 0x00, 0x01, 0xFE, 0xF7, 0xEF};

void setup() 
{
  Serial.begin(115200);
  
  myMP3.begin(9600, SERIAL_8N1, 16, 17);
  
  Serial.println("System Ready: Audio Module Active");
  delay(1000); 
}

void loop() 
{
  Serial.println("ALERT: Triggering Audio Annunciation!");
  
  myMP3.write(playCommand, sizeof(playCommand));
  
  delay(10000); 
}