/**
 * Gas Sensor Anomaly Detection Module
 * * This module implements real-time chemical vapor detection using an analog gas sensor. 
 * It utilizes a moving average filter to establish a dynamic environmental baseline, 
 * effectively smoothing out sensor noise and adapting to gradual environmental changes. 
 * Anomaly detection is triggered when the current reading exhibits a sudden spike 
 * exceeding a predefined percentage threshold relative to the moving baseline. 
 * The implementation uses non-blocking timing (millis) to ensure seamless integration 
 * with concurrent sensor operations.
 */

const int SENSOR_PIN = 34;
const int NUM_READINGS = 10;
const float SPIKE_THRESHOLD = 1.15; 

int readings[NUM_READINGS];  
int readIndex = 0;           
long total = 0;              
int average = 0;             

unsigned long previousMillis = 0;
const long interval = 100; 

void setup() 
{
  Serial.begin(115200);
  
  analogReadResolution(12); 
  
  for (int i = 0; i < NUM_READINGS; i++) 
  {
    readings[i] = 0;
  }
}

void loop() 
{
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) 
  {
    previousMillis = currentMillis;

    total = total - readings[readIndex];          
    int currentReading = analogRead(SENSOR_PIN);  
    readings[readIndex] = currentReading;         
    total = total + readings[readIndex];          
    
    readIndex = readIndex + 1;                    

    if (readIndex >= NUM_READINGS) 
    {              
      readIndex = 0;
    } 

    average = total / NUM_READINGS;               

    Serial.print("Gas_Level:");
    Serial.print(average);

    if (currentReading > (average * SPIKE_THRESHOLD)) 
    {
      Serial.print("\tSpike_Alert:");
      Serial.print(4000); 
    } 
    else 
    {
      Serial.print("\tSpike_Alert:");
      Serial.print(0);    
    }

    Serial.println(); 
  }
}