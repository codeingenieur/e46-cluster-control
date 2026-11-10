// Drive an E36 instrument cluster (VDO 62.11-8 360 482, no CAN bus) from a PC over USB:
//   PC -> USB serial -> Arduino Uno -> transistors/MOSFETs -> cluster.
//
// It speaks the same line protocol as the ESP32 firmware (docs/usb-interface.md); the keys that
// differ are listed in docs/e36-uno.md.
//
// Outputs. Every output switches a transistor or MOSFET to ground and never connects to the cluster directly:
//   D9  rpm square wave     (Timer1, hardware toggle)  -> white 20
//   D10 speed square wave   (Timer1, hardware toggle)  -> black 4
//   D6  coolant PWM         (Timer0)                   -> blue 18
//   D5  fuel gauge PWM      (Timer0)                   -> black 1
//   Warning lamps: see the LAMPS table below.
#include <Arduino.h>
#include <avr/interrupt.h>
#include <avr/io.h>
#include <stdlib.h>
#include <string.h>

static const char* FIRMWARE_VERSION = "0.1.0";

// ---------------------------------------------------------------- Pins

static const uint8_t PIN_RPM_SIGNAL = 9;    // OC1A
static const uint8_t PIN_SPEED_SIGNAL = 10; // OC1B
static const uint8_t PIN_COOLANT_PWM = 6;   // OC0A
static const uint8_t PIN_FUEL_PWM = 5;      // OC0B

struct Lamp {
  const char* name;  // key used in the SET command
  uint8_t pin;       // Uno pin number; A0..A5 are 14..19
};

// Warning and indicator lamps. The cluster pin is in the comment (see docs/e36-pinout.md).
static const Lamp LAMPS[] = {
    {"mil", 2},         // engine warning (check engine), white 16
    {"oilpress", 3},    // oil pressure, blue 19
    {"handbrake", 4},   // handbrake, white 17
    {"abs", 7},         // ABS, blue 11
    {"airbag", 8},      // airbag, white 14
    {"brakefluid", 11}, // brake fluid, white 18
    {"left", 12},       // left turn signal, white 4
    {"right", 13},      // right turn signal, white 3
    {"highbeam", 14},   // high beam, white 1
    {"fogfront", 15},   // front fog lamp, blue 8
    {"fogrear", 16},    // rear fog lamp, black 5
    {"belt", 17},       // seat belt warning, blue 14
    {"asc", 18},        // ASC, blue 12
    {"cat", 19},        // catalytic converter overtemperature, white 26
};
static const uint8_t LAMP_COUNT = sizeof(LAMPS) / sizeof(LAMPS[0]);

// ---------------------------------------------------------------- State and configuration

// What the PC asked for (changed with SET).
struct State {
  float rpm = 0;
  float speed = 0;
  float coolantCelsius = 40;
  float fuelPercent = 0;
  uint8_t coolantDuty = 0;  // PWM duty 0..255 for the coolant gauge
  uint8_t fuelDuty = 0;     // PWM duty 0..255 for the fuel gauge
  bool lampOn[LAMP_COUNT];
};

// Calibration values (changed with CFG, kept in RAM only, so a reset brings the defaults back).
struct Config {
  // Pulses per engine revolution. A four-cylinder needs 2, the real cluster needed 1.935 (needle was
  // about 3 % too high with 2).
  float rpmPulsesPerRevolution = 1.935f;

  // Extra rpm added to the requested value so the needle sits on the mark. Calibration points at
  // 1000, 2000, 3000, 4000, 5000, 6000 and 6500 rpm, linear in between, none at 0 rpm, constant above
  // 6500 rpm. Positive means the needle would otherwise be too low. Tuned by eye on the bench cluster.
  float rpmCorrection[7] = {137, 95, 95, 85, 68, 80, 35};

  // Speed signal frequency per km/h, tuned by hand on the bench cluster (50 km/h exact, 240 km/h on the mark).
  float speedHzPerKmh = 1.27f;

  // Coolant gauge: PWM duty at two temperatures. set coolant=<C> interpolates between them.
  float coolantTempLow = 40.0f;
  float coolantTempHigh = 120.0f;
  float coolantDutyLow = 0;
  float coolantDutyHigh = 255;

  // Fuel gauge: PWM duty at 0 % and at 100 %.
  float fuelDutyEmpty = 0;
  float fuelDutyFull = 255;

  // Level of D9 while there is no rpm signal: 1 = HIGH (MOSFET on, cluster pin pulled to ground).
  // Confirmed on the real cluster: with 0 (pin left open) the rpm needle swings to full scale.
  float rpmIdleLevel = 1;
  // Level of D10 while there is no speed signal, same meaning as rpmIdleLevel.
  float speedIdleLevel = 0;

  // Host watchdog in milliseconds, 0 = off. When the PC goes quiet for this long, rpm and speed drop to 0.
  float watchdogTimeoutMs = 0;
};

static State state;
static Config config;
static uint32_t lastHostActivityMs = 0;
static bool watchdogTripped = false;

// ---------------------------------------------------------------- Square wave outputs (Timer1)
// Timer1 free-runs at 250 kHz (prescaler 64, 4 microseconds per tick). A compare match toggles the
// output pin in hardware, and the interrupt only schedules the next match. That keeps the signal
// steady no matter how busy the serial code is.

static volatile uint16_t rpmHalfPeriodTicks = 0;
static volatile uint16_t speedHalfPeriodTicks = 0;

ISR(TIMER1_COMPA_vect) { OCR1A += rpmHalfPeriodTicks; }
ISR(TIMER1_COMPB_vect) { OCR1B += speedHalfPeriodTicks; }

static const float TIMER_TICKS_PER_SECOND = 250000.0f;
static const float MIN_FREQUENCY_HZ = 2.0f;     // below this the output is switched off (16-bit timer limit)
static const float MAX_FREQUENCY_HZ = 4000.0f;  // protects the interrupt load

static uint16_t halfPeriodTicks(float frequencyHz) {
  if (frequencyHz > MAX_FREQUENCY_HZ) frequencyHz = MAX_FREQUENCY_HZ;
  return (uint16_t)(TIMER_TICKS_PER_SECOND / (2.0f * frequencyHz) + 0.5f);
}

static void startTimer1() {
  TCCR1A = 0;                      // normal mode, output pins detached for now
  TCCR1B = _BV(CS11) | _BV(CS10);  // prescaler 64
  TIMSK1 = 0;
}

// Start, change or stop the rpm square wave on D9. Below MIN_FREQUENCY_HZ the toggling stops and the
// pin is held at the idle level instead.
static void setRpmFrequency(float frequencyHz) {
  if (!(frequencyHz >= MIN_FREQUENCY_HZ)) {
    noInterrupts();
    TCCR1A &= ~_BV(COM1A0);
    TIMSK1 &= ~_BV(OCIE1A);
    interrupts();
    digitalWrite(PIN_RPM_SIGNAL, config.rpmIdleLevel != 0 ? HIGH : LOW);
    return;
  }
  uint16_t ticks = halfPeriodTicks(frequencyHz);
  noInterrupts();
  rpmHalfPeriodTicks = ticks;
  if (!(TCCR1A & _BV(COM1A0))) {  // not running yet: schedule the first toggle and attach the pin
    OCR1A = TCNT1 + ticks;
    TIMSK1 |= _BV(OCIE1A);
    TCCR1A |= _BV(COM1A0);
  }
  interrupts();
}

// Same as setRpmFrequency, for the speed square wave on D10.
static void setSpeedFrequency(float frequencyHz) {
  if (!(frequencyHz >= MIN_FREQUENCY_HZ)) {
    noInterrupts();
    TCCR1A &= ~_BV(COM1B0);
    TIMSK1 &= ~_BV(OCIE1B);
    interrupts();
    digitalWrite(PIN_SPEED_SIGNAL, config.speedIdleLevel != 0 ? HIGH : LOW);
    return;
  }
  uint16_t ticks = halfPeriodTicks(frequencyHz);
  noInterrupts();
  speedHalfPeriodTicks = ticks;
  if (!(TCCR1A & _BV(COM1B0))) {
    OCR1B = TCNT1 + ticks;
    TIMSK1 |= _BV(OCIE1B);
    TCCR1A |= _BV(COM1B0);
  }
  interrupts();
}

// ---------------------------------------------------------------- Apply the state to the pins

// Linear mapping of a value from [valueAtZero..valueAtOne] to a PWM duty [dutyAtZero..dutyAtOne], clamped to 0..255.
static uint8_t mapToDuty(float value, float valueAtZero, float valueAtOne, float dutyAtZero, float dutyAtOne) {
  if (valueAtOne == valueAtZero) return 0;
  float t = (value - valueAtZero) / (valueAtOne - valueAtZero);
  if (!(t > 0)) t = 0;
  if (t > 1) t = 1;
  float duty = dutyAtZero + t * (dutyAtOne - dutyAtZero);
  if (!(duty > 0)) return 0;
  if (duty > 255) return 255;
  return (uint8_t)(duty + 0.5f);
}

// Rpm to add so the needle sits on the mark. Calibration points: 0 rpm (0), 1000..6000 rpm
// (rpmCorrection[0..5]) and 6500 rpm (rpmCorrection[6]), linear in between, constant above 6500 rpm.
static float rpmNeedleCorrection(float rpm) {
  if (!(rpm > 0)) return 0;
  if (rpm >= 6500) return config.rpmCorrection[6];
  uint8_t segment = (uint8_t)(rpm / 1000.0f);  // 0..6
  const float x0 = segment * 1000.0f;
  const float x1 = (segment < 6) ? x0 + 1000.0f : 6500.0f;
  const float y0 = (segment == 0) ? 0 : config.rpmCorrection[segment - 1];
  const float y1 = config.rpmCorrection[segment];
  return y0 + (y1 - y0) * (rpm - x0) / (x1 - x0);
}

static void applyRpm() {
  float correctedRpm = state.rpm + rpmNeedleCorrection(state.rpm);
  setRpmFrequency(correctedRpm * config.rpmPulsesPerRevolution / 60.0f);
}

static void applySpeed() { setSpeedFrequency(state.speed * config.speedHzPerKmh); }

static void applyPwm() {
  analogWrite(PIN_COOLANT_PWM, state.coolantDuty);
  analogWrite(PIN_FUEL_PWM, state.fuelDuty);
}

static void applyLamps() {
  for (uint8_t i = 0; i < LAMP_COUNT; i++) digitalWrite(LAMPS[i].pin, state.lampOn[i] ? HIGH : LOW);
}

// Recompute the PWM duties from the coolant temperature and fuel level (needed after a calibration change).
static void recomputeDuties() {
  state.coolantDuty = mapToDuty(state.coolantCelsius, config.coolantTempLow, config.coolantTempHigh,
                                config.coolantDutyLow, config.coolantDutyHigh);
  state.fuelDuty = mapToDuty(state.fuelPercent, 0, 100, config.fuelDutyEmpty, config.fuelDutyFull);
}

static void applyEverything() {
  recomputeDuties();
  applyRpm();
  applySpeed();
  applyPwm();
  applyLamps();
}

// ---------------------------------------------------------------- Commands

static bool parseNumber(const char* text, float& result) {
  char* end;
  float value = strtod(text, &end);
  if (end == text || *end != '\0') return false;
  result = value;
  return true;
}

// Apply one "key value" pair of a SET command. Returns false for an unknown key.
static bool applySetKey(const char* key, float value) {
  if (!strcasecmp(key, "rpm")) state.rpm = value;
  else if (!strcasecmp(key, "speed")) state.speed = value;
  else if (!strcasecmp(key, "coolant")) {
    state.coolantCelsius = value;
    state.coolantDuty = mapToDuty(value, config.coolantTempLow, config.coolantTempHigh,
                                  config.coolantDutyLow, config.coolantDutyHigh);
  } else if (!strcasecmp(key, "fuel")) {
    state.fuelPercent = value;
    state.fuelDuty = mapToDuty(value, 0, 100, config.fuelDutyEmpty, config.fuelDutyFull);
  }
  else if (!strcasecmp(key, "coolant_pwm")) state.coolantDuty = mapToDuty(value, 0, 255, 0, 255);
  else if (!strcasecmp(key, "fuel_pwm")) state.fuelDuty = mapToDuty(value, 0, 255, 0, 255);
  else {
    for (uint8_t i = 0; i < LAMP_COUNT; i++) {
      if (!strcasecmp(key, LAMPS[i].name)) {
        state.lampOn[i] = value != 0;
        return true;
      }
    }
    return false;
  }
  return true;
}

// Apply one "key value" pair of a CFG command. Returns false for an unknown key.
static bool applyConfigKey(const char* key, float value) {
  if (!strcasecmp(key, "rpm_ppr")) config.rpmPulsesPerRevolution = value;
  else if (!strncasecmp(key, "rpm_c", 5) && key[5] >= '1' && key[5] <= '7' && key[6] == '\0') {
    config.rpmCorrection[key[5] - '1'] = value;  // rpm_c1 .. rpm_c7
  }
  else if (!strcasecmp(key, "speed_hz")) config.speedHzPerKmh = value;
  else if (!strcasecmp(key, "cool_c0")) config.coolantTempLow = value;
  else if (!strcasecmp(key, "cool_c1")) config.coolantTempHigh = value;
  else if (!strcasecmp(key, "cool_d0")) config.coolantDutyLow = value;
  else if (!strcasecmp(key, "cool_d1")) config.coolantDutyHigh = value;
  else if (!strcasecmp(key, "fuel_d0")) config.fuelDutyEmpty = value;
  else if (!strcasecmp(key, "fuel_d1")) config.fuelDutyFull = value;
  else if (!strcasecmp(key, "rpm_idle")) config.rpmIdleLevel = value;
  else if (!strcasecmp(key, "speed_idle")) config.speedIdleLevel = value;
  else if (!strcasecmp(key, "wdt")) config.watchdogTimeoutMs = value < 0 ? 0 : value;
  else return false;
  return true;
}

// A SET or CFG line takes effect completely or not at all: first check that every value is a number,
// then apply the pairs, and undo everything if a key is unknown.
static void handleKeyValueCommand(char** tokens, int tokenCount, bool (*applyKey)(const char*, float), bool isConfig) {
  if (tokenCount < 2 || tokenCount % 2 != 0) { Serial.println(F("ERR usage")); return; }
  for (int i = 0; i < tokenCount; i += 2) {
    float value;
    if (!parseNumber(tokens[i + 1], value)) { Serial.println(F("ERR bad_value")); return; }
  }
  const State stateBackup = state;
  const Config configBackup = config;
  for (int i = 0; i < tokenCount; i += 2) {
    float value;
    parseNumber(tokens[i + 1], value);
    if (!applyKey(tokens[i], value)) {
      state = stateBackup;
      config = configBackup;
      Serial.println(F("ERR unknown_key"));
      return;
    }
  }
  if (isConfig) applyEverything();
  else {
    applyRpm();
    applySpeed();
    applyPwm();
    applyLamps();
  }
  Serial.println(F("OK"));
}

// GET: print the current state on one line.
static void handleGet() {
  Serial.print(F("STATE rpm="));
  Serial.print(state.rpm, 0);
  Serial.print(F(" speed="));
  Serial.print(state.speed, 1);
  Serial.print(F(" coolant="));
  Serial.print(state.coolantCelsius, 1);
  Serial.print(F(" fuel="));
  Serial.print(state.fuelPercent, 1);
  Serial.print(F(" coolant_pwm="));
  Serial.print(state.coolantDuty);
  Serial.print(F(" fuel_pwm="));
  Serial.print(state.fuelDuty);
  for (uint8_t i = 0; i < LAMP_COUNT; i++) {
    Serial.print(' ');
    Serial.print(LAMPS[i].name);
    Serial.print('=');
    Serial.print(state.lampOn[i] ? 1 : 0);
  }
  Serial.println();
}

// CFG without arguments prints all calibration values, CFG with key/value pairs changes them.
static void handleConfig(char** tokens, int tokenCount) {
  if (tokenCount == 0) {
    Serial.print(F("CFG rpm_ppr="));
    Serial.print(config.rpmPulsesPerRevolution, 3);
    for (uint8_t i = 0; i < 7; i++) {
      Serial.print(F(" rpm_c"));
      Serial.print(i + 1);
      Serial.print('=');
      Serial.print(config.rpmCorrection[i], 0);
    }
    Serial.print(F(" speed_hz="));
    Serial.print(config.speedHzPerKmh, 4);
    Serial.print(F(" cool_c0="));
    Serial.print(config.coolantTempLow, 1);
    Serial.print(F(" cool_c1="));
    Serial.print(config.coolantTempHigh, 1);
    Serial.print(F(" cool_d0="));
    Serial.print(config.coolantDutyLow, 0);
    Serial.print(F(" cool_d1="));
    Serial.print(config.coolantDutyHigh, 0);
    Serial.print(F(" fuel_d0="));
    Serial.print(config.fuelDutyEmpty, 0);
    Serial.print(F(" fuel_d1="));
    Serial.print(config.fuelDutyFull, 0);
    Serial.print(F(" rpm_idle="));
    Serial.print(config.rpmIdleLevel, 0);
    Serial.print(F(" speed_idle="));
    Serial.print(config.speedIdleLevel, 0);
    Serial.print(F(" wdt="));
    Serial.println(config.watchdogTimeoutMs, 0);
    return;
  }
  handleKeyValueCommand(tokens, tokenCount, applyConfigKey, true);
}

// Set rpm and speed to 0 (used by ZERO and by the watchdog).
static void zeroRpmAndSpeed() {
  state.rpm = 0;
  state.speed = 0;
  applyRpm();
  applySpeed();
}

static void handleLine(char* line) {
  const int MAX_TOKENS = 24;
  char* tokens[MAX_TOKENS];
  int tokenCount = 0;
  for (char* p = strtok(line, " \t"); p && tokenCount < MAX_TOKENS; p = strtok(nullptr, " \t")) tokens[tokenCount++] = p;
  if (tokenCount == 0) return;

  lastHostActivityMs = millis();
  watchdogTripped = false;

  const char* command = tokens[0];
  if (!strcasecmp(command, "PING")) {
    Serial.print(F("PONG e36-uno "));
    Serial.println(FIRMWARE_VERSION);
  } else if (!strcasecmp(command, "SET")) handleKeyValueCommand(tokens + 1, tokenCount - 1, applySetKey, false);
  else if (!strcasecmp(command, "GET")) handleGet();
  else if (!strcasecmp(command, "CFG")) handleConfig(tokens + 1, tokenCount - 1);
  else if (!strcasecmp(command, "ZERO")) {
    zeroRpmAndSpeed();
    Serial.println(F("OK"));
  } else if (!strcasecmp(command, "HELP")) {
    Serial.println(F("HELP PING | SET k v [k v ...] | GET | CFG [k v ...] | ZERO"));
  } else Serial.println(F("ERR unknown_cmd"));
}

// Collect bytes from the USB serial port into lines ('\n', '\r' or '\r\n' all end a line) and hand each line to handleLine.
static void readSerialLines() {
  static char line[96];
  static uint8_t length = 0;
  static bool overflowed = false;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (overflowed) Serial.println(F("ERR line_too_long"));
      else if (length > 0) { line[length] = '\0'; handleLine(line); }
      length = 0;
      overflowed = false;
    } else if (length < sizeof line - 1) {
      line[length++] = ch;
    } else {
      overflowed = true;
    }
  }
}

// ---------------------------------------------------------------- Arduino entry points

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RPM_SIGNAL, OUTPUT);
  pinMode(PIN_SPEED_SIGNAL, OUTPUT);
  pinMode(PIN_COOLANT_PWM, OUTPUT);
  pinMode(PIN_FUEL_PWM, OUTPUT);
  digitalWrite(PIN_RPM_SIGNAL, LOW);
  digitalWrite(PIN_SPEED_SIGNAL, LOW);
  for (uint8_t i = 0; i < LAMP_COUNT; i++) {
    pinMode(LAMPS[i].pin, OUTPUT);
    digitalWrite(LAMPS[i].pin, LOW);
    state.lampOn[i] = false;
  }
  startTimer1();
  applyEverything();
  Serial.print(F("READY e36-uno "));
  Serial.println(FIRMWARE_VERSION);
  lastHostActivityMs = millis();
}

void loop() {
  readSerialLines();
  bool hostWentQuiet = millis() - lastHostActivityMs > (uint32_t)config.watchdogTimeoutMs;
  if (config.watchdogTimeoutMs > 0 && !watchdogTripped && hostWentQuiet) {
    zeroRpmAndSpeed();
    watchdogTripped = true;
    Serial.println(F("EVT wdt"));
  }
}
