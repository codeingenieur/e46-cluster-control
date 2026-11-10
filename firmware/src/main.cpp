// Remote control for an E46 instrument cluster: PC (USB serial) -> ESP32 -> CAN (TWAI, 500 kbit/s).
// The ESP32 keeps the state and sends the cyclic DME frames by itself (every 10 ms),
// so the PC only has to change values. Protocol: docs/protocol.md
#include <Arduino.h>
#include <driver/twai.h>
#include <strings.h>

#include "frames.h"

#ifndef CAN_TX_PIN
#define CAN_TX_PIN 5
#endif
#ifndef CAN_RX_PIN
#define CAN_RX_PIN 4
#endif
#ifndef SPEED_PIN
#define SPEED_PIN 18
#endif
#ifndef SERIAL_BAUD
#define SERIAL_BAUD 115200
#endif

static const char* FIRMWARE_VERSION = "0.1.0";

static e46::State state;
static e46::Config config;
static bool txEnabled = true;       // TX 0/1: stop or resume the automatic DME frames
static bool sniffEnabled = false;   // SNIFF 0/1: print every received CAN frame

static uint32_t txOkCount = 0, txFailCount = 0, rxCount = 0, sniffDroppedCount = 0;
static twai_state_t busState = TWAI_STATE_STOPPED;
static uint32_t lastHostActivityMs = 0;
static bool watchdogTripped = false;

// A user-defined frame that is sent repeatedly (CYC command).
struct CyclicSlot {
  bool active = false;
  uint32_t periodUs = 0;
  uint32_t nextSendUs = 0;
  e46::Frame frame;
};
static const int CYCLIC_SLOT_COUNT = 4;
static CyclicSlot cyclicSlots[CYCLIC_SLOT_COUNT];

// ---------------------------------------------------------------- Speed (PWM)
// The cluster reads the speed from a wire: a square wave whose frequency is proportional to the speed.

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
static void startSpeedOutput() { ledcAttach(SPEED_PIN, 1000, 10); }
static void writeSpeedFrequency(float hz) { ledcWriteTone(SPEED_PIN, hz); }
#else
static const int SPEED_LEDC_CHANNEL = 0;
static void startSpeedOutput() {
  ledcSetup(SPEED_LEDC_CHANNEL, 1000, 10);
  ledcAttachPin(SPEED_PIN, SPEED_LEDC_CHANNEL);
}
static void writeSpeedFrequency(float hz) { ledcWriteTone(SPEED_LEDC_CHANNEL, hz); }
#endif

static void applySpeed() {
  float hz = state.speed_kmh * config.speed_hz_per_kmh;
  writeSpeedFrequency(hz >= 1.0f ? hz : 0.0f);
}

// ---------------------------------------------------------------- CAN

static bool startCan() {
  twai_general_config_t general = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)CAN_TX_PIN, (gpio_num_t)CAN_RX_PIN,
#ifdef E46_TWAI_NO_ACK
                                                              TWAI_MODE_NO_ACK
#else
                                                              TWAI_MODE_NORMAL
#endif
  );
  general.tx_queue_len = 16;
  general.rx_queue_len = 32;
  twai_timing_config_t timing = TWAI_TIMING_CONFIG_500KBITS();
  twai_filter_config_t filter = TWAI_FILTER_CONFIG_ACCEPT_ALL();
  if (twai_driver_install(&general, &timing, &filter) != ESP_OK) return false;
  return twai_start() == ESP_OK;
}

static void sendCanFrame(const e46::Frame& frame) {
  twai_message_t message = {};
  message.identifier = frame.id;
  message.data_length_code = frame.len;
  memcpy(message.data, frame.data, frame.len);
  if (twai_transmit(&message, 0) == ESP_OK) txOkCount++;
  else txFailCount++;
}

// Every 100 ms: read the bus state and recover from bus-off or a stopped driver.
static void maintainCanBus() {
  static uint32_t lastCheckMs = 0;
  if (millis() - lastCheckMs < 100) return;
  lastCheckMs = millis();
  twai_status_info_t status;
  if (twai_get_status_info(&status) != ESP_OK) return;
  busState = status.state;
  if (status.state == TWAI_STATE_BUS_OFF) {
    twai_initiate_recovery();
    Serial.println("EVT bus_off");
  } else if (status.state == TWAI_STATE_STOPPED) {
    twai_start();
  }
}

// Count received frames and, with SNIFF on, print them as "RX <id> <hex bytes>".
static void receiveCanFrames() {
  twai_message_t message;
  while (twai_receive(&message, 0) == ESP_OK) {
    rxCount++;
    if (!sniffEnabled || message.rtr) continue;
    // Never block: better to drop sniffed frames than to disturb the transmit timing.
    if (Serial.availableForWrite() < 40) {
      sniffDroppedCount++;
      continue;
    }
    char line[48];
    int length = snprintf(line, sizeof line, "RX %03X ", (unsigned)message.identifier);
    for (int i = 0; i < message.data_length_code && length < (int)sizeof line - 3; i++)
      length += snprintf(line + length, sizeof line - length, "%02X", message.data[i]);
    Serial.println(line);
  }
}

// Send the DME frames every 10 ms and the user-defined cyclic frames at their own period.
static void sendCyclicFrames() {
  static uint32_t nextDmeUs = micros();
  static uint8_t tick = 0;
  uint32_t nowUs = micros();

  if ((int32_t)(nowUs - nextDmeUs) >= 0) {
    nextDmeUs += 10000;
    if ((int32_t)(nowUs - nextDmeUs) >= 0) nextDmeUs = nowUs + 10000;  // do not catch up a backlog as a burst
    e46::advanceFuel(state, 0.01f);
    if (txEnabled) {
      sendCanFrame(e46::buildDme1(state, config));
      sendCanFrame(e46::buildDme2(state, config));
      sendCanFrame(e46::buildDme4(state, config));
      if (config.speed_can && (tick & 1) == 0) sendCanFrame(e46::buildAsc1(state, tick >> 1));
    }
    tick++;
  }

  for (CyclicSlot& slot : cyclicSlots) {
    if (!slot.active || (int32_t)(nowUs - slot.nextSendUs) < 0) continue;
    slot.nextSendUs += slot.periodUs;
    if ((int32_t)(nowUs - slot.nextSendUs) >= 0) slot.nextSendUs = nowUs + slot.periodUs;
    sendCanFrame(slot.frame);
  }
}

// ---------------------------------------------------------------- Commands

static bool parseNumber(const char* text, float& result) {
  char* end;
  float value = strtof(text, &end);
  if (end == text || *end != '\0') return false;
  result = value;
  return true;
}

// Apply one "key value" pair of a SET command. Returns false for an unknown key.
static bool applySetKey(const char* key, float value) {
  if (!strcasecmp(key, "rpm")) state.rpm = value;
  else if (!strcasecmp(key, "speed")) { state.speed_kmh = value; applySpeed(); }
  else if (!strcasecmp(key, "coolant")) state.coolant_c = value;
  else if (!strcasecmp(key, "oil")) state.oil_c = value;
  else if (!strcasecmp(key, "fco")) state.fco_rate = value;
  else if (!strcasecmp(key, "ign")) state.ign = value != 0;
  else if (!strcasecmp(key, "mil")) state.mil = value != 0;
  else if (!strcasecmp(key, "cruise")) state.cruise = value != 0;
  else if (!strcasecmp(key, "eml")) state.eml = value != 0;
  else if (!strcasecmp(key, "overheat")) state.overheat = value != 0;
  else if (!strcasecmp(key, "oilwarn")) state.oil_warn = value != 0;
  else if (!strcasecmp(key, "battery")) state.battery = value != 0;
  else if (!strcasecmp(key, "oilpress")) state.oil_press = value != 0;
  else return false;
  return true;
}

// Apply one "key value" pair of a CFG command. Returns false for an unknown key.
static bool applyConfigKey(const char* key, float value) {
  if (!strcasecmp(key, "rpm_scale")) config.rpm_scale = value;
  else if (!strcasecmp(key, "temp_offset")) config.temp_offset = value;
  else if (!strcasecmp(key, "speed_hz")) { config.speed_hz_per_kmh = value; applySpeed(); }
  else if (!strcasecmp(key, "speed_can")) config.speed_can = value != 0;
  else if (!strcasecmp(key, "wdt")) config.wdt_ms = value < 0 ? 0 : (uint32_t)value;
  else return false;
  return true;
}

// A SET or CFG line takes effect completely or not at all: first check that every value is a number,
// then apply the pairs, and undo everything if a key is unknown.
static void handleKeyValueCommand(char** tokens, int tokenCount, bool (*applyKey)(const char*, float)) {
  if (tokenCount < 2 || tokenCount % 2 != 0) { Serial.println("ERR usage"); return; }
  for (int i = 0; i < tokenCount; i += 2) {
    float value;
    if (!parseNumber(tokens[i + 1], value)) { Serial.println("ERR bad_value"); return; }
  }
  const e46::State stateBackup = state;
  const e46::Config configBackup = config;
  for (int i = 0; i < tokenCount; i += 2) {
    float value;
    parseNumber(tokens[i + 1], value);
    if (!applyKey(tokens[i], value)) {
      state = stateBackup;  // unknown key in the middle of the line: keep nothing
      config = configBackup;
      applySpeed();
      Serial.println("ERR unknown_key");
      return;
    }
  }
  Serial.println("OK");
}

// Parse an 11-bit CAN id written in hex (000..7FF).
static bool parseCanId(const char* text, uint32_t& id) {
  char* end;
  unsigned long value = strtoul(text, &end, 16);
  if (end == text || *end != '\0' || value > 0x7FF) return false;
  id = value;
  return true;
}

// RAW <id> <hex bytes>: send one frame once.
static void handleRaw(char** tokens, int tokenCount) {
  uint32_t id;
  e46::Frame frame;
  if (tokenCount < 1 || !parseCanId(tokens[0], id)) { Serial.println("ERR bad_id"); return; }
  int length = e46::parseHexBytes(tokens + 1, tokenCount - 1, frame.data, 8);
  if (length < 0) { Serial.println("ERR bad_hex"); return; }
  frame.id = id;
  frame.len = (uint8_t)length;
  sendCanFrame(frame);
  Serial.println("OK");
}

// CYC <slot> <id> <period_ms> <hex bytes>: send a frame repeatedly. CYC <slot> OFF stops it.
static void handleCyclic(char** tokens, int tokenCount) {
  if (tokenCount < 2) { Serial.println("ERR usage"); return; }
  int slotIndex = atoi(tokens[0]);
  if (slotIndex < 0 || slotIndex >= CYCLIC_SLOT_COUNT) { Serial.println("ERR bad_slot"); return; }
  if (!strcasecmp(tokens[1], "off")) {
    cyclicSlots[slotIndex].active = false;
    Serial.println("OK");
    return;
  }
  uint32_t id;
  if (tokenCount < 3 || !parseCanId(tokens[1], id)) { Serial.println("ERR bad_id"); return; }
  long periodMs = atol(tokens[2]);
  if (periodMs < 1 || periodMs > 60000) { Serial.println("ERR bad_period"); return; }
  e46::Frame frame;
  int length = e46::parseHexBytes(tokens + 3, tokenCount - 3, frame.data, 8);
  if (length < 0) { Serial.println("ERR bad_hex"); return; }
  frame.id = id;
  frame.len = (uint8_t)length;
  CyclicSlot& slot = cyclicSlots[slotIndex];
  slot.frame = frame;
  slot.periodUs = (uint32_t)periodMs * 1000;
  slot.nextSendUs = micros();
  slot.active = true;
  Serial.println("OK");
}

static const char* busStateName() {
  switch (busState) {
    case TWAI_STATE_RUNNING: return "running";
    case TWAI_STATE_BUS_OFF: return "bus_off";
    case TWAI_STATE_RECOVERING: return "recovering";
    default: return "stopped";
  }
}

// GET: print the current state, the transmit counters and the bus state on one line.
static void handleGet() {
  char line[256];
  snprintf(line, sizeof line,
           "STATE rpm=%.0f speed=%.1f coolant=%.1f oil=%.1f fco=%.1f ign=%d mil=%d cruise=%d eml=%d "
           "overheat=%d oilwarn=%d battery=%d oilpress=%d tx=%d tx_ok=%lu tx_fail=%lu rx=%lu can=%s",
           state.rpm, state.speed_kmh, state.coolant_c, state.oil_c, state.fco_rate, state.ign, state.mil,
           state.cruise, state.eml, state.overheat, state.oil_warn, state.battery, state.oil_press, txEnabled,
           (unsigned long)txOkCount, (unsigned long)txFailCount, (unsigned long)rxCount, busStateName());
  Serial.println(line);
}

// CFG without arguments prints all calibration values, CFG with key/value pairs changes them.
static void handleConfig(char** tokens, int tokenCount) {
  if (tokenCount == 0) {
    char line[160];
    snprintf(line, sizeof line, "CFG rpm_scale=%.4f temp_offset=%.3f speed_hz=%.4f speed_can=%d wdt=%lu",
             config.rpm_scale, config.temp_offset, config.speed_hz_per_kmh, config.speed_can,
             (unsigned long)config.wdt_ms);
    Serial.println(line);
    return;
  }
  handleKeyValueCommand(tokens, tokenCount, applyConfigKey);
}

static void handleHelp() {
  Serial.println("HELP PING | SET k v [k v ...] | GET | CFG [k v ...] | TX 0/1 | RAW id hex | "
                 "CYC slot id period_ms hex | CYC slot OFF | SNIFF 0/1 | ZERO");
}

// Set rpm, speed and fuel consumption to 0 (used by ZERO and by the watchdog).
static void zeroOutputs() {
  state.rpm = 0;
  state.speed_kmh = 0;
  state.fco_rate = 0;
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
    Serial.print("PONG e46-cluster ");
    Serial.println(FIRMWARE_VERSION);
  } else if (!strcasecmp(command, "SET")) handleKeyValueCommand(tokens + 1, tokenCount - 1, applySetKey);
  else if (!strcasecmp(command, "GET")) handleGet();
  else if (!strcasecmp(command, "CFG")) handleConfig(tokens + 1, tokenCount - 1);
  else if (!strcasecmp(command, "TX") && tokenCount == 2) { txEnabled = atoi(tokens[1]) != 0; Serial.println("OK"); }
  else if (!strcasecmp(command, "RAW")) handleRaw(tokens + 1, tokenCount - 1);
  else if (!strcasecmp(command, "CYC")) handleCyclic(tokens + 1, tokenCount - 1);
  else if (!strcasecmp(command, "SNIFF") && tokenCount == 2) { sniffEnabled = atoi(tokens[1]) != 0; Serial.println("OK"); }
  else if (!strcasecmp(command, "ZERO")) {
    zeroOutputs();
    Serial.println("OK");
  } else if (!strcasecmp(command, "HELP")) handleHelp();
  else Serial.println("ERR unknown_cmd");
}

// Collect bytes from the USB serial port into lines ('\n', '\r' or '\r\n' all end a line) and hand each line to handleLine.
static void readSerialLines() {
  static char line[128];
  static size_t length = 0;
  static bool overflowed = false;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (overflowed) Serial.println("ERR line_too_long");
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
  Serial.begin(SERIAL_BAUD);
  startSpeedOutput();
  applySpeed();
  bool canStarted = startCan();
  Serial.print(canStarted ? "READY e46-cluster " : "ERR can_init_failed e46-cluster ");
  Serial.println(FIRMWARE_VERSION);
}

void loop() {
  readSerialLines();
  receiveCanFrames();
  sendCyclicFrames();
  maintainCanBus();

  if (config.wdt_ms && !watchdogTripped && millis() - lastHostActivityMs > config.wdt_ms) {
    zeroOutputs();
    watchdogTripped = true;
    Serial.println("EVT wdt");
  }
}
