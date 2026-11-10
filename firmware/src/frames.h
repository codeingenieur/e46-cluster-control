// CAN frames for the E46 instrument cluster. Deliberately free of Arduino and ESP-IDF dependencies
// so the encoding can be tested on its own (for example natively on a PC).
//
// Signal layouts: docs/can-signals.md (sources and how reliable they are).
// Everything except rpm is community knowledge and has to be verified on a real cluster.
#pragma once

#include <stdint.h>
#include <string.h>

namespace e46 {

constexpr uint32_t ID_DME1 = 0x316;  // rpm, ignition
constexpr uint32_t ID_DME2 = 0x329;  // coolant temperature, pedal, brake
constexpr uint32_t ID_DME4 = 0x545;  // warning lamps, fuel consumption, oil temperature
constexpr uint32_t ID_ASC1 = 0x153;  // speed (only sent when speed_can is on)

struct Frame {
  uint32_t id = 0;
  uint8_t len = 8;
  uint8_t data[8] = {0, 0, 0, 0, 0, 0, 0, 0};
};

// What the PC asked for.
struct State {
  float rpm = 0;
  float speed_kmh = 0;
  float coolant_c = 80;  // neutral middle so the needle does not look dead
  float oil_c = 80;
  float fco_rate = 0;    // counter steps per second for the fuel consumption counter (DME4 bytes 1-2)
  uint16_t fco_counter = 0;
  float fco_frac = 0;    // fractional part of the counter that has not been added yet
  bool ign = true;       // ignition on
  bool mil = false;      // engine warning lamp (check engine)
  bool cruise = false;
  bool eml = false;
  bool overheat = false;
  bool oil_warn = false;
  bool battery = false;
  bool oil_press = false;
};

// Calibration values.
struct Config {
  float rpm_scale = 6.4f;                   // raw CAN value per rpm
  float temp_offset = -48.0f;               // temperature = raw * 0.75 + offset (sources say -48, -48.373 or -40)
  float speed_hz_per_kmh = 410.0f / 60.0f;  // PWM speed input of the cluster: 410 Hz = 60 km/h
  bool speed_can = false;                   // also send ASC1 (0x153)
  uint32_t wdt_ms = 0;                      // host watchdog in milliseconds, 0 = off
};

// Round to a byte; negative values and NaN give 0, too large values give 255.
inline uint8_t clampU8(float v) {
  if (!(v > 0)) return 0;  // also catches NaN
  if (v > 255) return 255;
  return (uint8_t)(v + 0.5f);
}

inline uint16_t clampU16(float v) {
  if (!(v > 0)) return 0;
  if (v > 65535) return 65535;
  return (uint16_t)(v + 0.5f);
}

// Advance the fuel consumption counter by dt_s seconds.
inline void advanceFuel(State& s, float dt_s) {
  if (s.fco_rate <= 0) return;
  s.fco_frac += s.fco_rate * dt_s;
  uint16_t whole = (uint16_t)s.fco_frac;
  s.fco_counter = (uint16_t)(s.fco_counter + whole);  // wraps around on purpose
  s.fco_frac -= whole;
}

inline Frame buildDme1(const State& s, const Config& c) {
  Frame f;
  f.id = ID_DME1;
  uint16_t rpm = clampU16(s.rpm * c.rpm_scale);
  f.data[0] = (s.ign ? 0x01 : 0x00) | 0x04;  // bit 0 ignition, bit 2 ASC1 ok (0x05 as in community examples)
  f.data[2] = rpm & 0xFF;
  f.data[3] = rpm >> 8;
  return f;
}

inline Frame buildDme2(const State& s, const Config& c) {
  Frame f;
  f.id = ID_DME2;
  f.data[0] = 0x11;  // MUX_INFO/MUX_CODE: CAN level info, common in community examples
  f.data[1] = clampU8((s.coolant_c - c.temp_offset) / 0.75f);
  f.data[2] = 0xCF;  // air pressure about 1013 hPa
  f.data[3] = 0x08;  // engine running
  return f;
}

inline Frame buildDme4(const State& s, const Config& c) {
  Frame f;
  f.id = ID_DME4;
  f.data[0] = (s.mil ? 0x02 : 0) | (s.cruise ? 0x08 : 0) | (s.eml ? 0x10 : 0);
  f.data[1] = s.fco_counter & 0xFF;
  f.data[2] = s.fco_counter >> 8;
  f.data[3] = (s.oil_warn ? 0x02 : 0) | (s.overheat ? 0x08 : 0);
  f.data[4] = clampU8(s.oil_c + 48.0f);
  f.data[5] = (s.battery ? 0x01 : 0) | (s.oil_press ? 0x10 : 0);
  (void)c;
  return f;
}

// ASC1: vehicle speed is 13 bits starting at bit 3 (Intel byte order), factor 0.0625 km/h. Byte 7 is an alive counter.
inline Frame buildAsc1(const State& s, uint8_t alive) {
  Frame f;
  f.id = ID_ASC1;
  uint16_t raw = clampU16(s.speed_kmh * 16.0f);
  if (raw > 0x1FFF) raw = 0x1FFF;
  f.data[1] = (uint8_t)((raw & 0x1F) << 3);
  f.data[2] = (uint8_t)(raw >> 5);
  f.data[3] = 0xFF;  // no ASC torque intervention
  f.data[6] = 0xFF;
  f.data[7] = alive & 0x0F;
  return f;
}

// Join the hex digits of the tokens: {"05","00"} or {"0500"} both give 05 00.
// Returns the number of bytes, or -1 on error (odd number of digits, invalid character, more than maxLen bytes).
inline int parseHexBytes(char* const* tokens, int n, uint8_t* out, int maxLen) {
  int nibbles = 0;
  int count = 0;
  uint8_t cur = 0;
  for (int i = 0; i < n; i++) {
    for (const char* p = tokens[i]; *p; p++) {
      int v;
      if (*p >= '0' && *p <= '9') v = *p - '0';
      else if (*p >= 'a' && *p <= 'f') v = *p - 'a' + 10;
      else if (*p >= 'A' && *p <= 'F') v = *p - 'A' + 10;
      else return -1;
      cur = (uint8_t)((cur << 4) | v);
      if (++nibbles % 2 == 0) {
        if (count >= maxLen) return -1;
        out[count++] = cur;
        cur = 0;
      }
    }
  }
  return nibbles % 2 == 0 ? count : -1;
}

}  // namespace e46
