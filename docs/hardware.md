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

CAN-H und CAN-L des Transceivers gehen an die CAN-Pins des Kombis. Alle drei Massen (ESP, Transceiver, Kombi)
verbinden.

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
