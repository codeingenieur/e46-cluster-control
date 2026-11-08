# Pinbelegung E36-Kombi (VDO 62.11-8 360 482)

Gilt für das vorhandene Kombi: VDO 110.008.645/002 A, BMW 62.11-8 360 482, HW 2.4, SW 6.0. Händlerangaben ordnen es
einem E36 Compact 316i (M43) von 1995/96 zu, siehe [hardware.md](hardware.md). Es hat **keinen CAN-Bus**.

## Quellen und Verlässlichkeit

Vollständige Pinliste: Beitrag von daniel.krueger (2008) im
[BMW-Syndikat-Thread "Pinbelegung Kombiinstrument"](https://www.bmw-syndikat.de/bmwsyndikatforum/topic161010_Pinbelegung_Kombiinstrument_3er_BMW_-_E36.html).
Die Liste ist ein Forenbeitrag. Sie nennt weder Baujahr noch Kabelfarben, und die Pinzahlen (26 / 26 / 12) sind aus der
höchsten genannten Nummer abgeleitet. Sie passt zu den Steckern auf den Fotos (weiß 26, schwarz 12, dazu ein blauer, den
wir noch nicht fotografiert haben).

Auf den wichtigsten Pins bestätigen andere Quellen die Liste:

| Pin | Funktion | Bestätigt durch |
|---|---|---|
| weiß 20 | Drehzahlsignal | [e36-talk](https://e36-talk.com/forum/index.php?thread%2F27659-anleitung-kombiinstrument-bmw-e36-austauschen%2F=), [Autosport Labs](https://wiki.autosportlabs.com/BMW_E36_Guide), [E36Clock](https://github.com/fast90/E36Clock), [sim-pc.de](https://sim-pc.de/bmw-e36-tachosteckerbelegung/) |
| weiß 21 | Verbrauchssignal | e36-talk |
| schwarz 4 | Eingang Wegsignal (Geschwindigkeit) | E36Clock, sim-pc.de |
| schwarz 1 | Tankgeber | E36Clock |
| blau 18 (mit 17) | Kühlmitteltemperatursensor | E36Clock |
| weiß 22 / blau 4 / weiß 24 / blau 3 | Klemme 30 / 15 / Masse | eine Anleitung (laut Suchtreffer) und die Forenliste |
| blau 2 | Tacho-A-Signal (**Ausgang**) | Autosport Labs nennt "X17 Pin 2" für die Geschwindigkeit |

Nicht belegt: der E36-Schaltplan. Der Link zum PDF (sanituning.de) liefert nur eine Shop-Seite, das 1996er-Handbuch
(wedophones.com) gibt 404. **Alles hier vor dem Anschließen am eigenen Kombi mit dem Multimeter prüfen.**

## Weißer Stecker, 26-polig

| Pin | Funktion |
|---|---|
| 1 | Kontrolleuchte Fernlicht |
| 2 | Instrumentenbeleuchtung (Klemme 58g) |
| 3 | Kontrolleuchte Blinker rechts |
| 4 | Kontrolleuchte Blinker links |
| 5 | Warnleuchte elektronische Getriebesteuerung |
| 6, 7 | nicht belegt |
| 8 | Warnleuchte DDE |
| 9 | Vorglühkontrolle |
| 10 | Warnlampe Überrollschutz |
| 11 | Diagnose RxD |
| 12 | Diagnose TxD |
| 13 | Öltemperatur |
| 14 | Warnleuchte Airbag |
| 15 | Klemme R (teils nicht belegt) |
| 16 | Motorkontrolleuchte (Check Engine) |
| 17 | Warnleuchte Handbremse |
| 18 | Warnleuchte Bremsflüssigkeit |
| 19 | Warnleuchte Bremsbelagverschleiß |
| 20 | **Drehzahlsignal** |
| 21 | Kraftstoffverbrauchssignal |
| 22 | **Klemme 30** (Dauerplus) |
| 23 | **Klemme 15** (Spannung für Kontrolleuchten) |
| 24 | **Klemme 31** (Masse Kombi-Elektronik) |
| 25 | nicht belegt |
| 26 | Warnleuchte Katalysator-Übertemperatur ("CATA LYST") |

## Blauer Stecker, 26-polig

| Pin | Funktion |
|---|---|
| 1 | Kontrolleuchte Anhängerblinker |
| 2 | Tacho-A-Signal (Ausgang) |
| 3 | **Klemme 31** (Masse für Kontrolleuchten) |
| 4 | **Klemme 15** (Spannungsversorgung der Kombi-Elektronik) |
| 5 | Klemme 15 (Versorgung Ladekontrolleuchte) |
| 6 | Klemme 61 (Masse Ladekontrolleuchte) |
| 7 | nicht belegt |
| 8 | Kontrolleuchte Nebelscheinwerfer |
| 9 | Akustikausgang Warnsignal (zum Gong), Ausgang |
| 10 | Informationssignal Tankinhalt für Bordcomputer, Ausgang |
| 11 | Warnleuchte ABS |
| 12 | Warnleuchte ASC |
| 13 | nicht belegt |
| 14 | Warnleuchte Gurtwarner |
| 15 | Reset Serviceintervallanzeige |
| 16 | Klemme R |
| 17, 18 | **Kühlmitteltemperatursensor** |
| 19 | Warnleuchte Öldruck |
| 20 | Fehlerlampe SMG (nur M3 SMG) |
| 21 | bis 9/96 nicht belegt, ab 9/96 Masse |
| 22, 23 | nicht belegt |
| 24 | Dimmsignal / Helligkeitssignal (Ausgang) |
| 25 | nicht belegt |
| 26 | Warnleuchte Check-Control |

## Schwarzer Stecker, 12-polig

| Pin | Funktion |
|---|---|
| 1 | **Tankgeber** (Kraftstoffniveaugeber) |
| 2 | nicht belegt |
| 3 | Masse Klemme 31b (Tankgeber / Wegsignalgeber) |
| 4 | **Eingang Wegsignal** (Reedkontakt-Wegsignalgeber) |
| 5 | Kontrolleuchte Nebelschlussleuchte |
| 6–12 | nicht belegt |

Gehäusenummern: In einem Thread wird gestritten, ob alle Nummern aufgedruckt sind oder nur "13" und "26".
Auf deinen Fotos sind "26 / 1 / 13" und "14 / 1" am weißen Stecker und "12 / 6" sowie "7 / 1" am schwarzen lesbar.

## Für den Tischaufbau

| Funktion | Pins |
|---|---|
| Klemme 30 (+12 V Dauer) | weiß 22 |
| Klemme 15 (+12 V Zündung) | weiß 23 und blau 4 (blau 5 für die Ladekontrolle) |
| Masse | weiß 24, blau 3, schwarz 3 |

Alle drei Masse-Pins verbinden. Die Zuordnung der Versorgung stammt aus Forenliste und einer Anleitung, nicht vom Schaltplan.

## Ansteuerung durch den ESP32 (Annahmen)

| Anzeige | Pin | Ansatz | Offen |
|---|---|---|---|
| Drehzahl | weiß 20 | Rechtecksignal (TD-Signal der Motorsteuerung) über Transistor | Impulse pro Umdrehung: 3 bei Sechszylinder laut Autosport-Wiki, für einen Vierzylinder wohl 2 (Annahme). Der Faktor hängt laut einer Quelle vom **Codierstecker** ab (grünes Teil in den Fotos?) |
| Geschwindigkeit | schwarz 4 gegen schwarz 3 | Impulse (Reedkontakt-Eingang), Transistor wie ein Schalter | Impulse pro km, Pegel |
| Kühlmitteltemperatur | blau 17/18 | Widerstand statt NTC-Sensor (digitales Poti oder Widerstandskette) | Widerstandskurve des Sensors |
| Tank | schwarz 1 gegen schwarz 3 | Widerstand statt Tankgeber | Widerstandsbereich (die E46-Werte gelten nicht) |
| Lampen | siehe Tabellen | Transistor, vermutlich gegen Masse schalten | Polarität messen (Annahme: Lampe leuchtet bei Masse) |

**Nicht ansteuern (Ausgänge des Kombis):** blau 2 (Tacho-A-Signal), blau 9 (Gong), blau 10 (Tankinhalt zum BC),
blau 24 (Dimmsignal).

Die E36Clock-Quelle steuert Wassertemperatur und Tank mit PWM (`analogWrite`), ein Forenkommentar nennt die Zeiger dabei
sehr träge. Ob PWM gefiltert oder ein Widerstand besser ist, ist offen.
