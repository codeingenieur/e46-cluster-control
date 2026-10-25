# Backlog

Priorität: **P1** per CAN steuerbare Funktionen, **P2** alles andere am Cluster, **P3** Anwendung drumherum.
Langfristiges Ziel: das gesamte Cluster vom PC aus steuern können.

## P1: CAN-Funktionen

- [x] Firmware mit PlatformIO kompilieren
- [ ] Firmware auf ESP32 flashen
- [ ] Bring-up am Cluster: `tx_ok` steigt, `can=running`, Cluster reagiert (ggf. Codierung klären)
- [ ] Drehzahl kalibrieren (`rpm_scale` 6.4 vs. 6.42), Wert in `docs/can-signals.md` festhalten
- [ ] Kühlmitteltemperatur kalibrieren (`temp_offset`: −48 / −48.373 / −40)
- [ ] Geschwindigkeit klären: PWM-Draht (X11175 Pin 19) vs. CAN 0x153, Pegelwandler am echten Eingang prüfen
- [ ] Warnleuchten verifizieren (MIL, EML, Tempomat, Überhitzung, Öl, Batterie): Polarität und Bit-Lage
- [ ] Verbrauchsanzeige: Skalierung des Zählers in 0x545 Byte 1–2 bestimmen
- [ ] Öltemperatur (0x545 Byte 4) prüfen, falls das Cluster sie anzeigt
- [ ] ABS/ASC/DSC-Leuchten über 0x153 (z. B. Byte 0 Bit 7 `LV_ABS_LED`) ausprobieren
- [ ] Getriebe-/Ganganzeige (0x43F, EGS/SMG) untersuchen
- [ ] Cluster-Frames mitschneiden (`sniff`: 0x613, 0x615, 0x610-VIN) und dokumentieren
- [ ] Alive-Zähler/Checksummen bei den Frames prüfen, falls das Cluster Frames verwirft
- [ ] DBC-Datei aus den verifizierten Signalen erzeugen
- [ ] Konfiguration (`cfg`) im Flash speichern (NVS)
- [ ] Nativer Test für `frames.h` (Kodierung gegen Referenzwerte)
- [ ] CI: Firmware-Build und Python-Tests

- [ ] Lampen über 0x153 in der Firmware ergänzen: Bremsfehler (Byte 0 = `0xFF`), Traktionskontrolle (Byte 1 = `0xFF`), von einem Fremdprojekt bestätigt
- [ ] Tacho-Faktor kalibrieren: Fremdprojekt 6,72 Hz/(km/h), unser Standard 6,833
- [ ] Lampen-Ausgänge und Klemme-15-Relais aus `docs/pinout.md` in der Firmware umsetzen (GPIO-Vorschläge dort)

## P2: Nicht per CAN steuerbar (später)

- [ ] Lampen am Draht per Transistor: ABS/DSC (X11175-22), Öldruck (13), Ladekontrolle (2), Handbremse (23); Pegel/Polarität klären
- [ ] K-Bus: Blinker, Stand-/Abblend-/Fernlicht, Nebellicht, Check-Control (Bibliothek `IbusTrx` und wilhelm-docs; Lichtstatus-Bits siehe can-signals.md)
- [ ] Hintergrundbeleuchtung (PWM-Dimmer) und Klemme 15 vom ESP32 schalten

- [ ] Tankanzeige: Geber-Widerstand nachbilden (digitales Poti oder Widerstandskette)
- [ ] Außentemperatur: Sensor-Widerstand nachbilden
- [ ] K-Bus/I-Bus: Blinker, Fernlicht, Standlicht, Handbremse, Gurtwarnung u. a. prüfen, welche Funktionen darüber laufen
- [ ] Check-Control-Meldungen und Textanzeige (Piktogramm-Display) über K-Bus
- [ ] Einzelleitungs-Leuchten per Transistor/Low-Side-Treiber (je nach Pinbelegung)
- [ ] Beleuchtungs-Dimmung
- [ ] Ölstands-Eingang (PWM vom Ölstandssensor) und Dimmer-Eingang (PWM vom Lichtschaltzentrum) ansteuern
- [ ] Klemmen R, 15 und 50 schalten (Zündungsstellungen)
- [ ] Kilometerstand, Service-Anzeige, Bordcomputer-Funktionen
- [x] Pinbelegung von X11175/X11176 aus Community-Quelle dokumentiert (siehe hardware.md)
- [ ] Pinbelegung gegen BMW-Schaltplan bzw. per Multimeter am eigenen Kombi (62.11-6 906 888) bestätigen
- [ ] Gegenstecker (schwarz, 26-polig) beschaffen: Gehäuse- und Kontaktserie klären
- [ ] Tankgeber nachbilden: links ca. 70–310 Ω, rechts ca. 70–395 Ω (X11175 Pin 15/16 und 11/12)
- [ ] Außentemperatur nachbilden: NTC ca. 4,7 kΩ bei 25 °C (X11176 Pin 1/2)

## P3: Anwendung

- [ ] Projektdaten aus Jira (Ziele, Defects) und Testergebnisse einlesen
- [ ] Abbildung auf Cluster: z. B. Ziel-Fortschritt → Drehzahl, offene Defects → Warnleuchten, Testergebnisse → Leuchten/Temperatur
- [ ] PC-Dashboard bzw. Dienst, der die Werte zyklisch an `e46cluster` schickt
- [ ] Watchdog nutzen, damit die Anzeige bei Verbindungsverlust auf 0 geht
