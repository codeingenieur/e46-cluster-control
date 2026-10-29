# E46-Kombi, Jira-Variante (Website)

Zweite, **unabhängige** Version des digitalen Kombis (die Original-Version liegt in `../web/`). Aussehen, Nadelphysik, Nachtmodus,
Widget und ESP32-Anbindung sind wie beim Original, die Anzeigen und Beschriftungen sind auf Jira-Daten umgestellt.

| Instrument | Original | Jira-Variante |
|---|---|---|
| Drehzahlmesser | Drehzahl 0 bis 7 (x1000) | **aktive Defects 0 bis 50**, Beschriftung „Defects active", rote Zone 45 bis 50. Bei 50 leuchtet die Jira-Defect-Leuchte |
| Kühlmittel | Temperatur mit Skala | **offene Nightrun-Tickets**, Füllstandsanzeige mit den Teilstrichen, aber **ohne Zahlen**, Beschriftung „NR Defects", intern 0 bis 20. Darüber leuchtet **NR** (roter Schriftzug, rechts im Leuchtenfeld neben dem Defect-Symbol), die Nadel bleibt am Anschlag |
| Tank | Tankinhalt, Zapfsäule | **Sprint-Restzeit**, Sanduhr, 1/1 = Sprintstart, 0 = Sprintende (Reserveleuchte bei leer) |
| Tacho | km/h 20 bis 240 | **Testresults: BAC30 Success %**, Skala **0 bis 100** auf denselben Strichen (gleiche Winkel und Abstände), Zahlen alle 10, ohne die zwei Randstriche vor 0 und hinter 100 |
| Kleine Anzeige im Drehzahlmesser | Momentanverbrauch L/100 km | **Defects closed/Day**: pro Tag abgearbeitete Defects, Skala 0 bis 20 unverändert, nur die Beschriftung ist neu |
| Mittendisplay, übrige Leuchten | | unverändert |

Die Leuchten für 50 Defects und NR schalten sich selbst, erst wenn die Nadel am Anschlag angekommen ist (wie die Tankleuchte).
Die Teilstriche des Tachos sind unverändert (gleiche Winkel), die Skala liegt mittig um 12 Uhr: 0 bei -116°, 100 bei +116°.
Anordnung der Leuchten unten: links arrk und TT, in der Mitte Tempomat, rechts Labor, NR und Jira Defect.

**ESP32 (echtes Kombi), die Schaltfläche ist vorerst aus der Seite entfernt (Code in `serial.js` und `app.js` bleibt, die Karte lässt sich in `index.html` wieder einsetzen):** Die Seite schickt die Nadelstellungen: Defects 0 bis 50 als Drehzahl 0 bis 7000, Testresults als Geschwindigkeit 30 bis 230 km/h, der Nightrun-Füllstand als
Kühlmitteltemperatur (jeweils gleiche Nadelstellung wie hier), NR als Überhitzungsleuchte. Das echte Kombi hat dann noch das Original-Zifferblatt.
Nicht an echter Hardware getestet.

**Widget:** `widget/e46-jira-cluster.js` registriert `<e46-jira-cluster>` mit den Properties `defects`, `nightrun`, `sprint` und Befehlen
wie `SET defects 23 nightrun 7 sprint 0.6 success 85`, siehe `widget/README.md`. Es läuft neben dem Original-Widget auf derselben Seite.

Die folgenden Abschnitte gelten unverändert auch für diese Variante (Maße, Außenform, Schrift).

`index.html` im Browser öffnen, kein Build und kein Server nötig. Die Dateien sind:

| Datei | Inhalt |
|---|---|
| `cluster.js` | Das Kombi als SVG: Zifferblätter, Nadeln mit Federphysik, Leuchten, Punktmatrix-Display |
| `sim.js` | Demo: `TicketSim` für Defects, Nightrun, Sprint, Testresults und Defects closed/Day (die Fahrsimulation läuft nur noch für die Wegstrecke) |
| `serial.js` | Anbindung an den ESP32 über Web Serial, Protokoll aus `docs/usb-interface.md` |
| `app.js`, `index.html`, `style.css` | Bedienung |
| `widget/` | **Web Component `<e46-jira-cluster>`** für HTML/Angular, ein einziges Skript, steuerbar per Befehl (siehe `widget/README.md`) |
| `fonts.css`, `grain.js` | Eingebettete Schrift und Körnung (Frontplatte, matte Naben) |

## Woher die Maße kommen

Skalenwinkel, Teilstriche, Nabengrößen, Position der Instrumente und der rote Bereich sind an Fotos eines
echten E46 (Vorfacelift, Normalausführung) abgenommen, nicht geschätzt:

- Tacho (Original-Version): 20 km/h bei -127,5°, 240 km/h bei +127,5° (1,159°/km/h), Striche alle 10, Zahlen alle 20. In der Jira-Variante
  liegen dieselben Striche unter der Skala 0 bis 100 (Zahlen alle 10)
- Drehzahlmesser: 0 bei -118,8°, 7000 bei +118,8°. Roter Bereich 6 bis 7 in drei kleinen Segmenten,
  weißem Strich bei 6,5 und einem großen Block
- Kleine Anzeige im Drehzahlmesser (Original: L/100 km, Jira-Variante: Defects closed/Day): ±68,4°, elliptische Skala 0 bis 20, Striche alle 2
- Außenform und Platte: je eine kubische B-Spline pro Hälfte (von der Scheitelmitte bis zum Beginn des flachen Bodens, dort
  Krümmung 0), gespiegelt und als Bézier-Stücke ausgegeben. Die Krümmung ist überall stetig (Sprung unter 0,03 bei Werten von
  0,2 bis 6, jeweils x1000), es gibt also keinen Übergang vom großen Bogen oben zu den Rundungen, der als Ecke wirkt. Angepasst
  ist die Kontur an die Messung am Frontfoto (Abweichung etwa 1 Einheit zum vorherigen Stand). Oben endet sie in einem
  gleichmäßigen Bogen (Haube abgeschnitten). Der innere Plattenrand ist über seine Krümmung definiert (steigt vom
  Scheitel gleichmäßig an, fällt zum flachen Boden auf null ab, keine Wellen) und an eine Linie angepasst, die direkt auf das
  Foto gezeichnet wurde (per Bildabgleich umgerechnet, gespiegelt, geglättet; Abweichung im Mittel unter 2 Einheiten). Über beiden
  Zifferblättern bleibt etwa 15 Abstand. Die Außenkante der Leuchtenfelder ist eine Parallelkurve zur
  Platte mit festem Abstand 14.
  Das Bild hat rundum Rand, damit nichts abgeschnitten wird (viewBox -40 -90 1680 800).
- Zifferblätter unten bei 0,884 R flach abgeschnitten, kleine Instrumente mit Achse unterhalb der Mitte
- Farbfelder im Kühlmittelinstrument: Rechtecke 27,5 x 23,5, Mitte bei Radius 107 und ±37,5° um die Achse, radial gedreht um ±35°
- Nadeln weiß (zweifarbig), nachts orange beleuchtet, Naben matt grau, hinten ein kleiner Stummel
- Tank und Kühlmittel: Die Nabe liegt 7,7 Einheiten außerhalb der Symmetrieachse. Teilstriche, Zahlen, Symbol und
  Farbfelder sind um diese Achse zentriert, die Nadel zeigt von der Nabe auf diese Skala
- Display: rote 5x7-Punktmatrix, links Kilometerstand, rechts Tageskilometer, darunter die Uhrzeit

Hauptreferenz: [BMW 320i E46 instrument cluster during fuel cut-off](https://commons.wikimedia.org/wiki/File:BMW_320i_E46_instrument_cluster_during_fuel_cut-off_(aka).jpg)
von Wikimedia Commons (CC BY-SA 2.5). Das Foto dient nur zum Abmessen und ist nicht im Repo enthalten.

Nicht belegt: das Aussehen bei Nacht (kein beleuchtetes Foto gefunden).

## Nachtmodus

Die Zeichnung besteht aus drei Ebenen: Gehäuse und Zifferblätter unten, darüber eine Abdunklung, darüber alles
Beleuchtete (Zahlen, Striche, Nadeln, Symbole, Leuchten, Display). Im Nachtmodus wird nur die untere Ebene dunkel,
das Beleuchtete bleibt hell und bekommt einen warmen Hof. Die Helligkeit regelt Leuchtstärke und Hof.
Das Aussehen bei Nacht ist nicht an einem Foto belegt.

## Schrift

Die Ziffern des Originals sind keine Helvetica: In einem Formtest (Ziffern 0 bis 6 aus dem Foto ausgeschnitten, jede
Kandidatenschrift auf denselben Rahmen skaliert, Überdeckung gemessen) kommen Helvetica-artige Schnitte (Arimo,
Archivo Narrow) bei der „1" nur auf etwa 0,47, die schmalen Gothic-/DIN-artigen Schriften auf über 0,8.

- **Oswald 500** für die Skalenzahlen: beste Überdeckung und beste natürliche Proportionen (Nullbreite 0,51 zu 0,48 im
  Foto, „140" 1,61 zu 1,69, „200" 1,76 zu 1,87)
- **Barlow 600** für „km/h", „1/min", „x1000" und „L/100km", die im Original breiter gesetzt sind
- Schriftgrößen aus der gemessenen Ziffernhöhe

Beide: SIL Open Font License 1.1, Teilmenge Basic Latin + Grad-Zeichen, siehe `fonts.css`. Die Originalschrift ist
es nicht, nur ein Ersatz.
