# Backlog

Priorität: **P1** per CAN steuerbare Funktionen, **P2** alles andere am Cluster, **P3** Anwendung drumherum.
Langfristiges Ziel: das gesamte Cluster vom PC aus steuern können.

## P1: CAN-Funktionen

- [x] Firmware mit PlatformIO kompilieren
- [ ] Firmware auf ESP32 flashen
- [ ] Bring-up am Cluster: `tx_ok` steigt, `can=running`, Cluster reagiert (ggf. Codierung klären)
- [ ] Drehzahl kalibrieren (`rpm_scale` 6.4 vs. 6.42), Wert in `docs/can-signals.md` festhalten
- [ ] Kühlmitteltemperatur kalibrieren (Offset −48 von einem Fremdprojekt bestätigt, Gegenprobe am Cluster)
- [ ] Geschwindigkeit: PWM-Draht (X11175 Pin 19), Faktor kalibrieren (Quellen: 6,72 und 6,83 Hz je km/h), Pegelwandler am echten Eingang prüfen
- [ ] Warnleuchten verifizieren (MIL, EML, Tempomat, Überhitzung, Ölstand): Polarität und Bit-Lage
- [ ] Verbrauchsanzeige: Skalierung des Zählers in 0x545 Byte 1–2 bestimmen
- [ ] Öltemperatur (0x545 Byte 4) prüfen, falls das Cluster sie anzeigt
- [ ] Lampen über 0x153 in der Firmware ergänzen: Bremsfehler (Byte 0 = `0xFF`), Traktionskontrolle (Byte 1 = `0xFF`), von einem Fremdprojekt bestätigt
- [ ] `battery`/`oilpress` (0x545 Byte 5) prüfen oder entfernen: vermutlich wirkungslos, die Lampen hängen am Draht
- [ ] Getriebe-/Ganganzeige (0x43F, EGS/SMG) untersuchen
- [ ] Cluster-Frames mitschneiden (`sniff`: 0x613, 0x615, 0x610-VIN) und dokumentieren
- [ ] Alive-Zähler/Checksummen bei den Frames prüfen, falls das Cluster Frames verwirft
- [ ] DBC-Datei aus den verifizierten Signalen erzeugen
- [ ] Konfiguration (`cfg`) im Flash speichern (NVS)
- [ ] Nativer Test für `frames.h` (Kodierung gegen Referenzwerte)
- [ ] CI: Firmware-Build und Python-Tests

## P2: Nicht per CAN steuerbar (später)

Pinplan und Ansteuerarten: [pinout.md](pinout.md).

- [x] Pinbelegung von X11175/X11176 aus Community-Quelle dokumentiert (siehe hardware.md und pinout.md)
- [ ] Pinbelegung gegen BMW-Schaltplan bzw. per Multimeter am eigenen Kombi (62.11-6 906 888) bestätigen
- [ ] Gegenstecker (schwarz, 26-polig) beschaffen: Gehäuse- und Kontaktserie klären
- [ ] Lampen am Draht per Transistor: ABS/DSC (X11175-22), Öldruck (13), Ladekontrolle (2), Handbremse (23); Pegel/Polarität messen, dann Ausgänge in der Firmware umsetzen (GPIO-Vorschläge in pinout.md)
- [ ] Klemme 15 vom ESP32 per Relais schalten, Beleuchtung (X11175-7, nur bis Modelljahr 2002) ansteuern
- [ ] Tankgeber nachbilden: links ca. 70–310 Ω, rechts ca. 70–395 Ω (X11175 Pin 15/16 und 11/12)
- [ ] Außentemperatur nachbilden: NTC ca. 4,7 kΩ bei 25 °C (X11176 Pin 1/2)
- [ ] K-Bus (X11175-14): Blinker, Stand-/Abblend-/Fernlicht, Nebellicht, Handbremse, Gurtwarnung, Check-Control-Meldungen und Textanzeige. 9600 Baud 8E1 mit Transceiver; Quellen: Bibliothek `IbusTrx`, wilhelm-docs, Lichtstatus-Bits in can-signals.md
- [ ] Ölstands-Eingang (PWM vom Ölstandssensor) und Dimmer-Eingang (PWM vom Lichtschaltzentrum) ansteuern
- [ ] Klemmen R, 15 und 50 schalten (Zündungsstellungen)
- [ ] Kilometerstand, Service-Anzeige, Bordcomputer-Funktionen

## P3: Anwendung

- [ ] Projektdaten aus Jira (Ziele, Defects) und Testergebnisse einlesen
- [ ] Abbildung auf Cluster: z. B. Ziel-Fortschritt → Drehzahl, offene Defects → Warnleuchten, Testergebnisse → Leuchten/Temperatur
- [ ] PC-Dashboard bzw. Dienst, der die Werte zyklisch an `e46cluster` schickt
- [ ] Watchdog nutzen, damit die Anzeige bei Verbindungsverlust auf 0 geht
