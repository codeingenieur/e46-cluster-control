# USB-Schnittstelle PC ↔ ESP32 (für die PC-Anwendung)

Dieses Dokument ist **eigenständig** geschrieben: Wer die PC-Seite (z. B. Jira-Anbindung und Aufbereitung der
Projektdaten) auf einem anderen System entwickelt, braucht nur diese Datei, nicht den Rest des Repos.
Die PC-Anwendung schickt Werte über USB an einen ESP32, der daraus CAN-Frames für ein BMW-E46-Kombiinstrument macht.

Referenzimplementierung in Python: `host/e46cluster/client.py` im Repo
([codeingenieur/e46-cluster-control](https://github.com/codeingenieur/e46-cluster-control)).
Vollständige Befehlstabelle: [protocol.md](protocol.md). Hier steht, was man für die Integration wissen muss.

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
