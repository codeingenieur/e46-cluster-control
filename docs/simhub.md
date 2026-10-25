# SimHub als Datenquelle

[SimHub](https://www.simhubdash.com/) liefert Telemetrie aus Rennspielen und Simulatoren (Drehzahl, Geschwindigkeit,
Wassertemperatur, ...). Mit dem SimHub-Plugin **Custom Serial devices** lässt sich daraus direkt eine Textzeile an den
ESP32 schicken. Unser Protokoll ist zeilenbasiert, deshalb braucht es keinen eigenen PC-Dienst, nur ein kleines Skript.

**Status:** Das Skript ist **nicht getestet** (kein SimHub in dieser Umgebung, kein Kombi am ESP32). Die Menünamen in
SimHub können je nach Version abweichen. Die Syntax der Skriptsprache und die Eigenschaftsnamen `Rpms`, `SpeedKmh` und
`EngineIgnitionOn` stammen aus dem Skript eines laufenden Projekts
([TeksuSiK/e46-cluster-simhub](https://github.com/TeksuSiK/e46-cluster-simhub)). `WaterTemperature` und `OilTemperature`
sind aus der Erinnerung ergänzt und müssen in der Eigenschaftenliste von SimHub gegengeprüft werden.

## Einrichtung

1. Firmware auf dem ESP32 (115200 Baud), Kombi angeschlossen, siehe [README](../README.md).
2. SimHub: Plugin **Custom Serial devices** aktivieren (Settings → Plugins).
3. Neues Gerät anlegen: den COM-Port des ESP32 wählen, **Baudrate 115200**.
4. Bei den Update-Nachrichten die Skriptsprache **JavaScript** einschalten und das Skript unten einfügen.
5. **Python-Werkzeuge und SimHub nicht gleichzeitig:** Ein Port kann nur von einem Programm geöffnet werden
   (siehe [usb-interface.md](usb-interface.md), Abschnitt 10).

Falls der ESP32 beim Verbinden neu startet (Boot-Meldung, Nadeln zucken kurz): Das ist der Auto-Reset über DTR/RTS.
Nach wenigen Sekunden läuft er normal weiter. Ob das Plugin DTR/RTS abschalten kann, ist nicht geprüft.

## Skript (eine Zeile pro Update)

```js
// SimHub -> e46-cluster-Firmware. Protokoll: docs/usb-interface.md
function n(v) {
  v = Number(v);
  return isFinite(v) ? Math.round(v) : 0;
}

var rpm = n($prop('Rpms'));
var speed = n($prop('SpeedKmh'));
var coolant = n($prop('WaterTemperature'));
var oil = n($prop('OilTemperature'));
var ign = $prop('EngineIgnitionOn') ? 1 : 0;

return 'SET rpm ' + rpm + ' speed ' + speed + ' coolant ' + coolant + ' oil ' + oil + ' ign ' + ign + '\n';
```

Das Skript erzeugt zum Beispiel `SET rpm 3200 speed 87 coolant 90 oil 95 ign 1`. Die Firmware antwortet auf jede Zeile
mit `OK`. SimHub liest diese Antworten nicht aus, das stört nicht.

## Hinweise

- **Reihenfolge der Felder** ist egal, jedes `Schlüssel Wert`-Paar wird einzeln ausgewertet. Alle Schlüssel stehen in
  [usb-interface.md](usb-interface.md).
- **Watchdog:** Wenn SimHub nach dem Spielende nichts mehr sendet, bleiben die Nadeln stehen. Mit einer Zeile
  `CFG wdt 2000` als Start- bzw. Setup-Nachricht (falls das Plugin so etwas anbietet) fahren Drehzahl, Geschwindigkeit und
  Verbrauch nach 2 s auf 0.
- **Weitere Anzeigen** (Leuchten, Öl, Verbrauch) lassen sich mit weiteren Paaren ergänzen, z. B. `mil`, `overheat`,
  sobald die Zuordnung am Kombi geprüft ist ([can-signals.md](can-signals.md)).
- **Blinker, Licht und Check-Control** laufen über den K-Bus, den diese Firmware noch nicht bedient (siehe Backlog).
- **Aktualisierungsrate:** SimHub schickt standardmäßig recht häufig. Bei 115200 Baud sind das kein Problem
  (eine Zeile hat ca. 60 Byte).
