/* E46 Kombiinstrument (Vorfacelift-Optik, vier Rundinstrumente) als SVG. Keine Abhängigkeiten.
 *
 *   const c = new E46Cluster(document.getElementById('cluster'));
 *   c.set({ rpm: 3000, speed: 80, coolant: 90, fuel: 0.6, fco: 8 });   // Nadelziele
 *   c.setLamps({ mil: true, left: true });                              // Leuchten
 *   c.setLcd({ gear: '4', odo: '148213 km' });                          // Mittendisplay
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

  // Winkel in Grad, 0 = 12 Uhr, im Uhrzeigersinn positiv
  function pol(cx, cy, r, deg) {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }
  function arc(cx, cy, r, a0, a1) {
    const p0 = pol(cx, cy, r, a0), p1 = pol(cx, cy, r, a1);
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) +
      'A' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' +
      p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  // Piktogramme in einem 40x40-Feld um (0,0)
  const ICONS = {
    mil: '<path d="M-16 -5H-9L-6 -11H6V-6H11L14 -3H19V8H14L11 11H-8L-12 7H-19V-1H-16Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    eml: '<rect x="-18" y="-12" width="36" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">EML</text>',
    cruise: '<path d="M-15 8A18 18 0 1 1 15 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M0 4L9 -9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle r="3.5" cy="4" fill="currentColor"/>',
    overheat: '<path d="M-3.5 -15a3.5 3.5 0 0 1 7 0V2.5a8 8 0 1 1 -7 0Z" fill="none" stroke="currentColor" stroke-width="3" transform="translate(-6 2)"/><path d="M5 -4h10M5 3h10M5 10h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    oilwarn: '<path d="M-17 -2H-6L-2 -9H6V-5H11L19 -11L21 -9L15 -1V8Q15 11 12 11H-12Q-17 11 -17 6Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M-12 16q3 2 6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    battery: '<rect x="-17" y="-7" width="34" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 -7v-5h6v5M5 -7v-5h6v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 2.5h7M7.5 -1v7M4 2.5h7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
    oilpress: '<path d="M-17 -4H-6L-2 -11H6V-7H11L19 -13L21 -11L15 -3V6Q15 9 12 9H-12Q-17 9 -17 4Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="-1" cy="15" r="2.6" fill="currentColor"/><path d="M-1 0v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    pump: '<path d="M-9 14V-12a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V14M-12 14H11M-3 -9h8v8h-8zM8 -6l6 3v12a3 3 0 0 0 6 0V-6l-4-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
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
    mil: [800, 105, 0.95],
    battery: [190, 544, 1.05], oilpress: [300, 544, 1.05],
    overheat: [494, 544, 1.05], oilwarn: [584, 544, 1.05],
    eml: [1010, 544, 1.05], cruise: [1100, 544, 1.05],
  };

  // Geometrie (viewBox 1600 x 640)
  const MAIN_R = 205, SIDE_R = 112;
  const SPEEDO = { cx: 580, cy: 296 }, TACHO = { cx: 1020, cy: 296 };
  const FUEL = { cx: 240, cy: 432 }, COOL = { cx: 1360, cy: 432 };

  class E46Cluster {
    constructor(host) {
      this.svg = el('svg', {
        viewBox: '0 0 1600 640', class: 'cluster', role: 'img',
        'aria-label': 'BMW E46 Kombiinstrument',
      });
      host.appendChild(this.svg);
      this.needles = {};
      this.lamps = {};
      this.lcd = {};
      this._lcdLast = {};
      this._build();
      this.setPower(true);
      this.setLight({ night: false, dim: 0.85 });
    }

    // ---------- Aufbau ----------

    _defs() {
      const d = el('defs', null, this.svg);
      const lin = (id, x1, y1, x2, y2, stops) => {
        const g = el('linearGradient', { id, x1, y1, x2, y2 }, d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g));
      };
      const rad = (id, stops, extra) => {
        const g = el('radialGradient', Object.assign({ id, cx: '50%', cy: '50%', r: '50%' }, extra || {}), d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
      };
      lin('gHousing', 0, 0, 0, 1, [[0, '#2a2a2c'], [0.12, '#111113'], [1, '#08080a']]);
      lin('gPlate', 0, 0, 0, 1, [[0, '#6c6966'], [0.45, '#55524f'], [1, '#3c3a38']]);
      rad('gDial', [[0, '#1a1a1b'], [0.75, '#0d0d0e'], [1, '#050505']], { cx: '45%', cy: '40%', r: '70%' });
      rad('gHub', [[0, '#4a4b4f'], [0.5, '#1a1a1c'], [1, '#050505']], { cx: '38%', cy: '32%', r: '75%' });
      rad('gKnob', [[0, '#55565a'], [0.55, '#1a1a1c'], [1, '#050505']], { cx: '35%', cy: '30%', r: '80%' });
      lin('gGlass', 0, 0, 1, 1, [[0, '#ffffff', 0.10], [0.45, '#ffffff', 0.02], [0.5, '#ffffff', 0], [1, '#ffffff', 0]]);
      lin('gPanel', 0, 0, 0, 1, [[0, '#0b0b0b'], [1, '#1b1a1a']]);
    }

    _build() {
      const svg = this.svg;
      this._defs();

      // Gehäuse, Blende, Frontplatte
      el('rect', { x: 6, y: 6, width: 1588, height: 628, rx: 100, fill: 'url(#gHousing)', stroke: '#303033', 'stroke-width': 2 }, svg);
      el('path', {
        d: 'M40 560L40 240Q40 70 210 70L1390 70Q1560 70 1560 240L1560 560Q1560 598 1522 598L78 598Q40 598 40 560Z',
        fill: 'url(#gPlate)', stroke: '#141414', 'stroke-width': 3,
      }, svg);
      el('path', { d: 'M52 240Q52 82 210 82L1390 82Q1548 82 1548 240', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.09, 'stroke-width': 2 }, svg);

      // Fenster oben mittig (MKL)
      el('rect', { x: 736, y: 84, width: 128, height: 40, rx: 8, fill: '#161515', stroke: '#0a0a0a', 'stroke-width': 2 }, svg);

      this._main({
        name: 'speed', cx: SPEEDO.cx, cy: SPEEDO.cy, R: MAIN_R,
        nmin: 0, nmax: 240, a0: -153.8, a1: 132,            // 20 km/h bei -130°, 240 km/h bei +132°
        from: 20, to: 240, major: 20, minor: 10, font: 27,
        label: (v) => String(Math.round(v)),
        texts: [['km/h', 100, 22]], spring: [110, 1.0],
      });
      this._main({
        name: 'rpm', cx: TACHO.cx, cy: TACHO.cy, R: MAIN_R,
        nmin: 0, nmax: 7000, a0: -121, a1: 122,              // 0 bei -121°, 7000 bei +122°
        from: 0, to: 7, major: 1, minor: 0.5, font: 38, unitScale: 1000, redFrom: 6, redTo: 7,
        label: (v) => String(Math.round(v)),
        texts: [['1/min', -82, 20], ['x1000', -60, 17]], spring: [320, 0.8],
      });
      this._consumption(TACHO.cx - 13, TACHO.cy + 142);

      this._side({
        name: 'fuel', cx: FUEL.cx, cy: FUEL.cy, r: SIDE_R, a0: -45, a1: 45, min: 0, max: 1,
        ticks: [0.25, 0.75], labels: [['0', 0], ['1/2', 0.5], ['1/1', 1]], redTo: 0.08,
        icon: 'pump', spring: [6, 1.5],
      });
      this._side({
        name: 'coolant', cx: COOL.cx, cy: COOL.cy, r: SIDE_R, a0: -45, a1: 45, min: 40, max: 130,
        // Mitte = Betriebstemperatur: die Nadel bleibt von ca. 80 bis 100 °C fast ruhig
        table: [[40, 0], [60, 0.2], [80, 0.44], [100, 0.56], [115, 0.76], [130, 1]],
        ticks: [0.25, 0.5, 0.75], marks: [[0.06, '#3d7bff'], [0.94, '#ee4a2b']],
        icon: 'overheat', spring: [10, 1.3],
      });

      [368, 1232].forEach((x) => {
        el('circle', { cx: x, cy: 440, r: 17, fill: 'url(#gKnob)', stroke: '#000', 'stroke-width': 2 }, svg);
      });

      this._strip();

      // Glasreflex über der ganzen Frontplatte
      el('path', { class: 'glass', d: 'M40 240Q40 70 210 70L1000 70L520 598L78 598Q40 598 40 560Z', fill: 'url(#gGlass)' }, svg);
    }

    /** Tacho und Drehzahlmesser */
    _main(c) {
      const g = el('g', { class: 'dial dial-' + c.name }, this.svg);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R + 6, fill: '#1c1b1b' }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R, fill: 'url(#gDial)', stroke: '#000', 'stroke-width': 2 }, g);

      const u = c.unitScale || 1;
      const ang = (v) => c.a0 + ((v * u - c.nmin) / (c.nmax - c.nmin)) * (c.a1 - c.a0);
      const lit = el('g', { class: 'lit' }, g);
      const ticks = el('g', { class: 'ticks' }, lit);
      const nums = el('g', { class: 'numerals', 'font-size': c.font }, lit);
      const rOut = c.R - 14;

      const n = Math.round((c.to - c.from) / c.minor);
      for (let i = 0; i <= n; i++) {
        const v = c.from + i * c.minor;
        const major = near((v - c.from) / c.major, Math.round((v - c.from) / c.major));
        if (c.redFrom != null && v > c.redFrom + 1e-9 && v < c.redTo - 1e-9) continue;   // Band ersetzt die Striche
        const len = major ? 28 : 15;
        const a = ang(v);
        const p0 = pol(c.cx, c.cy, rOut, a), p1 = pol(c.cx, c.cy, rOut - len, a);
        el('line', {
          class: 'tick ' + (major ? 'major' : 'minor'),
          x1: p0[0].toFixed(2), y1: p0[1].toFixed(2), x2: p1[0].toFixed(2), y2: p1[1].toFixed(2),
        }, ticks);
        if (major) {
          // Abstand so wählen, dass die Zahl (je nach Winkel breit oder hoch) den Strich nicht berührt
          const txt = c.label(v), rad = (a * Math.PI) / 180;
          const ext = Math.abs(Math.sin(rad)) * txt.length * 0.28 * c.font + Math.abs(Math.cos(rad)) * 0.36 * c.font;
          const t = pol(c.cx, c.cy, rOut - 28 - 14 - ext, a);
          el('text', { x: t[0].toFixed(2), y: t[1].toFixed(2), dy: '.35em', 'text-anchor': 'middle' }, nums, txt);
        }
      }

      if (c.redFrom != null) {   // roter Bereich: fünf Segmente
        const seg = (c.redTo - c.redFrom) / 5, gap = 0.012;
        for (let i = 0; i < 5; i++) {
          el('path', {
            class: 'redband',
            d: arc(c.cx, c.cy, c.R - 27, ang(c.redFrom + i * seg + gap), ang(c.redFrom + (i + 1) * seg - gap)),
            fill: 'none',
          }, lit);
        }
      }

      (c.texts || []).forEach((t) => {
        el('text', { class: 'unit', x: c.cx + (t[3] || 0), y: c.cy + t[1], 'text-anchor': 'middle', 'font-size': t[2] }, lit, t[0]);
      });

      this._hubAndNeedle(g, c, { len: c.R - 34, wb: 8, wt: 3.2, tail: 24, hub: 34 },
        { min: c.nmin, max: c.nmax, a0: c.a0, a1: c.a1, spring: c.spring });
    }

    /** Tankanzeige und Kühlmitteltemperatur */
    _side(c) {
      const g = el('g', { class: 'dial dial-' + c.name }, this.svg);
      el('circle', { cx: c.cx, cy: c.cy, r: c.r + 5, fill: '#1c1b1b' }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: c.r, fill: 'url(#gDial)', stroke: '#000', 'stroke-width': 2 }, g);
      const lit = el('g', { class: 'lit' }, g);
      const ang = (f) => c.a0 + f * (c.a1 - c.a0);

      if (c.redTo != null) {
        el('path', { class: 'mini-red', d: arc(c.cx, c.cy, c.r - 10, ang(0), ang(c.redTo)), fill: 'none' }, lit);
      }
      c.ticks.forEach((f) => {
        const p0 = pol(c.cx, c.cy, c.r - 10, ang(f)), p1 = pol(c.cx, c.cy, c.r - 26, ang(f));
        el('line', { class: 'tick major', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, lit);
      });
      const nums = el('g', { class: 'numerals', 'font-size': 20 }, lit);
      (c.labels || []).forEach((l) => {
        const p = pol(c.cx, c.cy, c.r - 24, ang(l[1]));
        el('text', { x: p[0], y: p[1], dy: '.35em', 'text-anchor': 'middle' }, nums, l[0]);
      });
      (c.marks || []).forEach((m) => {
        const p = pol(c.cx, c.cy, c.r - 24, ang(m[0]));
        el('rect', { x: p[0] - 10, y: p[1] - 10, width: 20, height: 20, rx: 3, fill: m[1], transform: 'rotate(' + ang(m[0]) + ' ' + p[0] + ' ' + p[1] + ')' }, lit);
      });
      const icon = el('g', { class: 'unit-icon', transform: 'translate(' + c.cx + ' ' + (c.cy - 52) + ') scale(.85)' }, lit);
      icon.innerHTML = ICONS[c.icon];

      let toFrac = (v) => (v - c.min) / (c.max - c.min);
      if (c.table) {
        const t = c.table;
        toFrac = (v) => {
          if (v <= t[0][0]) return t[0][1];
          for (let i = 1; i < t.length; i++) {
            if (v <= t[i][0]) return t[i - 1][1] + ((v - t[i - 1][0]) / (t[i][0] - t[i - 1][0])) * (t[i][1] - t[i - 1][1]);
          }
          return t[t.length - 1][1];
        };
      }
      this._hubAndNeedle(g, c, { len: c.r - 20, wb: 6, wt: 2.6, tail: 16, hub: 22 },
        { min: c.min, max: c.max, a0: c.a0, a1: c.a1, spring: c.spring, toFrac });
    }

    /** Momentanverbrauch unten im Drehzahlmesser (L/100 km) */
    _consumption(cx, cy) {
      const g = el('g', { class: 'mini mini-fco' }, this.svg);
      const lit = el('g', { class: 'lit' }, g);
      const a0 = -66, a1 = 68, ang = (v) => a0 + (v / 20) * (a1 - a0);
      for (let v = 0; v <= 20; v += 2) {
        const big = v % 10 === 0;
        const p0 = pol(cx, cy, 98, ang(v)), p1 = pol(cx, cy, big ? 82 : 88, ang(v));
        el('line', { class: 'tick ' + (big ? 'major' : 'minor'), x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, lit);
      }
      const nums = el('g', { class: 'numerals', 'font-size': 17 }, lit);
      [0, 10, 20].forEach((v) => {
        const p = pol(cx, cy, 64, ang(v));
        el('text', { x: p[0], y: p[1], dy: '.35em', 'text-anchor': 'middle' }, nums, String(v));
      });
      el('text', { class: 'unit', x: cx, y: cy + 36, 'text-anchor': 'middle', 'font-size': 15 }, lit, 'L/100km');
      this._hubAndNeedle(g, { cx: cx, cy: cy, name: 'fco' }, { len: 84, wb: 4, wt: 2, tail: 12, hub: 13 },
        { min: 0, max: 20, a0: a0, a1: a1, spring: [14, 1.1] });
    }

    _hubAndNeedle(g, c, shape, spec) {
      const wrap = el('g', { class: 'needle-wrap', transform: 'translate(' + c.cx + ' ' + c.cy + ')' }, g);
      const rot = el('g', null, wrap);
      el('path', {
        class: 'needle-shape',
        d: 'M' + -shape.wb / 2 + ' ' + shape.tail + 'L' + -shape.wt / 2 + ' ' + -shape.len + 'L' + shape.wt / 2 + ' ' + -shape.len + 'L' + shape.wb / 2 + ' ' + shape.tail + 'Z',
      }, rot);
      el('circle', { cx: c.cx, cy: c.cy, r: shape.hub, fill: 'url(#gHub)', stroke: '#2a2a2c', 'stroke-width': 2 }, g);
      el('circle', { cx: c.cx - shape.hub * 0.3, cy: c.cy - shape.hub * 0.35, r: shape.hub * 0.18, fill: '#fff', opacity: 0.16 }, g);
      this._addNeedle(c.name, rot, spec);
    }

    /** Leuchtenleiste unten mit Mittendisplay, Blinkerpfeilen und den Warnleuchten */
    _strip() {
      const svg = this.svg;
      [[100, 400], [436, 638], [953, 1155], [1188, 1495]].forEach((p) => {
        el('rect', { x: p[0], y: 500, width: p[1] - p[0], height: 92, rx: 10, fill: 'url(#gPanel)', stroke: '#050505', 'stroke-width': 2 }, svg);
      });
      el('rect', { x: 782, y: 450, width: 38, height: 38, rx: 7, fill: '#171616', stroke: '#0a0a0a', 'stroke-width': 2 }, svg);

      for (const id in LAMP_POS) {
        const m = LAMP_META[id], p = LAMP_POS[id];
        const g = el('g', { class: 'lamp ' + m[0], transform: 'translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')' }, svg);
        el('title', null, g, m[1]);
        g.insertAdjacentHTML('beforeend', ICONS[id]);
        this.lamps[id] = g;
      }

      const arrow = (x, dir, label) => {
        const g = el('g', { class: 'turn', transform: 'translate(' + x + ' 223) scale(' + dir + ' 1)', 'aria-label': label }, svg);
        el('path', { d: 'M-22 0L-4 -19V-8H22V8H-4V19Z', fill: 'currentColor', stroke: '#0008', 'stroke-width': 2 }, g);
        return g;
      };
      this.lamps.left = arrow(318, 1, 'Blinker links');
      this.lamps.right = arrow(1282, -1, 'Blinker rechts');

      // Mittendisplay
      el('rect', { x: 658, y: 506, width: 272, height: 82, rx: 8, fill: '#020202', stroke: '#000', 'stroke-width': 2 }, svg);
      const lcd = el('g', { class: 'lcd' }, svg);
      const t = (key, attrs, text) => { this.lcd[key] = el('text', attrs, lcd, text); };
      t('gear', { x: 676, y: 549, 'font-size': 36, 'font-weight': 700 }, '');
      t('odo', { x: 914, y: 547, 'font-size': 30, 'text-anchor': 'end' }, '');
      t('temp', { x: 676, y: 578, 'font-size': 17, class: 'lcd-dim' }, '');
      t('trip', { x: 794, y: 578, 'font-size': 17, 'text-anchor': 'middle', class: 'lcd-dim' }, '');
      t('clock', { x: 914, y: 578, 'font-size': 17, 'text-anchor': 'end', class: 'lcd-dim' }, '');
    }

    _addNeedle(name, rot, spec) {
      const span = spec.max - spec.min;
      this.needles[name] = {
        rot, a0: spec.a0, a1: spec.a1, f: 0, v: 0, target: 0, drawn: null,
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

    setLcd(v) {
      for (const k in v) {
        if (this.lcd[k] && this._lcdLast[k] !== v[k]) {
          this._lcdLast[k] = v[k];
          this.lcd[k].textContent = v[k];
        }
      }
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
      const a = n.a0 + n.f * (n.a1 - n.a0);
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
