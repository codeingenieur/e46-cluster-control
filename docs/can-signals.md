# CAN-Signale für das E46-Kombi

Bus: PT-CAN, **500 kbit/s**, 11-Bit-IDs, DLC 8. Die DME-Frames kommen im Fahrzeug alle 10 ms.
Die Firmware sendet sie genauso. Byte 0 ist das erste Datenbyte, Bits zählen ab 0 (LSB).

**Zuverlässigkeit:** ✅ von mehreren Quellen bestätigt · ⚠️ eine Quelle oder widersprüchlich · ❓ geraten/offen.
Alles stammt aus Foren, Wikis und GitHub-Projekten, nichts aus BMW-Unterlagen. Am eigenen Cluster verifizieren.

## 0x316 DME1, wird gesendet

| Signal | Kodierung | Status |
|---|---|---|
| Drehzahl | Byte 2 (LSB), Byte 3 (MSB); `raw = rpm × 6.4` (Quellen nennen auch 6.42) | ✅ Layout, ⚠️ Faktor |
| Zündung ein | Byte 0 Bit 0 | ⚠️ |
| ASC1 empfangen | Byte 0 Bit 2 | ⚠️ |

Die Firmware sendet Byte 0 = `0x05`, wie es in Community-Beispielen steht. Faktor per `cfg rpm_scale=...` änderbar.
Hinweis: Die ms4x-Wiki gibt `rpm = MSB×256 + LSB` ohne Faktor an. Das widerspricht den Forenbeiträgen und
sieht wie ein Rohwert ohne Skalierung aus.

## 0x329 DME2, wird gesendet

| Signal | Kodierung | Status |
|---|---|---|
| Kühlmitteltemperatur | Byte 1; `T = raw × 0.75 + offset` | ✅ Byte, ⚠️ Offset |
| MUX-Info | Byte 0 (Firmware: `0x11`) | ❓ |
| Luftdruck | Byte 2; `hPa = raw × 2 + 598` | ⚠️ |
| Motor läuft | Byte 3 Bit 3 | ⚠️ |
| Pedalstellung | Byte 5; `% = raw / 2.56` | ⚠️ |
| Bremse, Kickdown | Byte 6 Bit 0 / Bit 2 | ⚠️ |

Der Offset ist je nach Quelle −48, −48.373 oder −40. Per `cfg temp_offset=...` anpassen, bis die Nadel zu
einem bekannten Wert passt (Nadelmitte entspricht etwa 90 °C, Erfahrungswert, nicht belegt).

## 0x545 DME4, wird gesendet

| Signal | Kodierung | Status |
|---|---|---|
| Motorkontrollleuchte (MIL) | Byte 0 Bit 1 | ✅ |
| Tempomat-Leuchte | Byte 0 Bit 3 | ⚠️ |
| EML-Leuchte | Byte 0 Bit 4 | ⚠️ |
| Verbrauch | Byte 1 (LSB), Byte 2 (MSB): Zähler, das Cluster bildet die Differenz | ⚠️ Skalierung unbekannt |
| Ölniveau-Warnung | Byte 3 Bit 1 | ⚠️ |
| Überhitzungs-Leuchte | Byte 3 Bit 3 (`0x08`) | ⚠️ |
| Öltemperatur | Byte 4; `T = raw − 48` | ⚠️ |
| Ladekontrolle | Byte 5 Bit 0 | ❓ |
| Öldruck-Leuchte | Byte 5 Bit 4 | ❓ |

Ob eine gesetzte Leuchten-Bit die Lampe ein- oder ausschaltet, muss am Cluster geprüft werden.
Der Verbrauchszähler läuft mit `set fco=<Schritte/s>`; die Anzeige braucht zusätzlich eine Geschwindigkeit.

## Geschwindigkeit: Draht oder CAN?

Die Quellen sind uneinig:

- GitHub-Projekt *BMW_E46_Gauge_Cluster_Control*: Rechtecksignal in den Kombi-Stecker **X11175 Pin 19**,
  **410 Hz bei 50 % Tastverhältnis = 60 km/h** (also ca. 6.83 Hz pro km/h). Im Auto liefert das die ABS/DSC-Einheit.
  Der Verbrauchsanzeiger arbeitet erst ab ca. 82 Hz (~5 km/h) und fällt bei 68 Hz wieder ab.
- rusEFI-Forum: Der Tacho nutzt die CAN-Geschwindigkeit nicht, sondern den PWM-Draht.
- Bimmerforums: ASC1 `0x153` enthält die Geschwindigkeit (13 Bit ab Bit 3, Intel, Faktor 0.0625 km/h),
  ein M3-Nutzer berichtet aber ein stehendes Tacho trotz anderer funktionierender Anzeigen.

- BMW-Schulungsunterlage ST034 (E46 Driver Information, Quelle unten): Das **Wegsignal** kommt von der ABS/ASC+T- bzw.
  DSC-Einheit **als Rechtecksignal** zum Kombi (aus dem linken Hinterrad-Drehzahlsensor). Das Kombi reicht es per K-Bus
  als Geschwindigkeitssignal "A" weiter. Über CAN kommen laut derselben Unterlage von der DME die Signale
  "Ti" (Einspritzzeit, Verbrauch), Motortemperatur und "TD" (Drehzahl), außerdem Getriebedaten vom AGS.
  Für dieses E46-Kombi ist der **PWM-Draht der dokumentierte Weg für die Geschwindigkeit**. Eine Community-Pinbelegung
  nennt dafür **X11175 Pin 19** ("Wheel Speed Rear Left", Eingang), siehe [hardware.md](hardware.md).

Daher macht die Firmware beides möglich: PWM immer (Pin `SPEED_PIN`), ASC1 optional (`cfg speed_can=1`).

### 0x153 ASC1 (optional)

| Signal | Kodierung |
|---|---|
| Geschwindigkeit | `raw = km/h × 16`, 13 Bit: Byte 1 Bit 3–7 sind raw[0..4], Byte 2 ist raw[5..12] |
| Momenteneingriffe | Byte 3 / 6 = `0xFF` (kein Eingriff) |
| Alive-Zähler | Byte 7, 0..15 |

Sendezeit im Fahrzeug: 10 ms (ASC) bzw. 20 ms (DSC). Die Firmware sendet alle 20 ms.

## Bestätigung durch ein laufendes Projekt

[TeksuSiK/e46-cluster-simhub](https://github.com/TeksuSiK/e46-cluster-simhub) (Demo-Video im README) steuert ein
E46-Kombi. Aus dessen Quellcode (nur gelesen, nichts kopiert; das Projekt steht unter
GPL-3.0), mit unseren Annahmen verglichen:

| Punkt | Projekt | Bewertung |
|---|---|---|
| Drehzahl 0x316 | Nur Byte 3 gesetzt: `rpm / 40` (0–7000 → 0–175). Byte 0 und alle anderen bleiben 0 | ✅ passt zu `raw = rpm × 6.4` (MSB = rpm / 40). Byte 0 = 0 genügt also |
| Kühlmitteltemperatur 0x329 | Nur Byte 1: `(T + 48) / 0.75` | ✅ Offset **−48** bestätigt |
| 0x545 Byte 0 | Check Engine `0x02`, Tempomat `0x08`, DDE-Leuchte `0x10` | ✅ passt zu MIL / Tempomat / EML |
| 0x545 Byte 3 | Überhitzung `0x08` | ✅ |
| Geschwindigkeit | **Draht**: `tone()` mit **6,72 Hz pro km/h** (250 km/h = 1680 Hz) auf einem Digitalpin | ✅ Draht-Weg bestätigt. Unser Standard 6,833 Hz (aus 410 Hz = 60 km/h) weicht 1,7 % ab, per `CFG speed_hz` kalibrieren |
| Lampen über 0x153 | Byte 0 = `0xFF`: Bremsfehler-Lampe, Byte 1 = `0xFF`: Traktionskontrolle (ASC). Keine Geschwindigkeit in diesem Frame | ✅ mehr Lampen per CAN steuerbar, noch nicht in der Firmware |
| Ladekontrolle, Öldruck, Handbremse, ABS | **Digitale Pins**, nicht CAN | ⚠️ Unsere Bits in 0x545 Byte 5 (`battery`, `oilpress`) sind vermutlich wirkungslos. Die Lampen hängen an Kombi-Eingängen (X11175 Pin 2, 13, 23, 22) |
| Zündung, Hintergrundbeleuchtung | Digitalpins (Zündung, PWM-Dimmer) | Kombi-Klemme 15 bzw. Dimmer-Eingang |
| Blinker, Fern-/Abblend-/Nebellicht, Standlicht, Check-Control-Anzeigen | **K-Bus** (Bibliothek `IbusTrx`) | Lichtstatus-Bits siehe unten |

K-Bus-Lichtstatus in dem Projekt (Bitmaske, Bedeutung aus den Namen abgeleitet, Frame-ID dort nicht lesbar):
Standlicht `0x01`, Abblendlicht `0x02`, Fernlicht `0x04`, Nebel vorn `0x08`, Nebel hinten `0x10`, Blinker links `0x20`,
Blinker rechts `0x40`, schnelles Blinken `0x80`. Details zum K-Bus stehen im Projekt
[wilhelm-docs](https://github.com/piersholt/wilhelm-docs) (I-/K-Bus-Dokumentation, laut Autor unvollständig und nicht
maßgeblich), das auch das Projekt als Quelle nennt.

## Was das Cluster selbst sendet

- `0x613` / `0x615` (ICL2/ICL3) vom Cluster zur DME. Inhalt nicht verifiziert; ein Forenbeitrag nennt den
  Tankstand in Byte 2 (voll = `0x39`), was dazu passt, dass das Cluster den analogen Geber liest und weitergibt.
  Mit `sniff` mitlesen, das ist die beste Quelle für eigene Verifikation.
- `0x610` VIN-Anfrage (RTR) wird vom Cluster mit der VIN beantwortet.

## Hinweis: Codierung

Ein Forenbeitrag nennt, dass ein nicht codiertes Cluster nicht mit der DME kommuniziert. Falls das Cluster
auf dem Tisch keine Reaktion zeigt, obwohl `tx_ok` steigt, ist das der erste Verdacht. Die Cluster-Variante
(Benzin/Diesel, Facelift, M3) beeinflusst außerdem, welche Frames relevant sind.

## Quellen

- [ms4x.net: MS42 CAN Bus](https://www.ms4x.net/index.php?title=Siemens_MS42_CAN_Bus) (0x316/0x329/0x545, Hinweis: teils unverifiziert)
- [ms4x.net: 0x153 ASC1](https://www.ms4x.net/index.php?title=CAN_Bus_ID_0x153_ASC1)
- [HeinrichG-V12/E46_M3_Cluster](https://github.com/HeinrichG-V12/E46_M3_Cluster) (Nachrichtenliste, DBC/CANoe-Konfig)
- [david-morton/BMW_E46_Gauge_Cluster_Control](https://github.com/david-morton/BMW_E46_Gauge_Cluster_Control) (Tacho-PWM, X11175 Pin 19)
- [BMW Schulungsunterlage ST034, E46 Driver Information](https://ia801005.us.archive.org/11/items/BMWTechnicalTrainingDocuments/ST034%20E46%20Complete%20Vehicle/2%20Driver%20Information%20Internet-1.pdf) (Signalwege Draht/CAN/K-Bus, kein Pinout)
- [bimmerforums: DME1-Decode](https://www.bimmerforums.com/forum/showthread.php?p=25012791)
- [rusEFI: BMW-Cluster per CAN](https://rusefi.com/forum/viewtopic.php?p=3450)
