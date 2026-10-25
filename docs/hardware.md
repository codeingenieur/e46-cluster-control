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
- Rückseite: **zwei Steckverbinder**, einer hell (beige/weiß), einer schwarz. Die Fotos sind unscharf, **Pinzahl und
  Pinnummern sind nicht ablesbar**.
- Eine verlässliche Steckerbelegung habe ich weiterhin nicht. Gefundene Forenangaben zu Pins (u. a. "Pin 22", "Pin 9/10")
  stammen von anderen Fahrzeugen oder sind unbelegt und wurden **nicht** übernommen.

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

Eine **geprüfte Pinbelegung** habe ich nicht gefunden. Aus dem Schaltplan deiner Variante (ETK/ELSA oder
Reparaturleitfaden) brauchst du:

- Dauerplus (KL30), Zündung (KL15) und Masse (KL31). Ohne KL15 wacht das Kombi nicht auf.
- CAN-H, CAN-L
- Geschwindigkeitseingang. Laut [Community-Projekt](https://github.com/david-morton/BMW_E46_Gauge_Cluster_Control)
  ist das **X11175 Pin 19** (410 Hz = 60 km/h). Bitte gegen deinen Schaltplan prüfen.

Wenn du die Teilenummer vom Kombi-Aufkleber und ein Foto der Stecker schickst, kann ich das konkretisieren.

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
