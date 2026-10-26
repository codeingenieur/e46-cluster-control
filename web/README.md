# Digitales E46-Kombi (Website)

`index.html` im Browser öffnen, kein Build und kein Server nötig. Die Dateien sind:

| Datei | Inhalt |
|---|---|
| `cluster.js` | Das Kombi als SVG: Zifferblätter, Nadeln mit Federphysik, Leuchten, Punktmatrix-Display |
| `sim.js` | Demo-Fahrt (Schaltgetriebe, Warmlaufen) |
| `serial.js` | Anbindung an den ESP32 über Web Serial, Protokoll aus `docs/usb-interface.md` |
| `app.js`, `index.html`, `style.css` | Bedienung |
| `fonts.css`, `grain.js` | Eingebettete Schrift und Körnung (Frontplatte, matte Naben) |

## Woher die Maße kommen

Skalenwinkel, Teilstriche, Nabengrößen, Position der Instrumente und der rote Bereich sind an Fotos eines
echten E46 (Vorfacelift, Normalausführung) abgenommen, nicht geschätzt:

- Tacho: 20 km/h bei -127,5°, 240 km/h bei +127,5° (1,159°/km/h), Striche alle 10, Zahlen alle 20
- Drehzahlmesser: 0 bei -118,8°, 7000 bei +118,8°. Roter Bereich 6 bis 7 in drei kleinen Segmenten,
  weißem Strich bei 6,5 und einem großen Block
- Verbrauchsanzeige (L/100 km): ±68,4°, elliptische Skala, Striche alle 2
- Außenform: Die gemessene Kontur (Strahlen von der Mitte, auf die Mittelachse gespiegelt) ist an vier glatte
  Kurvenstücke angepasst (oben, Seite, Ecke, flacher Boden; mittlere Abweichung 2 bis 3 Einheiten), die Silhouette ist
  deshalb ein einziger glatter Pfad. Oben endet sie in einem gleichmäßigen Bogen (Haube abgeschnitten).
- Platte: ebenfalls aus vier glatten Kurvenstücken (oben ein einziger Bogen von der Mitte bis zur breitesten Stelle,
  dann Ecke und flacher Boden), angepasst an die gemessene Form. Die Krümmung des oberen Bogens steigt gleichmäßig von der
  Mitte zur Seite an, ohne Dellen. Oben liegt eine kleine Lücke über den Zifferblättern, an Seiten und Boden ist der Ring
  40 dick. Die Außenkante der Leuchtenfelder ist eine Parallelkurve zur Silhouette mit festem Abstand 54.
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
