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

## P2: Nicht per CAN steuerbar (später)

- [ ] Tankanzeige: Geber-Widerstand nachbilden (digitales Poti oder Widerstandskette)
- [ ] Außentemperatur: Sensor-Widerstand nachbilden
- [ ] K-Bus/I-Bus: Blinker, Fernlicht, Standlicht, Handbremse, Gurtwarnung u. a. prüfen, welche Funktionen darüber laufen
- [ ] Check-Control-Meldungen und Textanzeige (Piktogramm-Display) über K-Bus
- [ ] Einzelleitungs-Leuchten per Transistor/Low-Side-Treiber (je nach Pinbelegung)
- [ ] Beleuchtungs-Dimmung
- [ ] Ölstands-Eingang (PWM vom Ölstandssensor) und Dimmer-Eingang (PWM vom Lichtschaltzentrum) ansteuern
- [ ] Klemmen R, 15 und 50 schalten (Zündungsstellungen)
- [ ] Kilometerstand, Service-Anzeige, Bordcomputer-Funktionen
- [ ] Verifizierte Pinbelegung der Stecker dokumentieren (Teilenummer, Variante)

## P3: Anwendung

- [ ] Projektdaten aus Jira (Ziele, Defects) und Testergebnisse einlesen
- [ ] Abbildung auf Cluster: z. B. Ziel-Fortschritt → Drehzahl, offene Defects → Warnleuchten, Testergebnisse → Leuchten/Temperatur
- [ ] PC-Dashboard bzw. Dienst, der die Werte zyklisch an `e46cluster` schickt
- [ ] Watchdog nutzen, damit die Anzeige bei Verbindungsverlust auf 0 geht
