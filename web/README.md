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
- Zifferblätter unten bei 0,884 R flach abgeschnitten, kleine Instrumente mit Achse unterhalb der Mitte
- Nadeln weiß (zweifarbig), nachts orange beleuchtet, Naben matt grau, hinten ein kleiner Stummel
- Tank und Kühlmittel: Die Nabe liegt 7,7 Einheiten außerhalb der Symmetrieachse. Teilstriche, Zahlen, Symbol und
  Farbfelder sind um diese Achse zentriert, die Nadel zeigt von der Nabe auf diese Skala
- Display: rote 5x7-Punktmatrix, links Kilometerstand, rechts Tageskilometer, darunter die Uhrzeit

Hauptreferenz: [BMW 320i E46 instrument cluster during fuel cut-off](https://commons.wikimedia.org/wiki/File:BMW_320i_E46_instrument_cluster_during_fuel_cut-off_(aka).jpg)
von Wikimedia Commons (CC BY-SA 2.5). Das Foto dient nur zum Abmessen und ist nicht im Repo enthalten.

Nicht belegt: das Aussehen bei Nacht (kein beleuchtetes Foto gefunden).

## Schrift

Zwei Schnitte der Barlow (SIL Open Font License 1.1, Teilmenge Basic Latin + Grad-Zeichen, siehe `fonts.css`):

- **Barlow Semi Condensed 600** für die Skalenzahlen: Ink-Breite von „140" zur Ziffernhöhe 1,76, im Foto 1,80;
  Strichstärke 0,16 der Ziffernhöhe wie im Foto
- **Barlow 600** für „km/h", „1/min", „x1000" und „L/100km", die im Original deutlich breiter gesetzt sind
- Schriftgrößen aus der gemessenen Ziffernhöhe: Tacho 0,112 R, Drehzahlmesser 0,124 R, Beschriftungen 0,07 R
