#!/usr/bin/env python3
"""Erzeugt die Pinbelegungs-Grafiken fuer das E36-Kombi (VDO 62.11-8 360 482).

Aufruf:  python make_pinouts.py            (schreibt die SVGs neben dieses Skript)

Quelle der Pinbelegung: docs/e36-pinout.md (Forenliste, auf den wichtigsten Pins bestaetigt).
Die Anordnung der Pins entspricht den aufgedruckten Nummern am Kombi (Fotos der Rueckseite):
  weiss/blau 26 : links 26 bis 14 (oben nach unten), rechts 13 bis 1
  schwarz 12    : links 12 bis 7 (oben nach unten), rechts 6 bis 1
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "Segoe UI, Helvetica, Arial, sans-serif"

# Kategorie: (Legendentext, Fuellung, Rand, Textfarbe)
CATS = {
    "supply": ("Versorgung (+12 V)", "#fde4e4", "#c0392b", "#7a1c1c"),
    "ground": ("Masse", "#4b5563", "#1f2937", "#ffffff"),
    "signal": ("Signal, das wir ansteuern", "#d3f2e8", "#0f766e", "#064e3b"),
    "lamp": ("Warn- oder Kontrollleuchte", "#fff0d1", "#b45309", "#6b3a07"),
    "input": ("sonstiger Eingang oder Diagnose", "#e2ecfb", "#2563eb", "#1e3a8a"),
    "output": ("Ausgang des Kombis, nie ansteuern", "#eee5fa", "#7c3aed", "#4c1d95"),
    "unused": ("nicht belegt", "#f3f4f6", "#cfd4da", "#6b7280"),
}
GREEN = "#16a34a"

# Pin -> (Kategorie, Beschriftung)
WHITE = {
    1: ("lamp", "Kontrollleuchte Fernlicht"),
    2: ("supply", "Instrumentenbeleuchtung (Kl. 58g)"),
    3: ("lamp", "Blinker rechts"),
    4: ("lamp", "Blinker links"),
    5: ("lamp", "Warnleuchte Getriebesteuerung"),
    6: ("unused", "nicht belegt"),
    7: ("unused", "nicht belegt"),
    8: ("lamp", "Warnleuchte DDE"),
    9: ("lamp", "Vorglühkontrolle"),
    10: ("lamp", "Warnlampe Überrollschutz"),
    11: ("input", "Diagnose RxD"),
    12: ("input", "Diagnose TxD"),
    13: ("input", "Öltemperatur"),
    14: ("lamp", "Warnleuchte Airbag"),
    15: ("input", "Klemme R (teils nicht belegt)"),
    16: ("lamp", "Motorkontrolle (Check Engine)"),
    17: ("lamp", "Warnleuchte Handbremse"),
    18: ("lamp", "Warnleuchte Bremsflüssigkeit"),
    19: ("lamp", "Warnleuchte Bremsbelagverschleiß"),
    20: ("signal", "Drehzahlsignal"),
    21: ("input", "Kraftstoffverbrauchssignal"),
    22: ("supply", "Klemme 30 (Dauerplus)"),
    23: ("supply", "Klemme 15 (Plus für Leuchten)"),
    24: ("ground", "Klemme 31 (Masse Elektronik)"),
    25: ("unused", "nicht belegt"),
    26: ("lamp", "Warnleuchte Kat-Übertemperatur"),
}
BLUE = {
    1: ("lamp", "Kontrollleuchte Anhängerblinker"),
    2: ("output", "Tacho-A-Signal (Ausgang)"),
    3: ("ground", "Klemme 31 (Masse Leuchten)"),
    4: ("supply", "Klemme 15 (Elektronik)"),
    5: ("supply", "Klemme 15 (Ladekontrolle)"),
    6: ("ground", "Klemme 61 (Masse Ladekontrolle)"),
    7: ("unused", "nicht belegt"),
    8: ("lamp", "Kontrollleuchte Nebelscheinwerfer"),
    9: ("output", "Warngong (Ausgang)"),
    10: ("output", "Tankinhalt an Bordcomputer (Ausgang)"),
    11: ("lamp", "Warnleuchte ABS"),
    12: ("lamp", "Warnleuchte ASC"),
    13: ("unused", "nicht belegt"),
    14: ("lamp", "Warnleuchte Gurtwarner"),
    15: ("input", "Reset Serviceintervall"),
    16: ("input", "Klemme R"),
    17: ("signal", "Kühlmittelsensor (mit 18)"),
    18: ("signal", "Kühlmittelsensor (mit 17)"),
    19: ("lamp", "Warnleuchte Öldruck"),
    20: ("lamp", "Fehlerlampe SMG (nur M3 SMG)"),
    21: ("unused", "frei, ab 9/96 Masse"),
    22: ("unused", "nicht belegt"),
    23: ("unused", "nicht belegt"),
    24: ("output", "Dimmsignal (Ausgang)"),
    25: ("unused", "nicht belegt"),
    26: ("lamp", "Warnleuchte Check-Control"),
}
BLACK = {
    1: ("signal", "Tankgeber"),
    2: ("unused", "nicht belegt"),
    3: ("ground", "Klemme 31b (Masse Geber)"),
    4: ("signal", "Wegsignal (Geschwindigkeit)"),
    5: ("lamp", "Kontrollleuchte Nebelschlussleuchte"),
}
for _n in range(6, 13):
    BLACK.setdefault(_n, ("unused", "nicht belegt"))

DATA = {"weiß": WHITE, "blau": BLUE, "schwarz": BLACK}
USED = {"weiß": {20, 22, 23, 24}, "blau": {3, 4}, "schwarz": {3, 4}}  # am Tisch angeschlossen
CALIBRATED = {("weiß", 20), ("schwarz", 4)}                            # Drehzahl, Tacho: abgeglichen

LEFT26 = list(range(26, 13, -1))   # 26 .. 14
RIGHT26 = list(range(13, 0, -1))   # 13 .. 1
LEFT12 = list(range(12, 6, -1))    # 12 .. 7
RIGHT12 = list(range(6, 0, -1))    # 6 .. 1


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def legend(x0, y0, col_w=330):
    """Legende in drei Spalten, liefert (svg, hoehe)."""
    items = [(c[0], c[1], c[2]) for c in CATS.values()]
    out = [f'<text x="{x0}" y="{y0}" font-size="15" font-weight="700" fill="#111827">Legende</text>']
    y = y0 + 16
    for i, (txt, fill, stroke) in enumerate(items):
        col, row = i % 3, i // 3
        x, yy = x0 + col * col_w, y + row * 30
        out.append(f'<rect x="{x}" y="{yy}" width="24" height="18" rx="4" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
        out.append(f'<text x="{x + 34}" y="{yy + 14}" font-size="13.5" fill="#374151">{esc(txt)}</text>')
    i = len(items)
    col, row = i % 3, i // 3
    x, yy = x0 + col * col_w, y + row * 30
    out.append(f'<rect x="{x}" y="{yy}" width="24" height="18" rx="4" fill="#ffffff" stroke="{GREEN}" stroke-width="3.5"/>')
    out.append(f'<text x="{x + 34}" y="{yy + 14}" font-size="13.5" fill="#374151">am Tisch angeschlossen (grüner Rahmen)</text>')
    rows = (len(items) + 1 + 2) // 3
    return "\n".join(out), 16 + rows * 30


def check_badge(cx, cy):
    return (f'<circle cx="{cx}" cy="{cy}" r="9" fill="{GREEN}" stroke="#ffffff" stroke-width="2"/>'
            f'<path d="M{cx - 4} {cy} l3 3.5 l5.5 -6.5" fill="none" stroke="#ffffff" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')


def sheet(name, title, chip_fill, chip_stroke, sub, left, right, rowh, notes, fname):
    pins = DATA[name]
    n = len(left)
    top, W = 160, 1000
    body_h = n * rowh
    out = []
    leg_y = top + body_h + 70
    leg_svg, leg_h = legend(40, leg_y)
    H = leg_y + leg_h + 26 + len(notes) * 20 + 24
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
               f'font-family="{FONT}">')
    out.append(f'<title>{esc(title)}</title>')
    out.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
    out.append(f'<rect x="40" y="34" width="56" height="32" rx="6" fill="{chip_fill}" stroke="{chip_stroke}" stroke-width="2"/>')
    out.append(f'<text x="114" y="60" font-size="30" font-weight="700" fill="#111827">{esc(title)}</text>')
    for i, s in enumerate(sub):
        out.append(f'<text x="40" y="{96 + i * 22}" font-size="15" fill="#4b5563">{esc(s)}</text>')
    for i in range(n):
        y = top + i * rowh
        out.append(f'<rect x="30" y="{y}" width="{W - 60}" height="{rowh}" fill="{"#f6f8fa" if i % 2 == 0 else "#ffffff"}"/>')
    out.append(f'<rect x="408" y="{top - 14}" width="184" height="{body_h + 28}" rx="12" fill="#e5e7eb" '
               f'stroke="#9ca3af" stroke-width="2"/>')
    # Pin-Zellen
    for side, nums in (("L", left), ("R", right)):
        x = 424 if side == "L" else 512
        for i, num in enumerate(nums):
            cat, label = pins[num]
            _, fill, stroke, tcol = CATS[cat]
            used = num in USED[name]
            y = top + i * rowh
            cy = y + rowh / 2
            h = rowh - 10
            sw, sc = (3.5, GREEN) if used else (1.5, stroke)
            out.append(f'<rect x="{x}" y="{y + 5}" width="64" height="{h}" rx="6" fill="{fill}" stroke="{sc}" stroke-width="{sw}"/>')
            out.append(f'<text x="{x + 32}" y="{cy + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="{tcol}">{num}</text>')
            muted = cat == "unused"
            col = "#9ca3af" if muted else "#111827"
            weight = "700" if used else "400"
            extra = ""
            if (name, num) in CALIBRATED:
                extra = f'<tspan fill="{GREEN}" font-weight="700"> · abgeglichen</tspan>'
            if side == "L":
                out.append(f'<text x="394" y="{cy + 5.5}" text-anchor="end" font-size="16" font-weight="{weight}" fill="{col}">{esc(label)}{extra}</text>')
                if used:
                    out.append(check_badge(x, y + 7))
            else:
                out.append(f'<text x="606" y="{cy + 5.5}" font-size="16" font-weight="{weight}" fill="{col}">{esc(label)}{extra}</text>')
                if used:
                    out.append(check_badge(x + 64, y + 7))
    out.append(leg_svg)
    ny = leg_y + leg_h + 30
    for i, t in enumerate(notes):
        out.append(f'<text x="40" y="{ny + i * 20}" font-size="12.5" fill="#6b7280">{esc(t)}</text>')
    out.append("</svg>")
    with open(os.path.join(HERE, fname), "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def board(x, y, name, left, right, ids=None, cw=46, ch=24, gap=4, colgap=8, pad=12, chip=None):
    """Pinboard fuer die Uebersicht. Liefert (svg, Zellen-Mitten {(side, num): (cx, cy)}, Breite, Hoehe)."""
    pins = DATA[name]
    n = len(left)
    w = 2 * cw + colgap + 2 * pad
    h = n * (ch + gap) - gap + 2 * pad
    chip_fill, chip_stroke = chip
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{chip_fill}" stroke="{chip_stroke}" stroke-width="2.5"/>']
    cells = {}
    for side, nums in (("L", left), ("R", right)):
        cx0 = x + pad + (0 if side == "L" else cw + colgap)
        for i, num in enumerate(nums):
            cat, _ = pins[num]
            _, fill, stroke, tcol = CATS[cat]
            used = num in USED[name]
            cy0 = y + pad + i * (ch + gap)
            sw, sc = (3, GREEN) if used else (1, stroke)
            out.append(f'<rect x="{cx0}" y="{cy0}" width="{cw}" height="{ch}" rx="4" fill="{fill}" stroke="{sc}" stroke-width="{sw}"/>')
            out.append(f'<text x="{cx0 + cw / 2}" y="{cy0 + ch / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="{tcol}">{num}</text>')
            cells[(side, num)] = (cx0, cy0 + ch / 2, cx0 + cw)
    # aufgedruckte Eckennummern
    lx = x + pad + cw / 2
    rx = x + pad + cw + colgap + cw / 2
    out.append(f'<text x="{lx}" y="{y - 7}" text-anchor="middle" font-size="13" fill="#6b7280">{left[0]}</text>')
    out.append(f'<text x="{rx}" y="{y - 7}" text-anchor="middle" font-size="13" fill="#6b7280">{right[0]}</text>')
    out.append(f'<text x="{lx}" y="{y + h + 16}" text-anchor="middle" font-size="13" fill="#6b7280">{left[-1]}</text>')
    out.append(f'<text x="{rx}" y="{y + h + 16}" text-anchor="middle" font-size="13" fill="#6b7280">{right[-1]}</text>')
    return "\n".join(out), cells, w, h


# Aussenform des Kombis: gleiche Kontur wie im Digital-Kombi-Widget (web-custom/cluster.js, Konstante SILHOUETTE,
# am Frontfoto gemessen). Koordinaten im Widget-System: x 13 bis 1587, y -33 bis 646.
SILHOUETTE = ('M800 -33C867.6 -33 937.4 -29.9 1005.5 -22.1C1073.7 -14.4 1140.3 -2.1 1205.8 17.1C1271.4 36.4 1335.9 62.6 1393.4 100'
              'C1451 137.5 1501.5 186.3 1535.4 245.1C1569.3 303.9 1586.6 372.9 1576.2 441.4C1565.8 509.8 1527.6 577.9 1468.7 612'
              'C1409.7 646 1329.9 646 1271.9 646L328.1 646C270.1 646 190.3 646 131.3 612C72.4 577.9 34.2 509.8 23.8 441.4'
              'C13.4 372.9 30.7 303.9 64.6 245.1C98.5 186.3 149 137.5 206.6 100C264.1 62.6 328.6 36.4 394.2 17.1'
              'C459.7 -2.1 526.3 -14.4 594.5 -22.1C662.6 -29.9 732.4 -33 800 -33Z')
SIL_SCALE = 0.9
SIL_TX, SIL_TY = 283.9, 219.7      # Verschiebung: Kontur liegt dann x 296 bis 1702, y 190 bis 801
SIL_CX = SIL_TX + 800 * SIL_SCALE  # Mittelachse der Kontur


def overview(fname):
    W, H = 2150, 1100
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
           '<title>E36-Kombi von hinten mit den drei Steckern</title>',
           f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
           '<text x="50" y="62" font-size="36" font-weight="700" fill="#111827">E36-Kombi VDO 62.11-8 360 482: Rückseite mit den drei Steckern</text>',
           '<text x="50" y="96" font-size="18" fill="#4b5563">Blick von hinten auf das Gehäuse (VDO-Schriftzug lesbar, oben ist oben). Gespiegelt zur Vorderseite: Der schwarze Stecker sitzt auf der Seite der Tankanzeige.</text>',
           '<text x="50" y="122" font-size="18" fill="#4b5563">Lage der Stecker nach deinem Foto, nicht maßstäblich. Pins und Eckennummern sind wie am Kombi aufgedruckt.</text>']
    # Gehaeuse-Umriss
    out.append(f'<path d="{SILHOUETTE}" transform="translate({SIL_TX} {SIL_TY}) scale({SIL_SCALE})" '
               f'fill="#e3eaf0" stroke="#7b8794" stroke-width="{3 / SIL_SCALE:.2f}" stroke-linejoin="round"/>')
    # Mittelaussparung unten und Lampenreihe
    cx0 = SIL_CX
    out.append(f'<path d="M {cx0 - 120} 801 L {cx0 - 120} 745 C {cx0 - 120} 722, {cx0 - 100} 708, {cx0 - 75} 708 L {cx0 + 75} 708 '
               f'C {cx0 + 100} 708, {cx0 + 120} 722, {cx0 + 120} 745 L {cx0 + 120} 801 Z" '
               f'fill="#ffffff" stroke="#7b8794" stroke-width="2"/>')
    for i in range(11):
        cx = cx0 - 500 + i * 100
        if abs(cx - cx0) < 130:
            continue
        out.append(f'<circle cx="{cx:.0f}" cy="762" r="16" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>')
    for dx in (-60, 0, 60):
        out.append(f'<circle cx="{cx0 + dx:.0f}" cy="232" r="14" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>')
    out.append(f'<text x="{cx0:.0f}" y="305" text-anchor="middle" font-size="46" font-weight="700" fill="#b8c4d0" letter-spacing="3">VDO</text>')
    out.append(f'<text x="{cx0:.0f}" y="520" text-anchor="middle" font-size="20" fill="#7b8794">Rückseite des Kombis</text>')

    # weisser Stecker (links), blauer (rechts der Mitte), schwarzer (aussen rechts)
    WX, BX, KX = 510, 1300, 1510
    wsvg, wc, ww, wh = board(WX, 345, "weiß", LEFT26, RIGHT26, ch=22, chip=("#faf7ee", "#9ca3af"))
    bsvg, bc, bw, bh = board(BX, 345, "blau", LEFT26, RIGHT26, ch=22, chip=("#4f7fd1", "#2c4f94"))
    ksvg, kc, kw, kh = board(KX, 430, "schwarz", LEFT12, RIGHT12, ch=22, chip=("#3a3a3a", "#111111"))
    out += [wsvg, bsvg, ksvg]
    out.append(f'<text x="{WX + ww / 2}" y="{345 - 30}" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">weiß · 26 Pins</text>')
    out.append(f'<text x="{BX + bw / 2}" y="{345 - 30}" text-anchor="middle" font-size="22" font-weight="700" fill="#1e3a8a">blau · 26 Pins</text>')
    out.append(f'<text x="{KX + kw / 2}" y="{430 + kh + 42}" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">schwarz · 12 Pins</text>')

    def leader(points, color=GREEN):
        pts = " ".join(f"{px},{py}" for px, py in points)
        ex, ey = points[0]
        return (f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.5" stroke-linejoin="round"/>'
                f'<circle cx="{ex}" cy="{ey}" r="4.5" fill="{color}"/>')

    def label(x, y, text, anchor, bold_tail=None):
        if bold_tail and anchor == "start":
            return (f'<text x="{x}" y="{y + 6}" text-anchor="start" font-size="20" font-weight="700" fill="#111827">{esc(text)}'
                    f'<tspan fill="{GREEN}"> · {esc(bold_tail)}</tspan></text>')
        t = f'<text x="{x}" y="{y + 6}" text-anchor="{anchor}" font-size="20" font-weight="700" fill="#111827">{esc(text)}</text>'
        if bold_tail:
            t += (f'<text x="{x}" y="{y + 27}" text-anchor="{anchor}" font-size="16" font-weight="700" '
                  f'fill="{GREEN}">{esc(bold_tail)}</text>')
        return t

    # weiss: Pins links, Beschriftung im linken Rand
    for num, txt, tail in ((24, "weiß 24 · Masse", None), (23, "weiß 23 · Klemme 15", None),
                           (22, "weiß 22 · Klemme 30", None), (20, "weiß 20 · Drehzahl", "abgeglichen")):
        cx0, cy, _ = wc[("L", num)]
        out.append(leader([(cx0, cy), (330, cy)]))
        out.append(label(318, cy, txt, "end", tail))
    # blau 17/18: links in die Mitte
    for num, txt in ((18, "blau 18 · Kühlmittel (später)"), (17, "blau 17 · Kühlmittel (später)")):
        cx0, cy, _ = bc[("L", num)]
        out.append(leader([(cx0, cy), (1190, cy)], color="#6b7280"))
        out.append(label(1182, cy, txt, "end"))
    # blau 3/4: rechts, dann nach unten
    for num, txt, xl, ly in ((4, "blau 4 · Klemme 15", 1440, 845), (3, "blau 3 · Masse", 1470, 880)):
        _, cy, cx1 = bc[("R", num)]
        out.append(leader([(cx1, cy), (xl, cy), (xl, ly)]))
        out.append(label(xl - 12, ly, txt, "end"))
    # schwarz: rechts
    for num, txt, tail in ((4, "schwarz 4 · Wegsignal", "abgeglichen"), (3, "schwarz 3 · Masse", None),
                           (1, "schwarz 1 · Tankgeber (später)", None)):
        _, cy, cx1 = kc[("R", num)]
        out.append(leader([(cx1, cy), (1724, cy)], color=GREEN if num != 1 else "#6b7280"))
        out.append(label(1736, cy, txt, "start", tail))

    leg_svg, leg_h = legend(50, 950, col_w=420)
    out.append(leg_svg)
    out.append('<text x="50" y="1082" font-size="13.5" fill="#6b7280">Quelle: Forenliste (BMW-Syndikat, 2008), auf den wichtigsten Pins durch weitere Quellen bestätigt. Alles vor dem Anschließen am eigenen Kombi prüfen.</text>')
    out.append("</svg>")
    with open(os.path.join(HERE, fname), "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def main():
    common = ["Quelle: Forenliste (BMW-Syndikat, 2008), auf den wichtigsten Pins durch weitere Quellen bestätigt, nicht mit dem Schaltplan abgeglichen.",
              "Anordnung wie am Kombi aufgedruckt (Foto der Rückseite). Alles vor dem Anschließen am eigenen Kombi prüfen."]
    sheet("weiß", "Weißer Stecker, 26 Pins", "#faf7ee", "#9ca3af",
          ["Rückseite des Kombis. Oben links 26, oben rechts 13, unten links 14, unten rechts 1 (so steht es am Stecker).",
           "Linke Spalte von oben nach unten 26 bis 14, rechte Spalte 13 bis 1."],
          LEFT26, RIGHT26, 40, common, "pinout-weiss.svg")
    sheet("blau", "Blauer Stecker, 26 Pins", "#4f7fd1", "#2c4f94",
          ["Rückseite des Kombis. Oben steht 26 links und 13 rechts (Foto), unten 14 und 1 angenommen wie beim weißen Stecker.",
           "Linke Spalte von oben nach unten 26 bis 14, rechte Spalte 13 bis 1."],
          LEFT26, RIGHT26, 40, common, "pinout-blau.svg")
    sheet("schwarz", "Schwarzer Stecker, 12 Pins", "#3a3a3a", "#111111",
          ["Rückseite des Kombis. Oben links 12, oben rechts 6, unten links 7, unten rechts 1 (so steht es am Stecker).",
           "Linke Spalte von oben nach unten 12 bis 7, rechte Spalte 6 bis 1. Nur die Pins 1 bis 5 sind belegt."],
          LEFT12, RIGHT12, 58, common, "pinout-schwarz.svg")
    overview("kombi-uebersicht.svg")
    print("ok")


if __name__ == "__main__":
    sys.exit(main())
