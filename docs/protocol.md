# USB-Protokoll PC ↔ ESP32

ASCII, eine Zeile pro Kommando (senden: `\n`, `\r` und `\r\n` werden akzeptiert; die Firmware antwortet mit `\r\n`, Details in [usb-interface.md](usb-interface.md)), 115200 Baud, 8N1 (Firmware: `SERIAL_BAUD` in `platformio.ini`, Host: `--baud`; beide Seiten müssen übereinstimmen). Groß-/Kleinschreibung egal, Zahlen mit Punkt.
Jedes Kommando wird mit genau einer Zeile beantwortet: `OK`, `ERR <grund>` oder eine Datenzeile.
Daneben schickt die Firmware unaufgefordert `READY`, `EVT ...` und `RX ...`.

| Kommando | Antwort | Wirkung |
|---|---|---|
| `PING` | `PONG e46-cluster <version>` | Lebenszeichen |
| `SET k v [k v ...]` | `OK` | Werte setzen. Eine Zeile wirkt ganz oder gar nicht |
| `GET` | `STATE k=v ...` | Zustand und CAN-Zähler (`tx_ok`, `tx_fail`, `rx`, `can=running/bus_off/...`) |
| `CFG` | `CFG k=v ...` | Konfiguration lesen |
| `CFG k v [k v ...]` | `OK` | Konfiguration setzen |
| `TX 0\|1` | `OK` | Zyklische DME-Frames an/aus |
| `RAW id hex` | `OK` | Einen Frame einmalig senden, z.B. `RAW 316 05 00 80 25` |
| `CYC slot id period_ms hex` | `OK` | Eigenen Frame zyklisch senden (Slot 0–3) |
| `CYC slot OFF` | `OK` | Slot abschalten |
| `SNIFF 0\|1` | `OK` | Empfangene Frames als `RX <id> <hex>` melden |
| `ZERO` | `OK` | RPM, Geschwindigkeit, Verbrauch auf 0 |
| `HELP` | Kurzübersicht | |

## SET-Schlüssel

Messwerte: `rpm` (U/min), `speed` (km/h), `coolant` (°C), `oil` (°C), `fco` (Verbrauchszähler-Schritte/s).
Schalter (0/1): `ign`, `mil`, `cruise`, `eml`, `overheat`, `oilwarn`, `battery`, `oilpress`.

## CFG-Schlüssel

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `rpm_scale` | 6.4 | CAN-Rohwert pro U/min |
| `temp_offset` | −48 | `T = raw × 0.75 + offset` |
| `speed_hz` | 6.8333 | PWM-Hz pro km/h (410 Hz = 60 km/h) |
| `speed_can` | 0 | zusätzlich ASC1 (0x153) senden |
| `wdt` | 0 | Host-Watchdog in ms: bei Stille RPM/Speed/Verbrauch auf 0, Meldung `EVT wdt` (0 = aus) |

Die Konfiguration wird nicht im Flash gespeichert, sie gilt bis zum Neustart.

## Fehlergründe

`unknown_cmd`, `usage`, `bad_value`, `unknown_key`, `bad_id` (nur 11-Bit-IDs), `bad_hex`, `bad_slot`,
`bad_period`, `line_too_long` (max. 127 Zeichen).

## Hinweise

- `SNIFF` verwirft Frames, wenn der Serial-Puffer voll ist, damit der 10-ms-Takt nicht leidet. Bei 115200 Baud
  passen etwa 450 Frames/s durch (~25 Byte pro Zeile mit 8 Datenbytes); ein dichter Bus liefert mehr. Zum vollständigen Mitschneiden
  `SERIAL_BAUD` und `--baud` auf 921600 erhöhen.
- `EVT bus_off`: Der CAN-Controller hat sich abgeschaltet (meist fehlt der ACK eines zweiten Teilnehmers
  oder die Verkabelung ist falsch). Die Firmware startet die Wiederherstellung selbst.
