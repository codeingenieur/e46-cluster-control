# `<e46-cluster>`: das Kombi als Widget

Ein Web Component ohne Abhängigkeiten. Es funktioniert in reinem HTML, in Angular, React, Vue usw. Die Darstellung ist dieselbe wie
auf `../index.html`. Gesteuert wird es per Attribut, Property, Methode oder per **Befehl im Format des ESP32-Protokolls**.

| Datei | Zweck |
|---|---|
| `e46-cluster.js` | das fertige Skript (88 KB, Schriften und Körnung eingebettet). **Nur diese Datei wird gebraucht** |
| `e46-cluster.d.ts` | TypeScript-Typen (optional) |
| `demo.html` | Beispielseite mit Befehlskonsole, öffnen per Doppelklick |
| `element.src.js`, `build.py` | Quelle des Elements und Build-Skript (`python3 build.py` setzt `e46-cluster.js` neu zusammen) |

## HTML

```html
<script src="e46-cluster.js"></script>

<e46-cluster id="kombi" rpm="3000" speed="80" coolant="90" mil></e46-cluster>

<script>
  const kombi = document.getElementById('kombi');
  kombi.rpm = 4500;                                  // Property
  kombi.set({ speed: 120, coolant: 95, left: true });// mehrere Werte
  kombi.command('SET rpm 6000 speed 200 mil 1');     // Befehl, Antwort: "OK"
  kombi.addEventListener('clusterchange', (e) => console.log(e.detail));
</script>
```

Die Breite bestimmt der Container (`width: 100%`), die Höhe folgt dem Seitenverhältnis. Setze eine Breite, z. B.
`e46-cluster { width: 900px; }`.

## Angular

1. `e46-cluster.js` nach `src/assets/` kopieren und in `angular.json` unter `projects.<name>.architect.build.options.scripts`
   eintragen: `"scripts": ["src/assets/e46-cluster.js"]`. (Alternativ in `main.ts`: `import './assets/e46-cluster.js';`)
2. In der Komponente `CUSTOM_ELEMENTS_SCHEMA` erlauben (Angular kennt das Tag sonst nicht):

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-kombi',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <e46-cluster #kombi
      [rpm]="drehzahl" [speed]="tempo" [coolant]="temp"
      [mil]="motorlampe" [night]="nacht"
      (clusterready)="bereit()" (clusterchange)="geaendert($event)">
    </e46-cluster>
    <button (click)="vollgas()">Vollgas</button>`,
})
export class KombiComponent {
  @ViewChild('kombi', { static: true }) kombi!: ElementRef<HTMLElement & { command(l: string): string }>;
  drehzahl = 800; tempo = 0; temp = 90; motorlampe = false; nacht = false;
  bereit() { this.kombi.nativeElement.command('SET oil 100'); }
  geaendert(e: Event) { /* (e as CustomEvent).detail enthält den ganzen Zustand */ }
  vollgas() { this.kombi.nativeElement.command('SET rpm 6500 speed 200'); }
}
```

`[rpm]="…"` setzt die Property des Elements, also ist Datenbindung dynamisch. Für Typen in TypeScript `e46-cluster.d.ts` ins Projekt
legen und `import type { E46ClusterElement } from './e46-cluster';` verwenden. *Nicht in einem Angular-Projekt getestet, nur im
Browser mit reinem HTML. Die Schnittstelle ist Standard-DOM, deshalb sollte es gehen.*

## Properties und Attribute

Jedes Attribut hat eine gleichnamige Property. Zahlen werden auf den Skalenbereich begrenzt. Wahrheitswerte: Property `true`/`false`,
Attribut leer, `true`, `1` = an, `false`, `0` = aus.

| Name | Bereich | Bedeutung |
|---|---|---|
| `rpm` | 0 bis 7000 | Drehzahlmesser |
| `speed` | 0 bis 260 | Tacho (km/h) |
| `coolant` | 40 bis 130 | Kühlmitteltemperatur (°C) |
| `oil` | 40 bis 150 | Öltemperatur (nur Wert, das Original zeigt sie nicht) |
| `fuel` | 0 bis 1 | Tankinhalt. Bei leerem Tank (0) leuchtet die Reserveleuchte, aber erst, wenn die Nadel wirklich bei 0 angekommen ist |
| `fco` | 0 bis 20 | Momentanverbrauch (L/100 km) |
| `mil`, `cruise`, `overheat`, `oilwarn`, `battery`, `oilpress` | bool | Warnleuchten |
| `lab` | bool | Labor-Leuchte (roter Erlenmeyerkolben, nur Kontur). Sitzt an der Stelle der früheren EML-Leuchte. Der Schlüssel `eml` gilt im Widget als Alias dafür |
| `arrk`, `tt`, `defect` | bool | eigene Leuchten: arrk-Logo (blau), TT-Logo (orange), Jira-Defect-Symbol (rotes Quadrat mit ausgestanztem Kreis). Nur Anzeige |
| `turnLeft`, `turnRight`, `hazard` | bool | Blinker, Warnblinker |
| `ignition` | bool | aus: Nadeln auf 0, Lampen aus. an: Selbsttest (Nadelsweep, Lampentest) |
| `night` | bool | Nachtmodus: Platte dunkel, Beleuchtetes leuchtet |
| `dim` | 0 bis 1 | Helligkeit der Beleuchtung (Standard 0,85) |
| `demo` | bool | Demo-Fahrt, überschreibt rpm, speed, coolant, oil, fuel, fco |
| `odometer`, `trip` | Zahl | Kilometerstand und Tageskilometer, laufen mit der Geschwindigkeit weiter |
| `clock` | `HH:MM` oder `auto` | Uhrzeit im Display |
| `selftest="false"` | | kein Selbsttest beim Start |

Methoden: `set({...})`, `command(zeile)`, `commands(text)`, `selftest()`; Property `state` liefert alle Werte als Objekt.

## Befehle

Gleiche Syntax wie am ESP32 (`docs/protocol.md`): Schlüssel und Wert in Paaren, Zahlen mit Punkt, Wahrheitswerte nur `0`/`1`.
Eine Zeile wirkt ganz oder gar nicht. Antworten wie beim ESP32.

| Befehl | Wirkung | Antwort |
|---|---|---|
| `SET k v [k v …]` | Werte setzen | `OK`, `ERR usage`, `ERR unknown_key`, `ERR bad_value` |
| `GET` | Zustand lesen | `STATE rpm=… speed=… …` |
| `ZERO` | rpm, speed, fco auf 0 | `OK` |
| `SELFTEST` | Nadelsweep und Lampentest | `OK` |
| `RESET` | alles auf Standard | `OK` |
| `PING` / `HELP` | Lebenszeichen / Schlüsselliste | `PONG …` / `HELP …` |

Schlüssel (wie am ESP32): `rpm speed coolant oil fco ign mil cruise eml overheat oilwarn battery oilpress` (`eml` schaltet hier die Labor-Leuchte). Nur im Widget:
`lab arrk tt defect fuel left right hazard night dim demo odo trip clock`. Beispiel für eine Jira-Anzeige: `SET defect 1`. Beispiel: `SET rpm 3000 speed 80 coolant 90 mil 1 left 1 night 1`.

Dadurch kann **derselbe Befehlsstrom** das Widget und das echte Cluster steuern: Befehle erst an den ESP32 schicken, dieselbe Zeile
an `kombi.command(...)`. (Eine Brücke dafür ist `../serial.js`, `Esp32Link`.)

## Events

| Event | `detail` | Wann |
|---|---|---|
| `clusterready` | Zustand | Element ist aufgebaut |
| `clusterchange` | Zustand | nach einer Änderung von Werten (mehrere Änderungen im selben Moment ergeben ein Event) |

## Hinweise

- Das Element nutzt Shadow DOM: das Aussehen wird nicht von deinem CSS verändert, und mehrere Instanzen stören sich nicht.
- Die Schriften (Oswald, Barlow, SIL OFL 1.1) werden beim ersten Element als `<style data-e46-cluster-fonts>` in den `<head>` gesetzt.
- Hinter dem Kombi ist es transparent. Der schwarze Linsenrand gehört zum Kombi, der Rest ist deine Seite.
- Web Components brauchen einen aktuellen Browser (Chrome, Edge, Firefox, Safari). In Firefox nicht getestet.
