# `<e46-jira-cluster>`: das Kombi als Widget (Jira-Variante)

Gleiche Technik wie das Widget der Original-Version (`../../web/widget/`): ein Web Component ohne Abhängigkeiten für HTML, Angular,
React, Vue. Der Unterschied sind die Anzeigen: **Drehzahlmesser = aktive Defects, Kühlmittel = offene Nightrun-Tickets, Tank =
Sprint-Restzeit.** Das Element hat einen eigenen Namen, beide Versionen laufen auf derselben Seite nebeneinander.

| Datei | Zweck |
|---|---|
| `e46-jira-cluster.js` | das fertige Skript (92 KB, Schriften und Körnung eingebettet). **Nur diese Datei wird gebraucht** |
| `e46-jira-cluster.d.ts` | TypeScript-Typen (optional) |
| `demo.html` | Beispielseite mit Befehlskonsole, öffnen per Doppelklick |
| `element.src.js`, `build.py` | Quelle des Elements und Build-Skript (`py build.py` setzt `e46-jira-cluster.js` neu zusammen) |

## Was die Anzeigen bedeuten

| Instrument | Wert | Bereich | Leuchte |
|---|---|---|---|
| Drehzahlmesser | `defects`, aktive Defects | Nadel 0 bis 50, rote Zone ab 45 | bei 50 leuchtet das Jira-Defect-Symbol (rotes Quadrat mit Kreis) |
| Kühlmittel | `nightrun`, offene Nightrun-Tickets | intern 0 bis 20, Teilstriche ohne Zahlen, Beschriftung „NR Defects", die zwei Farbfelder blau = wenig, rot = viel | bei mehr als 20 leuchtet **NR** (roter Schriftzug), die Nadel bleibt am Anschlag |
| Tank | `sprint`, Sprint-Restzeit | 0 bis 1 (1/1 = Sprintstart, 0 = Sprintende) | bei leer leuchtet die Reserveleuchte |
| Tacho | `success`, Testresults: BAC30 Success in % | 0 bis 100, Zahlen alle 10 | keine |

Die beiden Leuchten schalten sich erst, wenn die Nadel am Anschlag angekommen ist. Mittendisplay und die übrigen Leuchten sind
unverändert vom Original (die Wegstrecke läuft nur in der Demo). Mit `defect` und `nr` lassen sich die beiden Leuchten zusätzlich von Hand erzwingen.

## HTML

```html
<script src="e46-jira-cluster.js"></script>

<e46-jira-cluster id="kombi" defects="12" nightrun="6" sprint="0.8"></e46-jira-cluster>

<script>
  const kombi = document.getElementById('kombi');
  kombi.defects = 31;                                       // Property
  kombi.set({ nightrun: 9, sprint: 0.5 });                  // mehrere Werte
  kombi.command('SET defects 50');                          // Befehl, Antwort: "OK" (Leuchte geht an, sobald die Nadel dort ist)
  kombi.addEventListener('clusterchange', (e) => console.log(e.detail));
</script>
```

Die Breite bestimmt der Container (`width: 100%`), die Höhe folgt dem Seitenverhältnis, z. B. `e46-jira-cluster { width: 900px; }`.

## Angular

1. `e46-jira-cluster.js` nach `src/assets/` kopieren und in `angular.json` unter `projects.<name>.architect.build.options.scripts`
   eintragen: `"scripts": ["src/assets/e46-jira-cluster.js"]`. (Alternativ in `main.ts`: `import './assets/e46-jira-cluster.js';`)
2. In der Komponente `CUSTOM_ELEMENTS_SCHEMA` erlauben:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-kombi',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <e46-jira-cluster #kombi
      [defects]="aktiveDefects" [nightrun]="nightrunOffen" [sprint]="sprintRest"
      (clusterready)="bereit()">
    </e46-jira-cluster>`,
})
export class KombiComponent {
  @ViewChild('kombi', { static: true }) kombi!: ElementRef<HTMLElement & { command(l: string): string }>;
  aktiveDefects = 0; nightrunOffen = 0; sprintRest = 1;
  bereit() { this.kombi.nativeElement.command('SET night 1'); }
}
```

`[defects]="…"` setzt die Property des Elements, die Bindung ist also dynamisch. Typen: `e46-jira-cluster.d.ts` ins Projekt legen.
*Nicht in einem Angular-Projekt getestet, nur im Browser mit reinem HTML.*

## Properties und Attribute

Jedes Attribut hat eine gleichnamige Property. Zahlen werden auf den Bereich begrenzt. Wahrheitswerte: Property `true`/`false`,
Attribut leer, `true`, `1` = an, `false`, `0` = aus.

| Name | Bereich | Bedeutung |
|---|---|---|
| `defects` | 0 bis 100 | aktive Defects (Nadel stoppt bei 50) |
| `nightrun` | 0 bis 40 | offene Nightrun-Tickets (Nadel stoppt bei 20, darüber NR) |
| `sprint` | 0 bis 1 | Sprint-Restzeit |
| `success` | 0 bis 100 | Tacho: Testresults, BAC30 Success in % |
| `closed` | 0 bis 20 | kleine Anzeige im Drehzahlmesser: Defects closed/Day, also pro Tag abgearbeitete Defects |
| `mil`, `lab`, `cruise`, `oilwarn`, `battery`, `oilpress` | bool | Leuchten wie im Original (`lab` = Labor-Kolben) |
| `arrk`, `tt` | bool | Logo-Leuchten (blau, orange) |
| `door_dev`, `door_test`, `door_stage`, `door_prod` | bool | Auto links vom Display: Tür offen für Dev, Test, Staging, Prod (rot) |
| `defect`, `nr` | bool | erzwingen die Leuchten, sonst schalten sie sich über die Werte |
| `turnLeft`, `turnRight`, `hazard` | bool | Blinker, Warnblinker |
| `ignition` | bool | aus: Nadeln auf 0, Lampen aus. an: Selbsttest |
| `night`, `dim` | bool, 0 bis 1 | Nachtmodus, Helligkeit |
| `chaos` | bool | Chaosmodus: Zeiger fahren wild umher, alle Leuchten und Blinker flackern zufällig (nur bei Zündung an) |
| `demo` | bool | Demo: überschreibt defects, nightrun, sprint, success, closed |
| `odometer`, `trip`, `clock` | Zahl, Zahl, `HH:MM` oder `auto` | Mittendisplay |
| `selftest="false"` | | kein Selbsttest beim Start |

Methoden: `set({...})`, `command(zeile)`, `commands(text)`, `selftest()`; `state` liefert alle Werte als Objekt.

## Befehle

Gleiche Syntax wie am ESP32 (`docs/protocol.md`): Schlüssel und Wert in Paaren, Zahlen mit Punkt, Wahrheitswerte nur `0`/`1`. Eine
Zeile wirkt ganz oder gar nicht, die Antworten sind wie beim ESP32.

| Befehl | Wirkung | Antwort |
|---|---|---|
| `SET k v [k v …]` | Werte setzen | `OK`, `ERR usage`, `ERR unknown_key`, `ERR bad_value` |
| `GET` | Zustand lesen | `STATE defects=… nightrun=… …` |
| `ZERO` | defects, success, closed auf 0 | `OK` |
| `SELFTEST`, `RESET`, `PING`, `HELP` | Selbsttest, Standardwerte, Lebenszeichen, Schlüsselliste | `OK`, `OK`, `PONG …`, `HELP …` |

Schlüssel: `defects nightrun sprint success closed ign mil cruise oilwarn battery oilpress lab arrk tt door_dev door_test door_stage door_prod defect nr left right hazard night dim
demo chaos odo trip clock`. Beispiel: `SET defects 23 nightrun 7 sprint 0.6`.

Die Schlüssel `rpm`, `speed`, `coolant`, `oil`, `overheat` und `eml` des Original-Widgets gibt es hier nicht.

## Events

| Event | `detail` | Wann |
|---|---|---|
| `clusterready` | Zustand | Element ist aufgebaut |
| `clusterchange` | Zustand | nach einer Änderung von Werten (mehrere Änderungen im selben Moment ergeben ein Event) |

## Hinweise

- Shadow DOM: das Aussehen wird nicht von deinem CSS verändert, mehrere Instanzen stören sich nicht.
- Die Schriften (Oswald, Barlow, SIL OFL 1.1) werden als `<style data-e46-cluster-fonts>` in den `<head>` gesetzt. Läuft das Original-Widget
  auf derselben Seite, kann dieser Block zweimal vorkommen, das ist harmlos.
- Hinter dem Kombi ist es transparent.
