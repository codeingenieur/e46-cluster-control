# `<e46-jira-cluster>`: das Kombi als Widget (Jira-Variante)

Gleiche Technik wie das Widget der Original-Version (`../../web/widget/`): ein Web Component ohne Abhängigkeiten für HTML, Angular,
React, Vue. Der Unterschied sind die Anzeigen: **Drehzahlmesser = aktive Defects, Kühlmittel = offene Nightrun-Tickets, Tank =
Sprint-Restzeit.** Das Element hat einen eigenen Namen, beide Versionen laufen auf derselben Seite nebeneinander.

| Datei | Zweck |
|---|---|
| `e46-jira-cluster.js` | das fertige Skript (105 KB, Schriften und Körnung eingebettet, keine Abhängigkeiten). **Nur diese Datei wird für HTML gebraucht** |
| `e46-jira-cluster.d.ts` | TypeScript-Typen |
| `package.json` | macht den Ordner zu einem npm-Paket (`npm pack` oder `npm install <ordner>`) |
| `angular/e46-jira-kombi.component.ts` | fertige Angular-Komponente mit typisierten Inputs und Outputs |
| `angular/app.component.example.ts` | Beispiel: Kombi in einer Seite, gespeist von einem Observable |
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

## Einbinden

### Reines HTML

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

### Als npm-Paket (Angular, React, Vue, jeder Bundler)

```
cd widget && npm pack                       # erzeugt e46-jira-cluster-1.2.0.tgz
cd <dein-projekt> && npm install ../widget/e46-jira-cluster-1.2.0.tgz
```

```ts
import 'e46-jira-cluster';                  // registriert <e46-jira-cluster>, die Typen kommen mit
```

Oder ohne Paket: `e46-jira-cluster.js` ins Projekt kopieren und mit `import './e46-jira-cluster.js'` oder in der Build-Konfiguration als Skript einbinden.

### Angular (empfohlen: die fertige Komponente)

1. Paket installieren (siehe oben).
2. `angular/e46-jira-kombi.component.ts` nach `src/app/` kopieren.
3. Verwenden (Standalone-Komponente, Angular 16 oder neuer):

```ts
import { E46JiraKombiComponent } from './e46-jira-kombi.component';

@Component({
  standalone: true,
  imports: [E46JiraKombiComponent],
  template: `
    <app-e46-jira-kombi #kombi style="width: 900px"
      [defects]="defects" [nightrun]="nightrun" [sprint]="sprint" [success]="success" [closed]="closed"
      [night]="false" (kombiReady)="bereit($event)" (kombiChange)="zustand = $event">
    </app-e46-jira-kombi>`,
})
export class SeiteComponent {
  @ViewChild('kombi') kombi!: E46JiraKombiComponent;
  defects = 12; nightrun = 6; sprint = 0.8; success = 87; closed = 8;
  zustand?: E46JiraClusterState;

  bereit(z: E46JiraClusterState) {}
  chaos() { this.kombi.command('SET chaos 1'); }        // oder this.kombi.element.xmas = true
}
```

- **Inputs:** `defects`, `nightrun`, `sprint`, `success`, `closed`, `dim`, `ignition`, `night`, `chaos`, `xmas`, `demo`, alle Leuchten, `clock`,
  `odometer`, `trip`, und `[values]="{ … }"` für mehrere Werte auf einmal. Nicht gesetzte Inputs behalten die Standardwerte.
- **Outputs:** `kombiReady`, `kombiChange` (Wert: Zustand des Kombis).
- **Methoden:** `command(zeile)`, `commands(text)`, `selftest()`, `element` (das Element selbst).
- Ohne die Komponente geht es auch direkt: `schemas: [CUSTOM_ELEMENTS_SCHEMA]` und `<e46-jira-cluster [defects]="…">`.
- Die Bildschleife läuft an zone.js vorbei, es gibt keine Change Detection je Bild.
- Geprüft: die Komponente übersetzt mit dem Angular-Compiler (Angular 18, `strictTemplates`), und mit geladenem zone.js löst das animierte
  Element keine Zone-Aufgaben aus. *In einer laufenden Angular-Anwendung nicht ausprobiert.*

### React und Vue

React 19 und Vue setzen Properties von Custom Elements direkt: `<e46-jira-cluster defects={31} />` bzw. `<e46-jira-cluster :defects="31" />`
(in Vue `compilerOptions.isCustomElement: (t) => t.startsWith('e46-')`). Für Methoden eine Referenz auf das Element holen (`ref`).

## Von außen ansteuern

| Weg | Beispiel |
|---|---|
| Attribut | `<e46-jira-cluster defects="31">` |
| Property | `kombi.defects = 31` |
| mehrere Werte | `kombi.set({ defects: 31, nightrun: 9 })` |
| Befehl (wie am ESP32) | `kombi.command('SET defects 31 nightrun 9')`, Antwort `OK` oder `ERR …` |
| Zustand lesen | `kombi.state` oder `kombi.command('GET')` |
| Änderungen hören | `kombi.addEventListener('clusterchange', e => e.detail)` |

Lebende Daten einspeisen, z. B. aus einem Server (Server-Sent Events, WebSocket oder Polling), immer nach demselben Muster:

```ts
const quelle = new EventSource('/api/jira-zahlen');          // liefert z. B. {"defects":31,"nightrun":9,"sprint":0.5}
quelle.onmessage = (e) => kombi.set(JSON.parse(e.data));     // unbekannte Schlüssel werfen einen Fehler
```

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
| `xmas` | bool | Weihnachtsmodus: blinkende Lichterkette an der Außenkante, Tannenbaum statt Batterieleuchte, Schneefall |
| `easter` | bool | Ostermodus: bunte Eier an Schnüren an der Außenkante, fallende Blütenblätter, Osterhase statt Batterieleuchte |
| `nye` | bool | Silvestermodus: funkelnde Sterne an der Schnur, Konfetti, Raketen mit Feuerwerk, Sektglas statt Batterieleuchte |
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
demo chaos xmas easter nye odo trip clock`. Beispiel: `SET defects 23 nightrun 7 sprint 0.6`.

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
