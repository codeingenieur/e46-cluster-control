# USB-Schnittstelle PC ↔ ESP32 (für die PC-Anwendung)

Dieses Dokument ist **eigenständig** geschrieben: Wer die PC-Seite (z. B. Jira-Anbindung und Aufbereitung der
Projektdaten) auf einem anderen System entwickelt, braucht nur diese Datei, nicht den Rest des Repos.
Die PC-Anwendung schickt Werte über USB an einen ESP32, der daraus CAN-Frames für ein BMW-E46-Kombiinstrument macht.

Referenzimplementierung in Python: `host/e46cluster/client.py` im Repo
([codeingenieur/e46-cluster-control](https://github.com/codeingenieur/e46-cluster-control)).
Vollständige Befehlstabelle: [protocol.md](protocol.md). Hier steht, was man für die Integration wissen muss.

## 0. Voraussetzungen und Abgrenzung

**Was dieses Dokument abdeckt:** alles, was man braucht, um vom PC aus mit dem ESP32 zu sprechen
(Treiber/Port in Abschnitt 10, Protokoll in 2–6, Abnahmetests in Abschnitt 11).

**Was es nicht abdeckt:** die Jira-Seite. Welche Projektdaten (Ziele, Defects, Testergebnisse) auf welches Signal
abgebildet werden, ist Aufgabe der PC-Anwendung. Dafür gibt Abschnitt 8 nur eine Strukturempfehlung.

**Was der Implementierer wissen muss:**

- Programmiersprache und Serial-Bibliothek sind frei wählbar. Gebraucht wird nur ein serieller Port mit
  Baudrate, DTR/RTS-Kontrolle und Timeouts (Python: `pyserial`, Node: `serialport`, C#: `System.IO.Ports`,
  Java: `jSerialComm`).
- Die ESP32-Firmware ist fertig und baut fehlerfrei. Sie ist **nicht** am echten Cluster getestet. Die
  Protokollseite (dieses Dokument) ist stabil, nur Kalibrierwerte können sich ändern (Abschnitt 9).
- Ohne angeschlossene Hardware lässt sich die PC-Seite mit einer Fake-Firmware testen (Abschnitt 8 und 11).
- Das Repo ([codeingenieur/e46-cluster-control](https://github.com/codeingenieur/e46-cluster-control)) enthält
  eine lauffähige Python-Referenz (`host/e46cluster/`) samt Tests. Sie kann direkt genutzt oder als Vorlage
  portiert werden.

## 1. Das Wichtigste in fünf Punkten

1. Der ESP32 erscheint als **serieller Port** (Windows `COMx`, Linux `/dev/ttyUSB0`, macOS `/dev/cu.usbserial-*`).
2. **115200 Baud, 8N1, kein Flow-Control.** Reiner ASCII-Text, eine Zeile pro Kommando. **Senden: Zeilenende `\n`
   (LF, Byte `0x0A`).** `\r\n` ist ebenfalls erlaubt. **Empfangen: Die Firmware beendet jede Zeile mit `\r\n`
   (CR LF, Bytes `0x0D 0x0A`)**, beim Lesen also an `\n` trennen und `\r` entfernen. Details in Abschnitt 3.
3. **Der ESP32 hält den Zustand.** Er sendet die CAN-Frames selbst alle 10 ms. Die Anwendung sendet nur
   Änderungen, und ein einmal gesetzter Wert bleibt bestehen, bis er überschrieben wird.
4. **Jedes Kommando wird mit genau einer Zeile beantwortet** (`OK`, `ERR <grund>` oder eine Datenzeile).
   Dazwischen können unaufgefordert Zeilen kommen (`READY`, `EVT ...`, `RX ...`).
5. 10–50 Aktualisierungen pro Sekunde reichen völlig. Mehr bringt nichts, die Nadeln sind träge.

## 2. Verbindung aufbauen

```
open(port, 115200, 8N1, dtr=False, rts=False, timeout ~0.1 s)
repeat bis zu 6x, je 300 ms Pause:
    sende "PING\n"
    erwarte innerhalb 1 s eine Zeile "PONG e46-cluster <version>"
```

- **DTR/RTS vor dem Öffnen ausschalten.** Viele ESP32-Boards starten sonst bei jedem Öffnen des Ports neu
  (Auto-Reset-Schaltung). Bei Reset kommt ca. 1 s lang keine Antwort, deshalb die Wiederholung beim Handshake.
- Nach einem Reset schickt die Firmware `READY e46-cluster <version>`. Bei einem CAN-Initialisierungsfehler
  stattdessen `ERR can_init_failed e46-cluster <version>`.
- Port finden: USB-Vendor-IDs `10C4` (CP210x), `1A86` (CH340), `0403` (FTDI), `303A` (Espressif nativ).
  Wenn genau ein Port passt, nehmen. Sonst den Nutzer wählen lassen bzw. konfigurierbar machen.
- Baudrate muss auf beiden Seiten gleich sein. Bei falscher Rate kommt Zeichenmüll oder nichts.
  Die Firmware wird bei Bedarf mit `-DSERIAL_BAUD=921600` gebaut, dann auch am PC 921600 nutzen.

## 3. Wire-Format (byte-genau)

### 3.1 PC → ESP32 (Kommandos)

| Eigenschaft | Festlegung |
|---|---|
| Zeichensatz | ASCII (7 Bit). Kein UTF-8, keine Umlaute |
| Zeilenende | `\n` (LF, `0x0A`) **oder** `\r` (CR, `0x0D`). Die Firmware beendet eine Zeile bei **jedem** der beiden Zeichen. Es funktionieren also `\n`, `\r` und `\r\n` |
| Leerzeilen | Eine Zeile ohne Inhalt wird ignoriert, ohne Antwort. Bei `\r\n` entsteht so intern eine leere Zeile, das ist harmlos |
| Empfehlung | Immer genau **`\n`** senden, so macht es die Referenzimplementierung |
| Trennzeichen | Leerzeichen oder Tab, beliebig viele hintereinander. Führende und angehängte Leerzeichen sind erlaubt |
| Groß-/Kleinschreibung | Egal bei Kommandonamen und Schlüsseln (`set RPM 3000` = `SET rpm 3000`). Hex-Ziffern `a-f`/`A-F` egal |
| Zahlen | Dezimal, **Punkt** als Dezimaltrenner (nie Komma, unabhängig von der Systemsprache; in C#/Java `InvariantCulture` bzw. `Locale.ROOT` nutzen). Vorzeichen `-`/`+` erlaubt. Keine Tausendertrenner. Exponentschreibweise (`1e3`) wird akzeptiert, sollte aber vermieden werden |
| Wahrheitswerte | **Nur Zahlen**, `0` = aus, jeder andere Wert = ein (`1` verwenden). `true`/`false`/`on`/`off` sind **ungültig** (`ERR bad_value`) |
| Maximale Zeilenlänge | 127 Zeichen ohne Zeilenende. Längere Zeilen werden verworfen, am Zeilenende kommt `ERR line_too_long` |
| Maximale Wortzahl | 24 Wörter pro Zeile (Kommando mitgezählt) |
| Echo, Prompt | Es gibt **kein** Echo, keinen Prompt und keine Prüfsumme |
| Tempo | Nicht schneller senden, als die Antworten eintreffen: immer erst auf die Antwort warten. Der Empfangspuffer des ESP32 ist klein (256 Byte) |

Beispiel, Hexdump von `PING` mit empfohlenem Zeilenende:

```
50 49 4E 47 0A            P I N G LF
```

### 3.2 ESP32 → PC (Antworten und Meldungen)

| Eigenschaft | Festlegung |
|---|---|
| Zeichensatz | ASCII |
| Zeilenende | **`\r\n` (CR LF, `0x0D 0x0A`)** bei jeder Zeile. Beim Lesen an `\n` trennen und ein führendes bzw. angehängtes `\r` entfernen (`strip()`/`Trim()`). Nicht auf `\r\n` als Paar verlassen, so bleibt der Parser auch bei `\n` allein korrekt |
| Aufbau | `WORT` (immer GROSS), dann optional Leerzeichen und Inhalt. Eine Zeile, kein Mehrzeiler |
| Zahlen in Antworten | Dezimalpunkt, `STATE`-Felder haben feste Nachkommastellen (z. B. `rpm=3000`, `speed=80.0`) |

Beispiel, Hexdump der Antwort auf `PING`:

```
50 4F 4E 47 20 65 34 36 2D 63 6C 75 73 74 65 72 20 30 2E 31 2E 30 0D 0A
P  O  N  G     e  4  6  -  c  l  u  s  t  e  r     0  .  1  .  0  CR LF
```

### 3.3 Antworten von asynchronen Meldungen trennen

Entscheidend ist das **erste Wort** der Zeile:

| Erstes Wort | Art | Bedeutung |
|---|---|---|
| `OK` | Antwort | Kommando ausgeführt (die Zeile ist genau `OK`) |
| `ERR` | Antwort | `ERR <grund>`, Kommando nicht ausgeführt |
| `PONG` | Antwort | auf `PING`: `PONG e46-cluster <version>` |
| `STATE` | Antwort | auf `GET` |
| `CFG` | Antwort | auf `CFG` ohne Argumente |
| `HELP` | Antwort | auf `HELP` |
| `READY` | asynchron | nach dem Start der Firmware: `READY e46-cluster <version>` |
| `EVT` | asynchron | Ereignis, z. B. `EVT bus_off`, `EVT wdt` |
| `RX` | asynchron | empfangener CAN-Frame (nur nach `SNIFF 1`): `RX <id-hex> <daten-hex>` |

Jedes Kommando erzeugt **genau eine** Antwortzeile (Ausnahme: ein ungültiges oder leeres Kommando, siehe oben).
Asynchrone Zeilen können jederzeit **zwischen** Kommando und Antwort auftauchen und dürfen nicht als Antwort gewertet
werden. Alles, was mit keinem dieser Wörter beginnt, einfach ignorieren: Direkt nach einem Reset schreibt der
ESP32-Bootloader eigene Textzeilen (und gegebenenfalls Zeichenmüll) auf dieselbe Leitung.

### 3.4 Ablauf pro Kommando

1. Eingangspuffer leeren (alte `READY`/`EVT`/`RX`-Zeilen verwerfen).
2. Zeile mit `\n` senden.
3. Zeilen lesen, asynchrone und unbekannte Zeilen überspringen, bis ein Antwortwort aus 3.3 kommt (Timeout ca. 1 s).
4. Beginnt die Antwort mit `ERR`, als Fehler behandeln.

Kommandos nie parallel aus mehreren Threads senden, sondern mit einem Lock serialisieren.

## 4. Kommandos, die die Anwendung braucht

### Übersicht: alle Befehle

| Befehl | Zweck | Verwendung |
|---|---|---|
| `PING` | Lebenszeichen, Handshake | Normalbetrieb |
| `SET k v [k v ...]` | Anzeigen und Leuchten setzen | **Normalbetrieb** |
| `ZERO` | Drehzahl, Geschwindigkeit, Verbrauch auf 0 | Normalbetrieb |
| `GET` | Zustand und CAN-Status lesen | Normalbetrieb (Statusanzeige) |
| `CFG [k v ...]` | Konfiguration lesen/setzen (u. a. Watchdog) | Normalbetrieb und Kalibrierung |
| `TX 0\|1` | zyklische CAN-Frames an/aus | Kalibrierung |
| `RAW id hex` | einen beliebigen CAN-Frame einmal senden | Kalibrierung, Experimente |
| `CYC slot id ms hex` / `CYC slot OFF` | beliebigen CAN-Frame zyklisch senden | Kalibrierung, Experimente |
| `SNIFF 0\|1` | empfangene CAN-Frames als `RX ...` melden | Kalibrierung |
| `HELP` | Kurzübersicht der Befehle | Debugging |

### Übersicht: welches Instrument wird womit gesteuert

Alle Anzeigen werden mit `SET <schlüssel> <wert>` gesetzt. **Status:** Alles hier ist am echten Cluster **noch nicht
verifiziert** (Spalte "Belegung" sagt, wie gut die CAN-Definition in den Quellen belegt ist, Details in
[can-signals.md](can-signals.md)). Die Reihenfolge der Spalten bleibt gleich, der Befehl ist stabil.

**Zeigerinstrumente und Displays**

| Instrument am Cluster | Befehl | Wert | Belegung | Anmerkung |
|---|---|---|---|---|
| Drehzahlmesser | `SET rpm 3000` | U/min, 0–7000 | gut (Faktor ±) | Faktor per `CFG rpm_scale` kalibrierbar |
| Tacho | `SET speed 80` | km/h, 0–240 | widersprüchlich | Läuft über einen **PWM-Ausgang** des ESP32 (Hardware: Transistor am Tacho-Eingang). Optional zusätzlich über CAN: `CFG speed_can 1` |
| Kühlmitteltemperatur | `SET coolant 90` | °C, 40–130 | Byte gut, Offset ± | Offset per `CFG temp_offset` kalibrierbar |
| Öltemperatur | `SET oil 100` | °C, 40–150 | mittel | Nicht jedes Cluster zeigt sie an |
| Momentanverbrauch | `SET fco 50` | Zählerschritte/s | Skalierung unbekannt | Cluster zeigt erst ab ca. 5 km/h etwas an, also zusätzlich `speed` setzen |

**Warn- und Kontrollleuchten** (jeweils `1` = Leuchte angesteuert, `0` = aus; ob "angesteuert" die Lampe an- oder
ausschaltet, ist noch zu prüfen, deshalb Invertierung pro Signal konfigurierbar halten)

| Leuchte | Befehl | Belegung |
|---|---|---|
| Motorkontrollleuchte (Check Engine, MIL) | `SET mil 1` | gut |
| Tempomat-Leuchte | `SET cruise 1` | mittel |
| EML-Leuchte (Motorelektronik) | `SET eml 1` | mittel |
| Überhitzungswarnung | `SET overheat 1` | mittel |
| Ölstand-Warnung | `SET oilwarn 1` | mittel |
| Ladekontrolle (Batterie) | `SET battery 1` | geraten |
| Öldruck-Leuchte | `SET oilpress 1` | geraten |
| Zündung-ein-Bit im Motorsteuergerät-Frame | `SET ign 1` | mittel (Standard `1`; das Cluster selbst braucht trotzdem Klemme 15 per Draht) |

Mehrere Werte gehen in einer Zeile: `SET rpm 3000 speed 80 coolant 90 mil 0`.

**Nicht steuerbar (heute)**

| Anzeige | Grund |
|---|---|
| Tankanzeige, Außentemperatur | analoge Geber am Cluster, kein CAN. Bräuchte nachgebildete Widerstände (Backlog) |
| Blinker, Fernlicht, Handbremse, Gurtwarnung, Check-Control-Texte | laufen über K-Bus oder Einzelleitungen (Backlog) |
| ABS-, ASC/DSC-, Airbag-Leuchten, Ganganzeige, Kilometerstand | noch nicht untersucht (Backlog) |
| Display-Beleuchtung/Dimmung | nicht umgesetzt (Backlog) |

Wer eine hier nicht gelistete Anzeige ausprobieren will, kann mit `RAW`/`CYC` eigene CAN-Frames schicken. Das ist ein
Experimentierweg, kein stabiler Teil der Schnittstelle.

### Werte setzen: `SET`

```
SET rpm 3000 speed 80 coolant 90
OK
```

Mehrere `Schlüssel Wert`-Paare in einer Zeile (maximal 11). Die Zeile wirkt **ganz oder gar nicht**: Bei einem
Fehler (`ERR unknown_key` oder `ERR bad_value`) wird nichts übernommen.

| Schlüssel | Einheit | Sinnvoller Bereich | Hinweis |
|---|---|---|---|
| `rpm` | U/min | 0 – 7000 | Drehzahlmesser |
| `speed` | km/h | 0 – 240 | Tacho (über PWM-Ausgang) |
| `coolant` | °C | 40 – 130 | Kühlmitteltemperatur |
| `oil` | °C | 40 – 150 | Öltemperatur, nicht jedes Cluster zeigt sie an |
| `fco` | Schritte/s | 0 – ? | Verbrauchszähler, Skalierung noch unbekannt |
| `ign`, `mil`, `cruise`, `eml`, `overheat`, `oilwarn`, `battery`, `oilpress` | 0/1 | | Leuchten bzw. Zündung |

Bei CAN-Werten (`rpm`, `coolant`, `oil`) begrenzt die Firmware auf den darstellbaren Bereich, statt abzulehnen.
`speed` wird nicht begrenzt (Frequenz am PWM-Ausgang), die Anwendung sollte im Bereich bleiben. Die genauen Skalen stehen in
[can-signals.md](can-signals.md). **Offen:** Ob eine gesetzte Leuchte die Lampe ein- oder ausschaltet,
ist am echten Cluster noch nicht verifiziert (siehe Backlog). Die Anwendung sollte die Zuordnung
"Zustand → Leuchte" deshalb konfigurierbar halten (Invertierung pro Signal).

### Sicherheitsnetz: Watchdog und Nullen

```
CFG wdt 2000      → OK     (nach 2 s ohne irgendein Kommando: rpm, speed, fco auf 0, Meldung "EVT wdt")
ZERO              → OK     (rpm, speed, fco sofort auf 0)
```

- Mit gesetztem Watchdog regelmäßig etwas senden. Jedes gültige Kommando zählt, auch `PING`.
  Empfehlung: Watchdog 2000 ms, Heartbeat (`PING`) jede Sekunde, falls sich länger nichts ändert.
- Der Watchdog nullt **nur** `rpm`, `speed` und `fco`. Leuchten, Temperaturen bleiben stehen,
  die Anwendung muss sie beim Beenden selbst zurücksetzen (`SET mil 0 ...`).
- Die Konfiguration (`CFG`) liegt nur im RAM. Nach jedem Neustart des ESP32 (Strom weg, Reset) ist sie
  wieder auf Standard, die Anwendung sollte `CFG wdt ...` deshalb bei jedem Verbindungsaufbau setzen.

### Zustand und Diagnose: `GET`

```
GET
STATE rpm=3000 speed=80.0 coolant=90.0 oil=80.0 fco=0.0 ign=1 mil=0 cruise=0 eml=0 overheat=0 oilwarn=0 battery=0 oilpress=0 tx=1 tx_ok=1234 tx_fail=0 rx=56 can=running
```

`key=value`-Paare, durch Leerzeichen getrennt. Wichtig für eine Statusanzeige in der Anwendung:

| Feld | Bedeutung |
|---|---|
| `can` | `running` (ok), `bus_off`, `recovering`, `stopped` |
| `tx_ok` / `tx_fail` | gesendete Frames. Steigt `tx_fail` oder ist `can=bus_off`, ist die CAN-Seite gestört (Kabel, Spannung, Cluster aus) |
| `rx` | vom Cluster empfangene Frames |

### Weitere (für die Anwendung meist nicht nötig)

`CFG` (lesen), `CFG k v` (setzen: `rpm_scale`, `temp_offset`, `speed_hz`, `speed_can`, `wdt`), `TX 0|1`,
`RAW id hex`, `CYC slot id period_ms hex`, `SNIFF 0|1`. Siehe [protocol.md](protocol.md).
Diese braucht man zum Kalibrieren am Cluster, nicht für den Normalbetrieb.

## 5. Fehlerbehandlung

| Situation | Reaktion |
|---|---|
| Keine Antwort (Timeout) | Verbindung als gestört markieren, `PING`-Handshake wiederholen, ggf. Port neu öffnen |
| `ERR unknown_key`, `bad_value`, `usage` | Programmierfehler in der Anwendung, loggen, nicht wiederholen |
| `ERR unknown_cmd` | Falsche Firmware-Version oder Zeile zerstört, Handshake wiederholen |
| Port verschwindet (USB abgezogen) | Wiederverbinden mit Backoff (z. B. alle 2 s) |
| `EVT bus_off` | Nur loggen/anzeigen. Die Firmware erholt sich selbst, danach `GET` prüfen |
| `EVT wdt` | Watchdog hat ausgelöst: Anwendung hat zu lange nichts gesendet |

## 6. Beispielablauf

```
→ PING
← PONG e46-cluster 0.1.0
→ CFG wdt 2000
← OK
→ SET rpm 2500 speed 60 coolant 85
← OK
→ SET mil 1
← OK
→ GET
← STATE rpm=2500 speed=60.0 coolant=85.0 ... tx_ok=480 tx_fail=0 rx=12 can=running
→ ZERO
← OK
```

## 7. Minimales Beispiel (Python, pyserial)

```python
import time
import serial  # pip install pyserial

ser = serial.Serial()
ser.port, ser.baudrate, ser.timeout = "COM5", 115200, 0.1
ser.dtr = ser.rts = False          # vor open(), sonst Reset des ESP32
ser.open()

def send(line: str, timeout: float = 1.0) -> str:
    ser.reset_input_buffer()       # alte Zeilen (READY, EVT) verwerfen
    ser.write((line + "\n").encode("ascii"))
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        reply = ser.readline().decode("ascii", errors="replace").strip()
        if reply.startswith(("OK", "ERR", "PONG", "STATE", "CFG", "HELP")):
            if reply.startswith("ERR"):
                raise RuntimeError(f"{line!r} -> {reply}")
            return reply
    raise TimeoutError(line)

for _ in range(6):                 # Handshake
    try:
        send("PING"); break
    except TimeoutError:
        time.sleep(0.3)

send("CFG wdt 2000")
send("SET rpm 3000 speed 80")
time.sleep(5)
send("ZERO")
```

Eine fertige Variante mit Hintergrund-Leser, Events und Tests gibt es in `host/e46cluster/client.py`
(`pip install -e host`, dann `from e46cluster import Cluster`).

## 8. Empfohlene Struktur für die PC-Anwendung

- **Adapter-Schicht:** Eine kleine Klasse (`ClusterOutput` o. ä.) kapselt alles aus diesem Dokument
  (`connect`, `set(**signale)`, `zero`, `state`, Reconnect, Heartbeat). Die Jira-Logik kennt kein Serial.
- **Mapping-Schicht:** Wandelt Projektdaten in Signale um, z. B. Ziel-Fortschritt → `rpm`, offene Defects →
  `mil`, Testergebnisse → `overheat`/`coolant`. Die Zuordnung gehört in eine Konfigurationsdatei, nicht in den Code.
- **Aktualisierung:** Daten aus Jira ändern sich selten (Minuten). Die Anzeige darf trotzdem weich laufen:
  Zielwerte interpolieren und mit 10–20 Hz senden, statt Sprünge zu senden.
- **Ohne Hardware entwickeln:** Eine Fake-Firmware, die die Zeilen aus Abschnitt 4 beantwortet, reicht für Tests.
  Ein Beispiel steht in `host/tests/test_client.py` (`FakeFirmware`).
- **Beim Beenden:** `ZERO` senden und alle Leuchten auf 0 setzen.

## 9. Bekannte Einschränkungen

- Die Firmware ist am echten Cluster noch **nicht getestet**. Skalen und Leuchten-Bits stammen aus
  Community-Quellen ([can-signals.md](can-signals.md)). Die Schnittstelle (dieses Dokument) bleibt stabil,
  Kalibrierwerte können sich ändern. Deshalb Skalierung nicht in der Anwendung hartkodieren, sondern
  `rpm_scale` und `temp_offset` per `CFG` setzen lassen oder die Wertebereiche konfigurierbar halten.
- Tankanzeige, Außentemperatur, Blinker und Ähnliches sind (noch) nicht steuerbar, siehe [backlog.md](backlog.md).
- Pro ESP32 gibt es genau eine Verbindung. Ein zweites Programm kann den Port nicht gleichzeitig öffnen.

## 10. Treiber, Port und Kabel (USB-Fehlersuche)

Ob etwas installiert werden muss, hängt vom USB-Chip auf dem ESP32-Board ab. Die Firmware selbst braucht nichts
Besonderes, sie spricht ganz normal über die serielle Schnittstelle des Boards.

| USB-Chip auf dem Board | Treiber | Port-Name |
|---|---|---|
| **CP2102 / CP210x** (Silicon Labs, VID `10C4`) | Windows 10/11 lädt ihn meist selbst über Windows Update. Sonst "CP210x Universal Windows Driver" von Silicon Labs | Windows `COMx`, Linux `/dev/ttyUSB0`, macOS `/dev/cu.usbserial-*` |
| **CH340 / CH9102** (WCH, VID `1A86`) | Windows meist automatisch, sonst WCH-Treiber (CH341SER). Auf älteren macOS-Versionen oft manuell nötig | wie oben |
| **FTDI** (VID `0403`) | Windows lädt ihn meist selbst | wie oben |
| **Nativer USB-Port des Chips** (ESP32-S2/S3/C3, VID `303A`) | Kein Treiber ab Windows 10 (CDC-ACM) | Windows `COMx`, Linux `/dev/ttyACM0`, macOS `/dev/cu.usbmodem*` |

Welcher Chip verbaut ist, steht meist auf dem Board (kleiner Chip neben der USB-Buchse), sonst zeigt es der
Gerätemanager. Treiberversionen und Verhalten der Betriebssysteme ändern sich, im Zweifel beim Hersteller nachsehen.

Hinweis zur Firmware: Sie ist für ein **klassisches ESP32-DevKit mit UART-Brücke** (CP210x/CH340) gebaut. Ein
Board, das nur den nativen USB-Port nutzt (S2/S3/C3), wird bisher nicht unterstützt und bräuchte eine kleine
Firmware-Anpassung.

### Prüfen, ob das Board erkannt wird

- **Windows:** Gerätemanager → "Anschlüsse (COM & LPT)". Dort sollte z. B. "Silicon Labs CP210x USB to UART Bridge (COM5)"
  stehen. Alternativ in Python: `python -m serial.tools.list_ports -v` (mit `pyserial`).
- **Linux:** `ls /dev/ttyUSB* /dev/ttyACM*`, dazu `dmesg | tail` direkt nach dem Einstecken.
- **macOS:** `ls /dev/cu.*`.

### Typische Probleme

| Symptom | Ursache und Lösung |
|---|---|
| Es erscheint **kein** neuer Port | Das Kabel ist oft ein reines **Ladekabel ohne Datenleitungen**. Anderes Kabel probieren, direkt am PC statt am Hub |
| Gerät erscheint als "Unbekanntes Gerät" oder mit gelbem Warnzeichen | Treiber fehlt, passenden Treiber laut Tabelle installieren |
| `Zugriff verweigert` (Windows) oder `Device or resource busy` (Linux/macOS) | Ein anderes Programm hat den Port offen (PlatformIO-Monitor, Arduino-IDE, Terminalprogramm). Schließen, es kann nur eine Anwendung gleichzeitig zugreifen |
| `Permission denied` unter Linux | Benutzer in die Gruppe `dialout` (Debian/Ubuntu) bzw. `uucp` (Arch): `sudo usermod -aG dialout $USER`, danach neu anmelden |
| CH340 verschwindet unter Ubuntu sofort wieder | Der Dienst `brltty` greift den Port ab. `sudo apt remove brltty` |
| Die COM-Nummer ändert sich | Windows vergibt sie pro USB-Buchse und Gerät. Anwendung soll den Port konfigurierbar machen oder per VID suchen (Abschnitt 2), nicht fest `COM5` einprogrammieren |
| Beim Öffnen des Ports startet der ESP32 neu (kurze Boot-Meldung) | Auto-Reset über DTR/RTS. Vor dem Öffnen `dtr=False`, `rts=False` setzen und den Handshake mit `PING` wiederholen (Abschnitt 2) |
| `PING` bleibt ohne Antwort, Port ist offen | Falsche Baudrate (Firmware und PC müssen beide 115200 nutzen) oder Firmware nicht geflasht |
| Zeichenmüll statt Text | Baudrate stimmt nicht |
| Flashen schlägt fehl ("Failed to connect") | Bei manchen Boards beim Start des Flashens die **BOOT**-Taste gedrückt halten. Betrifft nur das Flashen, nicht den Betrieb |

Der ESP32 wird über USB mit Strom versorgt. Das Kombiinstrument hat eine **eigene** 12-V-Versorgung und hängt
nicht am USB-Port.

## 11. Abnahmetests für die PC-Seite

Eine PC-Implementierung ist fertig, wenn diese Fälle gegen die Hardware **oder** eine Fake-Firmware funktionieren:

| # | Test | Erwartung |
|---|---|---|
| 1 | Port öffnen (DTR/RTS aus), `PING` senden | `PONG e46-cluster <version>` innerhalb 1 s, nach einem Reset innerhalb weniger Wiederholungen |
| 2 | `SET rpm 3000`, danach `GET` | `OK`, dann `STATE` mit `rpm=3000` |
| 3 | `SET rpm 2000 bogus 1` | `ERR unknown_key`, `GET` zeigt weiter den alten `rpm`-Wert (Zeile wirkt ganz oder gar nicht) |
| 4 | `SET mil true` | `ERR bad_value` (nur `0`/`1` erlaubt) |
| 5 | Antwortzeilen einmal mit `\r\n` (so sendet die Firmware) und einmal mit `\n` allein in den Parser geben | Parser liefert in beiden Fällen dieselben Zeilen ohne `\r` |
| 6 | Unaufgeforderte Zeilen (`READY ...`, `EVT bus_off`) zwischen Kommando und Antwort | Werden nicht als Antwort gewertet, das Kommando bekommt trotzdem seine richtige Antwort |
| 7 | Antwort bleibt aus (Timeout) | Fehler wird gemeldet, Anwendung stürzt nicht ab und verbindet neu |
| 8 | USB-Kabel abziehen und wieder einstecken | Anwendung erkennt den Verlust und verbindet nach dem Einstecken selbstständig wieder |
| 9 | `CFG wdt 2000`, dann 3 s nichts senden | `EVT wdt` kommt, `rpm`, `speed`, `fco` stehen danach auf `0` |
| 10 | Anwendung beenden | `ZERO` und Leuchten auf `0` wurden vorher gesendet |
| 11 | Dezimalzahlen mit deutscher Systemsprache | Es wird `80.5` gesendet, nie `80,5` |
