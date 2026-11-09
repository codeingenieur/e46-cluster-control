#!/usr/bin/env python3
"""Generate the schematic (SVG), wiring list (CSV) and bill of materials (CSV)
for the E36 cluster interface board (Arduino Uno -> VDO 62.11-8 360 482).

Usage:  python make_schematic.py        (writes the files next to this script)

Single source of truth: the CHANNELS table below. The Uno pins come from
firmware-e36-uno/src/main.cpp, the cluster pins from docs/e36-pinout.md.
If a pin changes there, change it here and re-run.
"""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "Segoe UI, Helvetica, Arial, sans-serif"

# ---------------------------------------------------------------- data
# (name, Uno pin, cluster pin text, cluster connector, cluster pin, note)
SIGNALS = [
    ("rpm", "D9", "white 20", "J2", 20, "RPM square wave (calibrated)"),
    ("speed", "D10", "black 4", "J4", 4, "Speed square wave (calibrated), return = black 3"),
    ("coolant", "D6", "blue 18", "J3", 18, "Coolant sender, PWM (unverified), return = blue 17"),
    ("fuel", "D5", "black 1", "J4", 1, "Fuel sender, PWM (unverified), return = black 3"),
]
# U1 = first ULN2803A, U2 = second. Order = input 1..8.
LAMPS_U1 = [
    ("mil", "D2", "white 16", "J2", 16, "Check engine"),
    ("oilpress", "D3", "blue 19", "J3", 19, "Oil pressure"),
    ("handbrake", "D4", "white 17", "J2", 17, "Handbrake"),
    ("abs", "D7", "blue 11", "J3", 11, "ABS"),
    ("airbag", "D8", "white 14", "J2", 14, "Airbag"),
    ("brakefluid", "D11", "white 18", "J2", 18, "Brake fluid"),
    ("left", "D12", "white 4", "J2", 4, "Turn signal left"),
    ("right", "D13", "white 3", "J2", 3, "Turn signal right"),
]
LAMPS_U2 = [
    ("highbeam", "A0", "white 1", "J2", 1, "High beam"),
    ("fogfront", "A1", "blue 8", "J3", 8, "Front fog"),
    ("fogrear", "A2", "black 5", "J4", 5, "Rear fog"),
    ("belt", "A3", "blue 14", "J3", 14, "Seat belt"),
    ("asc", "A4", "blue 12", "J3", 12, "ASC"),
    ("cat", "A5", "white 26", "J2", 26, "Catalyst over-temperature"),
]
POWER_PINS = [
    ("KL30 (+12 V permanent)", "white 22", "J2", 22),
    ("KL15 (+12 V ignition)", "white 23", "J2", 23),
    ("KL15 (+12 V ignition)", "blue 4", "J3", 4),
    ("GND", "white 24", "J2", 24),
    ("GND", "blue 3", "J3", 3),
    ("GND", "black 3", "J4", 3),
    ("GND (coolant sender return)", "blue 17", "J3", 17),
]

# ---------------------------------------------------------------- bill of materials
# (ref, qty, value, description, order search term, note)
BOM = [
    ("U1,U2", 2, "ULN2803A", "8-channel Darlington driver, DIP-18", "ULN2803A DIP-18", "Lamp channels. STMicro or TI, any maker is fine"),
    ("U1,U2", 2, "DIP-18 socket", "IC socket, DIP-18, 7.62 mm", "IC Sockel DIP-18", "Recommended, then a dead chip is easy to swap"),
    ("Q1-Q4", 4, "IRLZ34N", "N-MOSFET logic level, TO-220", "IRLZ34N", "Must be the L type (logic level). IRFZ34N will NOT switch fully at 5 V. You may already own two"),
    ("R1,R3,R5,R7", 4, "1 kOhm", "Resistor 0.25 W, through hole", "Widerstand 1k 0,25W", "Gate resistors"),
    ("R2,R4,R6,R8", 4, "10 kOhm", "Resistor 0.25 W, through hole", "Widerstand 10k 0,25W", "Gate pull-downs"),
    ("R9-R26", 18, "470 Ohm", "Resistor 0.25 W, through hole", "Widerstand 470R 0,25W", "Series protection, one per cluster output. See README for the lamp channels"),
    ("R27,R28", 2, "2.2 kOhm", "Resistor 0.25 W, through hole", "Widerstand 2k2 0,25W", "LED series resistors for the 12 V indicator LEDs"),
    ("D1", 1, "1N5822", "Schottky diode 40 V 3 A, DO-201", "1N5822", "Reverse-polarity protection in the 12 V line (SB340 / SB560 also work)"),
    ("LED1,LED2", 2, "LED 3 mm", "LED, green and red", "LED 3mm gruen / rot", "12 V present / ignition (KL15) on"),
    ("F1", 1, "T2A fuse", "Fuse 5x20 mm, 2 A slow-blow", "Feinsicherung 5x20 T2A", "Plus the matching board fuse holder"),
    ("F1", 1, "Fuse holder", "Fuse holder 5x20 mm, board mount", "Sicherungshalter 5x20 Platine", ""),
    ("C1", 1, "470 uF 25 V", "Electrolytic capacitor, radial", "Elko 470uF 25V", "Buffers the 12 V rail. Mind the polarity (stripe = minus)"),
    ("C2", 1, "100 nF", "Ceramic capacitor, 50 V", "Kerko 100nF", ""),
    ("SW1", 1, "Toggle switch SPST", "Switch, at least 3 A at 12 V DC", "Kippschalter 1-polig EIN-AUS 3A", "Switches KL15 (ignition)"),
    ("J1", 1, "Screw terminal 2-pin", "5.08 mm pitch, board mount", "Schraubklemme 2-polig RM5,08", "12 V supply input (+, GND)"),
    ("J2,J3", 2, "Pin header 2x13", "2.54 mm, 26 pins", "Stiftleiste 2x13 RM2,54", "White and blue cluster side. Numbering 1:1 to the cluster pins"),
    ("J4", 1, "Pin header 2x6", "2.54 mm, 12 pins", "Stiftleiste 2x6 RM2,54", "Black cluster side"),
    ("X1", 1, "Arduino Uno proto shield", "Uno prototyping shield with stacking headers, or perfboard + 2.54 mm headers", "Arduino Uno Proto Shield", "Carries everything above, plugs on the Uno"),
    ("", 1, "Wire", "Solid-core wire 0.25 mm2 or jumper wires", "Schaltdraht", "Plus 12 V supply wire in 0.75 mm2 (red/black)"),
    ("C3,C4 (optional)", 2, "1 uF 16 V film", "Film or ceramic capacitor, DNP", "Folienkondensator 1uF", "Optional low-pass on the coolant/fuel outputs. NOT fitted by default, only if the needle jitters"),
    ("", 1, "Multimeter", "Digital multimeter", "Multimeter digital", "Not a board part, but required before connecting the cluster (backlog)"),
]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- SVG helpers
class Svg:
    def __init__(self, w, h):
        self.w, self.h, self.o = w, h, []

    def add(self, s):
        self.o.append(s)

    def line(self, x1, y1, x2, y2, c="#111827", w=2):
        self.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>')

    def poly(self, pts, c="#111827", w=2, fill="none"):
        p = " ".join(f"{x},{y}" for x, y in pts)
        self.add(f'<polyline points="{p}" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>')

    def rect(self, x, y, w, h, fill="#fff", stroke="#111827", sw=2, rx=0):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def text(self, x, y, s, size=13, anchor="start", weight="400", fill="#111827"):
        self.add(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" fill="{fill}">{esc(s)}</text>')

    def dot(self, x, y):
        self.add(f'<circle cx="{x}" cy="{y}" r="3.5" fill="#111827"/>')

    def circle(self, x, y, r=4, fill="#fff"):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="#111827" stroke-width="2"/>')

    def gnd(self, x, y):
        self.line(x, y, x, y + 8)
        self.line(x - 10, y + 8, x + 10, y + 8)
        self.line(x - 6, y + 13, x + 6, y + 13)
        self.line(x - 2, y + 18, x + 2, y + 18)

    def res_h(self, x, y, label, value, above=True):
        """Horizontal resistor, left end at x, centre line y, 60 wide."""
        self.line(x, y, x + 10, y)
        self.rect(x + 10, y - 6, 40, 12)
        self.line(x + 50, y, x + 60, y)
        ty = y - 11 if above else y + 22
        self.text(x + 30, ty, f"{label} {value}", 11.5, "middle")

    def res_v(self, x, y, label, value, left=False):
        """Vertical resistor, top end at y, 60 long."""
        self.line(x, y, x, y + 10)
        self.rect(x - 6, y + 10, 12, 40)
        self.line(x, y + 50, x, y + 60)
        if left:
            self.text(x - 12, y + 33, f"{label} {value}", 11.5, "end")
        else:
            self.text(x + 12, y + 33, f"{label} {value}", 11.5)

    def netlabel(self, x, y, s, side="right", fill="#0f766e"):
        """Pin label with a small flag. side='right' = text to the right of x."""
        if side == "right":
            self.poly([(x, y), (x + 8, y - 8), (x + 8 + 8 * 0, y - 8)], fill, 0)
            self.rect(x, y - 10, 0, 0, "none", "none", 0)
            self.text(x + 8, y + 4.5, s, 13, "start", "600", fill)
        else:
            self.text(x - 8, y + 4.5, s, 13, "end", "600", fill)

    def render(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
                f'font-family="{FONT}" role="img" aria-label="Schematic: Arduino Uno interface for the E36 cluster">\n'
                f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>\n' + "\n".join(self.o) + "\n</svg>\n")


def section(s, x, y, w, h, title):
    s.rect(x, y, w, h, "none", "#9ca3af", 1.2, 6)
    s.text(x + 12, y + 20, title, 14, "start", "700", "#374151")


def mosfet(s, gx, yc):
    """N-MOSFET, gate wire end at (gx, yc). Returns (drain_xy, source_xy)."""
    s.line(gx, yc, gx + 16, yc)
    s.line(gx + 16, yc - 16, gx + 16, yc + 16)              # gate plate
    for a, b in ((-16, -9), (-5, 5), (9, 16)):
        s.line(gx + 23, yc + a, gx + 23, yc + b)           # channel
    s.line(gx + 23, yc - 13, gx + 46, yc - 13)              # drain
    s.line(gx + 23, yc + 13, gx + 46, yc + 13)              # source
    s.line(gx + 23, yc, gx + 46, yc)                        # body
    s.poly([(gx + 30, yc - 4), (gx + 23, yc), (gx + 30, yc + 4)], fill="#111827")
    s.line(gx + 46, yc, gx + 46, yc + 13)
    return (gx + 46, yc - 13), (gx + 46, yc + 13)


# ---------------------------------------------------------------- schematic
def build_svg():
    W, H = 1560, 1420
    s = Svg(W, H)
    s.text(30, 38, "E36 cluster interface: Arduino Uno -> VDO 62.11-8 360 482", 22, "start", "700")
    s.text(30, 60, "All cluster outputs pull the cluster pin to ground (low-side switch). The Uno is powered by USB only, "
                   "12 V never goes to the Uno (no VIN, no 5V).", 13, "start", "400", "#4b5563")
    s.text(30, 78, "Net labels with the same name are connected. Cluster pins use the numbers printed on the cluster "
                   "(white = J2, blue = J3, black = J4).", 13, "start", "400", "#4b5563")

    # ---- 1 power
    section(s, 20, 95, 1520, 200, "1  Power (bench supply 12 V)")
    x0, y0 = 110, 190
    s.circle(x0, y0 - 25); s.circle(x0, y0 + 40)
    s.text(x0 - 12, y0 - 20, "J1 +12 V", 12.5, "end", "600"); s.text(x0 - 12, y0 + 45, "J1 GND", 12.5, "end", "600")
    s.line(x0 + 4, y0 - 25, x0 + 60, y0 - 25)
    s.rect(x0 + 60, y0 - 33, 60, 16)                       # fuse
    s.line(x0 + 60, y0 - 25, x0 + 120, y0 - 25)
    s.text(x0 + 90, y0 - 40, "F1 T2A", 12, "middle")
    s.line(x0 + 120, y0 - 25, x0 + 150, y0 - 25)          # diode (anode left)
    s.poly([(x0 + 150, y0 - 37), (x0 + 150, y0 - 13), (x0 + 172, y0 - 25)], fill="#111827")
    s.line(x0 + 174, y0 - 37, x0 + 174, y0 - 13)
    s.text(x0 + 162, y0 - 44, "D1 1N5822", 12, "middle")
    kx = x0 + 330
    s.line(x0 + 174, y0 - 25, kx, y0 - 25)
    s.dot(x0 + 240, y0 - 25)
    s.text(x0 + 252, y0 - 31, "KL30", 13, "start", "700", "#b91c1c")
    # C1/C2 + LED1 branch from KL30 at x0+240 / +270 / +300
    for bx, kind in ((x0 + 240, "C"), (x0 + 340, "c"), (x0 + 440, "L")):
        s.dot(bx, y0 - 25)
        if kind == "C":
            s.line(bx, y0 - 25, bx, y0 + 5); s.line(bx - 10, y0 + 5, bx + 10, y0 + 5)
            s.line(bx - 10, y0 + 13, bx + 10, y0 + 13); s.line(bx, y0 + 13, bx, y0 + 25)
            s.text(bx + 14, y0 + 8, "C1 470uF", 11.5); s.text(bx + 14, y0 + 22, "(+ at top)", 11)
            s.gnd(bx, y0 + 25)
        elif kind == "c":
            s.line(bx, y0 - 25, bx, y0 + 5); s.line(bx - 10, y0 + 5, bx + 10, y0 + 5)
            s.line(bx - 10, y0 + 12, bx + 10, y0 + 12); s.line(bx, y0 + 12, bx, y0 + 25)
            s.text(bx + 14, y0 + 12, "C2 100nF", 11.5)
            s.gnd(bx, y0 + 25)
        else:
            s.res_v(bx, y0 - 25, "R27", "2.2k")
            s.poly([(bx - 8, y0 + 42), (bx + 8, y0 + 42), (bx, y0 + 56)], fill="#111827")
            s.line(bx - 8, y0 + 57, bx + 8, y0 + 57)
            s.text(bx + 14, y0 + 52, "LED1 green", 11.5)
            s.line(bx, y0 + 57, bx, y0 + 62)
            s.gnd(bx, y0 + 62)
    # KL30 -> switch -> KL15
    s.line(x0 + 440, y0 - 25, x0 + 540, y0 - 25)
    s.circle(x0 + 540, y0 - 25); s.line(x0 + 544, y0 - 25, x0 + 580, y0 - 38)   # switch blade
    s.circle(x0 + 600, y0 - 25)
    s.text(x0 + 570, y0 - 46, "SW1", 12, "middle")
    s.line(x0 + 604, y0 - 25, x0 + 720, y0 - 25)
    s.dot(x0 + 680, y0 - 25)
    s.text(x0 + 620, y0 - 8, "KL15", 13, "start", "700", "#b91c1c")
    s.res_v(x0 + 680, y0 - 25, "R28", "2.2k")
    s.poly([(x0 + 672, y0 + 42), (x0 + 688, y0 + 42), (x0 + 680, y0 + 56)], fill="#111827")
    s.line(x0 + 672, y0 + 57, x0 + 688, y0 + 57)
    s.text(x0 + 694, y0 + 52, "LED2 red", 11.5)
    s.line(x0 + 680, y0 + 57, x0 + 680, y0 + 62); s.gnd(x0 + 680, y0 + 62)
    # ground rail from J1
    s.line(x0 + 4, y0 + 40, x0 + 40, y0 + 40); s.gnd(x0 + 40, y0 + 40)
    # outputs text (right)
    rx = x0 + 830
    s.text(rx, y0 - 28, "KL30  ->  white 22", 13, "start", "600", "#b91c1c")
    s.text(rx, y0 - 8, "KL15  ->  white 23 and blue 4  (blue 5 left open)", 13, "start", "600", "#b91c1c")
    s.text(rx, y0 + 12, "GND   ->  white 24, blue 3, blue 17, black 3 and Uno GND", 13, "start", "600", "#374151")
    s.text(rx, y0 + 40, "Not connected on purpose: KL R (white 15, blue 16), blue 5 and 6 (charge lamp),", 12, "start", "400", "#6b7280")
    s.text(rx, y0 + 56, "cluster outputs blue 2, 9, 10, 24.", 12, "start", "400", "#6b7280")

    # ---- 2 signals
    section(s, 20, 310, 760, 550, "2  Signal outputs: IRLZ34N low-side switch (RPM and speed proven on the real cluster)")
    for i, (name, uno, cpin, conn, pin, note) in enumerate(SIGNALS):
        yc = 400 + i * 116
        n = i * 2
        s.text(40, yc + 4, f"{uno}", 14, "start", "700", "#1d4ed8")
        s.text(40, yc + 20, name, 11.5, "start", "400", "#6b7280")
        s.res_h(82, yc, f"R{n + 1}", "1k")
        gx = 142
        s.dot(gx, yc)
        s.line(gx, yc, gx, yc + 20)
        s.res_v(gx, yc + 4, f"R{n + 2}", "10k", left=True)
        s.gnd(gx, yc + 64)
        d, src = mosfet(s, gx, yc)
        s.text(gx + 62, yc + 4, f"Q{i + 1}", 12, "start", "600")
        s.line(src[0], src[1], src[0], src[1] + 22)
        s.gnd(src[0], src[1] + 22)
        # drain -> up -> Rs -> label
        s.line(d[0], d[1], d[0], yc - 36)
        s.line(d[0], yc - 36, d[0] + 20, yc - 36)
        s.res_h(d[0] + 20, yc - 36, f"R{9 + i}", "470")
        ex = d[0] + 80
        s.line(ex, yc - 36, ex + 40, yc - 36)
        s.text(ex + 48, yc - 31, f"{cpin}  ({conn}-{pin})", 13, "start", "600", "#0f766e")
        s.text(ex + 48, yc - 14, note, 11, "start", "400", "#6b7280")
    s.text(220, 846, "Optional (not fitted): C3/C4 1 uF from the coolant and fuel output to GND, only if the needle jitters.", 11.5, "start", "400", "#6b7280")

    # ---- 3 lamps
    def uln(x, y, title, ref, lamps, first_r):
        h = 8 * 46 + 60
        s.rect(x, y, 200, h, "#f9fafb", "#111827", 2.4, 4)
        s.text(x + 100, y + 20, f"{ref} ULN2803A", 14, "middle", "700")
        for k in range(8):
            py = y + 50 + k * 46
            s.line(x - 70, py, x, py)
            s.text(x + 8, py + 4, f"{k + 1}  IN", 11.5)
            s.text(x + 192, py + 4, f"OUT  {18 - k}", 11.5, "end")
            if k < len(lamps):
                name, uno, cpin, conn, pin, note = lamps[k]
                s.text(x - 76, py + 4, f"{uno}  {name}", 12.5, "end", "700", "#1d4ed8")
                s.line(x + 200, py, x + 230, py)
                s.res_h(x + 230, py, f"R{first_r + k}", "470")
                s.line(x + 290, py, x + 320, py)
                s.text(x + 328, py + 4.5, f"{cpin}  ({conn}-{pin})", 13, "start", "600", "#0f766e")
            else:
                s.text(x - 80, py + 4, "unused, to GND", 11.5, "end", "400", "#6b7280")
                s.gnd(x - 70, py)
        s.text(x + 100, y + h - 14, "pin 9 GND, pin 10 open", 11, "middle", "400", "#6b7280")
        s.line(x + 100, y + h, x + 100, y + h + 6); s.gnd(x + 100, y + h + 6)

    section(s, 800, 310, 740, 1080, "3  Lamp outputs: two ULN2803A (14 of 16 channels used)")
    # Right panel too narrow for two ICs side by side with labels: stack vertically
    uln(960, 350, "U1", "U1", LAMPS_U1, 13)
    uln(960, 800, "U2", "U2", LAMPS_U2, 21)
    s.text(830, 1330, "Each lamp line: Uno pin -> ULN input (internal 2.7 kOhm and pull-down, no extra parts),", 12, "start", "400", "#6b7280")
    s.text(830, 1348, "ULN output -> 470 Ohm -> cluster pin. The ULN pulls the pin to about 1 V (Darlington).", 12, "start", "400", "#6b7280")
    s.text(830, 1366, "The 470 Ohm makes the lamps glow dim. After the polarity test, bridge the resistor (wire) per lamp.", 12, "start", "400", "#6b7280")

    # ---- 4 ground and rules
    section(s, 20, 880, 760, 510, "4  Notes")
    notes = [
        "Order of the build: power section first (no cluster plugged in), check LED1/LED2, then the signal outputs one by one.",
        "Check the supply polarity with the board: with reversed supply D1 blocks, LED1 stays dark and nothing is damaged.",
        "All grounds are one net: J1 GND, Uno GND, all MOSFET sources, ULN pin 9, cluster ground pins.",
        "Cluster pins are numbered as printed on the cluster (white 26/1/13 and 14/1, black 12/6 and 7/1). Check twice.",
        "Never connect the cluster outputs blue 2, 9, 10, 24 (they drive other equipment, not inputs).",
        "Gate pull-downs 10 kOhm go to GND (as built). The optional pull-up variant to 5 V is described in docs/e36-uno.md.",
        "Lamp polarity (pin to ground = lamp on) and the PWM coolant/fuel circuit are assumptions: verify with the multimeter.",
        "The Uno stays USB-powered. D13 drives the onboard LED too, the right turn signal may blink once at Uno reset. Harmless.",
        "Uno pins used: D2-D13 and A0-A5. D0/D1 stay free for USB.",
    ]
    for i, t in enumerate(notes):
        s.text(40, 920 + i * 24, f"{i + 1}.  {t}", 12.5, "start", "400", "#374151")
    # Uno block
    s.rect(40, 1170, 720, 200, "#f3f4f6", "#6b7280", 1.5, 6)
    s.text(60, 1190, "X1  Arduino Uno (plugs under the shield)", 14, "start", "700")
    s.text(60, 1214, "Uno pins: D2-D13, A0-A5 (as digital outputs), GND -> board ground", 12.5)
    s.text(60, 1236, "5V: not used (only for the optional pull-up variant)", 12.5)
    s.text(60, 1256, "VIN: never connect", 12.5, "start", "700", "#b91c1c")
    s.text(60, 1284, "18 outputs = 4 signals (MOSFET) + 14 lamps (ULN2803A).", 12.5)
    s.text(60, 1304, "Cluster side: J2 white 2x13, J3 blue 2x13, J4 black 2x6, numbered 1:1 as on the cluster.", 12.5)
    s.text(60, 1324, "J2/J3/J4 connect to the mating connectors (pigtails) of the cluster, see README.", 12.5)
    return s.render()


# ---------------------------------------------------------------- CSV
def write_wiring(path):
    rows = []
    for i, (name, uno, cpin, conn, pin, note) in enumerate(SIGNALS):
        rows.append((f"Q{i + 1}", name, uno, "IRLZ34N, R%d 1k, R%d 10k" % (2 * i + 1, 2 * i + 2),
                     f"R{9 + i} 470", cpin, f"{conn}-{pin}", note))
    for ref, lamps, first in (("U1", LAMPS_U1, 13), ("U2", LAMPS_U2, 21)):
        for k, (name, uno, cpin, conn, pin, note) in enumerate(lamps):
            rows.append((f"{ref} in{k + 1}/out{k + 1}", name, uno, "ULN2803A", f"R{first + k} 470", cpin, f"{conn}-{pin}", note))
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["driver", "function", "uno_pin", "parts", "series_resistor", "cluster_pin", "board_connector_pin", "note"])
        w.writerows(rows)
        w.writerow([])
        w.writerow(["power", "net", "", "", "", "cluster_pin", "board_connector_pin", ""])
        for net, cp, conn, pin in POWER_PINS:
            w.writerow(["", net, "", "", "", cp, f"{conn}-{pin}", ""])


def write_bom(path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ref", "qty", "value", "description", "search_term_shop", "note"])
        w.writerows(BOM)


if __name__ == "__main__":
    with open(os.path.join(HERE, "schematic.svg"), "w", encoding="utf-8") as f:
        f.write(build_svg())
    write_wiring(os.path.join(HERE, "wiring.csv"))
    write_bom(os.path.join(HERE, "bom.csv"))
    n = len(SIGNALS) + len(LAMPS_U1) + len(LAMPS_U2)
    print(f"channels: {n}")
