/* <e46-jira-cluster> – digitales BMW-E46-Kombiinstrument, Jira-Variante, als Web Component. Erzeugt von web/widget/build.py, nicht von Hand ändern.
 * Schriften: Oswald und Barlow (SIL Open Font License 1.1), siehe web/fonts.css. */
(function () {
'use strict';
const window = {};   // cluster.js, sim.js und grain.js hängen ihre Klassen an dieses lokale Objekt
/* Feine Körnung für Frontplatte und matte Naben (96x96, wiederholt) */
window.E46_GRAIN = 'data:image/png;base64,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';

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
    door_dev: '<path d="M20 -19L9.9 -40.8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_test: '<path d="M-4 -19L-14.1 -40.8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_stage: '<path d="M20 19L9.9 40.8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    door_prod: '<path d="M-4 19L-14.1 40.8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
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
    arrk: [205, 546, 1.15], tt: [280, 546, 1.0], oilwarn: [355, 546, 1.0],   // eine Reihe, spiegelbildlich zu lab / nr / defect rechts
    battery: [1026, 542, 1.0], cruise: [1101, 547, 1.0],   // zwei Leuchten im Feld rechts neben dem Display, Abstand wie bei den anderen Gruppen
    lab: [1245, 546, 1.0], nr: [1320, 546, 1.0], defect: [1395, 546, 1.0],
    door_dev: [537, 546, 1.0], door_test: [537, 546, 1.0], door_stage: [537, 546, 1.0], door_prod: [537, 546, 1.0],
  };

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
        texts: [['Defects', -81, 20, 0], ['aktiv', -59, 20, 0]], spring: [320, 0.8], needle: { len: 190, wb: 11.5, wt: 3.4, hub: 31, tail: true },
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
        if (n && isFinite(values[k])) n.target = clamp01(n.toFrac(values[k]));
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
    }
  }

  global.E46Cluster = E46Cluster;
})(window);

/* Einfache Fahrsimulation für die Demo: Schaltgetriebe, Warmlaufen, Fahrzyklus in Schleife. */
(function (global) {
  'use strict';

  // 330i-ähnlich: Gangübersetzungen, Achsübersetzung, Abrollumfang 2,0 m
  const RATIOS = [4.35, 2.5, 1.66, 1.24, 1.0, 0.85];
  const FINAL = 3.15;
  const RPM_PER_KMH = (60 / 3.6 / 2.0) * FINAL;   // Raddrehzahl je km/h * Achse
  const IDLE = 800;
  const ACCEL = [30, 21, 14, 10, 7, 5];            // km/h je s bei Volllast je Gang
  const BRAKE = 24;                                // km/h je s
  const COAST = 2.2;

  // Fahrzyklus: Zielgeschwindigkeit, danach Haltezeit in s
  const CYCLE = [
    { v: 0, hold: 3 },
    { v: 55, hold: 1 },
    { v: 110, hold: 5 },
    { v: 70, hold: 1 },
    { v: 200, hold: 4 },
    { v: 130, hold: 3 },
    { v: 40, hold: 1 },
    { v: 0, hold: 4 },
  ];

  class DriveSim {
    constructor() { this.reset(); }

    reset() {
      this.t = 0;
      this.speed = 0;
      this.gear = 1;
      this.rpm = IDLE;
      this.shift = 0;
      this.step = 0;
      this.hold = CYCLE[0].hold;
      this.hard = false;
      this.coolant = 40;
      this.oil = 40;
      this.fuel = 0.65;
      this.dist = 0;
      this.fco = 0;
    }

    update(dt) {
      dt = Math.min(dt, 0.1);
      this.t += dt;
      const goal = CYCLE[this.step];
      const hard = this.hard;
      const accelerating = this.speed < goal.v - 1;

      if (accelerating) {
        const a = ACCEL[this.gear - 1] * (this.shift > 0 ? 0 : 1) * (hard ? 1 : 0.55) * (1 - this.speed / 300);
        this.speed = Math.min(goal.v, this.speed + a * dt);
      } else if (this.speed > goal.v + 1) {
        this.speed = Math.max(goal.v, this.speed - (this.speed - goal.v > 15 ? BRAKE : COAST * 3) * dt);
      } else {
        this.speed = goal.v;
        this.hold -= dt;
        if (this.hold <= 0) {
          this.step = (this.step + 1) % CYCLE.length;
          this.hold = CYCLE[this.step].hold;
          this.hard = CYCLE[this.step].v - this.speed > 45;   // Vollgas-Phase, bis das Ziel erreicht ist
        }
      }

      // Schalten
      this.shift = Math.max(0, this.shift - dt);
      const geared = this.speed * RPM_PER_KMH * RATIOS[this.gear - 1];
      if (this.shift === 0) {
        const upAt = accelerating && hard ? 6300 : 3200;
        if (geared > upAt && this.gear < 6) { this.gear++; this.shift = 0.4; }
        else if (geared < 1350 && this.gear > 1 && this.speed > 5) { this.gear--; this.shift = 0.3; }
      }

      // Drehzahl
      const idle = IDLE + 14 * Math.sin(this.t * 7.1) + 9 * Math.sin(this.t * 12.7);
      let rpm = this.speed * RPM_PER_KMH * RATIOS[this.gear - 1];
      if (this.speed < 14 && accelerating) rpm = Math.max(rpm, 2400);   // Kupplung schleift
      if (this.shift > 0) rpm = Math.max(idle, rpm * 0.9);
      this.rpm = Math.min(6900, Math.max(idle, rpm));

      // Temperaturen und Tank
      const load = this.rpm / 6000;
      this.coolant += ((88 + 6 * load) - this.coolant) * (dt / 40);
      this.oil += ((102 + 10 * load) - this.oil) * (dt / 80);
      this.fuel = Math.max(0.05, this.fuel - dt * 0.0006 * (0.4 + load));
      this.dist += this.speed / 3600 * dt;

      // Momentanverbrauch L/100km: Schub = 0, Vollgas hoch, sonst grob drehzahl- und tempoabhängig
      let fco;
      if (this.speed < 3) fco = 0.8;
      else if (this.speed > goal.v + 1) fco = 0;
      else if (accelerating) fco = this.hard ? 17 : 9 + this.speed / 25;
      else fco = 4.5 + this.speed / 22;
      this.fco += (fco - this.fco) * Math.min(1, dt * 3);
      return this;
    }

    get gearLabel() { return this.speed < 3 ? 'N' : String(this.gear); }
  }

  /** Demo-Daten der Jira-Variante: Defects (0 bis 50 und darüber), Nightrun-Tickets (0 bis 20 und darüber), Sprint-Restzeit. */
  class TicketSim {
    constructor() { this.reset(); }
    reset() { this.t = 0; this.defects = 18; this.nightrun = 8; this.sprint = 1; this.success = 80; this.closed = 6; this.doors = {}; }
    update(dt) {
      this.t += dt;
      // Ganze Tickets, langsam auf und ab; erreicht zeitweise 50 Defects und mehr als 20 Nightrun-Tickets
      this.defects = Math.max(0, Math.round(27 + 29 * Math.sin(this.t / 13 - 1.1)));
      this.nightrun = Math.max(0, Math.round(10 + 12 * Math.sin(this.t / 8.5)));
      this.success = Math.min(100, Math.max(0, Math.round(78 + 24 * Math.sin(this.t / 11 + 1))));   // BAC30 Success %, geht zeitweise bis 100
      this.closed = Math.max(0, Math.min(20, Math.round((8 + 7 * Math.sin(this.t / 7 + 2)) * 2) / 2));   // abgearbeitete Defects pro Tag, in halben Schritten
      this.sprint = 1 - ((this.t % 150) / 150);   // Sprint-Restzeit: voll am Anfang, leer am Ende, dann neuer Sprint
      // Auto: die vier Türen (Dev, Test, Staging, Prod) gehen reihum für einige Sekunden auf
      const P = [[23, 0.2], [31, 1.7], [37, 3.1], [53, 4.4]];
      ['door_dev', 'door_test', 'door_stage', 'door_prod'].forEach((k, i) => { this.doors[k] = Math.sin(this.t * 6.2832 / P[i][0] + P[i][1]) > 0.8; });
      return this;
    }
  }

  global.TicketSim = TicketSim;
  global.DriveSim = DriveSim;
  global.DriveSim.RATIOS = RATIOS;
  global.DriveSim.RPM_PER_KMH = RPM_PER_KMH;
})(typeof window !== 'undefined' ? window : globalThis);

const { E46Cluster, DriveSim, TicketSim } = window;
/* <e46-jira-cluster>: das Kombiinstrument in der Jira-Variante als Web Component. Wird von build.py mit cluster.js, sim.js,
 * grain.js und den Schriften zu e46-jira-cluster.js zusammengesetzt (E46Cluster, DriveSim, TicketSim und E46_GRAIN sind dort im
 * selben Closure sichtbar).
 *
 * Drehzahlmesser = aktive Defects (0 bis 50), Kühlmittel = offene Nightrun-Tickets (intern 0 bis 20), Tank = Sprint-Restzeit.
 * Steuerung: Attribute, Properties, Methoden oder Befehle im Stil des ESP32-Protokolls ("SET defects 23 nightrun 7").
 */
const VERSION = '1.0.0';

const MAX_DEFECTS = 50, MAX_NIGHTRUN = 20;   // Anschlag der Nadeln; bei 50 Defects leuchtet die Defect-Leuchte, über 20 Tickets NR
const NUMBERS = {          // Property: [min, max, Standard]
  defects: [0, 100, 0], nightrun: [0, 40, 0], sprint: [0, 1, 1],
  success: [0, 100, 0], closed: [0, 20, 0], dim: [0, 1, 0.85],
};
const BOOLS = {            // Property: Standard
  ignition: true, night: false, demo: false,
  mil: false, lab: false, cruise: false, oilwarn: false, battery: false, oilpress: false,
  arrk: false, tt: false,
  door_dev: false, door_test: false, door_stage: false, door_prod: false,   // Auto: vier Türen
  defect: false, nr: false,     // schalten sich über die Werte; true erzwingt die Leuchte
  turnLeft: false, turnRight: false, hazard: false,
};
const LAMPS = ['mil', 'lab', 'cruise', 'oilwarn', 'battery', 'oilpress', 'arrk', 'tt', 'door_dev', 'door_test', 'door_stage', 'door_prod'];   // von Hand schaltbar

// Befehlsschlüssel -> Property. Wo es sie am ESP32 gibt, heißen sie gleich (docs/protocol.md): ign, mil, cruise, oilwarn,
// battery, oilpress. Neu in dieser Variante: defects, nightrun, sprint, success (Testresults statt speed), closed (Defects closed/Day statt fco).
const KEYS = {
  defects: 'defects', nightrun: 'nightrun', sprint: 'sprint',
  success: 'success', closed: 'closed',
  ign: 'ignition', mil: 'mil', cruise: 'cruise', oilwarn: 'oilwarn',
  battery: 'battery', oilpress: 'oilpress',
  lab: 'lab', arrk: 'arrk', tt: 'tt', defect: 'defect', nr: 'nr',
  door_dev: 'door_dev', door_test: 'door_test', door_stage: 'door_stage', door_prod: 'door_prod',
  left: 'turnLeft', right: 'turnRight', hazard: 'hazard', night: 'night', dim: 'dim', demo: 'demo',
  odo: 'odometer', trip: 'trip', clock: 'clock',
};
const ATTRS = Object.keys(NUMBERS).concat(Object.keys(BOOLS), ['odometer', 'trip', 'clock', 'selftest']);

const CSS = ":host { display: block; line-height: 0; }\n.box { width: 100%; }\nsvg.cluster { display: block; width: 100%; height: auto; }\n/* ---------- Kombi (SVG) ---------- */\nsvg.cluster {\n  font-family: \"Oswald\", \"Bahnschrift\", \"DIN Alternate\", \"Arial Narrow\", system-ui, sans-serif;\n  font-weight: 500;\n  --lit: 1;\n  --glow: 0;\n  --shade-a: 0;\n  --dot-on: #ffb383;\n  --dot-off: #9a1914;\n}\nsvg.cluster * { transition: opacity .6s, fill .6s, stroke .6s, filter .6s, color .3s; }\nsvg.cluster .needle-wrap, svg.cluster .needle-wrap *, svg.cluster .dot { transition: none; }\nsvg.cluster.sw, svg.cluster.sw * { transition: none !important; }   /* Tag/Nacht: alles in einem Schritt */\n\n.numerals text, .unit { fill: #eeeeee; }\n.unit-icon { color: #eeeeee; }\n.unit { font-family: \"Barlow\", \"Bahnschrift\", \"DIN Alternate\", system-ui, sans-serif; font-weight: 600; }\n\n.lit { opacity: var(--lit); }\n.hub-shade { opacity: var(--shade-a); pointer-events: none; }\n\n.tick { stroke: #eeeeee; stroke-linecap: butt; }\n.redband { stroke: #dc2a21; }\n.deco { color: #c9ccd4; opacity: .10; }\n.shade { pointer-events: none; }\n\n/* Nachtmodus: Unbeleuchtetes wird dunkel (Abdunkelung per Ebene), Beleuchtetes leuchtet warmwei\u00df mit orangem Hof */\n.cluster.night .lit {\n  filter: drop-shadow(0 0 2px rgba(255, 170, 90, calc(.85 * var(--glow)))) drop-shadow(0 0 calc(var(--glow) * 7px) rgba(255, 110, 30, .6));\n}\n.cluster.night .numerals text, .cluster.night .unit, .cluster.night .unit-icon { fill: #fff1de; color: #fff1de; }\n.cluster.night .tick { stroke: #fff1de; }\n.cluster.night .redband { stroke: #ff3b28; }\n.cluster.night .needle-tail { fill: #17171a; }\n.cluster.night .turn:not(.on) { opacity: .35; }\n.cluster.night .lamp:not(.on) { opacity: .05; }\n\n/* Nadeln: tags\u00fcber wei\u00df, nachts orange beleuchtet */\n.needle-wrap { filter: drop-shadow(2px 4px 3px rgba(0, 0, 0, .55)); }\n.cluster.night .needle-shape { fill: #ff7a38; }\n.cluster.night .needle-wrap {\n  filter: drop-shadow(2px 4px 3px rgba(0, 0, 0, .55)) drop-shadow(0 0 calc(var(--glow) * 8px) rgba(255, 90, 20, .9));\n}\n.cluster.off .needle-shape { fill: #bdbdc2; }\n.cluster.off .needle-wrap { filter: drop-shadow(2px 4px 3px rgba(0, 0, 0, .55)); }\n.cluster.off .lit { opacity: .3; filter: none; }\n.cluster.off .needle-tail { fill: #3b3b3f; }\n\n.glass { pointer-events: none; }\n\n/* Leuchten */\n.lamp { opacity: .10; color: var(--amber, #ffb000); }\n.lamp.green { color: var(--green, #3ddc5a); }\n.lamp.red { color: var(--red, #ff2a1a); }\n.lamp.blue { color: #4a7fe0; }\n.lamp.orange { color: #ff7a01; }\n.lamp.bmw { color: #f2f6ff; }\n.lamp.on { opacity: 1; filter: drop-shadow(0 0 7px currentColor); }\n\n.turn { color: #4a3f43; }\n.turn.on { color: var(--green, #3ddc5a); filter: drop-shadow(0 0 8px currentColor); animation: blink .8s steps(1) infinite; }\n@keyframes blink { 0% { opacity: 1; } 50% { opacity: .25; filter: none; } }\n\n/* Mittendisplay: rote Punktmatrix */\n.lcd .dot { fill: var(--dot-off); }\n.lcd .dot.on { fill: var(--dot-on); }\n.lcd { filter: drop-shadow(0 0 2px rgba(255, 90, 50, .55)); }\n.cluster.off .lcd { opacity: .15; filter: none; }\n\n";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const toBool = (v) => !(v === false || v === null || v === 'false' || v === '0' || v === 0);

let fontsInjected = false;
function injectFonts() {
  // schon vom Original-Widget gesetzt? Dann nichts doppelt einfügen
  if (fontsInjected || typeof document === 'undefined' || document.querySelector('style[data-e46-cluster-fonts]')) return;
  fontsInjected = true;
  const st = document.createElement('style');
  st.setAttribute('data-e46-cluster-fonts', '');
  st.textContent = "/* Oswald 500 (Skalenzahlen) und Barlow 600 (Beschriftungen), Basic Latin + Grad-Zeichen.\n   Beide unter SIL Open Font License 1.1: Oswald (c) The Oswald Project Authors (Vernon Adams, Kalapi Gajjar, Cyreal),\n   Barlow (c) The Barlow Project Authors (https://github.com/jpt/barlow).\n   Ersatz f\u00fcr die Schriften des Kombis. Ziffernform und -proportionen sind am Foto nachgemessen (siehe README). */\n@font-face { font-family: \"Oswald\"; font-weight: 500; font-style: normal; font-display: swap;\n  src: url(data:font/woff2;base64,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) format(\"woff2\"); }\n@font-face { font-family: \"Barlow\"; font-weight: 600; font-style: normal; font-display: swap;\n  src: url(data:font/woff2;base64,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) format(\"woff2\"); }\n";
  document.head.appendChild(st);
}

class E46JiraClusterElement extends HTMLElement {
  static get observedAttributes() { return ATTRS; }

  constructor() {
    super();
    this._s = { odometer: 148213, trip: 0, clock: 'auto', selftest: true };
    for (const k in NUMBERS) this._s[k] = NUMBERS[k][2];
    for (const k in BOOLS) this._s[k] = BOOLS[k];
    this._sim = null;
    this._raf = 0;
    this._test = null;        // { t } während des Nadelsweeps
    this._cluster = null;
    this._pending = false;
  }

  connectedCallback() {
    if (!this._cluster) {
      injectFonts();
      const root = this.attachShadow({ mode: 'open' });
      const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
      const box = document.createElement('div'); box.className = 'box'; root.appendChild(box);
      this._cluster = new E46Cluster(box);
      this._applyLook();
      if (this._s.demo) this._startSim();
      if (this._s.ignition && this._s.selftest) this._test = { t: 0 };
      else if (!this._s.ignition) this._cluster.setPower(false);
    }
    this._last = performance.now();
    const loop = (now) => { this._raf = requestAnimationFrame(loop); this._frame(now); };
    this._raf = requestAnimationFrame(loop);
    this.dispatchEvent(new CustomEvent('clusterready', { detail: this.state }));
  }

  disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }

  attributeChangedCallback(name, _old, val) {
    if (name === 'clock') { this.clock = val == null ? 'auto' : val; return; }
    if (name === 'selftest') { this._s.selftest = toBool(val); return; }
    if (name in NUMBERS) { if (val != null && val !== '') this[name] = Number(val); return; }
    if (name === 'odometer' || name === 'trip') { if (val != null && val !== '') this[name] = Number(val); return; }
    if (name in BOOLS) this[name] = val === null ? BOOLS[name] : toBool(val);
  }

  // ---------- Zustand ----------

  /** Aktueller Zustand als einfaches Objekt (Soll-Werte, ohne Nadelträgheit). */
  get state() {
    const o = {};
    for (const k in NUMBERS) o[k] = this._s[k];
    for (const k in BOOLS) o[k] = this._s[k];
    o.odometer = Math.floor(this._s.odometer); o.trip = this._s.trip; o.clock = this._s.clock;
    return o;
  }

  /** Mehrere Werte auf einmal setzen: el.set({ defects: 23, nightrun: 7, sprint: 0.6 }). Unbekannte Schlüssel werfen. */
  set(values) {
    for (const k in values) if (!(k in NUMBERS || k in BOOLS || k === 'odometer' || k === 'trip' || k === 'clock')) throw new Error('unknown key ' + k);
    for (const k in values) this[k] = values[k];
    return this;
  }

  _changed() {
    if (this._pending) return;
    this._pending = true;
    queueMicrotask(() => { this._pending = false; this.dispatchEvent(new CustomEvent('clusterchange', { detail: this.state })); });
  }

  _applyLook() {
    if (this._cluster) this._cluster.setLight({ night: this._s.night, dim: this._s.dim });
  }

  // ---------- Fahrsimulation ----------

  _startSim() { this._sim = { drive: new DriveSim(), tickets: new TicketSim() }; }

  // ---------- Selbsttest ----------

  /** Nadelsweep und Lampentest wie beim Einschalten des echten Kombis. */
  selftest() { if (this._s.ignition) this._test = { t: 0 }; return this; }

  // ---------- Befehle ----------

  /**
   * Einen Befehl im Stil des ESP32-Protokolls ausführen und die Antwortzeile zurückgeben ("OK", "ERR …", "STATE …").
   * SET k v [k v …], GET, ZERO, PING, SELFTEST, RESET, HELP. Schlüssel: siehe README.
   */
  command(line) {
    const w = String(line).trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '';
    const cmd = w[0].toUpperCase();
    if (cmd === 'PING') return 'PONG e46-jira-cluster-widget ' + VERSION;
    if (cmd === 'HELP') return 'HELP SET k v [k v ...] | GET | ZERO | SELFTEST | RESET | PING | keys: ' + Object.keys(KEYS).join(' ');
    if (cmd === 'GET') {
      const s = this.state, p = [];
      for (const k in KEYS) { const v = s[KEYS[k]]; p.push(k + '=' + (typeof v === 'boolean' ? (v ? 1 : 0) : (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v))); }
      return 'STATE ' + p.join(' ');
    }
    if (cmd === 'ZERO') { this.defects = 0; this.success = 0; this.closed = 0; return 'OK'; }
    if (cmd === 'SELFTEST') { this.selftest(); return 'OK'; }
    if (cmd === 'RESET') { this._reset(); return 'OK'; }
    if (cmd === 'SET') {
      if (w.length < 3 || w.length % 2 === 0) return 'ERR usage';
      const todo = [];
      for (let i = 1; i < w.length; i += 2) {
        const key = w[i].toLowerCase(), prop = KEYS[key];
        if (!prop) return 'ERR unknown_key';
        let v = w[i + 1];
        if (prop === 'clock') { if (v.toLowerCase() === 'auto') v = 'auto'; else if (!/^\d{1,2}:\d{2}$/.test(v)) return 'ERR bad_value'; }
        else { v = Number(v); if (!Number.isFinite(v)) return 'ERR bad_value'; if (prop in BOOLS) v = v !== 0; }
        todo.push([prop, v]);
      }
      for (const [p, v] of todo) this[p] = v;    // erst prüfen, dann übernehmen: ganz oder gar nicht
      return 'OK';
    }
    return 'ERR unknown_cmd';
  }

  /** Mehrere Befehle (eine pro Zeile oder durch ; getrennt). Liefert die Antwortzeilen als Array. */
  commands(text) {
    return String(text).split(/[\n;]+/).map((l) => l.trim()).filter(Boolean).map((l) => this.command(l));
  }

  _reset() {
    for (const k in NUMBERS) this[k] = NUMBERS[k][2];
    for (const k in BOOLS) if (k !== 'ignition') this[k] = BOOLS[k];
    this.ignition = true; this.clock = 'auto'; this.trip = 0;
  }

  // ---------- Bild ----------

  _frame(now) {
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    const s = this._s, c = this._cluster;
    if (!c) return;

    if (s.demo && this._sim) {
      this._sim.drive.update(dt); this._sim.tickets.update(dt);
      s.success = this._sim.tickets.success; s.closed = this._sim.tickets.closed;
      s.defects = this._sim.tickets.defects; s.nightrun = this._sim.tickets.nightrun; s.sprint = this._sim.tickets.sprint;
    }
    // Wegstrecke läuft nur in der Demo (mit der Fahrsimulation im Hintergrund), sonst steht das Mittendisplay still
    const v = s.demo && this._sim ? this._sim.drive.speed : 0;
    s.trip += (v / 3600) * dt;
    s.odometer += (v / 3600) * dt;

    // Nadelnamen im Zifferblatt: rpm = Defects, coolant = Nightrun, fuel = Sprint-Restzeit, speed = Testresults
    let tgt = s.ignition
      ? { rpm: s.defects, speed: s.success, coolant: s.nightrun, fuel: s.sprint, fco: s.closed }
      : { rpm: 0, speed: 0, coolant: 0, fuel: 0, fco: 0 };
    let all = false;
    if (this._test && s.ignition) {
      this._test.t += dt;
      const t = this._test.t;
      if (t < 1.1) tgt = { rpm: MAX_DEFECTS, speed: 100, coolant: MAX_NIGHTRUN, fuel: 1, fco: 20 };
      else if (t < 2.2) tgt = { rpm: 0, speed: 0, coolant: 0, fuel: 0, fco: 0 };
      else this._test = null;
      all = t < 2.6;
    }
    c.set(tgt);
    c.frame(dt);

    const lit = {};
    LAMPS.forEach((k) => { lit[k] = s.ignition && (all || s[k] || (s.demo && !!(this._sim && this._sim.tickets.doors[k]))); });
    // Defect-Leuchte bei 50 Defects, NR bei mehr als 20 Nightrun-Tickets: erst wenn die Nadel am Anschlag angekommen ist
    lit.defect = s.ignition && (all || s.defect || (s.defects >= MAX_DEFECTS && c.needles.rpm.f >= 0.985));
    lit.nr = s.ignition && (all || s.nr || (s.nightrun > MAX_NIGHTRUN && c.needles.coolant.f >= 0.985));
    // Tankleuchte: erst wenn die Sprint-Restzeit leer ist und die Nadel wirklich auf 0 angekommen ist
    lit.fuelwarn = s.ignition && (all || (s.sprint <= 0.02 && c.needles.fuel.f <= 0.012));
    lit.left = s.ignition && (s.turnLeft || s.hazard);
    lit.right = s.ignition && (s.turnRight || s.hazard);
    c.setLamps(lit);

    let clock = s.clock;
    if (clock === 'auto') { const d = new Date(); clock = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    c.setLcd({
      odo: String(Math.floor(s.odometer)).padStart(6, '0'),
      trip: s.trip.toFixed(1),
      clock,
    });
  }
}

// Properties: Zahlen werden auf den Skalenbereich begrenzt, Wahrheitswerte akzeptieren true/false/0/1
Object.keys(NUMBERS).forEach((k) => {
  const [lo, hi] = NUMBERS[k];
  Object.defineProperty(E46JiraClusterElement.prototype, k, {
    get() { return this._s[k]; },
    set(v) {
      v = Number(v);
      if (!Number.isFinite(v)) return;
      this._s[k] = clamp(v, lo, hi);
      if (k === 'dim') this._applyLook();
      this._changed();
    },
    enumerable: true,
  });
});
Object.keys(BOOLS).forEach((k) => {
  Object.defineProperty(E46JiraClusterElement.prototype, k, {
    get() { return this._s[k]; },
    set(v) {
      v = toBool(v);
      const was = this._s[k];
      this._s[k] = v;
      if (k === 'night') this._applyLook();
      if (k === 'demo') { if (v && !this._sim) this._startSim(); if (!v && was) this._sim = null; }
      if (k === 'ignition' && this._cluster) {
        this._cluster.setPower(v);
        this._test = v && !was && this._s.selftest ? { t: 0 } : null;
      }
      this._changed();
    },
    enumerable: true,
  });
});
['odometer', 'trip'].forEach((k) => {
  Object.defineProperty(E46JiraClusterElement.prototype, k, {
    get() { return k === 'odometer' ? Math.floor(this._s.odometer) : this._s.trip; },
    set(v) { v = Number(v); if (Number.isFinite(v) && v >= 0) { this._s[k] = v; this._changed(); } },
    enumerable: true,
  });
});
Object.defineProperty(E46JiraClusterElement.prototype, 'clock', {
  get() { return this._s.clock; },
  set(v) { this._s.clock = v == null || v === '' ? 'auto' : String(v); this._changed(); },
  enumerable: true,
});
Object.defineProperty(E46JiraClusterElement.prototype, 'selftestOnStart', {
  get() { return this._s.selftest; }, set(v) { this._s.selftest = toBool(v); },
});

if (!customElements.get('e46-jira-cluster')) customElements.define('e46-jira-cluster', E46JiraClusterElement);
globalThis.E46JiraClusterElement = E46JiraClusterElement;

})();
