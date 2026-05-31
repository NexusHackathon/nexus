/**
 * Magnetic Anomaly Detection Module
 * This module interfaces with a digital magnetic sensor to detect localized 
 * magnetic fields. Such fields are commonly used in anti-tamper mechanisms 
 * or proximity triggers for improvised explosive devices (IEDs). 
 * The system continuously polls the digital input pin, utilizing an 
 * active-low logic state to register a positive magnetic anomaly detection, 
 * and broadcasts real-time telemetry via the serial interface.
 */

const int sensorPin = 2; 

void setup() 
{
  Serial.begin(9600);
  
  pinMode(sensorPin, INPUT);
  
  Serial.println("System Ready: Magnetic Sensor Active");
}

void loop() 
{
  int sensorState = digitalRead(sensorPin);
  
  if (sensorState == LOW) 
  {
    Serial.println("ALERT: Magnetic Field Detected!");
  } 
  else 
  {
    Serial.println("Status: Clear");
  }
  
  delay(200);
}