# Hardware

## Teile

| Teil | Hinweis |
|---|---|
| ESP32-DevKit (klassisch, z.B. ESP32-WROOM-32) | Der Controller hat den CAN-Controller (TWAI) eingebaut. Der Code ist für diesen Typ gedacht |
| CAN-Transceiver mit **3.3 V** Logik | z.B. SN65HVD230-Modul oder TJA1051T/3. **Kein** TJA1050 direkt an ESP32-Pins: der treibt RX mit 5 V |
| Netzteil 12–14 V, mind. 3 A | Das Kombi zieht deutlich Strom, sobald Zeiger und Beleuchtung laufen |
| NPN-Transistor (BC547/2N2222) + Widerstände | Pegelwandler für das Tachosignal |
| 120 Ω Widerstand | Busabschluss, falls nötig |

## Verdrahtung ESP32 ↔ Transceiver

| ESP32 | Transceiver |
|---|---|
| GPIO5 | TXD (CTX) |
| GPIO4 | RXD (CRX) |
| 3V3 | VCC |
| GND | GND |

Die Pins sind per Build-Flag änderbar (`CAN_TX_PIN`, `CAN_RX_PIN`, `SPEED_PIN` in `platformio.ini`).

Gegen das Datenblatt des ESP32-WROOM-32E (v1.6) geprüft:

- GPIO4 (Modulpin 26), GPIO5 (29) und GPIO18 (30) sind normale I/O-Pins des Moduls.
- **GPIO5 ist ein Strapping-Pin** (Standard: Pull-up, beeinflusst nur das Timing eines SDIO-Slaves, das wir nicht nutzen).
  Als CAN-TX unkritisch: Der Transceiver-Eingang liegt im Ruhezustand ohnehin hoch. Die kritischen Strapping-Pins
  (GPIO0, GPIO2, GPIO12/MTDI, GPIO15/MTDO) werden nicht verwendet und sollten frei bleiben.
- **Die Pins sind nicht 5-V-tolerant.** Zulässig ist höchstens VDD + 0,3 V (also ca. 3,6 V), High-Pegel ab 0,75 × VDD
  (ca. 2,5 V). Deshalb 3,3-V-Transceiver und der Transistor als Pegelwandler am Tacho-Ausgang. Nie ein 12-V-Signal
  direkt an einen GPIO legen.
- Das Datenblatt beschreibt das **Modul**. Welche Pins das DevKitC-Board nach außen führt, steht im Pinout des Boards.

CAN-H und CAN-L des Transceivers gehen an die CAN-Pins des Kombis. Alle drei Massen (ESP, Transceiver, Kombi)
verbinden.

## Das vorhandene Kombi

Vom Aufkleber abgelesen (Foto, einzelne Zeichen können falsch gelesen sein):

| Feld | Wert |
|---|---|
| BMW-Teilenummer | 62.11-6 906 888 |
| Hersteller / Herstellernummer | Motometer, 0 263 606 269 |
| HW / SW | 10.0 / 20.0 |
| CODE / DIAG / BUS | 04H / 52H / 11H |
| ÄND (Änderungsstand) / CAN | 59 / 04H |
| Weitere Nummern | 026602, PM:1010, 010131, 03470212701614 |

Das Feld `CAN :04H` zeigt, dass es ein Kombi mit CAN-Schnittstelle ist. Zur Teilenummer habe ich keine Variantenangabe
gefunden.

Befund aus den Fotos (Vorderseite und Rückseite):

- Zifferblatt: **km/h**, Skala 20–240. Drehzahlmesser **0–7 (×1000)** mit Rotbereich ab ca. 6, Kühlmittel- und Tankanzeige,
  Verbrauchsanzeige in km/L (Skala 5–22). Das spricht für ein **Benzin-Kombi**, abgeleitet aus dem Bild, nicht aus einer Quelle.
- Rückseite: **zwei Steckverbinder**, einer hell (beige/weiß), einer schwarz. Das passt zur Beschreibung unten
  (X11176 weiß 18-polig, X11175 schwarz 26-polig). Die Fotos sind unscharf, Pinzahl und Nummern habe ich daraus nicht
  gezählt. Vor dem Verdrahten am Gehäuse nachsehen: Auf den Steckern stehen meist die Pinnummern.
- Die Belegung unten stammt von einer Community-Seite für das Kombi mit **anderer Teilenummer** (62.11-6 931 252, Limousine).
  Laut Seite gilt sie für Bosch- und Motometer-Kombis, mit Ausnahmen (Pin 7 nur bis Modelljahr 2002, Pin 17 Kabelfarbe
  wechselt 03/2003). Für 62.11-6 906 888 ist sie **nicht** einzeln bestätigt.

## Signalwege laut BMW-Schulungsunterlage (E46)

| Funktion | Weg zum Kombi |
|---|---|
| Drehzahl, Motortemperatur, Verbrauch (Ti) | CAN von der DME |
| Geschwindigkeit ("Wegsignal") | Rechtecksignal von ABS/ASC/DSC (Draht) |
| Tankanzeige | zwei Geber parallel am Kombi (analog) |
| Außentemperatur | NTC-Sensor am Kombi (analog) |
| Ölstand | PWM-Signal vom Ölstandssensor (Draht) |
| Beleuchtungsdimmer | PWM-Signal vom Lichtschaltzentrum (Draht) |
| Check-Control-Piktogramme | K-Bus |
| Zündung | Klemmen R, 15 und 50 (Draht) |

Quelle: [ST034 Driver Information](https://ia801005.us.archive.org/11/items/BMWTechnicalTrainingDocuments/ST034%20E46%20Complete%20Vehicle/2%20Driver%20Information%20Internet-1.pdf).
Die Unterlage nennt keine Steckerbelegung.

## Kombi-Anschlüsse

Quelle: [bmwgm5.com, E46 IKE Connections](https://www.bmwgm5.com/E46_IKE_Connections.htm) (Ausdruck mit demselben Inhalt
liegt dem Projekt vor). Pin 9 als CAN-Pin bestätigt außerdem ein
[Forenbeitrag](https://bmwfaq.org/threads/esquema-electrico-cuadro-de-instrumentos.1048821/). **Nicht gegen einen
BMW-Schaltplan geprüft.** Vor dem ersten Einschalten mit dem Multimeter nachmessen (Masse, Durchgang, kein Kurzschluss
zwischen Klemme 30 und Masse).

Stecker **X11175: schwarz, 26-polig, zwei Reihen.** Pins 1–13 in einer Reihe, 14–26 in der anderen.

**Für den Tischaufbau nötig:**

| Pin | Funktion | Anschluss |
|---|---|---|
| X11175-1 | Masse | Netzteil −, ESP32-GND, Transceiver-GND |
| X11175-4 | Klemme 30 (Dauerplus, über 5-A-Sicherung F43) | Netzteil +12 V |
| X11175-5 | Klemme 15 (Zündung, über F34) | Netzteil +12 V, zuschaltbar |
| X11175-6 | Klemme R (über F10) | optional, siehe Hinweis |
| X11175-9 | CAN-H | Transceiver CAN-H |
| X11175-10 | CAN-L | Transceiver CAN-L |
| X11175-19 | Raddrehzahl hinten links (Eingang vom ABS/DSC) | **Tacho-PWM** vom ESP32 über Transistor |

Hinweise:

- Pin 19 ist der **Eingang** für das Tachosignal und passt zum Community-Projekt (410 Hz = 60 km/h). Pin 8
  ("Speedometer Signal Output") ist dagegen ein **Ausgang** des Kombis: nicht ansteuern.
- Ob Klemme R (Pin 6) zum Aufwecken nötig ist, ist offen. Zunächst nur KL30, KL15 und Masse anschließen und beobachten.
- Pin 3 ("Engine Start Signal Feedback") nicht beschalten.

**Weitere Pins von X11175** (für später, Backlog):

| Pin | Funktion |
|---|---|
| 2 | Ladekontrolle (Signal) |
| 7 | Beleuchtung 58G (nur bis Modelljahr 2002) |
| 8 | Tacho-Signalausgang (Ausgang des Kombis) |
| 11 / 12 | Tankgeber rechts: Signal / Masse |
| 13 | Öldruckschalter |
| 14 | K-Bus |
| 15 / 16 | Tankgeber links: Signal / Masse |
| 17 | Ölstandssensor |
| 18 | Service-Intervall-Reset |
| 20 | Bremsflüssigkeitsstand |
| 21 | Airbag-Warnleuchte |
| 22 | ABS-/DSC-/ASC-Warnleuchte |
| 23 | Feststellbremsschalter |
| 24 | Bremsbelagverschleiß |
| 25 | Diagnose TXD |
| 26 | Kühlmittelstand |

Stecker **X11176: weiß, 18-polig, zwei Reihen**, größtenteils unbelegt (N/C):

| Pin | Funktion |
|---|---|
| 1 / 2 | Außentemperatursensor: Signal / Masse |
| 4 | Waschwasserstand |
| 5 | Tempomat aktiv (nur M43) |
| 6 | Airbag/Überrollsensor (nur Cabrio) |
| 7 | Rückwärtsgang (nur Schaltgetriebe) |
| 12 | Fahrergurt (nur Cabrio) |
| 13 | BC-Taste am Blinkerhebel |
| 14 | Gong (T3) |
| 3, 8–11, 15–18 | nicht belegt |

Für den Tischaufbau reicht der **schwarze Stecker X11175**. Der weiße wird erst für die Außentemperatur gebraucht.

**Werte der Geber** (laut derselben Seite), für das spätere Nachbilden von Tank und Außentemperatur:

- Tankgeber links: ca. 70 Ω leer bis ca. 310 Ω voll. Tankgeber rechts: ca. 70 Ω leer bis ca. 395 Ω voll.
- Außentemperatursensor (NTC): ca. 4,7 kΩ bei 25 °C, 7,33 kΩ bei 15 °C, 3,07 kΩ bei 35 °C.

**Gegenstecker:** Für den schwarzen 26-poligen Stecker braucht man den passenden Gegenstecker (Pigtail) oder ein
Bench-Kabel. Die Gehäuse-/Kontaktnummern habe ich nicht gefunden. Möglichkeiten: ein fertiges Bench-Anschlusskabel für
E46-Kombis (es gibt Händler, die eines für Bosch und Motometer anbieten), ein gebrauchter Pigtail mit Stecker aus einem
E46-Kabelbaum, oder die Kontakte selbst crimpen, sobald Gehäuse und Kontaktserie feststehen.

## Tachosignal-Pegelwandlung

GPIO18 liefert ein 3.3-V-Rechteck (50 %). Das Cluster erwartet ein Signal wie von der ABS-Einheit, vermutlich
einen Open-Collector/Schaltausgang. Als Startpunkt:

```
ESP32 GPIO18 --[1 kΩ]--+-- Basis
                       NPN   Kollektor --> Kombi Speed-Eingang
                       Emitter --> GND
```

Erst messen, ob der Eingang einen internen Pull-up hat (Spannung am Pin bei offenem Eingang). Falls nicht und
das Cluster nichts zeigt, einen Pull-up (z.B. 4.7 kΩ) vom Kollektor nach +12 V (oder +5 V) probieren.
Pegel nicht raten, mit Multimeter/Oszi prüfen, bevor etwas an den Pin kommt.

## Busabschluss

Ein CAN-Bus braucht 120 Ω an jedem der beiden Enden. Das Kombi hat vermutlich keinen Abschluss. Bei Fehlern
(`tx_fail` steigt, `can=bus_off`): Mit ausgeschalteter Spannung zwischen CAN-H und CAN-L messen. Ideal sind
etwa 60 Ω (zwei Abschlüsse parallel). Viele Transceiver-Module haben einen 120-Ω-Widerstand oder Jumper.

## Sicherheit

- Anfangs mit Strombegrenzung am Netzteil arbeiten.
- Nicht ins Fahrzeug-Bordnetz stecken, solange Bring-up läuft. Ein CAN-Frame mit falscher ID auf einem echten
  Fahrzeugbus kann Steuergeräte stören.
