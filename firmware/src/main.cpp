// E46-Kombiinstrument-Fernsteuerung: PC (USB-Serial) -> ESP32 -> CAN (TWAI, 500 kbit/s).
// Der ESP32 haelt den Zustand und sendet die zyklischen DME-Frames selbst (10 ms),
// der PC muss nur Werte aendern. Protokoll: docs/protocol.md
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

static const char* FW_VERSION = "0.1.0";

static e46::State st;
static e46::Config cfg;
static bool txEnabled = true;
static bool sniff = false;

static uint32_t txOk = 0, txFail = 0, rxCount = 0, sniffDropped = 0;
static twai_state_t busState = TWAI_STATE_STOPPED;
static uint32_t lastHostMs = 0;
static bool wdtTripped = false;

struct CycSlot {
  bool active = false;
  uint32_t periodUs = 0;
  uint32_t nextUs = 0;
  e46::Frame frame;
};
static CycSlot slots[4];

// ---------------------------------------------------------------- Geschwindigkeit (PWM)

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
static void speedBegin() { ledcAttach(SPEED_PIN, 1000, 10); }
static void speedOut(float hz) { ledcWriteTone(SPEED_PIN, hz); }
#else
static const int SPEED_CH = 0;
static void speedBegin() {
  ledcSetup(SPEED_CH, 1000, 10);
  ledcAttachPin(SPEED_PIN, SPEED_CH);
}
static void speedOut(float hz) { ledcWriteTone(SPEED_CH, hz); }
#endif

static void applySpeed() {
  float hz = st.speed_kmh * cfg.speed_hz_per_kmh;
  speedOut(hz >= 1.0f ? hz : 0.0f);
}

// ---------------------------------------------------------------- CAN

static bool canStart() {
  twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)CAN_TX_PIN, (gpio_num_t)CAN_RX_PIN,
#ifdef E46_TWAI_NO_ACK
                                                        TWAI_MODE_NO_ACK
#else
                                                        TWAI_MODE_NORMAL
#endif
  );
  g.tx_queue_len = 16;
  g.rx_queue_len = 32;
  twai_timing_config_t t = TWAI_TIMING_CONFIG_500KBITS();
  twai_filter_config_t f = TWAI_FILTER_CONFIG_ACCEPT_ALL();
  if (twai_driver_install(&g, &t, &f) != ESP_OK) return false;
  return twai_start() == ESP_OK;
}

static void canSend(const e46::Frame& fr) {
  twai_message_t m = {};
  m.identifier = fr.id;
  m.data_length_code = fr.len;
  memcpy(m.data, fr.data, fr.len);
  if (twai_transmit(&m, 0) == ESP_OK) txOk++;
  else txFail++;
}

static void canMaintain() {
  static uint32_t last = 0;
  if (millis() - last < 100) return;
  last = millis();
  twai_status_info_t s;
  if (twai_get_status_info(&s) != ESP_OK) return;
  busState = s.state;
  if (s.state == TWAI_STATE_BUS_OFF) {
    twai_initiate_recovery();
    Serial.println("EVT bus_off");
  } else if (s.state == TWAI_STATE_STOPPED) {
    twai_start();
  }
}

static void canPoll() {
  twai_message_t m;
  while (twai_receive(&m, 0) == ESP_OK) {
    rxCount++;
    if (!sniff || m.rtr) continue;
    // Nie blockieren: lieber Sniff-Frames verwerfen als den TX-Takt zu stoeren.
    if (Serial.availableForWrite() < 40) {
      sniffDropped++;
      continue;
    }
    char buf[48];
    int n = snprintf(buf, sizeof buf, "RX %03X ", (unsigned)m.identifier);
    for (int i = 0; i < m.data_length_code && n < (int)sizeof buf - 3; i++)
      n += snprintf(buf + n, sizeof buf - n, "%02X", m.data[i]);
    Serial.println(buf);
  }
}

static void sendCyclic() {
  static uint32_t next10 = micros();
  static uint8_t tick = 0;
  uint32_t now = micros();

  if ((int32_t)(now - next10) >= 0) {
    next10 += 10000;
    if ((int32_t)(now - next10) >= 0) next10 = now + 10000;  // Rueckstand nicht als Burst nachholen
    e46::advanceFuel(st, 0.01f);
    if (txEnabled) {
      canSend(e46::buildDme1(st, cfg));
      canSend(e46::buildDme2(st, cfg));
      canSend(e46::buildDme4(st, cfg));
      if (cfg.speed_can && (tick & 1) == 0) canSend(e46::buildAsc1(st, tick >> 1));
    }
    tick++;
  }

  for (CycSlot& s : slots) {
    if (!s.active || (int32_t)(now - s.nextUs) < 0) continue;
    s.nextUs += s.periodUs;
    if ((int32_t)(now - s.nextUs) >= 0) s.nextUs = now + s.periodUs;
    canSend(s.frame);
  }
}

// ---------------------------------------------------------------- Kommandos

static bool parseFloat(const char* s, float& out) {
  char* end;
  float v = strtof(s, &end);
  if (end == s || *end != '\0') return false;
  out = v;
  return true;
}

static bool setKey(const char* k, float x) {
  if (!strcasecmp(k, "rpm")) st.rpm = x;
  else if (!strcasecmp(k, "speed")) { st.speed_kmh = x; applySpeed(); }
  else if (!strcasecmp(k, "coolant")) st.coolant_c = x;
  else if (!strcasecmp(k, "oil")) st.oil_c = x;
  else if (!strcasecmp(k, "fco")) st.fco_rate = x;
  else if (!strcasecmp(k, "ign")) st.ign = x != 0;
  else if (!strcasecmp(k, "mil")) st.mil = x != 0;
  else if (!strcasecmp(k, "cruise")) st.cruise = x != 0;
  else if (!strcasecmp(k, "eml")) st.eml = x != 0;
  else if (!strcasecmp(k, "overheat")) st.overheat = x != 0;
  else if (!strcasecmp(k, "oilwarn")) st.oil_warn = x != 0;
  else if (!strcasecmp(k, "battery")) st.battery = x != 0;
  else if (!strcasecmp(k, "oilpress")) st.oil_press = x != 0;
  else return false;
  return true;
}

static bool cfgKey(const char* k, float x) {
  if (!strcasecmp(k, "rpm_scale")) cfg.rpm_scale = x;
  else if (!strcasecmp(k, "temp_offset")) cfg.temp_offset = x;
  else if (!strcasecmp(k, "speed_hz")) { cfg.speed_hz_per_kmh = x; applySpeed(); }
  else if (!strcasecmp(k, "speed_can")) cfg.speed_can = x != 0;
  else if (!strcasecmp(k, "wdt")) cfg.wdt_ms = x < 0 ? 0 : (uint32_t)x;
  else return false;
  return true;
}

static void cmdKeyValues(char** t, int n, bool (*apply)(const char*, float)) {
  if (n < 2 || n % 2 != 0) { Serial.println("ERR usage"); return; }
  // Erst alles pruefen, dann anwenden: eine Zeile wirkt ganz oder gar nicht.
  for (int i = 0; i < n; i += 2) {
    float v;
    if (!parseFloat(t[i + 1], v)) { Serial.println("ERR bad_value"); return; }
  }
  for (int i = 0; i < n; i += 2) {
    float v;
    parseFloat(t[i + 1], v);
    if (!apply(t[i], v)) { Serial.println("ERR unknown_key"); return; }
  }
  Serial.println("OK");
}

static bool parseId(const char* s, uint32_t& id) {
  char* end;
  unsigned long v = strtoul(s, &end, 16);
  if (end == s || *end != '\0' || v > 0x7FF) return false;
  id = v;
  return true;
}

static void cmdRaw(char** t, int n) {
  uint32_t id;
  e46::Frame f;
  if (n < 1 || !parseId(t[0], id)) { Serial.println("ERR bad_id"); return; }
  int len = e46::parseHexBytes(t + 1, n - 1, f.data, 8);
  if (len < 0) { Serial.println("ERR bad_hex"); return; }
  f.id = id;
  f.len = (uint8_t)len;
  canSend(f);
  Serial.println("OK");
}

static void cmdCyc(char** t, int n) {
  if (n < 2) { Serial.println("ERR usage"); return; }
  int slot = atoi(t[0]);
  if (slot < 0 || slot >= 4) { Serial.println("ERR bad_slot"); return; }
  if (!strcasecmp(t[1], "off")) {
    slots[slot].active = false;
    Serial.println("OK");
    return;
  }
  uint32_t id;
  if (n < 3 || !parseId(t[1], id)) { Serial.println("ERR bad_id"); return; }
  long period = atol(t[2]);
  if (period < 1 || period > 60000) { Serial.println("ERR bad_period"); return; }
  e46::Frame f;
  int len = e46::parseHexBytes(t + 3, n - 3, f.data, 8);
  if (len < 0) { Serial.println("ERR bad_hex"); return; }
  f.id = id;
  f.len = (uint8_t)len;
  CycSlot& s = slots[slot];
  s.frame = f;
  s.periodUs = (uint32_t)period * 1000;
  s.nextUs = micros();
  s.active = true;
  Serial.println("OK");
}

static const char* busName() {
  switch (busState) {
    case TWAI_STATE_RUNNING: return "running";
    case TWAI_STATE_BUS_OFF: return "bus_off";
    case TWAI_STATE_RECOVERING: return "recovering";
    default: return "stopped";
  }
}

static void cmdGet() {
  char buf[256];
  snprintf(buf, sizeof buf,
           "STATE rpm=%.0f speed=%.1f coolant=%.1f oil=%.1f fco=%.1f ign=%d mil=%d cruise=%d eml=%d "
           "overheat=%d oilwarn=%d battery=%d oilpress=%d tx=%d tx_ok=%lu tx_fail=%lu rx=%lu can=%s",
           st.rpm, st.speed_kmh, st.coolant_c, st.oil_c, st.fco_rate, st.ign, st.mil, st.cruise, st.eml,
           st.overheat, st.oil_warn, st.battery, st.oil_press, txEnabled, (unsigned long)txOk,
           (unsigned long)txFail, (unsigned long)rxCount, busName());
  Serial.println(buf);
}

static void cmdCfg(char** t, int n) {
  if (n == 0) {
    char buf[160];
    snprintf(buf, sizeof buf, "CFG rpm_scale=%.4f temp_offset=%.3f speed_hz=%.4f speed_can=%d wdt=%lu",
             cfg.rpm_scale, cfg.temp_offset, cfg.speed_hz_per_kmh, cfg.speed_can, (unsigned long)cfg.wdt_ms);
    Serial.println(buf);
    return;
  }
  cmdKeyValues(t, n, cfgKey);
}

static void cmdHelp() {
  Serial.println("HELP PING | SET k v [k v ...] | GET | CFG [k v ...] | TX 0/1 | RAW id hex | "
                 "CYC slot id period_ms hex | CYC slot OFF | SNIFF 0/1 | ZERO");
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
    Serial.print("PONG e46-cluster ");
    Serial.println(FW_VERSION);
  } else if (!strcasecmp(c, "SET")) cmdKeyValues(t + 1, n - 1, setKey);
  else if (!strcasecmp(c, "GET")) cmdGet();
  else if (!strcasecmp(c, "CFG")) cmdCfg(t + 1, n - 1);
  else if (!strcasecmp(c, "TX") && n == 2) { txEnabled = atoi(t[1]) != 0; Serial.println("OK"); }
  else if (!strcasecmp(c, "RAW")) cmdRaw(t + 1, n - 1);
  else if (!strcasecmp(c, "CYC")) cmdCyc(t + 1, n - 1);
  else if (!strcasecmp(c, "SNIFF") && n == 2) { sniff = atoi(t[1]) != 0; Serial.println("OK"); }
  else if (!strcasecmp(c, "ZERO")) {
    st.rpm = 0; st.speed_kmh = 0; st.fco_rate = 0;
    applySpeed();
    Serial.println("OK");
  } else if (!strcasecmp(c, "HELP")) cmdHelp();
  else Serial.println("ERR unknown_cmd");
}

static void pollSerial() {
  static char line[128];
  static size_t len = 0;
  static bool overflow = false;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (overflow) Serial.println("ERR line_too_long");
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
  Serial.begin(SERIAL_BAUD);
  speedBegin();
  applySpeed();
  bool ok = canStart();
  Serial.print(ok ? "READY e46-cluster " : "ERR can_init_failed e46-cluster ");
  Serial.println(FW_VERSION);
}

void loop() {
  pollSerial();
  canPoll();
  sendCyclic();
  canMaintain();

  if (cfg.wdt_ms && !wdtTripped && millis() - lastHostMs > cfg.wdt_ms) {
    st.rpm = 0; st.speed_kmh = 0; st.fco_rate = 0;
    applySpeed();
    wdtTripped = true;
    Serial.println("EVT wdt");
  }
}
