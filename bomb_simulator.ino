/**
 * Threat Simulation and Countdown Module (Demo Prop)
 * This module drives a synchronized audiovisual countdown sequence to simulate 
 * a timed threat scenario for system demonstration purposes. It utilizes non-blocking 
 * asynchronous timing (millis) to simultaneously control an OLED alphanumeric 
 * display via I2C, a high-frequency passive buzzer (4kHz PWM), and an array 
 * of external LEDs. This component acts as the physical stimulus to validate 
 * the detection capabilities of the primary sensor fusion platform.
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

const int BUZZER_PIN = 18;
const int LED_PINS[] = {19, 5, 4, 2, 15};
const int NUM_LEDS = 5; 

int countdownSeconds = 120; 
unsigned long previousMillis = 0;
unsigned long tickMillis = 0;
bool isTicking = false;

void setup() 
{
  pinMode(BUZZER_PIN, OUTPUT);
  
  for (int i = 0; i < NUM_LEDS; i++) 
  {
    pinMode(LED_PINS[i], OUTPUT);
  }

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) 
  {
    for(;;); 
  }
  
  display.setTextSize(3);
  display.setTextColor(WHITE);
  updateDisplay(); 
}

void loop() 
{
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= 1000 && countdownSeconds > 0) 
  {
    previousMillis = currentMillis;
    countdownSeconds--;

    tone(BUZZER_PIN, 4000); 
    
    for (int i = 0; i < NUM_LEDS; i++) 
    {
      digitalWrite(LED_PINS[i], HIGH);
    }
    
    tickMillis = currentMillis;
    isTicking = true;

    updateDisplay(); 
  }

  if (isTicking && (currentMillis - tickMillis >= 500)) 
  {
    noTone(BUZZER_PIN); 
    
    for (int i = 0; i < NUM_LEDS; i++) 
    {
      digitalWrite(LED_PINS[i], LOW);
    }
    isTicking = false;
  }
}

void updateDisplay() 
{
  display.clearDisplay();
  
  int minutes = countdownSeconds / 60;
  int seconds = countdownSeconds % 60;
  
  display.setCursor(15, 20); 
  
  if (minutes < 10) 
  {
    display.print("0");
  }
  display.print(minutes);
  display.print(":");
  
  if (seconds < 10) 
  {
    display.print("0");
  }
  display.print(seconds);
  
  display.display();
}