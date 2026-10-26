/* E46 Kombiinstrument (Vorfacelift, vier Rundinstrumente) als SVG. Keine Abhängigkeiten.
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
    eml: '<rect x="-18" y="-12" width="36" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">EML</text>',
    cruise: '<path d="M-15 8A18 18 0 1 1 15 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M0 4L9 -9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle r="3.5" cy="4" fill="currentColor"/>',
    overheat: '<path d="M-3.5 -15a3.5 3.5 0 0 1 7 0V2.5a8 8 0 1 1 -7 0Z" fill="none" stroke="currentColor" stroke-width="3" transform="translate(-6 2)"/><path d="M5 -4h10M5 3h10M5 10h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    oilwarn: '<path d="M-17 -2H-6L-2 -9H6V-5H11L19 -11L21 -9L15 -1V8Q15 11 12 11H-12Q-17 11 -17 6Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M-12 16q3 2 6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    battery: '<rect x="-17" y="-7" width="34" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 -7v-5h6v5M5 -7v-5h6v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 2.5h7M7.5 -1v7M4 2.5h7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
    oilpress: '<path d="M-17 -4H-6L-2 -11H6V-7H11L19 -13L21 -11L15 -3V6Q15 9 12 9H-12Q-17 9 -17 4Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="-1" cy="15" r="2.6" fill="currentColor"/><path d="M-1 0v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    // nur Zifferblatt-Symbole
    // Zapfsäule: Körper um x=0 zentriert, Schlauch rechts (Maße vom Foto: 30 breit, 30 hoch)
    pump: '<rect x="-9" y="-15" width="18" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="-9" y="-2" width="18" height="13" fill="currentColor"/><rect x="-12" y="11" width="24" height="4" fill="currentColor"/><path d="M9 -8H14Q18 -8 18 -4V9Q18 13 14.5 13Q11.5 13 11.5 9.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    // Thermometer mit Wellen, um x=0 zentriert (35 breit, 32 hoch)
    therm: '<path d="M-3 2V-12.4a3 3 0 0 1 6 0V2" fill="none" stroke="currentColor" stroke-width="3.2"/><circle cy="5" r="5.4" fill="currentColor"/><path d="M4.6 -10h5M4.6 -5.5h5M4.6 -1h5" stroke="currentColor" stroke-width="2.4"/><path d="M-18 12.5q3 -3.2 6 0t6 0t6 0t6 0t6 0t6 0M-18 18.5q3 -3.2 6 0t6 0t6 0t6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  };
  const LAMP_META = {
    mil: ['amber', 'Motorkontrollleuchte'],
    eml: ['amber', 'EML'],
    cruise: ['green', 'Tempomat'],
    overheat: ['red', 'Überhitzung'],
    oilwarn: ['amber', 'Ölstand'],
    battery: ['red', 'Ladekontrolle'],
    oilpress: ['red', 'Öldruck'],
  };
  // Lage in der Leuchtenleiste: [x, y, Skalierung]
  const LAMP_POS = {
    mil: [800, 79, 0.95],
    overheat: [185, 526, 0.95], oilwarn: [265, 526, 0.95], battery: [345, 526, 0.95], oilpress: [275, 567, 0.95],
    eml: [1010, 547, 1.0], cruise: [1105, 547, 1.0],
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
  const STRIP_Y = 497, STRIP_H = 95;

  // Außenform, am Frontfoto abgenommen (Strahlen von der Mitte, auf die Mittelachse gespiegelt): Linse mit flachem Boden
  // und stark gerundeten unteren Ecken, oben ein gleichmäßiger Bogen (Haube abgeschnitten). Platte: gemessene Randpunkte,
  // rechte Hälfte gespiegelt, Oberkante mit Abstand über den Zifferblättern.
  const SILHOUETTE = 'M800 -33C819 -33 838 -33 857 -32C876 -32 894 -31 913 -30C931 -29 949 -28 966 -26C984 -25 1001 -23 1018 -21C1035 -19 1052 -17 1068 -15C1084 -12 1100 -10 1116 -7C1132 -4 1147 -1 1162 3C1176 6 1191 10 1205 14C1219 18 1232 22 1245 26C1258 31 1271 35 1283 40C1296 45 1307 51 1319 56C1330 61 1341 67 1351 73C1361 79 1371 85 1380 92C1390 98 1397 104 1407 112C1416 120 1425 129 1437 141C1449 152 1465 167 1478 181C1491 195 1503 210 1514 226C1525 242 1536 259 1545 276C1554 293 1562 312 1567 330C1573 348 1577 367 1578 386C1580 404 1578 423 1575 441C1572 459 1567 477 1560 494C1552 511 1542 527 1529 542C1516 556 1500 569 1482 580C1464 591 1444 600 1421 607C1399 613 1373 616 1348 619C1323 621 1296 620 1273 620C1250 620 1229 620 1209 620C1189 619 1171 619 1155 619C1138 619 1123 619 1108 619C1094 619 1080 618 1067 618C1054 618 1042 618 1030 618C1019 618 1008 618 997 618C987 618 977 618 967 618C957 618 947 618 938 618C929 618 920 618 911 618C902 618 894 618 885 618C877 618 868 618 860 618C852 618 844 618 836 618C828 618 820 618 812 618C804 618 796 618 788 618C780 618 772 618 764 618C756 618 748 618 740 618C732 618 723 618 715 618C706 618 698 618 689 618C680 618 671 618 662 618C653 618 643 618 633 618C623 618 613 618 603 618C592 618 581 618 570 618C558 618 546 618 533 618C520 618 506 619 492 619C477 619 462 619 445 619C429 619 411 619 391 620C371 620 350 620 327 620C304 620 277 621 252 619C227 616 201 613 179 607C156 600 136 591 118 580C100 569 84 556 71 542C58 527 48 511 40 494C33 477 28 459 25 441C22 423 20 404 22 386C23 367 27 348 33 330C38 312 46 293 55 276C64 259 75 242 86 226C97 210 109 195 122 181C135 167 151 152 163 141C175 129 184 120 193 112C203 104 210 98 220 92C229 85 239 79 249 73C259 67 270 61 281 56C293 51 304 45 317 40C329 35 342 31 355 26C368 22 381 18 395 14C409 10 424 6 438 3C453 -1 468 -4 484 -7C500 -10 516 -12 532 -15C548 -17 565 -19 582 -21C599 -23 616 -25 634 -26C651 -28 669 -29 687 -30C706 -31 724 -32 743 -32C762 -33 781 -33 800 -33Z';
  const PLATE = 'M800 57C867 57 948 60 1001 66C1055 71 1080 78 1120 89C1160 99 1204 114 1239 129C1274 145 1306 165 1329 180C1352 195 1359 202 1378 217C1396 233 1423 256 1441 274C1458 293 1472 311 1483 329C1495 347 1504 363 1510 382C1515 400 1518 423 1519 441C1519 460 1517 478 1513 494C1510 510 1507 527 1500 540C1494 553 1488 563 1474 572C1460 580 1441 587 1417 592C1393 596 1434 597 1331 598C1228 600 977 601 800 601C623 601 372 600 269 598C166 597 207 596 183 592C159 587 140 580 126 572C112 563 106 553 100 540C93 527 90 510 87 494C83 478 81 460 81 441C82 423 85 400 90 382C96 363 105 347 117 329C128 311 142 293 159 274C177 256 204 233 222 217C241 202 248 195 271 180C294 165 326 145 361 129C396 114 440 99 480 89C520 78 545 71 599 66C652 60 733 57 800 57Z';

  class E46Cluster {
    constructor(host) {
      this.svg = el('svg', {
        viewBox: '-40 -90 1680 780', class: 'cluster', role: 'img',
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
      el('rect', { x: 717, y: 56, width: 166, height: 46, rx: 9, fill: '#24272c', stroke: '#101114', 'stroke-width': 2 }, this.base);

      this._main({
        name: 'speed', cx: SPEEDO.cx, cy: SPEEDO.cy,
        nmin: 0, nmax: 240, a0: -127.5 - 20 * 1.1591, a1: 127.5,    // 20 km/h bei -127,5°, 240 bei +127,5°
        a: (v) => -127.5 + (v - 20) * 1.1591,
        from: 10, to: 250, step: 10, majorStep: 20, labelFrom: 20, labelTo: 240, font: 28.5,
        texts: [['km/h', 103, 20, 7]], spring: [110, 1.0], needle: { len: 190, wb: 10.3, wt: 2.8, hub: 31, tail: true },
      });
      this._main({
        name: 'rpm', cx: TACHO.cx, cy: TACHO.cy,
        nmin: 0, nmax: 7000, a0: -118.8, a1: 118.8,                   // 0 bei -118,8°, 7000 bei +118,8°
        a: (v) => -118.8 + v * (237.6 / 7),
        from: 0, to: 7, step: 0.5, majorStep: 1, labelFrom: 0, labelTo: 7, font: 30.5, red: true,
        texts: [['1/min', -81, 20, 0], ['x1000', -59, 20, 0]], spring: [320, 0.8], needle: { len: 190, wb: 11.5, wt: 3.4, hub: 31, tail: true },
      });
      this._consumption(TACHO.cx + 2, TACHO.cy + 144);

      this._fuel(FUEL.cx, FUEL.cy);
      this._coolant(COOL.cx, COOL.cy);

      [[352, 459, 1], [1233, 459, -1]].forEach((k) => this._pin(k[0], k[1], k[2]));
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
        if (c.red && v > 6 + 1e-9 && v < 7 - 1e-9 && !near(v, 6.5)) continue;
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

      if (c.red) {   // roter Bereich: drei kleine Segmente, weißer Strich bei 6,5, ein großer Block
        [[6.07, 6.14], [6.17, 6.29], [6.31, 6.48], [6.54, 6.97]].forEach((s) => {
          el('path', { class: 'redband', d: arc(c.cx, c.cy, rOut - 10.5, c.a(s[0]), c.a(s[1])), fill: 'none', 'stroke-width': 21 }, lit);
        });
      }

      (c.texts || []).forEach((t) => {
        el('text', { class: 'unit', x: c.cx + t[3], y: c.cy + t[1], 'text-anchor': 'middle', 'font-size': t[2] }, lit, t[0]);
      });

      const s = Object.assign({ tail0: 22 }, c.needle);
      this._needle(g, c.cx, c.cy, s, c.name, { min: c.nmin, max: c.nmax, a0: c.a0, a1: c.a1, spring: c.spring });
    }

    /**
     * Nebeninstrumente (Tank links, Kühlmittel rechts). Wie am Original liegt die Nabe nicht auf der Symmetrieachse
     * der Skala: Teilstriche, Zahlen, Symbol und Farbfelder sind um eine Achse zentriert, die 7,7 Einheiten weiter
     * innen liegt als die Nabe. Die Nadel zeigt von der Nabe aus auf Punkte dieser Skala.
     */
    _side(name, hubx, hy, dir, c) {
      const ax = hubx + dir * 7.7, RS = 108;
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
      const icon = el('g', { class: 'unit-icon', transform: 'translate(' + f2(ax + (c.iconDx || 0)) + ' ' + (hy - 71) + ')' }, lit);
      icon.innerHTML = ICONS[c.icon];

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
        min: 0, max: 1, a0: -46.6, a1: 46.6, spring: [6, 1.5], icon: 'pump', iconDx: -1.5,
        ticks: [[-46.6, 20], [-23.3, 18], [0, 22], [23.3, 18], [46.6, 20]],
        labels: [['0', -40, 127, 15], ['1/2', 0, 134, 14.5], ['1/1', 38.5, 124, 14.5]],
      });
      // Reserveleuchte: matter Punkt links neben der Nadel
      const lamp = el('g', { class: 'lamp amber', transform: 'translate(' + (cx - 86) + ' ' + (hy - 51) + ')' }, g);
      el('circle', { r: 9.5, fill: 'currentColor' }, lamp);
      this.lamps.fuelwarn = lamp;
    }

    _coolant(cx, hy) {
      // Betriebstemperatur in der Mitte: die Nadel bleibt von ca. 80 bis 100 °C fast ruhig
      const table = [[40, 0], [60, 0.2], [80, 0.44], [100, 0.56], [115, 0.78], [130, 1]];
      const toFrac = (v) => {
        if (v <= table[0][0]) return table[0][1];
        for (let i = 1; i < table.length; i++) {
          if (v <= table[i][0]) return table[i - 1][1] + ((v - table[i - 1][0]) / (table[i][0] - table[i - 1][0])) * (table[i][1] - table[i - 1][1]);
        }
        return 1;
      };
      this._side('coolant', cx, hy, -1, {
        min: 40, max: 130, a0: -47.5, a1: 47.5, spring: [10, 1.3], icon: 'therm', toFrac,
        ticks: [[-47.5, 22], [-16, 19], [16, 19], [47.5, 22]],
        marks: [[-37.5, '#2288d2', -35], [37.5, '#e04526', 35]],
      });
    }

    /** Momentanverbrauch unten im Drehzahlmesser (L/100 km), elliptische Skala */
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
      el('text', { class: 'unit', x: cx, y: cy - 40, 'text-anchor': 'middle', 'font-size': 13 }, lit, 'L/100km');
      const angFn = (f) => { const t = ((-T + f * 2 * T) * Math.PI) / 180; return (Math.atan2(RX * Math.sin(t), RY * Math.cos(t)) * 180) / Math.PI; };
      this._needle(g, cx, cy, { len: 92, wb: 6.5, wt: 3, hub: 24, tail0: 12 }, 'fco',
        { min: 0, max: 20, a0: -T, a1: T, spring: [14, 1.1], angFn });
    }

    /** Drücker für Uhr/Trip: matter Stift mit Chromring, zeigt schräg nach außen unten */
    _pin(x, y, dir) {
      const g = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + dir + ' 1)' }, this.base);
      el('rect', { x: -34, y: -9, width: 36, height: 18, rx: 9, fill: '#3c3c40', transform: 'rotate(18)' }, g);
      el('rect', { x: -34, y: -9, width: 36, height: 18, rx: 9, fill: 'url(#pGrain)', transform: 'rotate(18)' }, g);
      el('circle', { r: 18, fill: '#0b0b0d', stroke: '#9a9da3', 'stroke-width': 3, 'stroke-opacity': 0.7 }, g);
      el('circle', { r: 12, fill: '#16161a' }, g);
      el('circle', { cx: 24, cy: -5, r: 8, fill: '#050506', opacity: 0.55 }, g);
    }

    /** Leuchtenleiste unten mit Mittendisplay, Blinkerpfeilen und den Warnleuchten */
    _strip() {
      const svg = this.litLayer, base = this.base;
      // Die äußeren Felder folgen der Rundung der Platte: Beschneidung mit der leicht verkleinerten Plattenform
      const panels = el('g', { 'clip-path': this._clip2('stripClip', PLATE, 'translate(800 340) scale(.955 .975) translate(-800 -340)') }, base);
      [[100, 400], [436, 638], [953, 1170], [1190, 1495]].forEach((p) => {
        el('rect', { x: p[0], y: STRIP_Y, width: p[1] - p[0], height: STRIP_H, rx: 10, fill: 'url(#gPanel)', stroke: '#101114', 'stroke-width': 2 }, panels);
      });
      // dezente Symbole der unbelegten Leuchten (wie am echten Kombi sichtbar, wenn aus)
      const deco = el('g', { class: 'deco' }, base);
      el('path', { d: 'M-40 0q0 -14 14 -14h52q14 0 14 14q0 14 -14 14h-52q-14 0 -14 -14ZM-18 -11v22M18 -11v22', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, transform: 'translate(537 546)' }, deco);
      [1250, 1342, 1434].forEach((x) => el('circle', { cx: x, cy: 546, r: 17, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 }, deco));
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
      this.lcdWin = el('rect', { x: 658, y: 506, width: 272, height: 82, rx: 6, fill: 'url(#gLcd)', stroke: '#0c0c0e', 'stroke-width': 2 }, svg);
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

    /** Nadelziele setzen: { rpm (U/min), speed (km/h), coolant (°C), fuel (0..1), fco (L/100km) } */
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
      set('odo', v.odo, (s) => { this._dots(this.lcdRows.odo, s, 667, 513, 3.25, 3.9, 'start'); this._dots(this.lcdRows.km, 'km', 797, 526, 1.9, 2.3, 'start'); });
      set('trip', v.trip, (s) => this._dots(this.lcdRows.trip, s, 921, 513, 3.25, 3.9, 'end'));
      set('clock', v.clock, (s) => this._dots(this.lcdRows.clock, s, 794, 548, 3.25, 3.9, 'middle'));
    }

    setPower(on) { this.svg.classList.toggle('off', !on); }

    setLight(o) {
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
