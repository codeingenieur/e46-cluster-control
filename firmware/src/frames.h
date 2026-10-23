// CAN-Frames fuer das E46-Kombiinstrument. Bewusst ohne Arduino-/IDF-Abhaengigkeit,
// damit die Kodierung separat (z.B. nativ) getestet werden kann.
//
// Signal-Layouts: docs/can-signals.md (Quellen + Zuverlaessigkeit).
// Alles ausser RPM ist Community-Wissen und muss am echten Cluster verifiziert werden.
#pragma once

#include <stdint.h>
#include <string.h>

namespace e46 {

constexpr uint32_t ID_DME1 = 0x316;  // RPM, Zuendung
constexpr uint32_t ID_DME2 = 0x329;  // Kuehlmitteltemperatur, Pedal, Bremse
constexpr uint32_t ID_DME4 = 0x545;  // Warnleuchten, Verbrauch, Oeltemperatur
constexpr uint32_t ID_ASC1 = 0x153;  // Geschwindigkeit (nur wenn speed_can aktiv)

struct Frame {
  uint32_t id = 0;
  uint8_t len = 8;
  uint8_t data[8] = {0, 0, 0, 0, 0, 0, 0, 0};
};

struct State {
  float rpm = 0;
  float speed_kmh = 0;
  float coolant_c = 80;  // neutrale Mitte, damit die Nadel nicht "tot" aussieht
  float oil_c = 80;
  float fco_rate = 0;    // Zaehlschritte/s fuer den Verbrauchszaehler (DME4 Byte 1-2)
  uint16_t fco_counter = 0;
  float fco_frac = 0;
  bool ign = true;
  bool mil = false;      // Motorkontrollleuchte
  bool cruise = false;
  bool eml = false;
  bool overheat = false;
  bool oil_warn = false;
  bool battery = false;
  bool oil_press = false;
};

struct Config {
  float rpm_scale = 6.4f;               // CAN-Rohwert pro U/min
  float temp_offset = -48.0f;           // T = raw * 0.75 + offset (Quellen: -48 / -48.373 / -40)
  float speed_hz_per_kmh = 410.0f / 60.0f;  // PWM-Eingang des Clusters: 410 Hz = 60 km/h
  bool speed_can = false;               // zusaetzlich ASC1 (0x153) senden
  uint32_t wdt_ms = 0;                  // 0 = Host-Watchdog aus
};

inline uint8_t clampU8(float v) {
  if (!(v > 0)) return 0;  // faengt auch NaN
  if (v > 255) return 255;
  return (uint8_t)(v + 0.5f);
}

inline uint16_t clampU16(float v) {
  if (!(v > 0)) return 0;
  if (v > 65535) return 65535;
  return (uint16_t)(v + 0.5f);
}

inline void advanceFuel(State& s, float dt_s) {
  if (s.fco_rate <= 0) return;
  s.fco_frac += s.fco_rate * dt_s;
  uint16_t whole = (uint16_t)s.fco_frac;
  s.fco_counter = (uint16_t)(s.fco_counter + whole);  // laeuft absichtlich ueber
  s.fco_frac -= whole;
}

inline Frame buildDme1(const State& s, const Config& c) {
  Frame f;
  f.id = ID_DME1;
  uint16_t rpm = clampU16(s.rpm * c.rpm_scale);
  f.data[0] = (s.ign ? 0x01 : 0x00) | 0x04;  // Bit0 Zuendung, Bit2 ASC1 ok (0x05 wie in Community-Beispielen)
  f.data[2] = rpm & 0xFF;
  f.data[3] = rpm >> 8;
  return f;
}

inline Frame buildDme2(const State& s, const Config& c) {
  Frame f;
  f.id = ID_DME2;
  f.data[0] = 0x11;  // MUX_INFO/MUX_CODE: CAN-Level-Info, in Community-Beispielen ueblich
  f.data[1] = clampU8((s.coolant_c - c.temp_offset) / 0.75f);
  f.data[2] = 0xCF;  // Luftdruck ~1013 hPa
  f.data[3] = 0x08;  // Motor laeuft
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

// ASC1: VSS = 13 Bit ab Bit 3 (Intel), Faktor 0.0625 km/h. Byte 7 = Alive-Zaehler.
inline Frame buildAsc1(const State& s, uint8_t alive) {
  Frame f;
  f.id = ID_ASC1;
  uint16_t raw = clampU16(s.speed_kmh * 16.0f);
  if (raw > 0x1FFF) raw = 0x1FFF;
  f.data[1] = (uint8_t)((raw & 0x1F) << 3);
  f.data[2] = (uint8_t)(raw >> 5);
  f.data[3] = 0xFF;  // kein ASC-Momenteneingriff
  f.data[6] = 0xFF;
  f.data[7] = alive & 0x0F;
  return f;
}

// Hex-Zeichen aus tokens zusammenziehen: {"05","00"} oder {"0500"} -> 05 00.
// Gibt Anzahl Bytes zurueck, -1 bei Fehler (ungerade Ziffernzahl, ungueltiges Zeichen, > maxLen).
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
