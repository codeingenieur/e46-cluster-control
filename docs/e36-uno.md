# E36-Kombi mit Arduino Uno steuern

Firmware: [firmware-e36-uno/](../firmware-e36-uno). Gilt für das vorhandene Kombi VDO 62.11-8 360 482 (kein CAN),
Pinbelegung in [e36-pinout.md](e36-pinout.md). Das USB-Zeilenprotokoll ist dasselbe wie beim ESP32
([usb-interface.md](usb-interface.md)), nur die Schlüssel sind andere.

**Status:** Die Firmware **kompiliert** (Uno, 10 KB Flash, 665 Byte RAM). Sie ist **nicht am Kombi getestet**. Mehrere
Werte sind Platzhalter oder Annahmen und müssen kalibriert werden (Abschnitt 5). Zum Auswerten der Quellen siehe
[e36-pinout.md](e36-pinout.md).

## 1. Was du brauchst

Vorhanden laut dir: Arduino Uno, USB-Kabel, Transistoren, Widerstände. Dazu:

| Teil | Zweck |
|---|---|
| NPN-Transistoren, z. B. BC547, **oder** Logic-Level-MOSFET IRLZ34N | **ein Schalter je Ausgang** (4 Signale plus Lampen, bis zu 18) |
| Widerstände 1 kΩ (Basis) und 10 kΩ (Basis nach Masse) | je Transistor |
| 12-V-Netzteil, Sicherung 2 A | Versorgung des Kombis, siehe [hardware.md](hardware.md) |
| Gegenstecker für weiß 26, blau 26, schwarz 12 | noch offen, ohne ihn kein Anschluss |

Mit allen Lampen sind das bis zu 18 Transistoren. Für den Anfang reichen die vier Signalausgänge und eine Lampe.

## 2. Pinplan Uno ↔ Kombi

Jeder Ausgang geht **nur über einen Transistor** an das Kombi.

| Uno-Pin | Funktion | Kombi-Pin |
|---|---|---|
| D9 | Drehzahl-Rechteck | weiß 20 |
| D10 | Wegsignal-Rechteck (Tacho) | schwarz 4 (gegen schwarz 3) |
| D6 | PWM Kühlmitteltemperatur | blau 18 (gegen blau 17) |
| D5 | PWM Tankanzeige | schwarz 1 (gegen schwarz 3) |
| D2 | Lampe `mil` (Check Engine) | weiß 16 |
| D3 | Lampe `oilpress` (Öldruck) | blau 19 |
| D4 | Lampe `handbrake` | weiß 17 |
| D7 | Lampe `abs` | blau 11 |
| D8 | Lampe `airbag` | weiß 14 |
| D11 | Lampe `brakefluid` | weiß 18 |
| D12 | Lampe `left` (Blinker links) | weiß 4 |
| D13 | Lampe `right` (Blinker rechts) | weiß 3 |
| A0 | Lampe `highbeam` | weiß 1 |
| A1 | Lampe `fogfront` | blau 8 |
| A2 | Lampe `fogrear` | schwarz 5 |
| A3 | Lampe `belt` | blau 14 |
| A4 | Lampe `asc` | blau 12 |
| A5 | Lampe `cat` | weiß 26 |

D0/D1 gehören dem USB. Die Zuordnung steht oben in [main.cpp](../firmware-e36-uno/src/main.cpp) (`LAMPS`, `PIN_*`).

**Versorgung des Kombis (ohne Uno):** Klemme 30 an weiß 22, Klemme 15 an weiß 23 und blau 4, Masse an weiß 24, blau 3 und
schwarz 3. **Alle Massen mit der Uno-Masse verbinden** (sonst haben die Transistoren keinen Bezug).

## 3. Schaltung je Ausgang

```
Uno-Pin --[1 kΩ]--+-- Basis
                  |
                 10 kΩ (Basis -> GND)
                  |
                 GND (gemeinsame Masse)      NPN Emitter -> GND
                                             NPN Kollektor -> Kombi-Pin
```

Der Transistor zieht den Kombi-Pin **gegen Masse**. Das ist für Rechtecksignale und (vermutlich) für die Lampen richtig. Der
10-kΩ-Widerstand hält den Transistor beim Einschalten des Uno sicher aus.

**Optional, damit die Nadel auch beim Einschalten des Uno auf 0 bleibt:** den 10-kΩ-Widerstand am Gate nicht nach GND, sondern nach
**+5 V** legen (Uno-5V). Dann leitet der Schalter von selbst, solange der Uno-Pin noch nicht arbeitet (Reset, Flashen), und der
Kombi-Pin liegt auf Masse. Mit dem Standard (10 kΩ nach GND) schlägt die Nadel beim Einschalten des Uno kurz voll aus.

**Variante mit MOSFET IRLZ34N** (TO-220, Metallfahne oben): gleiche Schaltung, andere Namen der Beine. Text zum Betrachter,
Beine nach unten, von links nach rechts: **Gate, Drain, Source**.

| Bein | Anschluss |
|---|---|
| Gate (links) | Uno-Pin über 1 kΩ, dazu 10 kΩ nach GND |
| Drain (Mitte) | über 470 Ω an den Kombi-Pin |
| Source (rechts) | GND |

- Es muss ein **IRLZ34N (L)** sein. Der **IRFZ34N (F)** braucht etwa 10 V am Gate und schaltet am Uno nicht voll durch.
- Die **Metallfahne ist mit dem Drain verbunden**, also mit dem Kombi-Pin. Sie darf nichts berühren.
- Das Gate ist statikempfindlich. Vor dem Anfassen etwas Geerdetes berühren.
- Pinbelegung im Datenblatt gegenprüfen (International Rectifier / Infineon).

**Temperatur und Tank (PWM):** Hier gilt dieselbe Schaltung, die Quellen sind aber unklar. Das Kombi erwartet an diesen Pins
einen **Geber (Widerstand)**, die Zeigerinstrumente reagieren träge. Der Transistor mit PWM wirkt wie ein veränderlicher
Widerstand gegen Masse. Ob die Anzeige damit sauber läuft, ist ungeprüft. **Messen** (Abschnitt 4), bevor du etwas
anschließt, und mit einem **Vorwiderstand (z. B. 470 Ω) in der Kollektorleitung** beginnen, damit nie ein Kurzschluss
nach Masse entsteht.

## 4. Inbetriebnahme in dieser Reihenfolge

1. **Firmware bauen und flashen** (PlatformIO):
   ```bash
   cd firmware-e36-uno
   pio run -t upload
   ```
   Falls PlatformIO nicht installiert ist: siehe [README](../README.md).
2. **Ohne Kombi testen.** Host installieren (`pip install -e host`), dann:
   ```bash
   python -m e46cluster ping
   python -m e46cluster set rpm=3000 speed=100
   python -m e46cluster get
   ```
   Mit Multimeter oder Logikanalysator prüfen: D9 zeigt bei `rpm=3000` und 2 Impulsen je Umdrehung **100 Hz**, D10 bei
   `speed=100` **100 Hz** (Standardfaktor 1 Hz je km/h). Beide haben 50 % Tastverhältnis.
3. **Versorgung des Kombis** (Klemme 30, 15, Masse), **ohne** Signalleitungen. Strombegrenzung am Netzteil oder Sicherung 2 A.
   Das Kombi sollte seinen Lampentest zeigen.
4. **Vor jedem Signal messen:** Spannung am Kombi-Pin bei eingeschalteter Klemme 15 (Pin offen, gegen Masse gemessen):
   weiß 20, schwarz 4, blau 18, schwarz 1 und die Lampenpins. Liegt dort eine Spannung, hat das Kombi einen Pull-up und der
   Transistor-Aufbau passt. Liegt dort 0 V, ist der Eingang anders aufgebaut: dann nicht anschließen, sondern klären.
5. **Ein Signal nach dem anderen** anschließen: erst Drehzahl, dann Tacho, danach Lampen, zuletzt Temperatur und Tank.

## 4a. Notlösung ohne Multimeter

Der Ablauf in Abschnitt 4 setzt Messungen voraus. Ohne Multimeter ist der Anschluss **riskanter**. Die zwei Stellen, an denen
etwas kaputtgehen kann: **falsche Polarität der Versorgung** und **ein falscher Pin an 12 V**. Mit diesen Vorkehrungen
bleibt das Risiko überschaubar, ganz ausgeschlossen ist es nicht.

**Vorbereitung**

1. **Polarität des Netzteils** mit einer LED prüfen, nicht raten. Baue die Reihe Widerstand → LED-Anode (langes Bein) → LED-Kathode (kurzes Bein)
   und halte das freie Widerstandsende an die eine, das freie Kathodenende an die andere Ader (ohne Kombi). Die LED leuchtet nur,
   wenn die Ader am **Widerstandsende Plus** ist. Leuchtet sie nicht, tausche die beiden Adern. Beschrifte beide Adern.
2. **Sicherung 2 A** in die Plusleitung. Ohne Sicherung kann ein Fehler bis 5 A ziehen.
3. **Serienwiderstand 470 Ω in jede Signalleitung** zwischen Transistor-Kollektor und Kombi-Pin (Drehzahl, Tacho, Temperatur,
   Tank, Lampen). Dann kann ein falsch gewählter Pin keinen Kurzschluss nach Masse erzeugen: Es fließen höchstens etwa
   25 mA. Die Rechtecksignale funktionieren trotzdem, solange das Kombi am Eingang einen Pull-up hat.
4. **Pins vor dem Stecken zweimal gegen [e36-pinout.md](e36-pinout.md) und die Nummern auf dem Gehäuse prüfen.** Die
   Nummern stehen auf deinen Fotos am Rand der Stecker (weiß: 26/1/13 und 14/1, schwarz: 12/6 und 7/1).

**Reihenfolge am Kombi**

1. Alles **stromlos** verkabeln. **Foto der Verkabelung machen und prüfen lassen**, bevor Strom drauf kommt.
2. **Masse zuerst:** weiß 24, blau 3 und schwarz 3 an Netzteil-Minus (und Uno-GND).
3. **Klemme 30** an weiß 22, dann Netzteil einstecken. Das Kombi bleibt noch aus, es braucht Klemme 15.
4. **Klemme 15** an weiß 23 und blau 4 (blau 5 weglassen). Dann leuchten kurz die Lampen. Nach etwa einer Sekunde dürfen
   keine Warnleuchten mehr dauerhaft an sein, außer den vom Kombi gewollten.
5. **Sofort abstecken**, wenn es riecht, raucht, ungewöhnlich warm wird, die Sicherung durchbrennt oder nichts geschieht.
6. **Danach erst die Signale**, einzeln: Drehzahl (weiß 20), dann Tacho (schwarz 4 mit schwarz 3). Pro Signal einen Befehl,
   z. B. `set rpm=3000`, Nadel beobachten.
7. Temperatur und Tank (blau 18/17, schwarz 1/3) erst zuletzt: Das sind Geber-Eingänge, dort ist die Schaltung am
   unsichersten. Mit `set coolant_pwm=0` beginnen und in kleinen Schritten erhöhen.

**Nie anschließen:** die Ausgänge des Kombis (blau 2, 9, 10 und 24) und Klemme R, solange nicht geklärt ist, ob sie nötig ist.

## 5. Kalibrierung

Alle Werte ändern sich per `cfg` (nur im RAM, nach Neustart wieder Standard).

| Anzeige | Befehl | Hinweis |
|---|---|---|
| Drehzahl, Ruhepegel | `cfg rpm_idle=1` | Standard. Bei `rpm=0` hält der Uno den Kombi-Pin **auf Masse**. **Bestätigt:** mit `rpm_idle=0` (Pin offen) schlug die Nadel voll aus, mit `1` geht sie auf 0 |
| Drehzahl | `cfg rpm_ppr=2` | Impulse je Umdrehung. **Bestätigt** am eigenen Kombi: bei `set rpm=3000` zeigt die Nadel auf 3 (3000 U/min). Für einen Vierzylinder-Kombi; andere Werte weiter prüfen. (3 bei Sechszylinder laut Quelle.) Stimmt die Nadel nicht, Wert anpassen: Nadel zeigt zu wenig → größer |
| Tacho | `cfg speed_hz=1` | Hz je km/h. **Platzhalter.** Mit `set speed=100` die Nadel auf 100 stellen und `speed_hz` so ändern, bis sie passt |
| Temperatur | `set coolant_pwm=0..255` | Roh-Duty direkt setzen, Nadelstellung beobachten. Mit `cfg cool_c0=40 cool_c1=120 cool_d0=<duty> cool_d1=<duty>` festlegen, danach funktioniert `set coolant=<°C>` |
| Tank | `set fuel_pwm=0..255` | wie Temperatur. Mit `cfg fuel_d0` (leer) und `cfg fuel_d1` (voll) festlegen, danach `set fuel=<0..100>` |
| Lampen | `set mil=1` | Annahme: Lampe leuchtet, wenn der Pin gegen Masse gezogen wird. Falls nicht, Polarität am Kombi messen |

Die Duty-Werte von Temperatur und Tank dürfen vertauscht werden (`cool_d0=255 cool_d1=0`), falls mehr Leitung die Nadel
fallen lässt.

## 6. Befehle

| Befehl | Wirkung |
|---|---|
| `PING` | `PONG e36-uno <Version>` |
| `SET k v [k v ...]` | Werte setzen (ganz oder gar nicht) |
| `GET` | Zustand lesen |
| `CFG [k v ...]` | Konfiguration lesen/setzen |
| `ZERO` | Drehzahl und Geschwindigkeit auf 0 |

**SET-Schlüssel:** `rpm` (U/min), `speed` (km/h), `coolant` (°C), `fuel` (0–100 %), `coolant_pwm`, `fuel_pwm` (0–255,
Rohwert), Lampen `mil oilpress handbrake abs airbag brakefluid left right highbeam fogfront fogrear belt asc cat` (0/1).

**CFG-Schlüssel:** `rpm_ppr`, `speed_hz`, `cool_c0`, `cool_c1`, `cool_d0`, `cool_d1`, `fuel_d0`, `fuel_d1`, `wdt`
(Watchdog in ms, 0 = aus).

Die Rechtecksignale sind zwischen etwa 2 Hz und 4 kHz möglich, darunter schaltet die Firmware den Ausgang ab.
Alle Ausgänge starten beim Einschalten aus.

## 7. Unsicherheiten

- **Pinbelegung** stammt aus einem Forenbeitrag und ist nur auf wichtigen Pins bestätigt ([e36-pinout.md](e36-pinout.md)).
- **Drehzahl:** Impulse je Umdrehung für deinen Motor ungeprüft. Außerdem hängt der Faktor laut einer Quelle vom Codierstecker ab.
- **Tacho:** Impulse je km/h ungeprüft, der Standardwert ist ein Platzhalter.
- **Temperatur und Tank:** Eingangsschaltung am Kombi und Kennlinien unbekannt, PWM-Ansteuerung nur aus einem Hobbyprojekt
  bekannt (E36Clock), dort ohne dokumentierte Zusatzschaltung.
- **Lampen:** Polarität ungeprüft.
- **Uno und USB:** Beim Öffnen des Ports startet der Uno neu (Auto-Reset). Die Python-Bibliothek schaltet DTR/RTS vor dem
  Öffnen ab und pingt mehrfach, bis der Uno antwortet (etwa 2 Sekunden).
