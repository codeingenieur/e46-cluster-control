# E46-Kombiinstrument per PC steuern

```
PC (Python)  --USB/Serial-->  ESP32  --CAN 500 kbit/s-->  Transceiver  -->  E46-Kombi
                                 \--PWM (Tacho-Signal)--> Transistor ----->  Kombi Geschwindigkeitseingang
```

Der ESP32 hält den aktuellen Zustand (Drehzahl, Geschwindigkeit, Temperaturen, Warnleuchten)
und sendet die zyklischen Motorsteuergeräte-Frames selbst alle 10 ms. Der PC ändert nur Werte
(`SET rpm 3000 speed 80`), Jitter und USB-Latenz spielen für das Cluster keine Rolle.

**Status:** Firmware und Host-Bibliothek sind geschrieben, die Host-Tests laufen (8/8).
Die Firmware ist **noch nicht kompiliert und nicht am echten Cluster getestet**.
Die CAN-Signaldefinitionen stammen aus Community-Quellen und sind teils widersprüchlich,
siehe [docs/can-signals.md](docs/can-signals.md). Dafür gibt es Kalibrier-Kommandos (`cfg`, `raw`, `sniff`).

## Inhalt

| Pfad | Zweck |
|---|---|
| [firmware/](firmware) | PlatformIO-Projekt für den ESP32 (Arduino-Framework, TWAI-Treiber) |
| [host/](host) | Python-Paket `e46cluster` (Bibliothek + CLI) |
| [docs/hardware.md](docs/hardware.md) | Teileliste, Verdrahtung, Stromversorgung |
| [docs/can-signals.md](docs/can-signals.md) | Welche Frames das Cluster erwartet, mit Quellen und Zuverlässigkeit |
| [docs/protocol.md](docs/protocol.md) | USB-Zeilenprotokoll PC ↔ ESP32 |

## Inbetriebnahme

1. Hardware nach [docs/hardware.md](docs/hardware.md) aufbauen. Erst am Tisch mit Netzteil, nicht im Auto.
2. Firmware flashen (PlatformIO):
   ```bash
   cd firmware
   pio run -t upload
   ```
3. Host installieren und testen:
   ```bash
   cd host
   pip install -e .
   python -m e46cluster ports
   python -m e46cluster ping
   python -m e46cluster set rpm=3000
   python -m e46cluster sweep
   ```
4. Aus Python:
   ```python
   from e46cluster import Cluster

   with Cluster() as cl:          # oder Cluster("COM5")
       cl.set(rpm=2500, speed=60, coolant=90)
       cl.set(mil=True)           # Motorkontrollleuchte
       cl.watchdog(2000)          # Nadeln auf 0, wenn der PC 2 s nichts sendet
   ```

## Typischer Bring-up-Ablauf

1. **Ohne Cluster:** Build-Flag `-DE46_TWAI_NO_ACK` in `platformio.ini` aktivieren und mit dem
   Logikanalysator/Oszi prüfen, dass Frames auf CAN-H/L erscheinen. Ohne ACK eines zweiten Teilnehmers
   geht der Controller sonst in Bus-Off (`python -m e46cluster get` zeigt `can=bus_off`, `tx_fail` steigt).
2. **Cluster anschließen** (KL30, KL15, Masse, CAN-H/L), Flag wieder entfernen. `get` sollte `can=running`
   und steigendes `tx_ok` zeigen.
3. **Drehzahl** zuerst: `set rpm=3000`. Stimmt die Nadel nicht, `cfg rpm_scale=6.42` probieren.
4. **Geschwindigkeit:** Über den PWM-Pin (siehe Hardware). Falls dein Cluster sie per CAN will:
   `cfg speed_can=1`. Mit `cfg speed_hz=...` kalibrieren.
5. Rest (Temperatur, Leuchten, Verbrauch) per `set` und `raw`/`cyclic` ausprobieren und die Ergebnisse
   in `docs/can-signals.md` nachtragen.

## Nicht abgedeckt (Cluster-seitig, kein CAN)

- **Tankanzeige** kommt vom analogen Geber-Widerstand direkt am Kombi. Dafür bräuchte es ein
  digitales Potentiometer oder eine schaltbare Widerstandskette.
- **Außentemperatur** ebenfalls analoger Sensor am Kombi.
- Blinker, Fernlicht, Handbremse usw. laufen über den K-Bus bzw. Einzelleitungen und sind eine eigene Aufgabe.
