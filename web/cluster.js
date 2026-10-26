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
    pump: '<path d="M-9 14V-12a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V14M-12 14H11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="-5" y="-9" width="8" height="8" fill="currentColor"/><path d="M7 -6l6 3v12a3 3 0 0 0 6 0V-6l-4-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    therm: '<path d="M-3 -15a3 3 0 0 1 6 0V3a5.5 5.5 0 1 1 -6 0Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M-17 11q4 -4 8 0t8 0t8 0t8 0M-17 18q4 -4 8 0t8 0t8 0t8 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" transform="translate(4 0)"/>',
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
    mil: [800, 92, 0.95],
    overheat: [152, 528, 0.95], oilwarn: [250, 528, 0.95], battery: [348, 528, 0.95], oilpress: [152, 568, 0.95],
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
  const STRIP_Y = 497, STRIP_H = 98;

  class E46Cluster {
    constructor(host) {
      this.svg = el('svg', {
        viewBox: '0 0 1600 650', class: 'cluster', role: 'img',
        'aria-label': 'BMW E46 Kombiinstrument',
      });
      host.appendChild(this.svg);
      this.needles = {};
      this.lamps = {};
      this._lcdLast = {};
      this._build();
      this.setPower(true);
      this.setLight({ night: false, dim: 0.85 });
      this.setLcdStyle('red');
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
      lin('gPlate', 0, 0, 0, 1, [[0, '#626266'], [0.5, '#505055'], [1, '#3f3f44']]);
      rad('gDial', [[0, '#2c2f34'], [0.8, '#1e2024'], [1, '#17181c']], { cx: '42%', cy: '36%', r: '75%' });
      rad('gHub', [[0, '#434347'], [1, '#34343a']], { cx: '40%', cy: '35%', r: '70%' });
      lin('gNeedle', 0, 0, 1, 0, [[0, '#f6f6f6'], [0.5, '#e6e6e8'], [0.5, '#c6c6ca'], [1, '#b2b2b8']]);
      lin('gGlass', 0, 0, 1, 1, [[0, '#ffffff', 0.09], [0.4, '#ffffff', 0.02], [0.5, '#ffffff', 0], [1, '#ffffff', 0]]);
      lin('gPanel', 0, 0, 0, 1, [[0, '#272a2f'], [1, '#181a1e']]);
      this.lcdGrad = lin('gLcd', 0, 0, 0, 1, [[0, '#d2302a'], [1, '#b3211b']]);
      // Körnung der Frontplatte und der matten Naben
      const p = el('pattern', { id: 'pGrain', width: 96, height: 96, patternUnits: 'userSpaceOnUse' }, d);
      el('image', { href: global.E46_GRAIN || '', width: 96, height: 96 }, p);
    }

    _clip(id, x, y, w, h) {
      const c = el('clipPath', { id }, this.defs);
      el('rect', { x, y, width: w, height: h }, c);
      return 'url(#' + id + ')';
    }

    _build() {
      const svg = this.svg;
      this._defs();

      // Gehäuse und Frontplatte (Oberkante wölbt sich in der Mitte)
      el('rect', { x: 6, y: 6, width: 1588, height: 638, rx: 100, fill: 'url(#gHousing)', stroke: '#2c2c30', 'stroke-width': 2 }, svg);
      const plate = 'M40 580L40 300C40 150 330 58 800 56C1270 58 1560 150 1560 300L1560 580Q1560 612 1528 612L72 612Q40 612 40 580Z';
      el('path', { d: plate, fill: 'url(#gPlate)', stroke: '#141416', 'stroke-width': 3 }, svg);
      el('path', { d: plate, fill: 'url(#pGrain)' }, svg);

      // Fenster oben mittig (MKL)
      el('rect', { x: 712, y: 66, width: 176, height: 52, rx: 9, fill: '#24272c', stroke: '#101114', 'stroke-width': 2 }, svg);

      this._main({
        name: 'speed', cx: SPEEDO.cx, cy: SPEEDO.cy,
        nmin: 0, nmax: 240, a0: -127.5 - 20 * 1.1591, a1: 127.5,    // 20 km/h bei -127,5°, 240 bei +127,5°
        a: (v) => -127.5 + (v - 20) * 1.1591,
        from: 10, to: 250, step: 10, majorStep: 20, labelFrom: 20, labelTo: 240, font: 28,
        texts: [['km/h', 96, 20, 7]], spring: [110, 1.0], needle: { len: 190, wb: 10.3, wt: 2.8, hub: 31, tail: true },
      });
      this._main({
        name: 'rpm', cx: TACHO.cx, cy: TACHO.cy,
        nmin: 0, nmax: 7000, a0: -118.8, a1: 118.8,                   // 0 bei -118,8°, 7000 bei +118,8°
        a: (v) => -118.8 + v * (237.6 / 7),
        from: 0, to: 7, step: 0.5, majorStep: 1, labelFrom: 0, labelTo: 7, font: 38, red: true,
        texts: [['1/min', -99, 15, 0], ['x1000', -80, 15, 0]], spring: [320, 0.8], needle: { len: 190, wb: 11.5, wt: 3.4, hub: 31, tail: true },
      });
      this._consumption(TACHO.cx + 2, TACHO.cy + 144);

      this._fuel(FUEL.cx, FUEL.cy);
      this._coolant(COOL.cx, COOL.cy);

      [[352, 459, 1], [1233, 459, -1]].forEach((k) => this._pin(k[0], k[1], k[2]));
      this._strip();

      // Glasreflex über der Frontplatte
      el('path', { class: 'glass', d: 'M40 300C40 150 330 58 800 56L1000 56L560 612L72 612Q40 612 40 580Z', fill: 'url(#gGlass)' }, svg);
    }

    /** Matte Nabe mit Schatten */
    _hub(g, cx, cy, r) {
      el('circle', { cx, cy, r: r + 5, fill: '#000', opacity: 0.45 }, g);
      el('circle', { cx, cy, r, fill: 'url(#gHub)' }, g);
      el('circle', { cx, cy, r, fill: 'url(#pGrain)' }, g);
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
      const g = el('g', { class: 'dial dial-' + c.name }, this.svg);
      const clipR = this._clip(c.name + 'R', c.cx - R - 2, c.cy - R - 2, 2 * R + 4, R + 2 + CUT);
      const clipF = this._clip(c.name + 'F', c.cx - R - 2, c.cy - R - 2, 2 * R + 4, R + 2 + CUT - 10);
      el('circle', { cx: c.cx, cy: c.cy, r: R, fill: '#0a0b0d', 'clip-path': clipR }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: RF, fill: 'url(#gDial)', 'clip-path': clipF }, g);

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
          const ext = Math.abs(Math.sin(rad)) * txt.length * 0.27 * c.font + Math.abs(Math.cos(rad)) * 0.36 * c.font;
          const t = pol(c.cx, c.cy, rOut - longLen - 6 - ext, a);
          el('text', { x: f2(t[0]), y: f2(t[1]), dy: '.36em', 'text-anchor': 'middle' }, nums, txt);
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

    /** Gemeinsamer Rahmen der kleinen Instrumente: "Eimer"-Form, Achse unterhalb der Mitte */
    _bucket(name, cx, hy) {
      const g = el('g', { class: 'dial dial-' + name }, this.svg);
      const top = hy - 66 - 116;
      // Zuschnitt: Oberkante offen, Unterkante flach bei hy+34 (Ring) bzw. hy+28 (Fläche)
      const cutRing = this._clip(name + 'R', cx - 120, top, 240, hy + 34 - top);
      const cutFace = this._clip(name + 'F', cx - 120, top, 240, hy + 27 - top);
      el('circle', { cx, cy: hy - 66, r: 116, fill: '#0a0b0d', 'clip-path': cutRing }, g);
      el('circle', { cx, cy: hy - 66, r: 105, fill: 'url(#gDial)', 'clip-path': cutFace }, g);
      return el('g', { class: 'lit' }, g);
    }

    _fuel(cx, hy) {
      const lit = this._bucket('fuel', cx, hy);
      const g = lit.parentNode;
      [-43, -21.5, 0, 21.5, 43].forEach((a) => tickLine(lit, cx, hy, 114, a, 22, 3.2, 'thin'));
      const nums = el('g', { class: 'numerals' }, lit);
      [['0', -34, 123, 21, 500], ['1/2', 0, 140, 19, 600], ['1/1', 37, 135, 19, 600]].forEach((l) => {
        const p = pol(cx, hy, l[2], l[1]);
        el('text', { x: f2(p[0]), y: f2(p[1]), dy: '.36em', 'text-anchor': 'middle', 'font-size': l[3], 'font-weight': l[4] }, nums, l[0]);
      });
      const icon = el('g', { class: 'unit-icon', transform: 'translate(' + (cx + 17) + ' ' + (hy - 78) + ') scale(1.05)' }, lit);
      icon.innerHTML = ICONS.pump;
      // Reserveleuchte: matter Punkt links
      const lamp = el('g', { class: 'lamp amber', transform: 'translate(' + (cx - 76) + ' ' + (hy - 59) + ')' }, g);
      el('circle', { r: 10.5, fill: 'currentColor' }, lamp);
      this.lamps.fuelwarn = lamp;
      this._needle(g, cx, hy, { len: 113, wb: 9.5, wt: 3.6, hub: 23, tail0: 12 }, 'fuel',
        { min: 0, max: 1, a0: -43, a1: 43, spring: [6, 1.5] });
    }

    _coolant(cx, hy) {
      const lit = this._bucket('coolant', cx, hy);
      const g = lit.parentNode;
      [-47.5, -19, 19, 47.5].forEach((a) => tickLine(lit, cx, hy, a < -40 || a > 40 ? 113 : 116, a, 22, 3.2, 'thin'));
      [[-36, '#1f87c8'], [36, '#d5291f']].forEach((m) => {
        const p = pol(cx, hy, 121, m[0]);
        el('rect', { x: f2(p[0] - 14), y: f2(p[1] - 14), width: 28, height: 28, rx: 1.5, fill: m[1], transform: 'rotate(' + m[0] + ' ' + f2(p[0]) + ' ' + f2(p[1]) + ')' }, lit);
      });
      const icon = el('g', { class: 'unit-icon', transform: 'translate(' + (cx - 10) + ' ' + (hy - 84) + ') scale(.95)' }, lit);
      icon.innerHTML = ICONS.therm;
      // Betriebstemperatur in der Mitte: die Nadel bleibt von ca. 80 bis 100 °C fast ruhig
      const table = [[40, 0], [60, 0.2], [80, 0.44], [100, 0.56], [115, 0.78], [130, 1]];
      const toFrac = (v) => {
        if (v <= table[0][0]) return table[0][1];
        for (let i = 1; i < table.length; i++) {
          if (v <= table[i][0]) return table[i - 1][1] + ((v - table[i - 1][0]) / (table[i][0] - table[i - 1][0])) * (table[i][1] - table[i - 1][1]);
        }
        return 1;
      };
      this._needle(g, cx, hy, { len: 113, wb: 9.5, wt: 3.6, hub: 23, tail0: 12 }, 'coolant',
        { min: 40, max: 130, a0: -47.5, a1: 47.5, spring: [10, 1.3], toFrac });
    }

    /** Momentanverbrauch unten im Drehzahlmesser (L/100 km), elliptische Skala */
    _consumption(cx, cy) {
      const g = el('g', { class: 'mini mini-fco' }, this.svg);
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
      const nums = el('g', { class: 'numerals', 'font-size': 18 }, lit);
      [['0', -77, -35], ['10', -3, -67], ['20', 68, -33]].forEach((l) => {
        el('text', { x: cx + l[1], y: cy + l[2], dy: '.36em', 'text-anchor': 'middle' }, nums, l[0]);
      });
      el('text', { class: 'unit', x: cx, y: cy - 44, 'text-anchor': 'middle', 'font-size': 13 }, lit, 'L/100km');
      const angFn = (f) => { const t = ((-T + f * 2 * T) * Math.PI) / 180; return (Math.atan2(RX * Math.sin(t), RY * Math.cos(t)) * 180) / Math.PI; };
      this._needle(g, cx, cy, { len: 92, wb: 6.5, wt: 3, hub: 24, tail0: 12 }, 'fco',
        { min: 0, max: 20, a0: -T, a1: T, spring: [14, 1.1], angFn });
    }

    /** Drücker für Uhr/Trip: matter Stift mit Chromring, zeigt schräg nach außen unten */
    _pin(x, y, dir) {
      const g = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + dir + ' 1)' }, this.svg);
      el('rect', { x: -34, y: -9, width: 36, height: 18, rx: 9, fill: '#3c3c40', transform: 'rotate(18)' }, g);
      el('rect', { x: -34, y: -9, width: 36, height: 18, rx: 9, fill: 'url(#pGrain)', transform: 'rotate(18)' }, g);
      el('circle', { r: 18, fill: '#0b0b0d', stroke: '#9a9da3', 'stroke-width': 3, 'stroke-opacity': 0.7 }, g);
      el('circle', { r: 12, fill: '#16161a' }, g);
      el('circle', { cx: 24, cy: -5, r: 8, fill: '#050506', opacity: 0.55 }, g);
    }

    /** Leuchtenleiste unten mit Mittendisplay, Blinkerpfeilen und den Warnleuchten */
    _strip() {
      const svg = this.svg;
      [[100, 400], [436, 638], [953, 1170], [1190, 1495]].forEach((p) => {
        el('rect', { x: p[0], y: STRIP_Y, width: p[1] - p[0], height: STRIP_H, rx: 10, fill: 'url(#gPanel)', stroke: '#101114', 'stroke-width': 2 }, svg);
      });
      // dezente Symbole der unbelegten Leuchten (wie am echten Kombi sichtbar, wenn aus)
      const deco = el('g', { class: 'deco' }, svg);
      el('path', { d: 'M-40 0q0 -14 14 -14h52q14 0 14 14q0 14 -14 14h-52q-14 0 -14 -14ZM-18 -11v22M18 -11v22', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, transform: 'translate(537 546)' }, deco);
      [1250, 1342, 1434].forEach((x) => el('circle', { cx: x, cy: 546, r: 17, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 }, deco));
      // kleines Fenster zwischen den Zifferblättern
      el('rect', { x: 776, y: 424, width: 48, height: 48, rx: 8, fill: '#24272c', stroke: '#101114', 'stroke-width': 2 }, svg);

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
      set('odo', v.odo, (s) => { this._dots(this.lcdRows.odo, s, 668, 514, 3.1, 3.7, 'start'); this._dots(this.lcdRows.km, 'km', 788, 524, 1.9, 2.3, 'start'); });
      set('trip', v.trip, (s) => this._dots(this.lcdRows.trip, s, 920, 514, 3.1, 3.7, 'end'));
      set('clock', v.clock, (s) => this._dots(this.lcdRows.clock, s, 794, 548, 3.1, 3.7, 'middle'));
    }

    /** 'red' (Standard) oder 'blue' (helle, blau-weiße Variante) */
    setLcdStyle(style) {
      const s = style === 'blue'
        ? ['#a9cbe3', '#86aecb', '#14293a', '#7da4c0']
        : ['#c92a24', '#ad1d17', '#ffb383', '#9a1914'];
      const st = this.lcdGrad.querySelectorAll('stop');
      st[0].setAttribute('stop-color', s[0]);
      st[1].setAttribute('stop-color', s[1]);
      this.svg.style.setProperty('--dot-on', s[2]);
      this.svg.style.setProperty('--dot-off', s[3]);
    }

    setPower(on) { this.svg.classList.toggle('off', !on); }

    setLight(o) {
      if (o.night != null) { this.svg.classList.toggle('night', !!o.night); this._night = !!o.night; }
      if (o.dim != null) this._dim = o.dim;
      const night = this._night, dim = this._dim;
      this.svg.style.setProperty('--lit', String(night ? 0.55 + 0.45 * dim : 1));
      this.svg.style.setProperty('--glow', String(night ? dim : 0));
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
