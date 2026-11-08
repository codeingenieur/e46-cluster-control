// E36-Kombi (VDO 62.11-8 360 482, kein CAN) per USB steuern: PC -> Arduino Uno -> Transistoren -> Kombi.
// Gleiches Zeilenprotokoll wie die ESP32-Firmware (docs/usb-interface.md), andere Schluessel (docs/e36-uno.md).
//
// Ausgaenge (alle ueber NPN-Transistoren gegen Masse, nie direkt an das Kombi):
//   D9  Drehzahl-Rechteck   (Timer1, Hardware-Toggle)   -> weiss 20
//   D10 Wegsignal-Rechteck  (Timer1, Hardware-Toggle)   -> schwarz 4
//   D6  PWM Kuehlmitteltemperatur (Timer0)               -> blau 18
//   D5  PWM Tankanzeige           (Timer0)               -> schwarz 1
//   Lampen: siehe Tabelle LAMPS
#include <Arduino.h>
#include <avr/interrupt.h>
#include <avr/io.h>
#include <stdlib.h>
#include <string.h>

static const char* FW_VERSION = "0.1.0";

static const uint8_t PIN_RPM = 9;     // OC1A
static const uint8_t PIN_SPEED = 10;  // OC1B
static const uint8_t PIN_COOLANT = 6; // OC0A
static const uint8_t PIN_FUEL = 5;    // OC0B

struct Lamp {
  const char* name;
  uint8_t pin;  // Uno-Pin; A0..A5 = 14..19
};

// Warn-/Kontrolllampen: Pin am Kombi in Klammern (docs/e36-pinout.md).
static const Lamp LAMPS[] = {
    {"mil", 2},         // Motorkontrolle, weiss 16
    {"oilpress", 3},    // Oeldruck, blau 19
    {"handbrake", 4},   // Handbremse, weiss 17
    {"abs", 7},         // ABS, blau 11
    {"airbag", 8},      // Airbag, weiss 14
    {"brakefluid", 11}, // Bremsfluessigkeit, weiss 18
    {"left", 12},       // Blinker links, weiss 4
    {"right", 13},      // Blinker rechts, weiss 3
    {"highbeam", 14},   // Fernlicht, weiss 1
    {"fogfront", 15},   // Nebelscheinwerfer, blau 8
    {"fogrear", 16},    // Nebelschlussleuchte, schwarz 5
    {"belt", 17},       // Gurtwarner, blau 14
    {"asc", 18},        // ASC, blau 12
    {"cat", 19},        // Katalysator-Uebertemperatur, weiss 26
};
static const uint8_t N_LAMPS = sizeof(LAMPS) / sizeof(LAMPS[0]);

struct State {
  float rpm = 0;
  float speed = 0;
  float coolant = 40;
  float fuel = 0;
  uint8_t coolDuty = 0;
  uint8_t fuelDuty = 0;
  bool lamp[N_LAMPS];
};

struct Config {
  float rpmPpr = 2.0f;    // Impulse je Umdrehung (Vierzylinder, Annahme)
  float speedHz = 1.0f;   // Hz je km/h (Platzhalter, muss kalibriert werden)
  float coolC0 = 40.0f;   // Temperatur, bei der die Duty d0 gilt
  float coolC1 = 120.0f;  // Temperatur, bei der die Duty d1 gilt
  float coolD0 = 0;
  float coolD1 = 255;
  float fuelD0 = 0;       // Duty bei Tank 0 %
  float fuelD1 = 255;     // Duty bei Tank 100 %
  float wdtMs = 0;        // Host-Watchdog, 0 = aus
};

static State st;
static Config cfg;
static uint32_t lastHostMs = 0;
static bool wdtTripped = false;

// ---------------------------------------------------------------- Rechteckausgaenge (Timer1)
// Timer1 laeuft frei mit 250 kHz (Teiler 64, 4 us). Der Compare-Match schaltet den Pin per Hardware um,
// die ISR plant nur den naechsten Match. So bleibt das Signal unabhaengig von der Serial-Verarbeitung.

static volatile uint16_t halfA = 0;
static volatile uint16_t halfB = 0;

ISR(TIMER1_COMPA_vect) { OCR1A += halfA; }
ISR(TIMER1_COMPB_vect) { OCR1B += halfB; }

static const float TICKS_PER_SEC = 250000.0f;
static const float MIN_HZ = 2.0f;     // darunter wird der Ausgang abgeschaltet (16-Bit-Zaehler)
static const float MAX_HZ = 4000.0f;  // Schutz fuer die ISR-Last

static uint16_t halfTicks(float hz) {
  if (hz > MAX_HZ) hz = MAX_HZ;
  return (uint16_t)(TICKS_PER_SEC / (2.0f * hz) + 0.5f);
}

static void timer1Begin() {
  TCCR1A = 0;                       // Normal Mode, Pins zunaechst abgekoppelt
  TCCR1B = _BV(CS11) | _BV(CS10);   // Teiler 64
  TIMSK1 = 0;
}

static void setFreqA(float hz) {
  if (!(hz >= MIN_HZ)) {
    noInterrupts();
    TCCR1A &= ~_BV(COM1A0);
    TIMSK1 &= ~_BV(OCIE1A);
    interrupts();
    digitalWrite(PIN_RPM, LOW);
    return;
  }
  uint16_t h = halfTicks(hz);
  noInterrupts();
  halfA = h;
  if (!(TCCR1A & _BV(COM1A0))) {
    OCR1A = TCNT1 + h;
    TIMSK1 |= _BV(OCIE1A);
    TCCR1A |= _BV(COM1A0);
  }
  interrupts();
}

static void setFreqB(float hz) {
  if (!(hz >= MIN_HZ)) {
    noInterrupts();
    TCCR1A &= ~_BV(COM1B0);
    TIMSK1 &= ~_BV(OCIE1B);
    interrupts();
    digitalWrite(PIN_SPEED, LOW);
    return;
  }
  uint16_t h = halfTicks(hz);
  noInterrupts();
  halfB = h;
  if (!(TCCR1A & _BV(COM1B0))) {
    OCR1B = TCNT1 + h;
    TIMSK1 |= _BV(OCIE1B);
    TCCR1A |= _BV(COM1B0);
  }
  interrupts();
}

// ---------------------------------------------------------------- Ausgaenge anwenden

static uint8_t mapDuty(float v, float v0, float v1, float d0, float d1) {
  if (v1 == v0) return 0;
  float t = (v - v0) / (v1 - v0);
  if (!(t > 0)) t = 0;
  if (t > 1) t = 1;
  float d = d0 + t * (d1 - d0);
  if (!(d > 0)) return 0;
  if (d > 255) return 255;
  return (uint8_t)(d + 0.5f);
}

static void applyRpm() { setFreqA(st.rpm * cfg.rpmPpr / 60.0f); }
static void applySpeed() { setFreqB(st.speed * cfg.speedHz); }
static void applyPwm() {
  analogWrite(PIN_COOLANT, st.coolDuty);
  analogWrite(PIN_FUEL, st.fuelDuty);
}
static void applyLamps() {
  for (uint8_t i = 0; i < N_LAMPS; i++) digitalWrite(LAMPS[i].pin, st.lamp[i] ? HIGH : LOW);
}
static void applyMapped() {
  st.coolDuty = mapDuty(st.coolant, cfg.coolC0, cfg.coolC1, cfg.coolD0, cfg.coolD1);
  st.fuelDuty = mapDuty(st.fuel, 0, 100, cfg.fuelD0, cfg.fuelD1);
}
static void applyAll() {
  applyMapped();
  applyRpm();
  applySpeed();
  applyPwm();
  applyLamps();
}

// ---------------------------------------------------------------- Kommandos

static bool parseFloat(const char* s, float& out) {
  char* end;
  float v = strtod(s, &end);
  if (end == s || *end != '\0') return false;
  out = v;
  return true;
}

static bool setKey(const char* k, float x) {
  if (!strcasecmp(k, "rpm")) st.rpm = x;
  else if (!strcasecmp(k, "speed")) st.speed = x;
  else if (!strcasecmp(k, "coolant")) { st.coolant = x; st.coolDuty = mapDuty(x, cfg.coolC0, cfg.coolC1, cfg.coolD0, cfg.coolD1); }
  else if (!strcasecmp(k, "fuel")) { st.fuel = x; st.fuelDuty = mapDuty(x, 0, 100, cfg.fuelD0, cfg.fuelD1); }
  else if (!strcasecmp(k, "coolant_pwm")) st.coolDuty = mapDuty(x, 0, 255, 0, 255);
  else if (!strcasecmp(k, "fuel_pwm")) st.fuelDuty = mapDuty(x, 0, 255, 0, 255);
  else {
    for (uint8_t i = 0; i < N_LAMPS; i++) {
      if (!strcasecmp(k, LAMPS[i].name)) {
        st.lamp[i] = x != 0;
        return true;
      }
    }
    return false;
  }
  return true;
}

static bool cfgKey(const char* k, float x) {
  if (!strcasecmp(k, "rpm_ppr")) cfg.rpmPpr = x;
  else if (!strcasecmp(k, "speed_hz")) cfg.speedHz = x;
  else if (!strcasecmp(k, "cool_c0")) cfg.coolC0 = x;
  else if (!strcasecmp(k, "cool_c1")) cfg.coolC1 = x;
  else if (!strcasecmp(k, "cool_d0")) cfg.coolD0 = x;
  else if (!strcasecmp(k, "cool_d1")) cfg.coolD1 = x;
  else if (!strcasecmp(k, "fuel_d0")) cfg.fuelD0 = x;
  else if (!strcasecmp(k, "fuel_d1")) cfg.fuelD1 = x;
  else if (!strcasecmp(k, "wdt")) cfg.wdtMs = x < 0 ? 0 : x;
  else return false;
  return true;
}

// Eine Zeile wirkt ganz oder gar nicht: erst Zahlen pruefen, dann anwenden, bei unbekanntem Schluessel zuruecksetzen.
static void cmdKeyValues(char** t, int n, bool (*apply)(const char*, float), bool isCfg) {
  if (n < 2 || n % 2 != 0) { Serial.println(F("ERR usage")); return; }
  for (int i = 0; i < n; i += 2) {
    float v;
    if (!parseFloat(t[i + 1], v)) { Serial.println(F("ERR bad_value")); return; }
  }
  const State stBak = st;
  const Config cfgBak = cfg;
  for (int i = 0; i < n; i += 2) {
    float v;
    parseFloat(t[i + 1], v);
    if (!apply(t[i], v)) {
      st = stBak;
      cfg = cfgBak;
      Serial.println(F("ERR unknown_key"));
      return;
    }
  }
  if (isCfg) applyAll();
  else {
    applyRpm();
    applySpeed();
    applyPwm();
    applyLamps();
  }
  Serial.println(F("OK"));
}

static void cmdGet() {
  Serial.print(F("STATE rpm="));
  Serial.print(st.rpm, 0);
  Serial.print(F(" speed="));
  Serial.print(st.speed, 1);
  Serial.print(F(" coolant="));
  Serial.print(st.coolant, 1);
  Serial.print(F(" fuel="));
  Serial.print(st.fuel, 1);
  Serial.print(F(" coolant_pwm="));
  Serial.print(st.coolDuty);
  Serial.print(F(" fuel_pwm="));
  Serial.print(st.fuelDuty);
  for (uint8_t i = 0; i < N_LAMPS; i++) {
    Serial.print(' ');
    Serial.print(LAMPS[i].name);
    Serial.print('=');
    Serial.print(st.lamp[i] ? 1 : 0);
  }
  Serial.println();
}

static void cmdCfg(char** t, int n) {
  if (n == 0) {
    Serial.print(F("CFG rpm_ppr="));
    Serial.print(cfg.rpmPpr, 3);
    Serial.print(F(" speed_hz="));
    Serial.print(cfg.speedHz, 4);
    Serial.print(F(" cool_c0="));
    Serial.print(cfg.coolC0, 1);
    Serial.print(F(" cool_c1="));
    Serial.print(cfg.coolC1, 1);
    Serial.print(F(" cool_d0="));
    Serial.print(cfg.coolD0, 0);
    Serial.print(F(" cool_d1="));
    Serial.print(cfg.coolD1, 0);
    Serial.print(F(" fuel_d0="));
    Serial.print(cfg.fuelD0, 0);
    Serial.print(F(" fuel_d1="));
    Serial.print(cfg.fuelD1, 0);
    Serial.print(F(" wdt="));
    Serial.println(cfg.wdtMs, 0);
    return;
  }
  cmdKeyValues(t, n, cfgKey, true);
}

static void zeroOutputs() {
  st.rpm = 0;
  st.speed = 0;
  applyRpm();
  applySpeed();
}

static void handleLine(char* line) {
  char* t[24];
  int n = 0;
  for (char* p = strtok(line, " \t"); p && n < 24; p = strtok(nullptr, " \t")) t[n++] = p;
  if (n == 0) return;

  lastHostMs = millis();
  wdtTripped = false;

  const char* c = t[0];
  if (!strcasecmp(c, "PING")) {
    Serial.print(F("PONG e36-uno "));
    Serial.println(FW_VERSION);
  } else if (!strcasecmp(c, "SET")) cmdKeyValues(t + 1, n - 1, setKey, false);
  else if (!strcasecmp(c, "GET")) cmdGet();
  else if (!strcasecmp(c, "CFG")) cmdCfg(t + 1, n - 1);
  else if (!strcasecmp(c, "ZERO")) {
    zeroOutputs();
    Serial.println(F("OK"));
  } else if (!strcasecmp(c, "HELP")) {
    Serial.println(F("HELP PING | SET k v [k v ...] | GET | CFG [k v ...] | ZERO"));
  } else Serial.println(F("ERR unknown_cmd"));
}

static void pollSerial() {
  static char line[96];
  static uint8_t len = 0;
  static bool overflow = false;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (overflow) Serial.println(F("ERR line_too_long"));
      else if (len > 0) { line[len] = '\0'; handleLine(line); }
      len = 0;
      overflow = false;
    } else if (len < sizeof line - 1) {
      line[len++] = ch;
    } else {
      overflow = true;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RPM, OUTPUT);
  pinMode(PIN_SPEED, OUTPUT);
  pinMode(PIN_COOLANT, OUTPUT);
  pinMode(PIN_FUEL, OUTPUT);
  digitalWrite(PIN_RPM, LOW);
  digitalWrite(PIN_SPEED, LOW);
  for (uint8_t i = 0; i < N_LAMPS; i++) {
    pinMode(LAMPS[i].pin, OUTPUT);
    digitalWrite(LAMPS[i].pin, LOW);
    st.lamp[i] = false;
  }
  timer1Begin();
  applyAll();
  Serial.print(F("READY e36-uno "));
  Serial.println(FW_VERSION);
  lastHostMs = millis();
}

void loop() {
  pollSerial();
  if (cfg.wdtMs > 0 && !wdtTripped && millis() - lastHostMs > (uint32_t)cfg.wdtMs) {
    zeroOutputs();
    wdtTripped = true;
    Serial.println(F("EVT wdt"));
  }
}
