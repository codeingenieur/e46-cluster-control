# Pinplan unseres Setups

Ein Blatt mit allem, was Pins betrifft: Kombi-Stecker, ESP32-GPIOs und wie jedes Signal elektrisch angesteuert wird.
Setup: ESP32-DevKitC-32E, CAN-Transceiver mit 3,3 V (z. B. SN65HVD230), Kombi **62.11-6 906 888** (Motometer).

**Quellen und Verlässlichkeit.** Kombi-Pins: [bmwgm5.com](https://www.bmwgm5.com/E46_IKE_Connections.htm) für ein Kombi mit
anderer Teilenummer, nicht am eigenen Kombi geprüft. Ansteuerlogik: aus dem Quellcode des Projekts
[TeksuSiK/e46-cluster-simhub](https://github.com/TeksuSiK/e46-cluster-simhub) abgelesen. Dort sind es Pegel am
Mikrocontroller, die Treiberstufen zwischen Controller und Kombi stehen nur in einem Schaltplanbild, das ich nicht
lesen konnte. **Alles Elektrische vor dem Anschließen am eigenen Kombi messen.**

## 1. Kombi-Stecker X11175 (schwarz, 26-polig)

Pins 1–13 in einer Reihe, 14–26 in der anderen. Pins, die wir brauchen oder bald brauchen:

| Pin | Signal | Richtung | Wie wir es ansteuern | ESP32 | Status |
|---|---|---|---|---|---|
| 1 | Masse | – | gemeinsame Masse (Netzteil, ESP32, Transceiver) | GND | Quelle |
| 4 | Klemme 30, Dauerplus (5-A-Sicherung) | Versorgung | Netzteil +12 V | – | Quelle |
| 5 | Klemme 15, Zündung (5-A-Sicherung) | Versorgung | +12 V, später per Relais vom ESP32 | siehe Abschnitt 2 | Quelle |
| 6 | Klemme R (5-A-Sicherung) | Versorgung | zunächst offen lassen | – | offen, ob nötig |
| 9 | CAN-H | Bus | Transceiver | – | Quelle + Forum |
| 10 | CAN-L | Bus | Transceiver | – | Quelle + Forum |
| 19 | Raddrehzahl hinten links (Tacho-Eingang) | Eingang am Kombi | PWM, 50 % Tastverhältnis, über NPN | **GPIO18** | Quelle + 2 Projekte |
| 2 | Ladekontrolle | Lampe, Eingang | Transistor | GPIO19 (Vorschlag) | Polarität offen |
| 13 | Öldruckschalter | Lampe, Eingang | Transistor | GPIO21 (Vorschlag) | Polarität offen |
| 22 | ABS-/DSC-/ASC-Lampe | Lampe, Eingang | Transistor | GPIO22 (Vorschlag) | s. Abschnitt 3 |
| 23 | Feststellbremsschalter | Lampe, Eingang | Transistor | GPIO23 (Vorschlag) | Polarität offen |
| 7 | Beleuchtung 58G (nur bis Modelljahr 2002) | Eingang | Transistor | GPIO26 (Vorschlag) | bei deinem Kombi offen |
| 14 | K-Bus | Bus | LIN-/K-Bus-Transceiver | GPIO16/17/27 (Vorschlag) | später |

**Nicht ansteuern:** Pin 8 ist der Tacho-**Ausgang** des Kombis. Pin 3 (Anlasser-Rückmeldung) nicht beschalten.

Weitere belegte Pins für später: 11/12 Tankgeber rechts, 15/16 Tankgeber links, 17 Ölstand, 18 Service-Reset,
20 Bremsflüssigkeit, 21 Airbag-Lampe, 24 Bremsbelagverschleiß, 25 Diagnose TXD, 26 Kühlmittelstand.
Details und Geberwerte in [hardware.md](hardware.md).

## 2. ESP32-GPIOs

| GPIO | Funktion | Status |
|---|---|---|
| 5 | CAN TX (an Transceiver TXD) | in der Firmware (Strapping-Pin, unkritisch) |
| 4 | CAN RX (an Transceiver RXD) | in der Firmware |
| 18 | Tacho-PWM | in der Firmware |
| 19, 21, 22, 23 | Lampen: Ladekontrolle, Öldruck, ABS, Handbremse | **Vorschlag**, nicht implementiert |
| 25 | Klemme 15 per Relais/Treiber | **Vorschlag** |
| 26 | Beleuchtung (Pin 7) | **Vorschlag** |
| 16 / 17 / 27 | K-Bus: UART2 RX / TX, Transceiver-Enable | **Vorschlag**, K-Bus-Seite offen |

Auswahlkriterien der Vorschläge: kein Strapping-Pin (0, 2, 12, 15), nicht Flash-Pin (6–11), nicht input-only (34–39),
und Pins, die beim Booten nicht kurz schalten, damit beim Einschalten keine Lampe aufblitzt. Alle Pegel am ESP32 sind
3,3 V und **nicht 5-V-tolerant**. Zwischen ESP32 und Kombi immer eine Treiberstufe (siehe unten).

## 3. Ansteuerarten

**Versorgung.** Nur 12 V (Netzteil, strombegrenzt) an Pin 4 und 5, Masse an Pin 1. Der ESP32 hängt an USB.

**CAN (Pin 9/10).** 500 kbit/s, SN65HVD230 an GPIO5/4. Siehe [can-signals.md](can-signals.md).

**Tacho (Pin 19).** Rechteck mit 50 % Tastverhältnis, Frequenz proportional zur Geschwindigkeit. Zwei Quellen:
410 Hz bei 60 km/h (6,83 Hz je km/h) und 6,72 Hz je km/h (250 km/h = 1680 Hz). Ausgang des ESP32 über NPN
(Open-Collector) an Pin 19, Details und Schaltung in [hardware.md](hardware.md).

**Lampen am Draht (Pin 2, 13, 22, 23).** Aus dem Fremdprojekt:

| Lampe | Pegel am Mikrocontroller bei "Lampe an" |
|---|---|
| ABS/DSC | **LOW** (invertiert) |
| Ladekontrolle | HIGH |
| Öldruck | HIGH (Bedeutung des Flags dort nicht eindeutig) |
| Handbremse | HIGH |

Das beschreibt nur den Mikrocontroller-Pin. Weil dort laut README Relaistreiber dazwischen liegen, folgt daraus **nicht**,
ob das Kombi die Lampe bei Masse oder bei +12 V einschaltet. Die ABS-Logik (LOW = an) spricht für einen Eingang, der
gegen Masse gezogen wird, ist aber kein Beweis. **Messen:** Spannung am jeweiligen Kombi-Pin bei Klemme 15 ein, Pin offen.
Liegt dort eine Spannung (Pull-up im Kombi), schaltet Masse die Lampe ein: NPN-Open-Collector gegen Masse.
Liegt dort 0 V, wäre +12 V nötig.

**Zündung und Beleuchtung.** Im Fremdprojekt sind Zündung (HIGH = Zündung an) und Seitenlicht (HIGH = an) reine
Ein/Aus-Ausgänge, kein PWM. Für uns: Klemme 15 per Relais, Beleuchtung über Pin 7 (nur bis Modelljahr 2002 belegt).

**Geber nachbilden (später).** Tank links ca. 70–310 Ω, Tank rechts ca. 70–395 Ω (Pins 15/16 bzw. 11/12), Außentemperatur
NTC ca. 4,7 kΩ bei 25 °C (X11176 Pin 1/2): digitales Potentiometer oder Relais mit Festwiderständen.

**K-Bus (Pin 14, später).** Einleitungsbus mit 12-V-Pegel, 9600 Baud, 8 Datenbits, gerade Parität, 1 Stopbit (8E1). Das
Fremdprojekt nutzt dafür einen MCP2021 (LIN-Transceiver) an einer UART und die Bibliothek IbusTrx. Ein Lichtstatus-Telegramm
sieht dort so aus: `D0 07 BF 5B 00 00 00 00` plus Lichtbits in Byte 4 (siehe [can-signals.md](can-signals.md)). Die Bedeutung
der ersten Bytes (Absender, Länge, Empfänger, Befehl, Prüfsumme) steht in der Quelle nicht, nach allgemeinem I-/K-Bus-Wissen
ist `D0` das Lichtmodul, `BF` Rundruf, `5B` Lampenstatus. Das ist hier nicht belegt. Der ESP32 braucht dafür einen
Pegelwandler (3,3 V UART ↔ 12 V Bus), nicht direkt anschließen.

## 4. Vor dem ersten Anschließen messen

1. Kombi ausgesteckt: Durchgang zwischen Pin 1 und Gehäuse-Masse, **kein** Kurzschluss zwischen Pin 4/5 und Pin 1.
2. Kombi aus, nur Strom an Pin 1/4/5: Strom am Netzteil beobachten (Begrenzung z. B. 1 A).
3. Spannung an den Lampen-Eingängen (Pin 2, 13, 22, 23) bei Klemme 15 ein, Pins offen: Das bestimmt die Treiberschaltung.
4. Spannung am Tacho-Eingang (Pin 19) bei offenem Pin: Pull-up vorhanden?
5. CAN-Widerstand zwischen Pin 9 und 10 bei ausgeschalteter Versorgung: Ist ein Abschluss im Kombi?
