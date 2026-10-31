/* E46-Kombiinstrument, Variante "Jira": Drehzahlmesser = aktive Defects (0 bis 50), Kühlmittel = offene Nightrun-Tickets (Füllstand),
 * Tank = Sprint-Restzeit, Überhitzungsleuchte = NR (Nightrun-Überlauf). Sonst wie das Original.
 * Ursprünglich: E46 Kombiinstrument (Vorfacelift, vier Rundinstrumente) als SVG. Keine Abhängigkeiten.
 * Maße und Winkel sind an Fotos eines echten Kombis abgenommen (siehe web/README.md).
 *
 *   const c = new E46Cluster(document.getElementById('cluster'));
 *   c.set({ rpm: 3000, speed: 80, coolant: 90, fuel: 0.6, fco: 8 });   // Nadelziele
 *   c.setLamps({ mil: true, left: true });                              // Leuchten
 *   c.setLcd({ odo: '148213', trip: '0.3', clock: '20:44' });           // Mittendisplay
 *   c.frame(dtSekunden);                                                // je requestAnimationFrame
 */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent, text) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  const f2 = (n) => Math.round(n * 100) / 100;

  // Winkel in Grad, 0 = 12 Uhr, im Uhrzeigersinn positiv
  function pol(cx, cy, r, deg) {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }
  function arc(cx, cy, r, a0, a1) {
    const p0 = pol(cx, cy, r, a0), p1 = pol(cx, cy, r, a1);
    return 'M' + f2(p0[0]) + ' ' + f2(p0[1]) + 'A' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' + f2(p1[0]) + ' ' + f2(p1[1]);
  }
  /** Strich der Länge len, Mitte bei Abstand r vom Nabenmittelpunkt in Richtung deg, Ausrichtung radial */
  function tickLine(parent, cx, cy, r, deg, len, width, cls) {
    const a = pol(cx, cy, r + len / 2, deg), b = pol(cx, cy, r - len / 2, deg);
    return el('line', { class: 'tick ' + (cls || ''), 'stroke-width': width, x1: f2(a[0]), y1: f2(a[1]), x2: f2(b[0]), y2: f2(b[1]) }, parent);
  }
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  // Piktogramme in einem 40x40-Feld um (0,0)
  const ICONS = {
    mil: '<path d="M-16 -5H-9L-6 -11H6V-6H11L14 -3H19V8H14L11 11H-8L-12 7H-19V-1H-16Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    lab: '<path d="M-6 -16H6M-4.5 -16V-4L-15 12.5Q-17.5 16 -13.5 16H13.5Q17.5 16 15 12.5L4.5 -4V-16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M-9.5 5H9.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    cruise: '<path d="M-15 8A18 18 0 1 1 15 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M0 4L9 -9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle r="3.5" cy="4" fill="currentColor"/>',
    overheat: '<path d="M-3.5 -15a3.5 3.5 0 0 1 7 0V2.5a8 8 0 1 1 -7 0Z" fill="none" stroke="currentColor" stroke-width="3" transform="translate(-6 2)"/><path d="M5 -4h10M5 3h10M5 10h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    // Variante Jira: der Ölstand-Platz zeigt das BMW-Logo (Quadranten aus BMW_logo.svg, blau fest, weiß = Leuchtfarbe)
    oilwarn: '<g transform="scale(1.12) translate(-26.5 -26.5)"><path d="M26.5,10.8v15.7h-15.7c0-8.6,7-15.7,15.7-15.7Z" fill="#1f78d1"/><path d="M42.2,26.5c0,8.7-7,15.7-15.7,15.7v-15.7h15.7Z" fill="#1f78d1"/><path d="M42.2,26.5h-15.7v-15.7c8.7,0,15.7,7.1,15.7,15.7Z" fill="currentColor"/><path d="M26.5,42.2c-8.7,0-15.7-7-15.7-15.7h15.7v15.7Z" fill="currentColor"/></g>',
    battery: '<rect x="-17" y="-7" width="34" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 -7v-5h6v5M5 -7v-5h6v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 2.5h7M7.5 -1v7M4 2.5h7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
    oilpress: '<path d="M-17 -4H-6L-2 -11H6V-7H11L19 -13L21 -11L15 -3V6Q15 9 12 9H-12Q-17 9 -17 4Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="-1" cy="15" r="2.6" fill="currentColor"/><path d="M-1 0v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    // eigene Leuchten: arrk- und TT-Logo (aus arrk.svg / tt.svg) und das Jira-Defect-Symbol (rotes Quadrat mit ausgestanztem, durchsichtigem Kreis)
    arrk: '<polygon points="10.9,-17 -15.2,16.9 -4.9,16.9 5.4,3.2 7.2,16.9 15.2,16.9" fill="currentColor"/>',
    tt: '<g transform="scale(.25) translate(-307 -277)"><path d="M333.6,327.3c0-7.4,0-14.2,0-21c0-15,0-29.9,0-44.9c0-9-2.4-11.5-11.6-11.5c-19.6-0.1-39.3,0-58.9,0c-2,0-3.9-0.2-5.8-0.3c-1.7-19.3,17-40.3,35.7-40.4c24.3-0.1,48.6,0,72.9,0c6.8,0,9.1,2.4,9.1,9.4c0,23.1-0.2,46.2,0.1,69.3c0.2,12.6-4.9,22.1-14.5,29.6C352.9,323.5,344.2,326.7,333.6,327.3z" fill="currentColor"/><path d="M263.7,344.5c-5.8,0-11.6-0.1-17.5,0c-4.6,0.1-7.3-2.6-7.3-6.5c-0.1-12.8-0.4-25.6,0.8-38.3c0.9-9.9,9.4-16.7,19.2-16.9c11.6-0.3,23.3-0.2,34.9-0.1c5.1,0.1,7.2,2.3,7.3,7.4c0.1,11.3,0.2,22.6,0,33.9c-0.2,11.5-9.4,20.3-20.9,20.4C274.7,344.6,269.2,344.5,263.7,344.5z" fill="currentColor"/></g>',
    defect: '<path fill-rule="evenodd" d="M-11 -17H11A6 6 0 0 1 17 -11V11A6 6 0 0 1 11 17H-11A6 6 0 0 1 -17 11V-11A6 6 0 0 1 -11 -17ZM0 -8.5A8.5 8.5 0 1 0 0 8.5A8.5 8.5 0 1 0 0 -8.5Z" fill="currentColor"/>',
    // Variante Jira: NR (Nightrun-Überlauf) als roter Schriftzug, Mond für Nightrun, Sanduhr für die Sprint-Restzeit
    nr: '<text y="12.6" text-anchor="middle" font-size="31" font-weight="700" fill="currentColor">NR</text>',
    hourglass: '<path d="M-9 -14H9M-9 14H9" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M-7 -14C-7 -4 -1 -1.5 0 0C-1 1.5 -7 4 -7 14M7 -14C7 -4 1 -1.5 0 0C1 1.5 7 4 7 14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-4.2 13L0 6L4.2 13Z" fill="currentColor"/>',
    // Variante Jira: Auto von oben im Feld links vom Display. Die vier Türen stehen für die Pipeline-Stufen Dev, Test, Staging, Prod
    door_dev: '<path d="M20 -19L1.6 -34.4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_test: '<path d="M-9 -19L-27.4 -34.4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_stage: '<path d="M20 19L1.6 34.4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_prod: '<path d="M-9 19L-27.4 34.4" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    // Weihnachtsmodus: Tannenbaum statt Batterieleuchte (Stern gelb, Baum in der Leuchtfarbe)
    tree: '<g transform="scale(.88)"><path d="M0 -15L8 -5H4L11 4H5L13 13H-13L-5 4H-11L-4 -5H-8Z" fill="currentColor"/><rect x="-2.6" y="12.5" width="5.2" height="6" fill="currentColor"/><path d="M0 -23.5L1.7 -19.4L6 -19.2L2.7 -16.4L3.8 -12.2L0 -14.6L-3.8 -12.2L-2.7 -16.4L-6 -19.2L-1.7 -19.4Z" fill="#ffd23a"/></g>',
    // Osterhase (Umriss wie die übrigen Leuchten) und Sektglas für Ostern und Silvester
    bunny: '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M-8 -3C-12 -12 -10 -19 -6 -19C-2 -19 -2 -10 -3 -3"/><path d="M8 -3C12 -12 10 -19 6 -19C2 -19 2 -10 3 -3"/><ellipse cy="5" rx="11" ry="9.5"/><path d="M-6 10L-15 9M-6 12L-14 14M6 10L15 9M6 12L14 14" stroke-width="1.6"/></g><circle cx="-4" cy="3" r="1.9" fill="currentColor"/><circle cx="4" cy="3" r="1.9" fill="currentColor"/><circle cy="8" r="1.7" fill="currentColor"/>',
    flute: '<path d="M-5.4 -8H5.4L4.5 3Q4.5 8 0 8Q-4.5 8 -4.5 3Z" fill="currentColor" opacity=".35"/><path d="M-6 -16H6L4.5 3Q4.5 8 0 8Q-4.5 8 -4.5 3Z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M0 8V16M-6.5 16.5H6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="-1" cy="-2" r="1.4" fill="currentColor"/><circle cx="1.6" cy="-6" r="1.2" fill="currentColor"/><circle cx="-1.2" cy="2.6" r="1.1" fill="currentColor"/><path d="M10 -14L12 -17M13 -10L16 -11M9 -18L9 -21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    // Symbole der weiteren Anlässe (Umrisse wie die übrigen Leuchten): Narrenkappe, Clown, Maibaum, Maßkrug, Kürbis
    jester: '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M-14 9C-16 -3 -12 -12 -10 -17C-6 -10 -4 -6 0 -4C4 -6 6 -10 10 -17C12 -12 16 -3 14 9Z"/><path d="M0 -4C-1 -11 1 -15 0 -19"/><path d="M-15 9H15"/></g><circle cx="-10" cy="-18.5" r="2.4" fill="currentColor"/><circle cx="10" cy="-18.5" r="2.4" fill="currentColor"/><circle cy="-20.5" r="2.4" fill="currentColor"/><circle cx="-6" cy="3" r="1.5" fill="currentColor"/><circle cx="6" cy="3" r="1.5" fill="currentColor"/><circle cy="-1" r="1.3" fill="currentColor"/>',
    clown: '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><circle cy="3" r="12"/><path d="M-6 9Q0 14 6 9"/><circle cx="-14" cy="-6" r="4.5"/><circle cx="14" cy="-6" r="4.5"/></g><circle cy="4" r="3.6" fill="currentColor"/><circle cx="-4.6" cy="-1" r="1.7" fill="currentColor"/><circle cx="4.6" cy="-1" r="1.7" fill="currentColor"/>',
    maypole: '<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M0 -18V18M-8 18H8"/><ellipse cy="-14" rx="7.5" ry="3"/><path d="M0 -12C-8 -2 -12 6 -14 16M0 -12C8 -2 12 6 14 16M0 -12C-3 -2 -5 8 -6 16M0 -12C3 -2 5 8 6 16" stroke-width="1.8"/></g>',
    mug: '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M-8 -10H8V12Q8 15 5 15H-5Q-8 15 -8 12Z"/><path d="M8 -6H13Q16 -6 16 -3V8Q16 11 13 11H8"/><path d="M-9 -10Q-9 -16 -4 -15Q-1 -19 3 -15Q9 -16 9 -10"/></g><path d="M-7 -4H7V12Q7 14 5 14H-5Q-7 14 -7 12Z" fill="currentColor" opacity=".3"/>',
    pumpkin: '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cy="4" rx="14" ry="11"/><path d="M-5 -6Q-8 4 -5 14M5 -6Q8 4 5 14"/><path d="M0 -7V-13L3 -16"/><path d="M-7 9L-4 7L-1 9L2 7L5 9L7 7" stroke-width="2"/></g><path d="M-8 1L-4 1L-6 -3ZM4 1L8 1L6 -3Z" fill="currentColor"/>',
    // nur Zifferblatt-Symbole
    // Zapfsäule: Körper um x=0 zentriert, Schlauch rechts (Maße vom Foto: 30 breit, 30 hoch)
    pump: '<rect x="-9" y="-15" width="18" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="-9" y="-2" width="18" height="13" fill="currentColor"/><rect x="-12" y="11" width="24" height="4" fill="currentColor"/><path d="M9 -8H14Q18 -8 18 -4V9Q18 13 14.5 13Q11.5 13 11.5 9.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    // Thermometer mit Wellen, um x=0 zentriert (35 breit, 32 hoch)
    therm: '<path d="M-3 2V-12.4a3 3 0 0 1 6 0V2" fill="none" stroke="currentColor" stroke-width="3.2"/><circle cy="5" r="5.4" fill="currentColor"/><path d="M4.6 -10h5M4.6 -5.5h5M4.6 -1h5" stroke="currentColor" stroke-width="2.4"/><path d="M-18 12.5q3 -3.2 6 0t6 0t6 0t6 0t6 0t6 0M-18 18.5q3 -3.2 6 0t6 0t6 0t6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  };
  const LAMP_META = {
    mil: ['amber', 'Motorkontrollleuchte'],
    lab: ['red', 'Labor'],
    cruise: ['green', 'Tempomat'],
    nr: ['red', 'NR: Nightrun-Überlauf'],
    oilwarn: ['bmw', 'BMW'],
    battery: ['red', 'Ladekontrolle'],
    oilpress: ['red', 'Öldruck'],
    arrk: ['blue', 'arrk'],
    tt: ['orange', 'TT'],
    defect: ['red', 'Jira: Defect'],
    door_dev: ['red', 'Dev: Tür offen'],
    door_test: ['red', 'Test: Tür offen'],
    door_stage: ['red', 'Staging: Tür offen'],
    door_prod: ['red', 'Prod: Tür offen'],
  };
  // Lage in der Leuchtenleiste: [x, y, Skalierung]
  const LAMP_POS = {
    mil: [800, 95, 0.95],
    arrk: [205, 542, 1.15], tt: [280, 542, 1.0], oilwarn: [355, 542, 1.0],   // eine Reihe, spiegelbildlich zu lab / nr / defect rechts
    battery: [1026, 542, 1.0], cruise: [1101, 547, 1.0],   // zwei Leuchten im Feld rechts neben dem Display, Abstand wie bei den anderen Gruppen
    lab: [1245, 542, 1.0], nr: [1320, 542, 1.0], defect: [1395, 542, 1.0],
    door_dev: [537, 546, 1.0], door_test: [537, 546, 1.0], door_stage: [537, 546, 1.0], door_prod: [537, 546, 1.0],
  };

  // Jahreszeiten-Modi: welches Symbol die Batterieleuchte ersetzt, [Symbol, Leuchtfarbe, Titel]
  const SEASON_LAMP = {
    xmas: ['tree', 'green', 'Weihnachtsbaum'], easter: ['bunny', 'pink', 'Osterhase'], nye: ['flute', 'gold', 'Sektglas'],
    karneval: ['jester', 'purple', 'Narrenkappe'], aprilscherz: ['clown', 'red', 'Clown'], maibaum: ['maypole', 'green', 'Maibaum'],
    oktoberfest: ['mug', 'amber', 'Maßkrug'], halloween: ['pumpkin', 'orange', 'Kürbis'],
  };
  const EGG = 'M0 -10.5C6 -10.5 8.6 -1 8.6 3.5C8.6 8 5 11 0 11C-5 11 -8.6 8 -8.6 3.5C-8.6 -1 -6 -10.5 0 -10.5Z';
  const STAR = 'M0 -8L2 -2.75L7.6 -2.47L3.23 1.05L4.7 6.47L0 3.4L-4.7 6.47L-3.23 1.05L-7.6 -2.47L-2 -2.75Z';

  // 5x7-Punktmatrix für das Mittendisplay (Zeilen von oben, 1 = Punkt an)
  const GLYPH = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    ':': ['0', '0', '1', '0', '1', '0', '0'],
    '.': ['0', '0', '0', '0', '0', '0', '1'],
    'k': ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
    'm': ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
    ' ': ['00', '00', '00', '00', '00', '00', '00'],
  };

  // Geometrie (viewBox 1600 x 650), Maße aus Foto abgenommen
  const R = 205;                 // Zifferblatt inkl. Vertiefungsring
  const RF = 198;                // Zifferblattfläche
  const CUT = 181;               // Zifferblatt unten flach abgeschnitten (0,884 R unter der Nabe)
  const SPEEDO = { cx: 578, cy: 296 }, TACHO = { cx: 1022, cy: 296 };
  const FUEL = { cx: 244, cy: 434 }, COOL = { cx: 1356, cy: 434 };
  const STRIP_Y = 497, STRIP_H = 94;

  // Außenform und Platte: je eine glatte Kurve pro Hälfte (von der Scheitelmitte bis zum Beginn des flachen Bodens, dort Krümmung 0),
  // links/rechts gespiegelt, als Bézier-Stücke ausgegeben: die Krümmung ist überall stetig. Die Außenkante ist an die am
  // Frontfoto gemessene Kontur angepasst. Die Platte ist über ihre Krümmung definiert (steigt vom Scheitel gleichmäßig an, fällt
  // zum flachen Boden auf null ab, keine Wellen) und an die Linie angepasst, die der Nutzer auf das Foto gezeichnet hat; über
  // beiden Zifferblättern bleibt etwa 15 Abstand. Die Außenkante der Leuchtenfelder ist eine Parallelkurve zur Platte (Abstand 14).
  const SILHOUETTE = 'M800 -33C867.6 -33 937.4 -29.9 1005.5 -22.1C1073.7 -14.4 1140.3 -2.1 1205.8 17.1C1271.4 36.4 1335.9 62.6 1393.4 100C1451 137.5 1501.5 186.3 1535.4 245.1C1569.3 303.9 1586.6 372.9 1576.2 441.4C1565.8 509.8 1527.6 577.9 1468.7 612C1409.7 646 1329.9 646 1271.9 646L328.1 646C270.1 646 190.3 646 131.3 612C72.4 577.9 34.2 509.8 23.8 441.4C13.4 372.9 30.7 303.9 64.6 245.1C98.5 186.3 149 137.5 206.6 100C264.1 62.6 328.6 36.4 394.2 17.1C459.7 -2.1 526.3 -14.4 594.5 -22.1C662.6 -29.9 732.4 -33 800 -33Z';
  const PLATE = 'M800 54.9C839.9 54.9 879.9 56.6 919.8 60.1C959.6 63.6 999.2 69 1038.5 76.4C1077.7 83.9 1116.7 93.4 1154.9 105.1C1193.1 116.8 1230.7 130.6 1267.1 147.1C1303.5 163.7 1338.7 183.1 1371.7 205.6C1404.6 228.2 1435.1 253.9 1460.8 284.9C1486.4 315.9 1507.3 352.2 1516.6 390.6C1526 428.9 1523.9 469.4 1506.4 505.7C1488.9 541.9 1456 574 1419 590C1382.1 606 1341.1 606 1303.9 606L296.1 606C258.9 606 217.9 606 181 590C144 574 111.1 541.9 93.6 505.7C76.1 469.4 74 428.9 83.4 390.6C92.7 352.2 113.6 315.9 139.2 284.9C164.9 253.9 195.4 228.2 228.3 205.6C261.3 183.1 296.5 163.7 332.9 147.1C369.3 130.6 406.9 116.8 445.1 105.1C483.3 93.4 522.3 83.9 561.5 76.4C600.8 69 640.4 63.6 680.2 60.1C720.1 56.6 760.1 54.9 800 54.9Z';
  const PANEL_EDGE = 'M800 68.9C811.5 68.9 823 69 834.6 69.3C846.1 69.6 857.6 70 869.1 70.6C880.6 71.2 892.1 71.9 903.6 72.8C915 73.7 926.5 74.7 938 75.9C949.4 77.1 960.9 78.4 972.3 80C983.7 81.5 995.1 83.1 1006.5 85C1017.8 86.8 1029.2 88.9 1040.5 91.1C1051.8 93.3 1063.1 95.6 1074.3 98.2C1085.5 100.7 1096.7 103.4 1107.9 106.3C1119 109.2 1130.1 112.3 1141.2 115.6C1152.2 118.8 1163.2 122.3 1174.1 125.9C1185.1 129.5 1195.9 133.3 1206.7 137.4C1217.5 141.4 1228.2 145.6 1238.9 150.1C1249.5 154.6 1260 159.2 1270.4 164.1C1280.8 169 1291.2 174.2 1301.3 179.6C1311.5 185 1321.6 190.6 1331.5 196.5C1341.3 202.4 1351.1 208.6 1360.6 215C1370.1 221.5 1379.5 228.2 1388.6 235.3C1397.7 242.3 1406.6 249.7 1415.1 257.5C1423.6 265.2 1431.8 273.3 1439.6 281.8C1447.3 290.4 1454.7 299.3 1461.5 308.5C1468.2 317.8 1474.6 327.5 1480.2 337.5C1485.8 347.6 1491 358 1495.1 368.7C1499.2 379.4 1502.6 390.6 1504.8 401.8C1507 413.1 1508.2 424.7 1508.1 436.2C1508 447.6 1506.7 459.3 1504.1 470.4C1501.4 481.5 1497.3 492.6 1492.2 502.7C1487 512.9 1480.4 522.6 1473.1 531.5C1465.8 540.3 1457.5 548.6 1448.5 555.7C1439.6 562.8 1429.8 569.3 1419.5 574.3C1409.3 579.3 1398.1 583 1387 585.7C1375.9 588.5 1364.3 589.7 1352.8 590.7C1341.4 591.8 1329.8 591.8 1318.3 592C1306.8 592.2 1295.3 592 1283.8 592C1272.2 592 1260.7 592 1249.2 592C1237.7 592 1226.2 592 1214.6 592C1203.1 592 1191.6 592 1180.1 592C1168.6 592 1157.1 592 1145.5 592C1134 592 1122.5 592 1111 592C1099.5 592 1087.9 592 1076.4 592C1064.9 592 1053.4 592 1041.9 592C1030.4 592 1018.8 592 1007.3 592C995.8 592 984.3 592 972.8 592C961.3 592 949.7 592 938.2 592C926.7 592 915.2 592 903.7 592C892.1 592 880.6 592 869.1 592C857.6 592 846.1 592 834.6 592C823 592 811.5 592 800 592C788.5 592 777 592 765.4 592C753.9 592 742.4 592 730.9 592C719.4 592 707.9 592 696.3 592C684.8 592 673.3 592 661.8 592C650.3 592 638.7 592 627.2 592C615.7 592 604.2 592 592.7 592C581.2 592 569.6 592 558.1 592C546.6 592 535.1 592 523.6 592C512.1 592 500.5 592 489 592C477.5 592 466 592 454.5 592C442.9 592 431.4 592 419.9 592C408.4 592 396.9 592 385.4 592C373.8 592 362.3 592 350.8 592C339.3 592 327.8 592 316.2 592C304.7 592 293.2 592.2 281.7 592C270.2 591.8 258.6 591.8 247.2 590.7C235.7 589.7 224.1 588.5 213 585.7C201.9 583 190.7 579.3 180.5 574.3C170.2 569.3 160.4 562.8 151.5 555.7C142.5 548.6 134.2 540.3 126.9 531.5C119.6 522.6 113 512.9 107.8 502.7C102.7 492.6 98.6 481.5 95.9 470.4C93.3 459.3 92 447.6 91.9 436.2C91.8 424.7 93 413.1 95.2 401.8C97.4 390.6 100.8 379.4 104.9 368.7C109 358 114.2 347.6 119.8 337.5C125.4 327.5 131.8 317.8 138.5 308.5C145.3 299.3 152.7 290.4 160.4 281.8C168.2 273.3 176.4 265.2 184.9 257.5C193.4 249.7 202.3 242.3 211.4 235.3C220.5 228.2 229.9 221.5 239.4 215C248.9 208.6 258.7 202.4 268.5 196.5C278.4 190.6 288.5 185 298.7 179.6C308.8 174.2 319.2 169 329.6 164.1C340 159.2 350.5 154.6 361.1 150.1C371.8 145.6 382.5 141.4 393.3 137.4C404.1 133.3 414.9 129.5 425.9 125.9C436.8 122.3 447.8 118.8 458.8 115.6C469.9 112.3 481 109.2 492.1 106.3C503.3 103.4 514.5 100.7 525.7 98.2C536.9 95.6 548.2 93.3 559.5 91.1C570.8 88.9 582.2 86.8 593.5 85C604.9 83.1 616.3 81.5 627.7 80C639.1 78.4 650.6 77.1 662 75.9C673.5 74.7 685 73.7 696.4 72.8C707.9 71.9 719.4 71.2 730.9 70.6C742.4 70 753.9 69.6 765.4 69.3C777 69 788.5 68.9 800 68.9Z';

  /** Ostersonntag (Gauß/Meeus), als Date */
  function easterSunday(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  /** Anlass zu einem Datum (für season="auto"), '' wenn heute keiner ist */
  function seasonForDate(d) {
    const m = d.getMonth() + 1, day = d.getDate();
    const dayNo = (x) => Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5);
    const k = dayNo(d), e = dayNo(easterSunday(d.getFullYear()));
    if (k >= e - 52 && k <= e - 46) return 'karneval';      // Weiberfastnacht bis Aschermittwoch
    if (k >= e - 2 && k <= e + 1) return 'easter';          // Karfreitag bis Ostermontag
    if (m === 4 && day === 1) return 'aprilscherz';
    if ((m === 4 && day >= 28) || (m === 5 && day === 1)) return 'maibaum';
    if ((m === 9 && day >= 13) || (m === 10 && day <= 4)) return 'oktoberfest';
    if (m === 10 && day === 31) return 'halloween';
    if (m === 12 && day <= 26) return 'xmas';
    if (m === 12 && day >= 27) return 'nye';
    if (m === 1 && day <= 2) return 'nye';
    return '';
  }

  class E46Cluster {
    constructor(host) {
      this.svg = el('svg', {
        viewBox: '-40 -90 1680 800', class: 'cluster', role: 'img',
        'aria-label': 'BMW E46 Kombiinstrument',
      });
      host.appendChild(this.svg);
      this.needles = {};
      this.lamps = {};
      this._lcdLast = {};
      this._build();
      this.setPower(true);
      this.setLight({ night: false, dim: 0.85 });
      this.svg.style.setProperty('--dot-on', '#ffb383');
      this.svg.style.setProperty('--dot-off', '#9a1914');
    }

    // ---------- Aufbau ----------

    _defs() {
      const d = this.defs = el('defs', null, this.svg);
      const lin = (id, x1, y1, x2, y2, stops) => {
        const g = el('linearGradient', { id, x1, y1, x2, y2 }, d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g));
        return g;
      };
      const rad = (id, stops, extra) => {
        const g = el('radialGradient', Object.assign({ id, cx: '50%', cy: '50%', r: '50%' }, extra || {}), d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
      };
      lin('gHousing', 0, 0, 0, 1, [[0, '#26262a'], [0.1, '#0f0f11'], [1, '#08080a']]);
      lin('gPlate', 0, 0, 0, 1, [[0, '#6a6a6e'], [0.5, '#5a5a5e'], [1, '#4a4a4e']]);
      rad('gDial', [[0, '#33363b'], [0.8, '#24262a'], [1, '#1b1c20']], { cx: '42%', cy: '36%', r: '75%' });
      rad('gHub', [[0, '#434347'], [1, '#34343a']], { cx: '40%', cy: '35%', r: '70%' });
      lin('gNeedle', 0, 0, 1, 0, [[0, '#f6f6f6'], [0.5, '#e6e6e8'], [0.5, '#c6c6ca'], [1, '#b2b2b8']]);
      lin('gGlass', 0, 0, 1, 1, [[0, '#ffffff', 0.09], [0.4, '#ffffff', 0.02], [0.5, '#ffffff', 0], [1, '#ffffff', 0]]);
      lin('gPanel', 0, 0, 0, 1, [[0, '#272a2f'], [1, '#181a1e']]);
      lin('gLcd', 0, 0, 0, 1, [[0, '#d2302a'], [1, '#b3211b']]);
      // Körnung der Frontplatte und der matten Naben
      const p = el('pattern', { id: 'pGrain', width: 96, height: 96, patternUnits: 'userSpaceOnUse' }, d);
      el('image', { href: global.E46_GRAIN || '', width: 96, height: 96 }, p);
    }

    /** Beliebige Form als Beschneidung */
    _clip2(id, d, transform) {
      const c = el('clipPath', { id }, this.defs);
      const pth = el('path', { d }, c);
      if (transform) pth.setAttribute('transform', transform);
      return 'url(#' + id + ')';
    }

    _clip(id, x, y, w, h) {
      const c = el('clipPath', { id }, this.defs);
      el('rect', { x, y, width: w, height: h }, c);
      return 'url(#' + id + ')';
    }

    _build() {
      const svg = this.svg;
      this._defs();

      // Ebenen: unten Gehäuse und Zifferblätter (werden nachts abgedunkelt), darüber die Abdunklung, darüber alles,
      // was beleuchtet ist (Zahlen, Striche, Nadeln, Symbole, Leuchten, Display)
      this.base = el('g', { class: 'layer-base' }, svg);
      this.shade = el('path', { class: 'shade', d: SILHOUETTE, fill: '#000', opacity: 0 }, svg);
      this.litLayer = el('g', { class: 'layer-lit' }, svg);

      // Außenform: Linse
      el('path', { d: SILHOUETTE, fill: '#0a0a0a', stroke: '#35353a', 'stroke-width': 2.5 }, this.base);

      el('path', { d: PLATE, fill: 'url(#gPlate)', stroke: '#050505', 'stroke-width': 4 }, this.base);
      el('path', { d: PLATE, fill: 'url(#pGrain)' }, this.base);
      el('path', { d: PLATE, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.12, 'stroke-width': 1.5, transform: 'translate(0 1.5)' }, this.base);

      // Fenster oben mittig (MKL)
      el('rect', { x: 717, y: 72, width: 166, height: 46, rx: 9, fill: '#24272c', stroke: '#101114', 'stroke-width': 2 }, this.base);

      this._main({
        name: 'speed', cx: SPEEDO.cx, cy: SPEEDO.cy,
        // Testresults (BAC30 Success %): 0 bis 100 auf denselben Strichen wie die ursprüngliche km/h-Skala (gleiche Winkel, gleiche
        // Abstände): lange Striche mit Zahlen alle 10, dazwischen ein kurzer. Die beiden unbeschrifteten Randstriche vor 0 und hinter 100 entfallen.
        // 0 liegt bei -116°, 100 bei +116°, die Skala ist mittig um 12 Uhr.
        nmin: 0, nmax: 100, a0: -116, a1: 116,
        a: (v) => -116 + v * 2.32,
        from: 0, to: 100, step: 5, majorStep: 10, labelFrom: 0, labelTo: 100, font: 28.5,
        texts: [['BAC30', 92, 20, 7], ['Success %', 115, 17, 7]], spring: [110, 1.0], needle: { len: 190, wb: 10.3, wt: 2.8, hub: 31, tail: true },
      });
      this._main({
        name: 'rpm', cx: TACHO.cx, cy: TACHO.cy,
        nmin: 0, nmax: 50, a0: -118.8, a1: 118.8,                     // 0 bei -118,8°, 50 bei +118,8° (aktive Defects)
        a: (v) => -118.8 + v * (237.6 / 50),
        from: 0, to: 50, step: 2, majorStep: 10, labelFrom: 0, labelTo: 50, font: 30.5, red: { from: 45, to: 50 },
        texts: [['Defects', -81, 20, 0], ['active', -59, 20, 0]], spring: [320, 0.8], needle: { len: 190, wb: 11.5, wt: 3.4, hub: 31, tail: true },
      });
      this._consumption(TACHO.cx + 2, TACHO.cy + 144);

      this._fuel(FUEL.cx, FUEL.cy);
      this._coolant(COOL.cx, COOL.cy);

      [384, 1216].forEach((x) => this._pin(x, 459));
      this._strip();

      // Glasreflex über der Frontplatte
      const pc = this._clip2('plateClip', PLATE);
      el('path', { class: 'glass', d: 'M0 50L1000 50L560 640L0 640Z', fill: 'url(#gGlass)', 'clip-path': pc }, svg);
    }

    /** Matte Nabe mit Schatten */
    _hub(g, cx, cy, r) {
      el('circle', { cx, cy, r: r + 3, fill: '#000', opacity: 0.35 }, g);
      el('circle', { cx, cy, r, fill: 'url(#gHub)' }, g);
      el('circle', { cx, cy, r, fill: 'url(#pGrain)' }, g);
      el('circle', { class: 'hub-shade', cx, cy, r: r + 3, fill: '#000' }, g);
    }

    _needle(g, cx, cy, s, name, spec) {
      const wrap = el('g', { class: 'needle-wrap', transform: 'translate(' + cx + ' ' + cy + ')' }, g);
      const rot = el('g', null, wrap);
      el('path', {
        class: 'needle-shape', fill: 'url(#gNeedle)',
        d: 'M' + -s.wb / 2 + ' ' + s.tail0 + 'L' + -s.wt / 2 + ' ' + -s.len + 'L' + s.wt / 2 + ' ' + -s.len + 'L' + s.wb / 2 + ' ' + s.tail0 + 'Z',
      }, rot);
      if (s.tail) el('rect', { class: 'needle-tail', x: -10, y: s.hub - 4, width: 20, height: 17, fill: '#3b3b3f' }, rot);
      this._hub(g, cx, cy, s.hub);
      this._addNeedle(name, rot, spec);
    }

    /** Tacho und Drehzahlmesser */
    _main(c) {
      const g = el('g', { class: 'dial dial-' + c.name }, this.litLayer);
      const clipR = this._clip(c.name + 'R', c.cx - R - 2, c.cy - R - 2, 2 * R + 4, R + 2 + CUT);
      const clipF = this._clip(c.name + 'F', c.cx - R - 2, c.cy - R - 2, 2 * R + 4, R + 2 + CUT - 10);
      el('circle', { cx: c.cx, cy: c.cy, r: R, fill: '#0a0b0d', 'clip-path': clipR }, this.base);
      el('circle', { cx: c.cx, cy: c.cy, r: RF, fill: 'url(#gDial)', 'clip-path': clipF }, this.base);

      const lit = el('g', { class: 'lit' }, g);
      const ticks = el('g', { class: 'ticks' }, lit);
      const nums = el('g', { class: 'numerals', 'font-size': c.font }, lit);
      const rOut = RF - 3, longLen = 25, thinLen = 20;

      const n = Math.round((c.to - c.from) / c.step);
      for (let i = 0; i <= n; i++) {
        const v = c.from + i * c.step;
        const major = near(v / c.majorStep, Math.round(v / c.majorStep)) && v >= c.labelFrom - 1e-9 && v <= c.labelTo + 1e-9;
        if (c.red && v > c.red.from + 1e-9 && v < c.red.to - 1e-9) continue;   // der rote Bereich ersetzt die Striche
        const a = c.a(v);
        tickLine(ticks, c.cx, c.cy, rOut - (major ? longLen : thinLen) / 2, a, major ? longLen : thinLen, major ? 6.4 : 3.0, major ? 'major' : 'thin');
        if (major) {
          // Zahl direkt unter dem Strich: Abstand je nach Winkel und Stellenzahl
          const txt = String(Math.round(v)), rad = (a * Math.PI) / 180;
          const ext = Math.abs(Math.sin(rad)) * txt.length * 0.26 * c.font + Math.abs(Math.cos(rad)) * 0.41 * c.font;
          const t = pol(c.cx, c.cy, rOut - longLen - 6 - ext, a);
          el('text', { x: f2(t[0]), y: f2(t[1]), dy: '.41em', 'text-anchor': 'middle' }, nums, txt);
        }
      }

      if (c.red) {   // roter Bereich: drei kleine Segmente, weißer Strich in der Mitte, ein großer Block (Maße vom Foto, auf den Bereich skaliert)
        const k = c.red.to - c.red.from, at = (u) => c.red.from + (u - 6) * k;
        [[6.07, 6.14], [6.17, 6.29], [6.31, 6.48], [6.54, 6.97]].forEach((s) => {
          el('path', { class: 'redband', d: arc(c.cx, c.cy, rOut - 10.5, c.a(at(s[0])), c.a(at(s[1]))), fill: 'none', 'stroke-width': 21 }, lit);
        });
        tickLine(ticks, c.cx, c.cy, rOut - thinLen / 2, c.a(at(6.5)), thinLen, 3.0, 'thin');
      }

      (c.texts || []).forEach((t) => {
        el('text', { class: 'unit', x: c.cx + t[3], y: c.cy + t[1], 'text-anchor': 'middle', 'font-size': t[2] }, lit, t[0]);
      });

      const s = Object.assign({ tail0: 22 }, c.needle);
      this._needle(g, c.cx, c.cy, s, c.name, { min: c.nmin, max: c.nmax, a0: c.a0, a1: c.a1, spring: c.spring });
    }

    /**
     * Nebeninstrumente (Tank links, Kühlmittel rechts). Skala, Zahlen, Symbol, Farbfelder und Nabe liegen auf einer gemeinsamen
     * Symmetrieachse: zeigt die Nadel senkrecht nach oben, steht sie genau auf der mittleren Markierung (1/2). Die Achse liegt
     * 7,7 Einheiten weiter innen als die ursprünglich übergebene Position.
     */
    _side(name, hubx, hy, dir, c) {
      const ax = hubx + dir * 7.7, RS = 108;
      hubx = ax;   // Nabe auf der Skalenachse: zeigt die Nadel senkrecht nach oben, steht sie genau auf der mittleren Markierung
      const g = el('g', { class: 'dial dial-' + name }, this.litLayer);
      const top = hy - 66 - 112;
      // "Eimer"-Form: Kreis mit flachem Boden (Ring bei hy+34, Fläche bei hy+27)
      const cutRing = this._clip(name + 'R', ax - 120, top, 240, hy + 38 - top);
      const cutFace = this._clip(name + 'F', ax - 120, top, 240, hy + 32 - top);
      el('circle', { cx: ax, cy: hy - 66, r: 111, fill: '#0a0b0d', 'clip-path': cutRing }, this.base);
      el('circle', { cx: ax, cy: hy - 66, r: 105, fill: 'url(#gDial)', 'clip-path': cutFace }, this.base);
      const lit = el('g', { class: 'lit' }, g);

      c.ticks.forEach((t) => tickLine(lit, ax, hy, RS, t[0], t[1], 3.2, 'thin'));
      (c.marks || []).forEach((m) => {   // [Winkel auf der Skala, Farbe, Drehung]; Rechteck 27,5 tangential x 23,5 radial
        const p = pol(ax, hy, 107, m[0]);
        el('rect', { x: f2(p[0] - 13.75), y: f2(p[1] - 11.75), width: 27.5, height: 23.5, rx: 1.2, fill: m[1], transform: 'rotate(' + m[2] + ' ' + f2(p[0]) + ' ' + f2(p[1]) + ')' }, lit);
      });
      const nums = el('g', { class: 'numerals' }, lit);
      (c.labels || []).forEach((l) => {
        const p = pol(ax, hy, l[2], l[1]);
        el('text', { x: f2(p[0]), y: f2(p[1]), dy: '.41em', 'text-anchor': 'middle', 'font-size': l[3] }, nums, l[0]);
      });
      // Symbol mittig auf der Achse
      if (c.icon) {
        const icon = el('g', { class: 'unit-icon', transform: 'translate(' + f2(ax + (c.iconDx || 0)) + ' ' + (hy - 71) + ')' }, lit);
        icon.innerHTML = ICONS[c.icon];
      }
      // Beschriftung statt Symbol: [Text, Höhe über der Nabe, Schriftgröße]
      (c.texts || []).forEach((t) => {
        el('text', { class: 'unit', x: f2(ax), y: f2(hy - t[1]), 'text-anchor': 'middle', 'font-size': t[2] }, lit, t[0]);
      });

      // Die Nadel zeigt von der Nabe auf den Punkt der Skala (Radius RS um die Achse)
      const angFn = (f) => {
        const q = pol(ax, hy, RS, c.a0 + f * (c.a1 - c.a0));
        return (Math.atan2(q[0] - hubx, hy - q[1]) * 180) / Math.PI;
      };
      this._needle(g, hubx, hy, { len: 108, wb: 9, wt: 3.6, hub: 24, tail0: 12 }, name,
        { min: c.min, max: c.max, a0: c.a0, a1: c.a1, spring: c.spring, toFrac: c.toFrac, angFn });
      return g;
    }

    _fuel(cx, hy) {
      const g = this._side('fuel', cx, hy, 1, {
        min: 0, max: 1, a0: -46.6, a1: 46.6, spring: [6, 1.5], icon: 'hourglass', iconDx: 0,
        ticks: [[-46.6, 20], [-23.3, 18], [0, 22], [23.3, 18], [46.6, 20]],
        labels: [['0', -40, 127, 15], ['1/2', 0, 134, 14.5], ['1/1', 38.5, 124, 14.5]],
      });
      // Reserveleuchte: matter Punkt links neben der Nadel
      const lamp = el('g', { class: 'lamp amber', transform: 'translate(' + (cx - 86) + ' ' + (hy - 51) + ')' }, g);
      el('circle', { r: 9.5, fill: 'currentColor' }, lamp);
      this.lamps.fuelwarn = lamp;
    }

    _coolant(cx, hy) {
      // Offene Nightrun-Tickets: Füllstandsanzeige mit den Teilstrichen der Temperaturanzeige, aber ohne Zahlen, dazu die beiden
      // Farbfelder (blau = wenig, rot = viel) und die Beschriftung "NR Defects". Intern 0 bis 20, die Nadel ist linear und bleibt
      // bei Überlauf am Anschlag.
      this._side('coolant', cx, hy, -1, {
        min: 0, max: 20, a0: -47.5, a1: 47.5, spring: [10, 1.3], texts: [['NR', 81, 19], ['Defects', 59, 17]],
        ticks: [[-47.5, 22], [-16, 19], [16, 19], [47.5, 22]],
        marks: [[-37.5, '#2288d2', -35], [37.5, '#e04526', 35]],
      });
    }

    /** Defects closed/Day unten im Drehzahlmesser (Skala 0 bis 20, elliptisch; intern heißt die Nadel 'fco') */
    _consumption(cx, cy) {
      const g = el('g', { class: 'mini mini-fco' }, this.litLayer);
      const lit = el('g', { class: 'lit' }, g);
      const RX = 111, RY = 86.5, T = 68.4;
      const pos = (v, k) => { const t = -T + (v / 20) * 2 * T, a = (t * Math.PI) / 180; return [cx + k * RX * Math.sin(a), cy - k * RY * Math.cos(a)]; };
      for (let v = 0; v <= 20; v += 2) {
        const big = v % 10 === 0, len = v === 10 ? 17 : big ? 27 : 15;
        const p = pos(v, 1), dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
        const ux = dx / d, uy = dy / d, h = len / 2;
        el('line', {
          class: 'tick ' + (big ? 'major' : 'thin'), 'stroke-width': big ? 7.5 : 3.4,
          x1: f2(p[0] + ux * h), y1: f2(p[1] + uy * h), x2: f2(p[0] - ux * h), y2: f2(p[1] - uy * h),
        }, lit);
      }
      const nums = el('g', { class: 'numerals', 'font-size': 17.5 }, lit);
      [['0', -77, -35], ['10', -3, -67], ['20', 68, -33]].forEach((l) => {
        el('text', { x: cx + l[1], y: cy + l[2], dy: '.41em', 'text-anchor': 'middle' }, nums, l[0]);
      });
      // Defects closed/Day: zweizeilig, damit die Beschriftung zwischen der 10 und der Nabe Platz hat
      el('text', { class: 'unit', x: cx, y: cy - 46, 'text-anchor': 'middle', 'font-size': 12 }, lit, 'Defects');
      el('text', { class: 'unit', x: cx, y: cy - 33, 'text-anchor': 'middle', 'font-size': 12 }, lit, 'closed/Day');
      const angFn = (f) => { const t = ((-T + f * 2 * T) * Math.PI) / 180; return (Math.atan2(RX * Math.sin(t), RY * Math.cos(t)) * 180) / Math.PI; };
      this._needle(g, cx, cy, { len: 92, wb: 6.5, wt: 3, hub: 24, tail0: 12 }, 'fco',
        { min: 0, max: 20, a0: -T, a1: T, spring: [14, 1.1], angFn });
    }

    /** Drücker für Uhr/Trip: ein runder Knopf mit hellem Ring */
    _pin(x, y) {
      const g = el('g', { transform: 'translate(' + x + ' ' + y + ')' }, this.base);
      el('circle', { r: 18, fill: '#0b0b0d', stroke: '#9a9da3', 'stroke-width': 3, 'stroke-opacity': 0.7 }, g);
      el('circle', { r: 12, fill: '#16161a' }, g);
    }

    /** Leuchtenleiste unten mit Mittendisplay, Blinkerpfeilen und den Warnleuchten */
    _strip() {
      const svg = this.litLayer, base = this.base;
      // Die äußeren Felder enden an einer Parallelkurve zur Außenkante (fester Abstand)
      const panels = el('g', { 'clip-path': this._clip2('stripClip', PANEL_EDGE) }, base);
      [[40, 400], [436, 638], [962, 1164], [1200, 1560]].forEach((p) => {
        el('rect', { x: p[0], y: STRIP_Y, width: p[1] - p[0], height: STRIP_H, rx: 10, fill: 'url(#gPanel)', stroke: '#101114', 'stroke-width': 2 }, panels);
      });
      // dezente Symbole der unbelegten Leuchten (wie am echten Kombi sichtbar, wenn aus)
      const deco = el('g', { class: 'deco' }, base);
      el('path', { d: 'M-52 -10Q-52 -19 -43 -19H30Q46 -19 52 -8V8Q46 19 30 19H-43Q-52 19 -52 10ZM20 -17V17M-32 -17V17', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, transform: 'translate(537 546)' }, deco);
      // kleines Fenster zwischen den Zifferblättern
      el('rect', { x: 776, y: 424, width: 48, height: 48, rx: 8, fill: '#24272c', stroke: '#101114', 'stroke-width': 2 }, base);

      for (const id in LAMP_POS) {
        const m = LAMP_META[id], p = LAMP_POS[id];
        const g = el('g', { class: 'lamp ' + m[0], transform: 'translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')' }, svg);
        el('title', null, g, m[1]);
        g.insertAdjacentHTML('beforeend', ICONS[id]);
        this.lamps[id] = g;
      }

      const arrow = (x, dir, label) => {
        const g = el('g', { class: 'turn', transform: 'translate(' + x + ' 221) scale(' + dir + ' 1)', 'aria-label': label }, svg);
        el('path', { d: 'M-24 0L-2 -26V-11H24V11H-2V26Z', fill: 'currentColor', stroke: '#0006', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
        return g;
      };
      this.lamps.left = arrow(308, 1, 'Blinker links');
      this.lamps.right = arrow(1292, -1, 'Blinker rechts');

      // Mittendisplay: Fenster mit Punktmatrix
      this.lcdWin = el('rect', { x: 664, y: 506, width: 272, height: 82, rx: 6, fill: 'url(#gLcd)', stroke: '#0c0c0e', 'stroke-width': 2 }, svg);
      this.lcd = el('g', { class: 'lcd' }, svg);
      this.lcdRows = {
        odo: el('g', null, this.lcd), km: el('g', null, this.lcd), trip: el('g', null, this.lcd), clock: el('g', null, this.lcd),
      };
    }

    /** Text in 5x7-Punktmatrix zeichnen; align: 'start' | 'end' | 'middle' */
    _dots(group, str, x, y, pitch, ph, align) {
      group.textContent = '';
      let w = 0;
      for (const ch of str) w += ((GLYPH[ch] || GLYPH[' '])[0].length + 1) * pitch;
      w -= pitch;
      let px = align === 'end' ? x - w : align === 'middle' ? x - w / 2 : x;
      const ds = pitch * 0.92, dh = ph * 0.9;
      for (const ch of str) {
        const gl = GLYPH[ch] || GLYPH[' '];
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < gl[0].length; c++) {
            el('rect', { class: gl[r][c] === '1' ? 'dot on' : 'dot', x: f2(px + c * pitch), y: f2(y + r * ph), width: f2(ds), height: f2(dh), rx: f2(ds * 0.3) }, group);
          }
        }
        px += (gl[0].length + 1) * pitch;
      }
    }

    _addNeedle(name, rot, spec) {
      const span = spec.max - spec.min;
      this.needles[name] = {
        rot, a0: spec.a0, a1: spec.a1, f: 0, v: 0, target: 0, drawn: null, angFn: spec.angFn,
        k: spec.spring[0], c: 2 * spec.spring[1] * Math.sqrt(spec.spring[0]),
        toFrac: spec.toFrac || ((val) => (val - spec.min) / span),
      };
      this._draw(this.needles[name]);
    }

    // ---------- Bedienung ----------

    /** Nadelziele setzen: { rpm (Defects 0..50), speed (Testresults 0..100 %), coolant (Nightrun 0..20), fuel (0..1), fco (Defects closed/Day 0..20) } */
    set(values) {
      for (const k in values) {
        const n = this.needles[k];
        if (n && isFinite(values[k])) n.target = clamp01(this._invert ? 1 - n.toFrac(values[k]) : n.toFrac(values[k]));   // _invert: Aprilscherz
      }
    }

    /** Nadeln sofort auf einen Wert setzen, ohne Federbewegung */
    jump(values) {
      this.set(values);
      for (const k in values) {
        const n = this.needles[k];
        if (n) { n.f = n.target; n.v = 0; this._draw(n); }
      }
    }

    setLamps(map) {
      for (const k in map) if (this.lamps[k]) this.lamps[k].classList.toggle('on', !!map[k]);
      // Das Symbol des Jahreszeiten-Modus leuchtet, solange die Zündung an ist
      if (this._season && this.lamps.battery) this.lamps.battery.classList.toggle('on', !this.svg.classList.contains('off'));
      const S = this._season && this._seasons[this._season];
      if (S && S.lamps) S.lamps(this.lamps);
    }

    /** Mittendisplay: odo ('148213'), trip ('0.3'), clock ('20:44') */
    setLcd(v) {
      const set = (key, str, draw) => {
        if (str == null || this._lcdLast[key] === str) return;
        this._lcdLast[key] = str;
        draw(str);
      };
      set('odo', v.odo, (s) => { this._dots(this.lcdRows.odo, s, 673, 513, 3.25, 3.9, 'start'); this._dots(this.lcdRows.km, 'km', 803, 526, 1.9, 2.3, 'start'); });
      set('trip', v.trip, (s) => this._dots(this.lcdRows.trip, s, 927, 513, 3.25, 3.9, 'end'));
      set('clock', v.clock, (s) => this._dots(this.lcdRows.clock, s, 800, 548, 3.25, 3.9, 'middle'));
    }

    setPower(on) { this.svg.classList.toggle('off', !on); }

    // ---------- Jahreszeiten-Modi: Weihnachten, Ostern, Silvester ----------
    // Jeder Modus legt eine eigene Ebene über das Kombi (Schmuck an der Außenkante, fallende Teilchen), ersetzt die Batterieleuchte
    // durch ein eigenes Symbol und läuft in frame(). Es ist immer nur einer aktiv.

    setXmas(on) { if (on) this.setSeason('xmas'); else if (this._season === 'xmas') this.setSeason(''); }

    /** '' (aus), 'xmas', 'easter' oder 'nye' */
    setSeason(name) {
      name = SEASON_LAMP[name] ? name : '';
      const old = this._season || '';
      if (name === old) return;
      this._season = name;
      this._seasons = this._seasons || {};
      if (old) { this._seasons[old].layer.setAttribute('display', 'none'); if (this._seasons[old].off) this._seasons[old].off(); }
      const g = this.lamps.battery;
      if (g && this._batHtml == null) this._batHtml = g.innerHTML;
      if (g) g.classList.remove('red', 'green', 'pink', 'gold', 'purple', 'amber', 'orange');
      if (!name) { if (g && this._batHtml != null) { g.innerHTML = this._batHtml; g.classList.add('red'); } return; }
      if (!this._seasons[name]) {
        this._seasons[name] = name === 'xmas' ? (this._buildXmas(), { layer: this.xmasLayer, update: (dt) => this._xmasFrame(dt) })
          : name === 'easter' ? this._buildEaster() : name === 'nye' ? this._buildNye() : name === 'karneval' ? this._buildKarneval()
          : name === 'aprilscherz' ? this._buildAprilscherz() : name === 'maibaum' ? this._buildMaibaum() : name === 'oktoberfest' ? this._buildOktoberfest() : this._buildHalloween();
      }
      this._seasons[name].layer.setAttribute('display', 'inline');
      if (g) { const L = SEASON_LAMP[name]; g.innerHTML = '<title>' + L[2] + '</title>' + ICONS[L[0]]; g.classList.add(L[1]); }
    }

    /** Zufallszahlen mit festem Startwert: der Schmuck sieht bei jedem Laden gleich aus */
    _rnd(seed) {
      return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }

    /** Weicher Leuchtfleck in einer Farbe (Verlauf wird nur einmal je Farbe angelegt) */
    _glow(c) {
      const id = 'gl' + c.slice(1);
      if (!this.defs.querySelector('#' + id)) {
        const g = el('radialGradient', { id }, this.defs);
        el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': 0.7 }, g);
        el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }, g);
      }
      return 'url(#' + id + ')';
    }

    /** Schmuck an der oberen Außenkante: eine Schnur zwischen unregelmäßigen Ankerpunkten, daran hängen Teile.
     *  make(g, rnd) zeichnet ein Teil um (0,0), nach unten hängend, und liefert zusätzliche Felder für den Eintrag. */
    _hang(layer, rnd, o, make) {
      const probe = el('path', { d: SILHOUETTE }, this.defs);
      const total = probe.getTotalLength();
      let end = 0;
      for (let s = 0; s < total / 2; s += 6) { if (probe.getPointAtLength(s).y > 520) break; end = s; }
      const inward = (p, k) => {
        const dx = 800 - p.x, dy = 330 - p.y, l = Math.hypot(dx, dy) || 1;
        return { x: p.x + (dx / l) * k, y: p.y + (dy / l) * k };
      };
      const side = (mirror) => {
        const out = [];
        for (let s = 40 + rnd() * 120; s < end - 70; s += 150 + rnd() * 150) out.push(s);
        out.push(end);
        return out.map((s) => { const q = probe.getPointAtLength(s); return inward(mirror ? { x: 1600 - q.x, y: q.y } : q, 5 + rnd() * 5); });
      };
      const left = side(true).reverse(), right = side(false);
      probe.remove();
      const pts = left.concat(right), items = [];
      const wire = el('g', null, layer), hung = el('g', null, layer);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
        const m = { x: (a.x + b.x) / 2 + (b.x - a.x) * (rnd() - 0.5) * 0.3, y: (a.y + b.y) / 2 + (b.y - a.y) * (rnd() - 0.5) * 0.3 };
        const c = inward(m, 2 * len * (0.07 + rnd() * 0.1));
        el('path', { d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1),
          fill: 'none', stroke: o.wire, 'stroke-width': 2.2 + rnd() * 0.8, 'stroke-linecap': 'round' }, wire);
        const n = Math.max(2, Math.round(len / o.gap));
        for (let j = 0; j < n; j++) {
          const u = Math.min(0.94, Math.max(0.06, (j + 0.5 + (rnd() - 0.5) * 0.7) / n));
          const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x;
          const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y;
          const g = el('g', null, hung);
          const extra = make(g, rnd) || {};
          items.push(Object.assign({ g, x, y, sc: 0.82 + rnd() * 0.36, tilt: (rnd() - 0.5) * 26, sw: 0.8 + rnd() * 1.4, swph: rnd() * 6.28, ph: rnd() * 6.28 }, extra));
        }
      }
      return items;
    }

    /** Hängende Teile leicht pendeln lassen; pulse(it, t) skaliert zusätzlich (optional) */
    _sway(items, t, amp, pulse) {
      items.forEach((it) => {
        const k = it.sc * (pulse ? pulse(it, t) : 1);
        it.g.setAttribute('transform', 'translate(' + it.x.toFixed(1) + ' ' + it.y.toFixed(1) + ') rotate(' + (it.tilt + amp * Math.sin(t * it.sw + it.swph)).toFixed(1) + ') scale(' + k.toFixed(2) + ')');
      });
    }

    /** Fallende Teilchen über das ganze Kombi; make(g, rnd) zeichnet eines um (0,0) und liefert vy, sw (Pendelweite), flip (Kipptempo) */
    _fall(layer, n, make) {
      const list = [], grp = el('g', null, layer);
      for (let i = 0; i < n; i++) {
        const g = el('g', null, grp);
        const p = make(g, Math.random);
        list.push(Object.assign({ g, x: Math.random() * 1680 - 40, y: Math.random() * 800 - 90, ph: Math.random() * 6.28, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 80, flip: 0 }, p));
      }
      return list;
    }

    _fallStep(list, dt, t) {
      list.forEach((f) => {
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        if (f.y > 710) { f.y = -100; f.x = Math.random() * 1680 - 40; }
        const x = f.x + Math.sin(t * 0.9 + f.ph) * f.sw, fl = f.flip ? Math.cos(t * f.flip + f.ph) : 1;
        f.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + f.y.toFixed(1) + ') rotate(' + f.rot.toFixed(0) + ') scale(' + fl.toFixed(2) + ' 1)');
      });
    }

    /** Osterei um (0,0), r liefert Zufallszahlen: Farbe und Muster (Zickzack, Punkte, Streifen) */
    _egg(g, r) {
      const base = ['#ff9ec7', '#ffe27a', '#8fe3b5', '#8ec9ff', '#c9a6ff', '#ffb36b'];
      const c = base[Math.floor(r() * base.length)], pat = Math.floor(r() * 3);
      el('path', { d: EGG, fill: c, stroke: '#0005', 'stroke-width': 0.9 }, g);
      if (pat === 0) el('path', { d: 'M-8 0L-5 -3L-2 0L1 -3L4 0L7 -3', fill: 'none', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linejoin': 'round', opacity: 0.9 }, g);
      else if (pat === 1) [[-3.5, -5], [3, -2], [-1, 4], [4, 5], [-5, 1]].forEach((d) => el('circle', { cx: d[0], cy: d[1], r: 1.5, fill: '#fff', opacity: 0.9 }, g));
      else { el('path', { d: 'M-8.2 -2Q0 1 8.2 -2', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, opacity: 0.9 }, g); el('path', { d: 'M-8 4Q0 7 8 4', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, opacity: 0.9 }, g); }
      el('ellipse', { cx: -3, cy: -5, rx: 1.6, ry: 2.8, fill: '#fff', opacity: 0.45 }, g);
    }

    /** Ostern: Frühlingswiese am unteren Rand mit Blumen und versteckten Eiern, ein Osterhase hüpft durchs Bild, Schmetterlinge, fallende Blütenblätter */
    _buildEaster() {
      const layer = el('g', { class: 'easter', 'pointer-events': 'none' }, this.svg);
      const rnd = this._rnd(20270405);
      const lg = el('linearGradient', { id: 'gMeadow', x1: 0, y1: 0, x2: 0, y2: 1 }, this.defs);
      el('stop', { offset: 0, 'stop-color': '#6fcf52' }, lg); el('stop', { offset: 1, 'stop-color': '#2c7a2c' }, lg);

      // Wiese: leicht welliger Boden über die ganze Breite
      const gy = (x) => 694 + 5 * Math.sin(x / 90) + 3 * Math.sin(x / 37 + 1);
      let d = 'M-40 720V' + gy(-40).toFixed(1);
      for (let x = -12; x <= 1640; x += 28) d += 'L' + x + ' ' + gy(x).toFixed(1);
      el('path', { d: d + 'V720Z', fill: 'url(#gMeadow)' }, layer);

      const greens = ['#3f9a3a', '#4fb04a', '#2f7f33', '#6cc24f', '#58b844'];
      const blade = (x, hMin, hMax) => {
        const h = hMin + rnd() * (hMax - hMin), bend = (rnd() - 0.5) * 12;
        const g = el('g', null, null);
        el('path', { d: 'M-1.7 0Q0 ' + (-h * 0.6).toFixed(1) + ' ' + bend.toFixed(1) + ' ' + (-h).toFixed(1) + 'Q1.2 ' + (-h * 0.55).toFixed(1) + ' 1.7 0Z', fill: greens[Math.floor(rnd() * greens.length)] }, g);
        return { g, x, y: gy(x) + 3, amp: 3 + rnd() * 4, sp: 0.8 + rnd() * 1.2, ph: rnd() * 6.28 };
      };
      const sway = [];
      const grassBack = el('g', null, layer), mid = el('g', null, layer), grassFront = el('g', null, layer);
      for (let i = 0; i < 70; i++) { const b = blade(-30 + rnd() * 1700, 18, 36); grassBack.appendChild(b.g); sway.push(b); }

      // versteckte Eier im Gras
      for (let i = 0; i < 9; i++) {
        const x = 60 + (i + rnd() * 0.8) * 180, sc = 1.1 + rnd() * 0.5;
        const g = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + (gy(x) - 8 * sc).toFixed(1) + ') rotate(' + ((rnd() - 0.5) * 40).toFixed(0) + ') scale(' + sc.toFixed(2) + ')' }, mid);
        this._egg(g, rnd);
      }
      // Blumen: Gänseblümchen und Tulpen, wiegen sich im Wind
      const tulip = ['#ff6f91', '#ffb3c7', '#ffd23a', '#ff9a4d'];
      for (let i = 0; i < 22; i++) {
        const x = -10 + rnd() * 1660, h = 22 + rnd() * 20;
        const g = el('g', null, null);
        el('path', { d: 'M0 0Q' + ((rnd() - 0.5) * 8).toFixed(1) + ' ' + (-h / 2).toFixed(1) + ' 0 ' + (-h).toFixed(1), fill: 'none', stroke: '#2f8a34', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
        const head = el('g', { transform: 'translate(0 ' + (-h).toFixed(1) + ')' }, g);
        if (rnd() < 0.5) {
          for (let k = 0; k < 7; k++) el('ellipse', { cy: -5.5, rx: 2.5, ry: 5.5, fill: '#fff', transform: 'rotate(' + (k * 360 / 7).toFixed(0) + ')' }, head);
          el('circle', { r: 3.3, fill: '#ffd23a' }, head);
        } else {
          el('path', { d: 'M-6 0C-7 -8 -3 -13 0 -15C3 -13 7 -8 6 0Q0 4 -6 0Z', fill: tulip[Math.floor(rnd() * tulip.length)], stroke: '#0004', 'stroke-width': 0.7 }, head);
          el('path', { d: 'M-2 -14L0 -8L2 -14', fill: 'none', stroke: '#fff', 'stroke-width': 1, opacity: 0.45 }, head);
        }
        mid.appendChild(g);
        sway.push({ g, x, y: gy(x) + 2, amp: 2.5 + rnd() * 2.5, sp: 0.7 + rnd() * 0.8, ph: rnd() * 6.28 });
      }
      for (let i = 0; i < 70; i++) { const b = blade(-30 + rnd() * 1700, 9, 20); grassFront.appendChild(b.g); sway.push(b); }

      // Osterhase von der Seite, hüpft von links nach rechts und macht dann eine Pause
      const bun = el('g', null, layer);
      const body = el('g', { fill: '#f7f2ea', stroke: '#6a5a4a', 'stroke-width': 1.2 }, bun);
      el('ellipse', { cx: -8, cy: 9, rx: 10, ry: 5.5 }, body);
      el('ellipse', { cx: 0, cy: 0, rx: 17, ry: 11 }, body);
      el('circle', { cx: -17, cy: -3, r: 5.5, fill: '#fff' }, body);
      el('ellipse', { cx: 17, cy: -23, rx: 3.2, ry: 10, transform: 'rotate(8 17 -23)' }, body);
      el('ellipse', { cx: 23, cy: -22, rx: 3.2, ry: 10, transform: 'rotate(22 23 -22)' }, body);
      el('circle', { cx: 19, cy: -9, r: 8 }, body);
      el('ellipse', { cx: 18, cy: -22, rx: 1.4, ry: 6, fill: '#ffb3c7', stroke: 'none', transform: 'rotate(8 18 -22)' }, bun);
      el('circle', { cx: 22, cy: -11, r: 1.5, fill: '#2a2a2a' }, bun);
      el('circle', { cx: 26.5, cy: -8, r: 1.6, fill: '#ff8fb0' }, bun);

      // Schmetterlinge
      const flies = [];
      const wing = (g, c) => {
        el('ellipse', { cx: 6, cy: -3, rx: 7, ry: 5, fill: c, transform: 'rotate(-25 6 -3)' }, g);
        el('ellipse', { cx: 5, cy: 4, rx: 5, ry: 4, fill: c, opacity: 0.85 }, g);
      };
      ['#ff9a4d', '#ffd23a', '#7fb8ff', '#ff8fc4', '#fff'].forEach((c, i) => {
        const g = el('g', null, layer), w = el('g', null, g);
        const wl = el('g', null, w), wr = el('g', { transform: 'scale(-1 1)' }, w);
        wing(wl, c); wing(wr, c);
        el('ellipse', { rx: 1.3, ry: 5, fill: '#333' }, g);
        flies.push({ g, w, x: Math.random() * 1600, vx: 18 + Math.random() * 26, by: 380 + Math.random() * 260, ph: Math.random() * 6.28, fl: 10 + Math.random() * 6 });
      });

      const pc = ['#ffb7d5', '#ffffff', '#ffe27a', '#d9b8ff'];
      const petals = this._fall(layer, 40, (g, r) => {
        const s = 0.7 + r() * 0.9;
        el('path', { d: 'M0 0C-6 -5 -6 -12 0 -15C6 -12 6 -5 0 0Z', fill: pc[Math.floor(r() * pc.length)], opacity: 0.85, transform: 'scale(' + s.toFixed(2) + ')' }, g);
        return { vy: 22 + s * 18 + r() * 14, sw: 14 + r() * 26, flip: 1 + r() * 2 };
      });

      let t = 0;
      return { layer, update: (dt) => {
        t += dt;
        sway.forEach((b) => b.g.setAttribute('transform', 'translate(' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ') rotate(' + (b.amp * Math.sin(t * b.sp + b.ph)).toFixed(1) + ')'));
        // Hase: 20 s hüpfen (alle 0,9 s ein Sprung), dann 10 s Pause außerhalb des Bildes
        const c = t % 30;
        if (c > 20) bun.setAttribute('display', 'none');
        else {
          const ph = (c / 0.9) % 1, hop = Math.sin(ph * Math.PI);
          bun.setAttribute('display', 'inline');
          bun.setAttribute('transform', 'translate(' + (-90 + 1780 * (c / 20)).toFixed(1) + ' ' + (676 - 44 * hop).toFixed(1) + ') rotate(' + (-14 * Math.cos(ph * Math.PI)).toFixed(1) + ') scale(1.5 ' + (1 + 0.1 * (1 - hop)).toFixed(2) + ')');
        }
        flies.forEach((f) => {
          f.x += f.vx * dt; if (f.x > 1680) f.x = -40;
          const y = f.by + 30 * Math.sin(t * 0.8 + f.ph) + 12 * Math.sin(t * 2.3 + f.ph * 2);
          f.g.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (12 * Math.sin(t * 1.6 + f.ph)).toFixed(0) + ') scale(1.3)');
          f.w.setAttribute('transform', 'scale(' + (0.2 + 0.8 * Math.abs(Math.sin(t * f.fl + f.ph))).toFixed(2) + ' 1)');
        });
        this._fallStep(petals, dt, t);
      } };
    }

    /** Silvester: funkelnde Sterne an der Schnur, Konfetti und ein kräftiges Feuerwerk (Kugeln, Trauerweiden, Knistern, Finale) */
    _buildNye() {
      const layer = el('g', { class: 'nye', 'pointer-events': 'none' }, this.svg);
      const rnd = this._rnd(20261231);
      const cols = ['#ffd24a', '#f2f4f8', '#ff5fa8', '#4fd8ff', '#b78cff', '#ff7a3d', '#6dff8a'];
      const stars = this._hang(layer, rnd, { wire: '#8d939e', gap: 46 }, (g, r) => {
        const c = cols[Math.floor(r() * 5)];
        el('circle', { cy: 8, r: 15, fill: this._glow(c) }, g);
        el('path', { d: STAR, transform: 'translate(0 8)', fill: c, stroke: '#0004', 'stroke-width': 0.7 }, g);
        return { sp: 1.8 + r() * 3 };
      });
      const conf = this._fall(layer, 70, (g, r) => {
        const w = 3 + r() * 4;
        el('rect', { x: -w / 2, y: -w * 0.8, width: w, height: w * 1.6, fill: cols[Math.floor(r() * cols.length)], opacity: 0.9 }, g);
        return { vy: 40 + r() * 50, sw: 12 + r() * 24, flip: 2 + r() * 4, vr: (r() - 0.5) * 240 };
      });

      // Aufblitzen beim Platzen: weiche Lichtflecken, die schnell verblassen
      const flashes = [];
      const flashG = el('g', null, layer);
      for (let i = 0; i < 10; i++) flashes.push({ c: el('circle', { r: 80, display: 'none' }, flashG), on: false, life: 0, max: 0.25, peak: 0.3 });

      // Funken: fester Vorrat, wiederverwendet
      const POOL = 1200, fx = el('g', null, layer), sparks = [];
      for (let i = 0; i < POOL; i++) sparks.push({ c: el('circle', { r: 2, display: 'none' }, fx), on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, g: 150, drag: 1.4, trail: false });
      let cursor = 0;
      const spawn = (x, y, vx, vy, life, color, r, o) => {
        for (let k = 0; k < POOL; k++) {
          const s = sparks[(cursor + k) % POOL];
          if (s.on) continue;
          cursor = (cursor + k + 1) % POOL;
          Object.assign(s, { on: true, x, y, vx, vy, life, max: life, g: 150, drag: 1.4, trail: false }, o || null);
          s.c.setAttribute('fill', color); s.c.setAttribute('r', r); s.c.setAttribute('display', 'inline');
          return;
        }
      };
      const flash = (x, y, color, rad, peak) => {
        const f = flashes.find((q) => !q.on);
        if (!f) return;
        f.on = true; f.life = f.max = 0.25; f.peak = peak;
        f.c.setAttribute('cx', x.toFixed(0)); f.c.setAttribute('cy', y.toFixed(0)); f.c.setAttribute('r', rad); f.c.setAttribute('fill', this._glow(color)); f.c.setAttribute('display', 'inline');
      };
      const pick = () => cols[Math.floor(Math.random() * cols.length)];
      const later = [];   // zeitversetzte Sekundärexplosionen
      const burst = (x, y) => {
        flash(x, y, '#ffe2b0', 85, 0.3);
        const kind = Math.random(), a0 = Math.random() * 6.28, A = (i, n) => a0 + (i / n) * 6.2832 + Math.random() * 0.06;
        if (kind < 0.45) {   // Kugel
          const pal = [pick(), pick()], n = 80 + Math.floor(Math.random() * 40), sp = 150 + Math.random() * 130;
          for (let i = 0; i < n; i++) { const a = A(i, n), v = sp * (0.3 + Math.random() * 0.7); spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.1 + Math.random() * 0.8, pal[i % 2], 2.8); }
        } else if (kind < 0.75) {   // Trauerweide: langsame, goldene Funken mit Schweif
          const n = 70;
          for (let i = 0; i < n; i++) { const a = A(i, n), v = 90 + Math.random() * 120; spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 2.4 + Math.random() * 0.8, '#ffcf6a', 2.4, { g: 190, drag: 1.9, trail: true }); }
        } else {   // Knistern: Kugel, aus der nach kurzer Zeit kleine weiße Explosionen kommen
          const c = pick(), n = 60;
          for (let i = 0; i < n; i++) { const a = A(i, n), v = 110 + Math.random() * 130; spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.5, c, 2.8); }
          for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28, r = 40 + Math.random() * 110; later.push({ t: 0.5 + Math.random() * 0.7, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }); }
        }
      };
      let rockets = [], next = 0.3, finale = 20, queue = [], t = 0;
      const launch = () => rockets.push({ x: -20 + Math.random() * 1640, y: 720, vx: (Math.random() - 0.5) * 60, vy: -(460 + Math.random() * 200), ty: -50 + Math.random() * 320, col: pick() });
      return { layer, update: (dt) => {
        t += dt;
        this._sway(stars, t, 4, (it, tt) => 0.9 + 0.2 * Math.sin(tt * it.sp + it.ph));
        stars.forEach((it) => { it.g.setAttribute('opacity', (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * it.sp + it.ph))).toFixed(2)); });
        this._fallStep(conf, dt, t);

        // Starts: dichte Folge, manchmal Doppelstart, alle ~9 s ein Finale mit einer ganzen Salve
        next -= dt; finale -= dt;
        if (next <= 0) { launch(); if (Math.random() < 0.08) launch(); next = 1.3 + Math.random() * 1.7; }
        if (finale <= 0) { for (let i = 0; i < 5; i++) queue.push(i * 0.3); finale = 26 + Math.random() * 8; }
        queue = queue.map((q) => q - dt).filter((q) => { if (q <= 0) { launch(); return false; } return true; });
        rockets = rockets.filter((r) => {
          r.x += r.vx * dt; r.y += r.vy * dt;
          spawn(r.x, r.y, (Math.random() - 0.5) * 24, 40, 0.4, '#ffe3b0', 1.8);
          if (Math.random() < 0.4) spawn(r.x, r.y, (Math.random() - 0.5) * 24, 40, 0.3, r.col, 1.4);
          if (r.y <= r.ty) { burst(r.x, r.y); return false; }
          return true;
        });
        for (let i = later.length - 1; i >= 0; i--) {
          later[i].t -= dt;
          if (later[i].t > 0) continue;
          const q = later.splice(i, 1)[0];
          // kleine Knisterexplosion: ein feiner Funkenstern statt eines Lichtkreises
          flash(q.x, q.y, '#ffd98a', 26, 0.45);
          for (let k = 0; k < 24; k++) { const a = Math.random() * 6.28, v = 50 + Math.random() * 90; spawn(q.x, q.y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.5, k % 3 ? '#fff4d6' : '#ffc94a', 2.2); }
        }
        flashes.forEach((f) => {
          if (!f.on) return;
          f.life -= dt;
          if (f.life <= 0) { f.on = false; f.c.setAttribute('display', 'none'); return; }
          f.c.setAttribute('opacity', (f.peak * f.life / f.max).toFixed(2));
        });
        sparks.forEach((s) => {
          if (!s.on) return;
          s.life -= dt;
          if (s.life <= 0) { s.on = false; s.c.setAttribute('display', 'none'); return; }
          s.vy += s.g * dt; s.vx *= 1 - s.drag * dt; s.vy *= 1 - 0.8 * dt;
          s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.trail && Math.random() < 0.5) spawn(s.x, s.y, 0, 10, 0.5, '#ffcf6a', 1.4);
          s.c.setAttribute('cx', s.x.toFixed(1)); s.c.setAttribute('cy', s.y.toFixed(1));
          s.c.setAttribute('opacity', Math.min(1, s.life / s.max * 1.4).toFixed(2));
        });
      } };
    }

    /** Punkte entlang der oberen Außenkante, links und rechts getrennt, für Schmuck, der von der Kante hängt */
    _rimPoints(rnd, gap) {
      const probe = el('path', { d: SILHOUETTE }, this.defs);
      const total = probe.getTotalLength();
      let end = 0;
      for (let s = 0; s < total / 2; s += 6) { if (probe.getPointAtLength(s).y > 520) break; end = s; }
      const out = [];
      for (let s = 30 + rnd() * gap; s < end; s += gap * (0.7 + rnd() * 0.6)) {
        const q = probe.getPointAtLength(s);
        out.push({ x: q.x, y: q.y }, { x: 1600 - q.x, y: q.y });
      }
      probe.remove();
      return out;
    }

    /** Karneval: Luftschlangen am oberen Rand, Konfetti, aufsteigende Luftballons; die Leuchten blinken im Takt */
    _buildKarneval() {
      const layer = el('g', { class: 'karneval', 'pointer-events': 'none' }, this.svg);
      const rnd = this._rnd(20260211);
      const cols = ['#ff3b6b', '#ffd23a', '#37d65a', '#3d8bff', '#b36bff', '#ff8a3d', '#2fe0d0'];
      const sg = el('g', null, layer);
      const streamers = this._rimPoints(rnd, 70).map((p) => {
        const c = cols[Math.floor(rnd() * cols.length)];
        return { p, len: 50 + rnd() * 55, amp: 5 + rnd() * 9, sp: 1.4 + rnd() * 1.6, ph: rnd() * 6.28,
          e: el('path', { fill: 'none', stroke: c, 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sg) };
      });
      const balloons = [], bg = el('g', null, layer);
      for (let i = 0; i < 10; i++) {
        const g = el('g', null, bg), c = cols[i % cols.length];
        el('path', { d: 'M0 14Q-4 26 2 38Q-3 48 1 60', fill: 'none', stroke: '#ddd', 'stroke-width': 1, opacity: 0.7 }, g);
        el('ellipse', { rx: 11, ry: 14, fill: c, stroke: '#0004', 'stroke-width': 0.8 }, g);
        el('path', { d: 'M0 14L-3 19H3Z', fill: c }, g);
        el('ellipse', { cx: -4, cy: -5, rx: 2.4, ry: 4, fill: '#fff', opacity: 0.45 }, g);
        balloons.push({ g, x: Math.random() * 1600, y: Math.random() * 800 - 40, vy: 28 + Math.random() * 30, sw: 10 + Math.random() * 16, ph: Math.random() * 6.28 });
      }
      const conf = this._fall(layer, 70, (g, r) => {
        const w = 3 + r() * 4;
        if (r() < 0.3) el('circle', { r: w * 0.7, fill: cols[Math.floor(r() * cols.length)], opacity: 0.9 }, g);
        else el('rect', { x: -w / 2, y: -w * 0.8, width: w, height: w * 1.6, fill: cols[Math.floor(r() * cols.length)], opacity: 0.9 }, g);
        return { vy: 40 + r() * 50, sw: 12 + r() * 24, flip: 2 + r() * 4, vr: (r() - 0.5) * 240 };
      });
      // Die Leuchten blinken im Takt abwechselnd in zwei Gruppen
      const groupA = ['arrk', 'oilwarn', 'door_dev', 'door_stage', 'lab'], groupB = ['tt', 'cruise', 'door_test', 'door_prod'];
      let t = 0;
      return { layer,
        update: (dt) => {
          t += dt;
          streamers.forEach((s) => {
            let d = 'M' + s.p.x.toFixed(1) + ' ' + s.p.y.toFixed(1);
            for (let i = 1; i <= 14; i++) d += 'L' + (s.p.x + Math.sin(i * 0.8 + t * s.sp + s.ph) * s.amp * (i / 14)).toFixed(1) + ' ' + (s.p.y + i * s.len / 14).toFixed(1);
            s.e.setAttribute('d', d);
          });
          balloons.forEach((b) => {
            b.y -= b.vy * dt;
            if (b.y < -90) { b.y = 780; b.x = Math.random() * 1600; }
            b.g.setAttribute('transform', 'translate(' + (b.x + Math.sin(t * 0.8 + b.ph) * b.sw).toFixed(1) + ' ' + b.y.toFixed(1) + ')');
          });
          this._fallStep(conf, dt, t);
        },
        lamps: (L) => {
          if (this.svg.classList.contains('off')) return;
          const beat = Math.floor(t * 3) % 2;
          groupA.forEach((k) => L[k] && L[k].classList.toggle('on', beat === 0));
          groupB.forEach((k) => L[k] && L[k].classList.toggle('on', beat === 1));
        } };
    }

    /** Aprilscherz: die Zeiger fahren zeitweise rückwärts, das Kombi steht kurz auf dem Kopf, Leuchten schlagen Fehlalarm,
     *  eine Fliege krabbelt über das Glas und ab und zu bekommt es einen Sprung */
    _buildAprilscherz() {
      const layer = el('g', { class: 'aprilscherz', 'pointer-events': 'none' }, this.svg);
      const f = el('g', null, el('g', null, layer));
      el('ellipse', { rx: 3.4, ry: 5.2, fill: '#15110f' }, f);
      el('circle', { cy: -6, r: 2.6, fill: '#15110f' }, f);
      el('circle', { cx: -1.2, cy: -7, r: 0.8, fill: '#e33' }, f); el('circle', { cx: 1.2, cy: -7, r: 0.8, fill: '#e33' }, f);
      el('ellipse', { cx: -4.5, cy: -1, rx: 2.4, ry: 5.4, fill: '#cfe8ff', opacity: 0.55, transform: 'rotate(25 -4.5 -1)' }, f);
      el('ellipse', { cx: 4.5, cy: -1, rx: 2.4, ry: 5.4, fill: '#cfe8ff', opacity: 0.55, transform: 'rotate(-25 4.5 -1)' }, f);
      el('path', { d: 'M-3 -2L-8 -5M-3 1L-9 1M-3 4L-8 8M3 -2L8 -5M3 1L9 1M3 4L8 8', stroke: '#15110f', 'stroke-width': 0.9, fill: 'none' }, f);
      const fly = { x: 600, y: 300, h: 0.5, sp: 0, timer: 1 };
      const crackShadow = el('path', { fill: 'none', stroke: '#000', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, layer);
      const crack = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0 }, layer);
      const alarmLamps = ['mil', 'lab', 'cruise', 'nr', 'defect', 'fuelwarn', 'door_dev', 'door_prod'];
      let t = 0, rot = false, crackT = -1, nextCrack = 14, alarm = null, nextAlarm = 4;
      const makeCrack = () => {
        const cx = 200 + Math.random() * 1200, cy = 100 + Math.random() * 420;
        let d = '';
        for (let i = 0; i < 7; i++) {
          let a = (i / 7) * 6.28 + Math.random() * 0.6, x = cx, y = cy;
          d += 'M' + cx.toFixed(0) + ' ' + cy.toFixed(0);
          for (let k = 0; k < 4; k++) { const l = 18 + Math.random() * 45; a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * l; y += Math.sin(a) * l; d += 'L' + x.toFixed(0) + ' ' + y.toFixed(0); }
        }
        crack.setAttribute('d', d); crackShadow.setAttribute('d', d);
      };
      return { layer,
        update: (dt) => {
          t += dt;
          // Zeiger rückwärts: 7 s in jeder halben Minute
          const c = t % 30;
          this._invert = c > 21 && c < 28;
          // Kopfstand: 3,5 s alle 45 s
          const r = (t % 45) > 36 && (t % 45) < 39.5;
          if (r !== rot) { rot = r; this.svg.style.transition = 'transform .8s ease'; this.svg.style.transform = r ? 'rotate(180deg)' : ''; }
          // Fliege
          fly.timer -= dt;
          if (fly.timer <= 0) {
            if (Math.random() < 0.4) { fly.sp = 0; fly.timer = 0.6 + Math.random() * 1.6; }
            else { fly.sp = 30 + Math.random() * 70; fly.h += (Math.random() - 0.5) * 2.2; fly.timer = 0.4 + Math.random() * 1.1; }
          }
          fly.x += Math.cos(fly.h) * fly.sp * dt; fly.y += Math.sin(fly.h) * fly.sp * dt;
          if (fly.x < 40 || fly.x > 1560) { fly.h = Math.PI - fly.h; fly.x = Math.min(1560, Math.max(40, fly.x)); }
          if (fly.y < 0 || fly.y > 650) { fly.h = -fly.h; fly.y = Math.min(650, Math.max(0, fly.y)); }
          const jit = fly.sp === 0 ? Math.sin(t * 40) * 2 : 0;
          f.setAttribute('transform', 'translate(' + fly.x.toFixed(1) + ' ' + fly.y.toFixed(1) + ') rotate(' + (fly.h * 57.3 + 90 + jit).toFixed(0) + ') scale(2.2)');
          // Sprung im Glas: 3,2 s sichtbar, alle ~50 s
          nextCrack -= dt;
          if (nextCrack <= 0) { makeCrack(); crackT = 0; nextCrack = 35 + Math.random() * 30; }
          if (crackT >= 0) {
            crackT += dt;
            const o = crackT < 0.1 ? crackT * 10 : crackT > 2.7 ? Math.max(0, (3.2 - crackT) / 0.5) : 1;
            crack.setAttribute('opacity', (0.8 * o).toFixed(2)); crackShadow.setAttribute('opacity', (0.5 * o).toFixed(2));
            if (crackT > 3.2) crackT = -1;
          }
          // Fehlalarm
          nextAlarm -= dt;
          if (nextAlarm <= 0) { alarm = { k: alarmLamps[Math.floor(Math.random() * alarmLamps.length)], t: 1.3 }; nextAlarm = 4 + Math.random() * 5; }
          if (alarm) { alarm.t -= dt; if (alarm.t <= 0) alarm = null; }
        },
        lamps: (L) => { if (alarm && L[alarm.k] && !this.svg.classList.contains('off')) L[alarm.k].classList.add('on'); },
        off: () => { this._invert = false; this.svg.style.transform = ''; } };
    }

    /** Maibaum: je ein Maibaum links und rechts mit flatternden Bändern, Bienen summen umher, Blüten und Blätter fallen */
    _buildMaibaum() {
      const layer = el('g', { class: 'maibaum', 'pointer-events': 'none' }, this.svg);
      const rnd = this._rnd(20260501);
      const rib = ['#3a8bd6', '#ffffff', '#e8433b', '#ffd23a', '#37b34a', '#ff8fc4', '#ff9a4d'];
      const ribbons = [];
      [-12, 1612].forEach((cx) => {
        const g = el('g', null, layer);
        el('ellipse', { cx, cy: 706, rx: 34, ry: 9, fill: '#3b8f3a' }, g);
        el('rect', { x: cx - 4.5, y: 232, width: 9, height: 476, fill: '#f6f6f6', stroke: '#0003', 'stroke-width': 1 }, g);
        for (let y = 708; y > 244; y -= 26) el('path', { d: 'M' + (cx - 4.5) + ' ' + y + 'L' + (cx + 4.5) + ' ' + (y - 9) + 'L' + (cx + 4.5) + ' ' + (y - 21) + 'L' + (cx - 4.5) + ' ' + (y - 12) + 'Z', fill: '#3a8bd6' }, g);
        el('circle', { cx, cy: 234, r: 15, fill: 'none', stroke: '#3da04a', 'stroke-width': 7 }, g);
        for (let k = 0; k < 9; k++) { const a = k * 0.698; el('circle', { cx: cx + Math.cos(a) * 15, cy: 234 + Math.sin(a) * 15, r: 3.2, fill: ['#ff8fc4', '#fff', '#ffd23a'][k % 3] }, g); }
        rib.forEach((c, i) => ribbons.push({ x0: cx + (i - 3) * 2.5, y0: 242 + i * 2, len: 110 + rnd() * 120, amp: 14 + rnd() * 14, sp: 0.9 + rnd() * 0.9, ph: rnd() * 6.28, side: cx < 800 ? 1 : -1,
          e: el('path', { fill: 'none', stroke: c, 'stroke-width': 4.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.95 }, g) }));
      });
      const bees = [];
      for (let i = 0; i < 5; i++) {
        const g = el('g', null, layer), wings = el('g', null, g);
        el('ellipse', { cx: -2, cy: -5, rx: 3, ry: 5, fill: '#fff', opacity: 0.6 }, wings); el('ellipse', { cx: 2, cy: -5, rx: 3, ry: 5, fill: '#fff', opacity: 0.6 }, wings);
        el('ellipse', { rx: 4, ry: 6, fill: '#ffcf1a', stroke: '#111', 'stroke-width': 0.6 }, g);
        el('rect', { x: -4, y: -2.5, width: 8, height: 1.8, fill: '#111' }, g); el('rect', { x: -4, y: 1.2, width: 8, height: 1.8, fill: '#111' }, g);
        el('circle', { cy: -6.5, r: 2.4, fill: '#111' }, g);
        bees.push({ g, wings, cx: 150 + rnd() * 1300, cy: 100 + rnd() * 500, ax: 80 + rnd() * 140, ay: 30 + rnd() * 60, w1: 0.5 + rnd() * 0.6, w2: 0.9 + rnd() * 0.8, ph: rnd() * 6.28, px: 0, py: 0 });
      }
      const pc = ['#ffd1e3', '#ffffff', '#ffb7d5'];
      const fall = this._fall(layer, 38, (g, r) => {
        const s = 0.7 + r() * 0.8, leaf = r() < 0.3;
        el('path', { d: 'M0 0C-6 -5 -6 -12 0 -15C6 -12 6 -5 0 0Z', fill: leaf ? '#5ec24f' : pc[Math.floor(r() * pc.length)], opacity: 0.88, transform: 'scale(' + s.toFixed(2) + ')' }, g);
        return { vy: 20 + s * 16 + r() * 12, sw: 14 + r() * 26, flip: 1 + r() * 2 };
      });
      let t = 0;
      return { layer, update: (dt) => {
        t += dt;
        ribbons.forEach((b) => {
          let d = 'M' + b.x0.toFixed(1) + ' ' + b.y0.toFixed(1);
          for (let i = 1; i <= 14; i++) d += 'L' + (b.x0 + b.side * (Math.sin(i * 0.5 + t * b.sp + b.ph) * b.amp * (i / 14) + 8 * (i / 14))).toFixed(1) + ' ' + (b.y0 + i * b.len / 14).toFixed(1);
          b.e.setAttribute('d', d);
        });
        bees.forEach((b) => {
          const x = b.cx + b.ax * Math.sin(t * b.w1 + b.ph), y = b.cy + b.ay * Math.sin(t * b.w2 + b.ph * 2);
          const h = Math.atan2(y - b.py, x - b.px) * 57.3 + 90;
          if (b.px || b.py) b.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + h.toFixed(0) + ') scale(1.5)');
          b.px = x; b.py = y;
          b.wings.setAttribute('transform', 'scale(1 ' + (0.3 + 0.7 * Math.abs(Math.sin(t * 38 + b.ph))).toFixed(2) + ')');
        });
        this._fallStep(fall, dt, t);
      } };
    }

    /** Oktoberfest: Wiesn-Raute am unteren Rand, Maßkrüge und Brezeln fliegen in hohem Bogen durchs Bild, blau-weißes Konfetti */
    _buildOktoberfest() {
      const layer = el('g', { class: 'oktoberfest', 'pointer-events': 'none' }, this.svg);
      const h = 14.14;
      let blue = '', white = '';
      for (let a = -3; a * h < 1700; a++) for (let b = 0; b < 3; b++) {
        if (((a + b) % 2 + 2) % 2) continue;
        const cx = -40 + a * h, cy = 690 + b * h;
        const d = 'M' + (cx - h).toFixed(1) + ' ' + cy.toFixed(1) + 'L' + cx.toFixed(1) + ' ' + (cy - h).toFixed(1) + 'L' + (cx + h).toFixed(1) + ' ' + cy.toFixed(1) + 'L' + cx.toFixed(1) + ' ' + (cy + h).toFixed(1) + 'Z';
        if (((((a + b) / 2) % 2) + 2) % 2 === 0) blue += d; else white += d;
      }
      el('path', { d: blue, fill: '#1c78c0' }, layer); el('path', { d: white, fill: '#ffffff' }, layer);
      const mug = (g) => {
        el('rect', { x: -9, y: -10, width: 18, height: 23, rx: 2, fill: '#f2c14e', stroke: '#fff6', 'stroke-width': 1 }, g);
        el('path', { d: 'M9 -6H15Q19 -6 19 -2V8Q19 12 15 12H9', fill: 'none', stroke: '#cfd3d8', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
        [[-6, -11], [0, -14], [6, -11], [-3, -10], [3, -9]].forEach((c) => el('circle', { cx: c[0], cy: c[1], r: 4.4, fill: '#fff' }, g));
        el('rect', { x: -6.5, y: -5, width: 2.4, height: 14, rx: 1, fill: '#fff', opacity: 0.4 }, g);
      };
      const pretzel = (g) => {
        el('path', { d: 'M-13 10C-23 -8 -5 -17 0 -2C5 -17 23 -8 13 10C8 15 -8 15 -13 10Z', fill: 'none', stroke: '#b5651d', 'stroke-width': 4.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        el('path', { d: 'M-12 9C-5 1 5 1 12 9', fill: 'none', stroke: '#b5651d', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
        [[-9, -4], [0, -8], [9, -4], [-2, 8], [4, 9]].forEach((c) => el('circle', { cx: c[0], cy: c[1], r: 1.1, fill: '#fff' }, g));
      };
      const things = [];
      for (let i = 0; i < 6; i++) {
        const g = el('g', { display: 'none' }, layer);
        (i % 2 ? mug : pretzel)(g);
        things.push({ g, on: false, wait: i * 1.4 + Math.random(), x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0 });
      }
      const cc = ['#1c78c0', '#ffffff', '#ffd23a'];
      const conf = this._fall(layer, 36, (g, r) => {
        const w = 3 + r() * 4;
        el('rect', { x: -w / 2, y: -w * 0.8, width: w, height: w * 1.6, fill: cc[Math.floor(r() * cc.length)], opacity: 0.9 }, g);
        return { vy: 40 + r() * 40, sw: 12 + r() * 24, flip: 2 + r() * 4, vr: (r() - 0.5) * 240 };
      });
      let t = 0;
      return { layer, update: (dt) => {
        t += dt;
        things.forEach((o) => {
          if (!o.on) {
            o.wait -= dt;
            if (o.wait > 0) return;
            const left = Math.random() < 0.5;
            Object.assign(o, { on: true, x: left ? -60 : 1700, y: 220 + Math.random() * 380, vx: (left ? 1 : -1) * (150 + Math.random() * 110), vy: -(240 + Math.random() * 170), rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 180) });
            o.g.setAttribute('display', 'inline');
          }
          o.vy += 330 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
          if (o.y > 790 || o.x < -120 || o.x > 1760) { o.on = false; o.wait = 1 + Math.random() * 3.5; o.g.setAttribute('display', 'none'); return; }
          o.g.setAttribute('transform', 'translate(' + o.x.toFixed(1) + ' ' + o.y.toFixed(1) + ') rotate(' + o.rot.toFixed(0) + ') scale(1.7)');
        });
        this._fallStep(conf, dt, t);
      } };
    }

    /** Halloween: Fledermäuse, Spinnweben in den Ecken, eine Spinne am Faden, Nebel, flackernde Kürbisse, ab und zu ein Blitz */
    _buildHalloween() {
      const layer = el('g', { class: 'halloween', 'pointer-events': 'none' }, this.svg);
      // Spinnweben in den oberen Ecken
      const web = (x0, y0, sx) => {
        let d = '';
        const rays = [0, 18, 36, 54, 72, 90].map((a) => a / 57.3);
        rays.forEach((a) => { d += 'M' + x0 + ' ' + y0 + 'L' + (x0 + sx * Math.cos(a) * 230).toFixed(1) + ' ' + (y0 + Math.sin(a) * 230).toFixed(1); });
        [55, 100, 145, 190, 228].forEach((r) => {
          for (let i = 0; i < rays.length - 1; i++) {
            const a = rays[i], b = rays[i + 1], m = (a + b) / 2;
            d += 'M' + (x0 + sx * Math.cos(a) * r).toFixed(1) + ' ' + (y0 + Math.sin(a) * r).toFixed(1)
              + 'Q' + (x0 + sx * Math.cos(m) * r * 0.9).toFixed(1) + ' ' + (y0 + Math.sin(m) * r * 0.9).toFixed(1)
              + ' ' + (x0 + sx * Math.cos(b) * r).toFixed(1) + ' ' + (y0 + Math.sin(b) * r).toFixed(1);
          }
        });
        el('path', { d, fill: 'none', stroke: '#e8e8f0', 'stroke-width': 1.1, opacity: 0.55 }, layer);
      };
      web(-40, -90, 1); web(1640, -90, -1);
      // Nebel
      const fog = [], fg = el('g', null, layer);
      for (let i = 0; i < 6; i++) fog.push({ e: el('ellipse', { rx: 260, ry: 40, fill: this._glow('#cdd6e6'), opacity: 0.35 }, fg), x: i * 300 - 100, y: 650 + (i % 3) * 22, v: 12 + Math.random() * 14 });
      // Kürbisse
      const pumps = [];
      [[70, 1.1], [165, 0.8], [1530, 1.1], [1435, 0.8]].forEach((p, i) => {
        const g = el('g', { transform: 'translate(' + p[0] + ' 684) scale(' + p[1] + ')' }, layer);
        const glow = el('circle', { r: 70, fill: this._glow('#ff9a2a'), opacity: 0.5 }, g);
        el('ellipse', { rx: 26, ry: 21, fill: '#ff7a1a', stroke: '#7a2e00', 'stroke-width': 2 }, g);
        el('ellipse', { rx: 15, ry: 21, fill: '#ff9433', stroke: '#7a2e00', 'stroke-width': 1.2 }, g);
        el('ellipse', { rx: 6, ry: 21, fill: '#ffab4d', stroke: '#7a2e00', 'stroke-width': 1 }, g);
        el('path', { d: 'M-3 -19Q-3 -29 4 -31Q4 -24 3 -19Z', fill: '#3d7a2a', stroke: '#1d3d12', 'stroke-width': 1 }, g);
        const face = 'M-14 -6L-6 -6L-10 -13ZM6 -6L14 -6L10 -13ZM-2 0L2 0L0 -4ZM-15 5L-10 8L-6 5L-2 9L2 5L6 8L10 5L15 6L12 13Q0 18 -12 13Z';
        el('path', { d: face, fill: '#2a1000' }, g);
        const lit = el('path', { d: face, fill: '#ffe27a' }, g);
        pumps.push({ glow, lit, ph: i * 1.7 });
      });
      // Fledermäuse
      const bats = [];
      for (let i = 0; i < 5; i++) {
        const g = el('g', null, layer), wings = el('g', null, g);
        const wing = 'M0 0C-6 -9 -18 -12 -28 -4C-23 -4 -19 0 -15 6C-12 1 -6 2 0 5Z';
        el('path', { d: wing, fill: '#2b1b3a', stroke: '#8a6ab0', 'stroke-width': 1 }, wings);
        el('path', { d: wing, fill: '#2b1b3a', stroke: '#8a6ab0', 'stroke-width': 1, transform: 'scale(-1 1)' }, wings);
        el('ellipse', { rx: 4.5, ry: 6.5, fill: '#2b1b3a', stroke: '#8a6ab0', 'stroke-width': 1 }, g);
        el('path', { d: 'M-4 -5L-5 -11L-1 -7ZM4 -5L5 -11L1 -7Z', fill: '#2b1b3a', stroke: '#8a6ab0', 'stroke-width': 0.8 }, g);
        el('circle', { cx: -1.8, cy: -3, r: 0.9, fill: '#ff3b3b' }, g); el('circle', { cx: 1.8, cy: -3, r: 0.9, fill: '#ff3b3b' }, g);
        const dir = Math.random() < 0.5 ? 1 : -1;
        bats.push({ g, wings, x: Math.random() * 1700 - 50, by: 60 + Math.random() * 480, v: dir * (90 + Math.random() * 60), ph: Math.random() * 6.28, sc: 1 + Math.random() * 0.6 });
      }
      // Spinne am Faden
      const sp = el('g', null, layer), thread = el('line', { x1: 430, y1: -90, x2: 430, y2: 0, stroke: '#e8e8f0', 'stroke-width': 1, opacity: 0.7 }, sp);
      const spider = el('g', null, sp);
      el('circle', { cy: 8, r: 7, fill: '#1c1426', stroke: '#8a6ab0', 'stroke-width': 1 }, spider);
      el('circle', { r: 4.5, fill: '#1c1426', stroke: '#8a6ab0', 'stroke-width': 1 }, spider);
      el('path', { d: 'M-5 6L-14 -2L-17 6M-6 9L-17 8L-15 17M5 6L14 -2L17 6M6 9L17 8L15 17M-4 11L-10 20M4 11L10 20', stroke: '#1c1426', 'stroke-width': 1.6, fill: 'none' }, spider);
      el('circle', { cx: -1.8, cy: -1, r: 1, fill: '#ff3b3b' }, spider); el('circle', { cx: 1.8, cy: -1, r: 1, fill: '#ff3b3b' }, spider);
      // Blitz
      const flash = el('rect', { x: -40, y: -90, width: 1680, height: 800, fill: '#dfe6ff', opacity: 0 }, layer);
      let t = 0, flT = -1, nextFlash = 14;
      return { layer, update: (dt) => {
        t += dt;
        fog.forEach((f) => { f.x += f.v * dt; if (f.x > 1750) f.x = -320; f.e.setAttribute('cx', f.x.toFixed(1)); f.e.setAttribute('cy', f.y); });
        pumps.forEach((p) => {
          const k = 0.7 + 0.3 * Math.sin(t * 11 + p.ph) * Math.sin(t * 5.3 + p.ph * 2);
          p.lit.setAttribute('opacity', k.toFixed(2)); p.glow.setAttribute('opacity', (0.35 + 0.3 * k).toFixed(2));
        });
        bats.forEach((b) => {
          b.x += b.v * dt;
          if (b.x > 1750 || b.x < -120) { b.x = b.v > 0 ? -90 : 1720; b.by = 60 + Math.random() * 480; }
          const y = b.by + 40 * Math.sin(t * 2 + b.ph) + 14 * Math.sin(t * 5.1 + b.ph * 3);
          b.g.setAttribute('transform', 'translate(' + b.x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (b.v > 0 ? b.sc : -b.sc).toFixed(2) + ' ' + b.sc.toFixed(2) + ') rotate(' + (8 * Math.sin(t * 2 + b.ph)).toFixed(0) + ')');
          b.wings.setAttribute('transform', 'scale(1 ' + (0.2 + 0.8 * Math.abs(Math.sin(t * 9 + b.ph))).toFixed(2) + ')');
        });
        const sy = 60 + 60 * (0.5 + 0.5 * Math.sin(t * 0.55));
        thread.setAttribute('y2', (sy + 6).toFixed(1)); spider.setAttribute('transform', 'translate(430 ' + sy.toFixed(1) + ') scale(1.2)');
        nextFlash -= dt;
        if (nextFlash <= 0) { flT = 0; nextFlash = 22 + Math.random() * 18; }
        if (flT >= 0) {
          flT += dt;
          flash.setAttribute('opacity', (flT < 0.08 ? 0.3 : flT < 0.16 ? 0 : flT < 0.3 ? 0.18 : 0).toFixed(2));
          if (flT > 0.3) flT = -1;
        }
      } };
    }

    _buildXmas() {
      const layer = this.xmasLayer = el('g', { class: 'xmas', 'pointer-events': 'none', display: 'none' }, this.svg);
      const colors = ['#ff3b30', '#ffd23a', '#37d65a', '#3d8bff', '#ffe6b0'];
      colors.forEach((c, i) => {
        const g = el('radialGradient', { id: 'xGlow' + i }, this.defs);
        el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': 0.75 }, g);
        el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }, g);
      });
      // fester Startwert: die Kette sieht bei jedem Laden gleich "zufällig" aus
      let seed = 20241224;
      const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

      // Ankerpunkte entlang der oberen Außenkante: links und rechts getrennt, mit unregelmäßigem Abstand
      const probe = el('path', { d: SILHOUETTE }, this.defs);
      const total = probe.getTotalLength();
      let end = 0;
      for (let s = 0; s < total / 2; s += 6) { if (probe.getPointAtLength(s).y > 520) break; end = s; }
      const inward = (p, k) => {
        const dx = 800 - p.x, dy = 330 - p.y, l = Math.hypot(dx, dy) || 1;
        return { x: p.x + (dx / l) * k, y: p.y + (dy / l) * k };
      };
      const side = (mirror) => {
        const out = [];
        for (let s = 40 + rnd() * 120; s < end - 70; s += 150 + rnd() * 150) out.push(s);
        out.push(end);
        return out.map((s) => { const q = probe.getPointAtLength(s); return inward(mirror ? { x: 1600 - q.x, y: q.y } : q, 5 + rnd() * 5); });
      };
      const left = side(true).reverse(), right = side(false);
      probe.remove();
      const pts = left.concat(right);

      this._bulbs = [];
      const wire = el('g', null, layer), bulbs = el('g', null, layer);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
        const m = { x: (a.x + b.x) / 2 + (b.x - a.x) * (rnd() - 0.5) * 0.3, y: (a.y + b.y) / 2 + (b.y - a.y) * (rnd() - 0.5) * 0.3 };
        const c = inward(m, 2 * len * (0.07 + rnd() * 0.1));   // längere Stücke hängen mehr durch, jedes anders
        el('path', { d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1),
          fill: 'none', stroke: '#17381f', 'stroke-width': 2.2 + rnd() * 0.8, 'stroke-linecap': 'round' }, wire);
        const n = Math.max(2, Math.round(len / 48));
        for (let j = 0; j < n; j++) {
          const u = Math.min(0.94, Math.max(0.06, (j + 0.5 + (rnd() - 0.5) * 0.7) / n));
          const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x;
          const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y;
          const r = rnd(), k = r < 0.27 ? 0 : r < 0.5 ? 1 : r < 0.74 ? 2 : r < 0.94 ? 3 : 4;   // Rot, Gelb, Grün, Blau, selten Warmweiß
          const sc = 0.82 + rnd() * 0.36, tilt = (rnd() - 0.5) * 26;
          const g = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + tilt.toFixed(1) + ') scale(' + sc.toFixed(2) + ')' }, bulbs);
          el('circle', { cy: 8, r: 18, fill: 'url(#xGlow' + k + ')' }, g);
          el('rect', { x: -2.6, y: 0, width: 5.2, height: 4, rx: 1, fill: '#1b1d20' }, g);
          el('ellipse', { cy: 9, rx: 4.6, ry: 6.4, fill: colors[k], stroke: '#0006', 'stroke-width': 0.8 }, g);
          el('ellipse', { cx: -1.4, cy: 6.6, rx: 1.3, ry: 2.2, fill: '#fff', opacity: 0.55 }, g);
          this._bulbs.push({ g, x, y, sc, tilt, op: 1, sp: 1.3 + rnd() * 2.4, ph: rnd() * 6.28, steady: rnd() < 0.15, sw: 0.8 + rnd() * 1.4, swph: rnd() * 6.28 });
        }
      }

      // Schneefall: kleine Punkte und größere Sechsstrahler, die schräg nach unten treiben
      this._flakes = [];
      const snow = el('g', { fill: 'none' }, layer);
      for (let i = 0; i < 70; i++) {
        const r = 1.3 + Math.random() * 3.6, big = r > 3.2;
        const g = el('g', null, snow);
        if (big) {
          const q = r * 1.7;
          el('path', { d: 'M0 ' + -q + 'V' + q + 'M' + (-0.87 * q) + ' ' + (-0.5 * q) + 'L' + (0.87 * q) + ' ' + (0.5 * q) + 'M' + (-0.87 * q) + ' ' + (0.5 * q) + 'L' + (0.87 * q) + ' ' + (-0.5 * q),
            stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.9 }, g);
        } else {
          el('circle', { r, fill: '#fff', opacity: 0.55 + Math.random() * 0.4 }, g);
        }
        this._flakes.push({ g, x: Math.random() * 1680 - 40, y: Math.random() * 800 - 90, vy: 28 + r * 14 + Math.random() * 20, sw: 8 + Math.random() * 16,
          ph: Math.random() * 6.28, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 60 });
      }
      this._xt = 0;
    }

    _xmasFrame(dt) {
      this._xt += dt;
      const t = this._xt;
      this._bulbs.forEach((b) => {
        const op = b.steady ? 0.8 + 0.2 * Math.sin(t * 0.9 + b.ph) : 0.22 + 0.78 * Math.max(0, Math.sin(t * b.sp + b.ph) + 0.15 * Math.sin(t * 7.3 + b.ph * 3));
        if (Math.abs(op - b.op) > 0.03) { b.op = op; b.g.setAttribute('opacity', Math.min(1, op).toFixed(2)); }
        b.g.setAttribute('transform', 'translate(' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ') rotate(' + (b.tilt + 3.5 * Math.sin(t * b.sw + b.swph)).toFixed(1) + ') scale(' + b.sc.toFixed(2) + ')');
      });
      this._flakes.forEach((f) => {
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        if (f.y > 710) { f.y = -100; f.x = Math.random() * 1680 - 40; }
        const x = f.x + Math.sin(t * 0.9 + f.ph) * f.sw + t * 6 % 1680;
        f.g.setAttribute('transform', 'translate(' + (x > 1640 ? x - 1680 : x).toFixed(1) + ' ' + f.y.toFixed(1) + ') rotate(' + f.rot.toFixed(0) + ')');
      });
    }

    setLight(o) {
      if (o.night != null && !!o.night !== !!this._night) {
        // Ohne Übergänge umschalten: sonst laufen Deckkraft, Farben und Filter unterschiedlich schnell und die Ebenen sind kurz nicht deckungsgleich
        this.svg.classList.add('sw');
        requestAnimationFrame(() => requestAnimationFrame(() => this.svg.classList.remove('sw')));
      }
      if (o.night != null) { this.svg.classList.toggle('night', !!o.night); this._night = !!o.night; }
      if (o.dim != null) this._dim = o.dim;
      const night = this._night, dim = this._dim;
      this.svg.style.setProperty('--lit', String(night ? 0.55 + 0.45 * dim : 1));
      this.svg.style.setProperty('--glow', String(night ? dim : 0));
      // Nachts wird alles Unbeleuchtete dunkel, nur das Beleuchtete leuchtet
      const shade = night ? 0.68 : 0;
      this.shade.setAttribute('opacity', String(shade));
      this.svg.style.setProperty('--shade-a', String(shade));
    }

    _draw(n) {
      const a = n.angFn ? n.angFn(n.f) : n.a0 + n.f * (n.a1 - n.a0);
      if (n.drawn === null || Math.abs(a - n.drawn) > 0.005) {
        n.drawn = a;
        n.rot.setAttribute('transform', 'rotate(' + a.toFixed(3) + ')');
      }
    }

    /** Feder-Dämpfer-Simulation der Nadeln, dt in Sekunden */
    frame(dt) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (const key in this.needles) {
        const n = this.needles[key];
        for (let i = 0; i < steps; i++) {
          n.v += (n.k * (n.target - n.f) - n.c * n.v) * h;
          n.f += n.v * h;
          if (n.f < 0) { n.f = 0; if (n.v < 0) n.v = 0; }
          else if (n.f > 1) { n.f = 1; if (n.v > 0) n.v = 0; }
        }
        this._draw(n);
      }
      if (this._season) this._seasons[this._season].update(dt);
    }
  }

  E46Cluster.seasonForDate = seasonForDate;
  global.E46Cluster = E46Cluster;
})(window);
