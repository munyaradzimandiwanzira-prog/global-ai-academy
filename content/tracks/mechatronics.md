---
id: mechatronics
title: Mechatronics & IoT
short: MECHATRONICS
category: hardware
level: beginner
language: cpp
color: "#00979D"
icon: "🔧"
order: 80
summary: Build machines that sense and act. Electronics basics, Arduino and ESP32, sensors and actuators, motors, communication protocols, IoT with MQTT, solar power and robotics — with projects for Zimbabwean farms, homes and schools.
tags: [mechatronics, arduino, esp32, iot, robotics, electronics, sensors]
---

# What is Mechatronics? {#intro}

**Mechatronics** combines **mechanical engineering**, **electronics** and **computing** to build intelligent machines: robots, drones, automatic gates, 3D printers, smart irrigation systems, production lines.

```text
  SENSE  ───▶  THINK  ───▶  ACT
  sensors      microcontroller    motors, relays, pumps,
  (soil, temp,  runs your code    LEDs, buzzers, screens
  distance)
```

**IoT** (Internet of Things) adds a network connection so devices can report data and be controlled remotely.

## Projects that matter here

- **Smart irrigation:** soil-moisture sensors switch a solar pump on only when needed — saving water and power.
- **Cold-chain monitoring:** temperature alerts for vaccines and fresh produce.
- **Borehole and tank level monitors** with SMS alerts.
- **Load-shedding helpers:** automatic switching to battery/solar, power-cut logging.
- **Classroom robots** for STEM clubs.

> No hardware yet? Use the free **Wokwi** simulator (wokwi.com) to build and run Arduino and ESP32 circuits in your browser.

# Electronics Basics {#electronics}

| Quantity | Symbol | Unit | Water analogy |
|---|---|---|---|
| **Voltage** | V | volts (V) | Water pressure |
| **Current** | I | amps (A) | Flow rate |
| **Resistance** | R | ohms (Ω) | Pipe narrowness |
| **Power** | P | watts (W) | How much work per second |

**Ohm's law:** `V = I × R`. **Power:** `P = V × I`.

```python run title="Choosing an LED resistor"
supply_v = 5.0        # Arduino pin voltage
led_v = 2.0           # red LED forward voltage
led_current = 0.020   # 20 mA

resistance = (supply_v - led_v) / led_current
power = (supply_v - led_v) * led_current
standard = [100, 120, 150, 180, 220, 270, 330, 390, 470]
pick = min(r for r in standard if r >= resistance)
print(f"Minimum resistor: {resistance:.0f} Ω → use the next standard value: {pick} Ω")
print(f"Power in resistor: {power * 1000:.0f} mW (a common ¼ W resistor is fine)")
```

## Safety

- Microcontroller projects use **safe low voltages** (3.3–12 V DC).
- **Mains electricity (220 V AC in Zimbabwe) can kill.** Never connect projects to mains wiring yourself — use certified relay modules with enclosures, under supervision of a qualified electrician.
- Lithium batteries can catch fire if shorted or damaged — use proper holders and protection.

# Arduino and ESP32 {#microcontrollers}

| Board | Strengths |
|---|---|
| **Arduino Uno** | Simple, robust, huge community — perfect to start |
| **Arduino Nano** | Small Uno for compact projects |
| **ESP32** | Built-in **Wi-Fi and Bluetooth**, faster, cheap — the IoT workhorse |
| **Raspberry Pi** | A full Linux computer — cameras, AI, dashboards |

Every Arduino sketch has two functions:

```cpp run title="Blink — the 'Hello world' of hardware"
// On a real board this blinks the built-in LED.
// Here we simulate the board so you can see what the code does.
#include <iostream>
#include <string>
const int HIGH = 1, LOW = 0, LED_BUILTIN = 13, OUTPUT = 1;
void pinMode(int, int) {}
void digitalWrite(int pin, int v) { std::cout << "pin " << pin << " -> " << (v ? "ON" : "OFF") << "\n"; }
void delay(int ms) { std::cout << "  wait " << ms << " ms\n"; }

// ---- the Arduino sketch ----
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
// ----------------------------

int main() { setup(); for (int i = 0; i < 2; i++) loop(); }
```

```output
pin 13 -> ON
  wait 500 ms
pin 13 -> OFF
  wait 500 ms
pin 13 -> ON
  wait 500 ms
pin 13 -> OFF
  wait 500 ms
```

`setup()` runs once at power-on; `loop()` repeats forever.

# Digital and Analogue I/O {#io}

| Function | Does |
|---|---|
| `pinMode(pin, INPUT/OUTPUT/INPUT_PULLUP)` | Configure a pin |
| `digitalWrite(pin, HIGH/LOW)` | Switch an output on/off |
| `digitalRead(pin)` | Read a button or switch (HIGH/LOW) |
| `analogRead(pin)` | Read a sensor voltage as 0–1023 (Uno) or 0–4095 (ESP32) |
| `analogWrite(pin, 0–255)` | PWM: dim LEDs, control motor speed |

```cpp
const int BUTTON = 2;
const int LED = 9;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  bool pressed = digitalRead(BUTTON) == LOW;
  int light = analogRead(A0);                 // light sensor
  analogWrite(LED, map(light, 0, 1023, 255, 0)); // darker room → brighter LED
  if (pressed) Serial.println("Button pressed!");
  delay(50);
}
```

# Sensors {#sensors}

| Sensor | Measures | Typical project |
|---|---|---|
| Capacitive soil moisture | Water in soil | Smart irrigation |
| DHT22 / BME280 | Temperature, humidity (pressure) | Weather station, greenhouse |
| DS18B20 | Waterproof temperature | Fridges, cold rooms |
| HC-SR04 ultrasonic | Distance | Tank level, robot obstacle avoidance |
| PIR | Motion | Security lights |
| LDR / BH1750 | Light | Automatic lights |
| ACS712 / INA219 | Current / power | Solar system monitoring |
| GPS module | Location | Vehicle tracking |

## Converting raw readings

Sensors give raw numbers; you **calibrate** them into real units:

```python run title="Calibrating a soil-moisture sensor"
DRY_RAW, WET_RAW = 3200, 1300     # measured: sensor in dry air vs in a glass of water (ESP32 scale)

def moisture_percent(raw):
    pct = (DRY_RAW - raw) / (DRY_RAW - WET_RAW) * 100
    return max(0, min(100, round(pct)))

def should_irrigate(readings, threshold=35):
    avg = sum(moisture_percent(r) for r in readings) / len(readings)   # average to reduce noise
    return avg, avg < threshold

for readings in ([2900, 2950, 2880], [1800, 1750, 1900]):
    avg, water = should_irrigate(readings)
    print(f"avg moisture {avg:.0f}% → pump {'ON' if water else 'OFF'}")
```

# Actuators and Motors {#actuators}

| Actuator | Use | Driven by |
|---|---|---|
| LED / buzzer | Indicators, alarms | Direct pin (with resistor) |
| **Relay module** | Switch pumps, lights, bigger loads | Pin → relay board |
| **DC motor** | Wheels, fans, pumps | Motor driver (L298N, TB6612) |
| **Servo** | Precise angle 0–180° (gates, arms) | PWM signal |
| **Stepper** | Exact steps (3D printers, CNC) | Stepper driver (A4988) |

> Never power motors directly from a microcontroller pin — use a **driver** or **relay** and a separate power supply, with a common ground.

```cpp
#include <Servo.h>
Servo gate;
const int TRIG = 9, ECHO = 10;

void setup() { gate.attach(6); pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); }

long distanceCm() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) * 0.0343 / 2;   // speed of sound
}

void loop() {
  gate.write(distanceCm() < 30 ? 90 : 0);     // open when a car is close
  delay(200);
}
```

# Control Logic {#control}

Real machines need more than on/off:

- **Hysteresis** — switch on below 30% moisture, off above 45%, so the pump doesn't flicker on and off.
- **State machines** — clear modes: `IDLE → FILLING → FULL → FAULT`.
- **PID control** — smoothly hold a value (temperature, motor speed) at a target.
- **Fail-safes** — maximum run time for pumps; stop if a sensor reading is impossible.

```python run title="Hysteresis prevents rapid switching"
readings = [50, 42, 36, 31, 29, 33, 38, 44, 47, 40, 32, 28]
ON_BELOW, OFF_ABOVE = 30, 45
pump = False
for r in readings:
    if not pump and r < ON_BELOW:
        pump = True
    elif pump and r > OFF_ABOVE:
        pump = False
    print(f"moisture {r:2}% → pump {'ON ' if pump else 'off'}")
```

# Communication and IoT {#iot}

## Wired protocols between chips

| Protocol | Wires | Typical devices |
|---|---|---|
| **UART (Serial)** | TX, RX | GPS, GSM modules, PC debugging |
| **I²C** | SDA, SCL (many devices on 2 wires) | BME280, OLED screens, RTC |
| **SPI** | 4 wires, fast | SD cards, displays |
| **1-Wire** | 1 wire | DS18B20 |

## Wireless and the internet

- **Wi-Fi** (ESP32) for homes, schools, farms with a router.
- **GSM/LTE modules** (SIM800, SIM7600) where there's mobile coverage but no Wi-Fi.
- **LoRa/LoRaWAN** — kilometres of range on tiny power, ideal for farms.
- **MQTT** — the lightweight publish/subscribe protocol of IoT.

```cpp
// ESP32 publishing a reading over MQTT (PubSubClient library)
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient net;
PubSubClient mqtt(net);

void setup() {
  WiFi.begin("FarmWiFi", "password");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  mqtt.setServer("broker.example.com", 1883);
}

void loop() {
  if (!mqtt.connected()) mqtt.connect("farm-node-1");
  int moisture = analogRead(34);
  mqtt.publish("farm/plot1/moisture", String(moisture).c_str());
  mqtt.loop();
  delay(60000);   // once a minute — saves data and power
}
```

A dashboard (Node-RED, Grafana, or a web app) subscribes to `farm/#` to chart readings and send alerts.

# Power: Batteries and Solar {#power}

Off-grid projects need a power budget:

```python run title="Sizing a solar-powered sensor node"
avg_current_ma = 25        # ESP32 waking every few minutes (deep sleep in between)
hours = 24
daily_mah = avg_current_ma * hours
autonomy_days = 3          # keep running through cloudy days
battery_mah = daily_mah * autonomy_days / 0.8      # don't fully drain
panel_w = (daily_mah / 1000 * 3.7) / (5 * 0.7)     # ~5 peak sun hours, 70% efficiency

print(f"Daily use: {daily_mah} mAh")
print(f"Battery: at least {battery_mah:,.0f} mAh")
print(f"Solar panel: at least {panel_w:.1f} W (round up — e.g. a 2–5 W panel)")
```

Tips: use **deep sleep**, send data less often, and use a proper solar charge controller for lithium cells.

# Robotics {#robotics}

A simple mobile robot:

- **Chassis** with 2 DC motors + a caster wheel.
- **Motor driver** (TB6612/L298N).
- **Sensors**: ultrasonic for obstacles, IR sensors for line-following.
- **Brain**: Arduino or ESP32.
- **Power**: battery pack separate from logic power.

```cpp
void loop() {
  bool leftOnLine = digitalRead(IR_LEFT);
  bool rightOnLine = digitalRead(IR_RIGHT);
  if (distanceCm() < 15)         stopMotors();
  else if (leftOnLine && rightOnLine) forward(180);
  else if (leftOnLine)           turnLeft(150);
  else if (rightOnLine)          turnRight(150);
  else                           search();
}
```

Next steps: add a camera and **computer vision** on a Raspberry Pi, or join a robotics competition. Learn the AI side in [Machine Learning](/learn/machine-learning).

````challenge
id: mech-tank-level
title: Water tank level
difficulty: easy
prompt: |
  An ultrasonic sensor is mounted at the top of a tank that is **200 cm** deep. It measures the distance down to the water surface as **50 cm**.

  Write a C++ program that prints the tank level as a **percentage** (a whole number) followed by `%`.

  Level = (depth − distance) ÷ depth × 100
starter: |
  #include <iostream>

  int main() {
      int depth = 200;
      int distance = 50;
      // print the level, e.g. 75%
  }
expectedOutput: "75%"
````

```quiz
- q: What does a relay module let a microcontroller do?
  options: ["Read temperature", "Switch higher-power loads like pumps", "Connect to Wi-Fi", "Store files"]
  answer: 1
- q: Why use hysteresis in an irrigation controller?
  options: ["To use more water", "To stop the pump switching on and off rapidly", "To speed up Wi-Fi", "To measure distance"]
  answer: 1
- q: Which board has built-in Wi-Fi and Bluetooth?
  options: ["Arduino Uno", "ESP32", "A breadboard", "A servo"]
  answer: 1
- q: Using Ohm's law, what current flows through 100 Ω with 5 V across it?
  options: ["0.05 A", "500 A", "20 A", "0.5 A"]
  answer: 0
```

```exam
- q: "Ohm's law states\u2026"
  options: ["V = I \u00d7 R", "P = V / R\u00b2", "I = V \u00d7 R", "R = P \u00d7 I"]
  answer: 0
- q: "Which function reads an analogue sensor on Arduino?"
  options: ["analogRead()", "digitalRead()", "analogWrite()", "readSensor()"]
  answer: 0
- q: "Why use a motor driver instead of a pin to power a motor?"
  options: ["Pins can't supply enough current", "Drivers are decorative", "Motors need Wi-Fi", "Pins are too fast"]
  answer: 0
- q: "Which protocol connects many sensors on just two wires (SDA/SCL)?"
  options: ["I\u00b2C", "UART", "SPI", "HDMI"]
  answer: 0
- q: "Which wireless option gives kilometres of range at very low power?"
  options: ["LoRa", "Bluetooth", "NFC", "Infrared"]
  answer: 0
- q: "What does deep sleep do on an ESP32?"
  options: ["Greatly reduces power use between readings", "Increases speed", "Connects to Wi-Fi", "Erases memory"]
  answer: 0
```
