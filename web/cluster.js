/* E46 Kombiinstrument als SVG. Reine Darstellung, keine Abhängigkeiten.
 *
 *   const c = new E46Cluster(document.getElementById('cluster'));
 *   c.set({ rpm: 3000, speed: 80, coolant: 90, fuel: 0.6 });   // Nadelziele
 *   c.setLamps({ mil: true });                                  // Leuchten
 *   c.setLcd({ gear: '4', odo: 148213 });                       // Mittendisplay
 *   c.frame(dtSekunden);                                        // je requestAnimationFrame
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

  const SWEEP = [-130, 130];   // Hauptinstrumente: 260° Bogen, unten offen
  const LAMP_ORDER = ['mil', 'eml', 'cruise', 'overheat', 'oilwarn', 'battery', 'oilpress'];

  // Piktogramme in einem 40x40-Feld um (0,0)
  const ICONS = {
    mil: '<path d="M-16 -5H-9L-6 -11H6V-6H11L14 -3H19V8H14L11 11H-8L-12 7H-19V-1H-16Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    eml: '<rect x="-18" y="-12" width="36" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">EML</text>',
    cruise: '<path d="M-15 8A18 18 0 1 1 15 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M0 4L9 -9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle r="3.5" cy="4" fill="currentColor"/>',
    overheat: '<path d="M-3.5 -15a3.5 3.5 0 0 1 7 0V2.5a8 8 0 1 1 -7 0Z" fill="none" stroke="currentColor" stroke-width="3" transform="translate(-6 2)"/><path d="M5 -4h10M5 3h10M5 10h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    oilwarn: '<path d="M-17 -2H-6L-2 -9H6V-5H11L19 -11L21 -9L15 -1V8Q15 11 12 11H-12Q-17 11 -17 6Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M-12 16q3 2 6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    battery: '<rect x="-17" y="-7" width="34" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 -7v-5h6v5M5 -7v-5h6v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-11 2.5h7M7.5 -1v7M4 2.5h7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
    oilpress: '<path d="M-17 -4H-6L-2 -11H6V-7H11L19 -13L21 -11L15 -3V6Q15 9 12 9H-12Q-17 9 -17 4Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="-1" cy="15" r="2.6" fill="currentColor"/><path d="M-1 0v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
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

  class E46Cluster {
    constructor(host) {
      this.svg = el('svg', {
        viewBox: '0 0 1600 620', class: 'cluster night', role: 'img',
        'aria-label': 'BMW E46 Kombiinstrument',
      });
      host.appendChild(this.svg);
      this.needles = {};
      this.lamps = {};
      this.lcd = {};
      this._lcdLast = {};
      this._build();
      this.setPower(true);
      this.setLight({ night: true, dim: 0.85 });
    }

    // ---------- Aufbau ----------

    _defs() {
      const d = el('defs', null, this.svg);
      const lin = (id, x1, y1, x2, y2, stops, units) => {
        const g = el('linearGradient', { id, x1, y1, x2, y2, gradientUnits: units || 'objectBoundingBox' }, d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g));
      };
      const rad = (id, stops, extra) => {
        const g = el('radialGradient', Object.assign({ id, cx: '50%', cy: '45%', r: '60%' }, extra || {}), d);
        stops.forEach((s) => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
      };
      lin('gHousing', 0, 0, 0, 1, [[0, '#1b1b1e'], [0.5, '#0e0e10'], [1, '#09090a']]);
      lin('gBezel', 0, 0, 1, 1, [[0, '#8a8d93'], [0.25, '#2a2b2f'], [0.55, '#0d0d0f'], [0.8, '#3a3c41'], [1, '#9a9da3']]);
      rad('gFace', [[0, '#1c1c1f'], [0.7, '#0c0c0e'], [1, '#050506']]);
      rad('gHub', [[0, '#3a3b3f'], [0.55, '#151517'], [1, '#050505']], { cx: '40%', cy: '35%' });
      lin('gNeedle', 0, -255, 0, 50, [[0, '#ff7a30'], [0.6, '#ff4a12'], [1, '#b92a00']], 'userSpaceOnUse');
      lin('gGlass', 0, 0, 0, 1, [[0, '#ffffff', 0.10], [0.7, '#ffffff', 0.015], [1, '#ffffff', 0]]);
      const lcd = el('linearGradient', { id: 'gLcd', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
      el('stop', { offset: 0, 'stop-color': '#050505' }, lcd);
      el('stop', { offset: 1, 'stop-color': '#0b0805' }, lcd);
    }

    _build() {
      const svg = this.svg;
      this._defs();

      // Gehäuse
      el('rect', { x: 8, y: 6, width: 1584, height: 608, rx: 70, fill: 'url(#gHousing)', stroke: '#2b2c30', 'stroke-width': 3 }, svg);
      el('rect', { x: 20, y: 18, width: 1560, height: 584, rx: 60, fill: 'none', stroke: '#000', 'stroke-width': 2, opacity: 0.7 }, svg);

      this._dial({
        name: 'rpm', cx: 385, cy: 310, R: 275, min: 0, max: 7,
        major: 1, mid: 0.5, minor: 0.1, font: 40, redFrom: 6.5,
        label: (v) => String(Math.round(v)), unit: ['1/min', 'x 1000'],
        spring: [320, 0.8], scale: 1000,
      });
      this._dial({
        name: 'speed', cx: 1215, cy: 310, R: 275, min: 0, max: 260,
        major: 20, mid: 10, minor: 5, font: 29, redFrom: Infinity,
        label: (v) => String(Math.round(v)), unit: ['km/h'],
        spring: [110, 1.0],
      });

      // Kühlmittel links im Drehzahlmesser, Tank rechts im Tacho
      this._mini({
        name: 'coolant', cx: 385, cy: 310, r: 168, a0: 212, a1: 148, min: 40, max: 130,
        ticks: [0, 0.25, 0.5, 0.75, 1], redFrom: 0.8, spring: [10, 1.3],
        labels: [['C', 0], ['H', 1]],
      });
      this._mini({
        name: 'fuel', cx: 1215, cy: 310, r: 168, a0: 212, a1: 148, min: 0, max: 1,
        ticks: [0, 0.25, 0.5, 0.75, 1], redTo: 0.12, spring: [6, 1.5],
        labels: [['0', 0], ['1/1', 1]],
      });

      this._center();

      // Glasreflex über beiden Zifferblättern
      [385, 1215].forEach((cx) => {
        const R = 275, cy = 310;
        const a = pol(cx, cy, R, -88), b = pol(cx, cy, R, 88);
        el('path', {
          class: 'glass',
          d: 'M' + a[0] + ' ' + a[1] + 'A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] +
             'Q' + cx + ' ' + (cy - 95) + ' ' + a[0] + ' ' + a[1] + 'Z',
          fill: 'url(#gGlass)',
        }, svg);
      });
    }

    _dial(c) {
      const svg = this.svg;
      const g = el('g', { class: 'dial dial-' + c.name }, svg);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R + 18, fill: 'url(#gBezel)' }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R + 7, fill: '#050506' }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R, fill: 'url(#gFace)' }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: c.R - 1, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.06, 'stroke-width': 2 }, g);

      const ang = (v) => SWEEP[0] + ((v - c.min) / (c.max - c.min)) * (SWEEP[1] - SWEEP[0]);
      const lit = el('g', { class: 'lit' }, g);

      if (isFinite(c.redFrom)) {
        el('path', { class: 'redband', d: arc(c.cx, c.cy, c.R - 8, ang(c.redFrom), SWEEP[1]), fill: 'none' }, lit);
      }

      const ticks = el('g', { class: 'ticks' }, lit);
      const nums = el('g', { class: 'numerals', 'font-size': c.font }, lit);
      const n = Math.round((c.max - c.min) / c.minor);
      const rOut = c.R - 14;
      for (let i = 0; i <= n; i++) {
        const v = c.min + i * c.minor;
        const q = (step) => Math.abs((v - c.min) / step - Math.round((v - c.min) / step)) < 1e-6;
        const kind = q(c.major) ? 'major' : q(c.mid) ? 'mid' : 'minor';
        const len = kind === 'major' ? 32 : kind === 'mid' ? 22 : 12;
        const a = ang(v);
        const p0 = pol(c.cx, c.cy, rOut, a), p1 = pol(c.cx, c.cy, rOut - len, a);
        el('line', {
          class: 'tick ' + kind + (v >= c.redFrom - 1e-9 ? ' red' : ''),
          x1: p0[0].toFixed(2), y1: p0[1].toFixed(2), x2: p1[0].toFixed(2), y2: p1[1].toFixed(2),
        }, ticks);
        if (kind === 'major') {
          // Abstand so wählen, dass die Zahl (je nach Winkel breit oder hoch) den Strich nicht berührt
          const txt = c.label(v), rad = (a * Math.PI) / 180;
          const ext = Math.abs(Math.sin(rad)) * txt.length * 0.28 * c.font + Math.abs(Math.cos(rad)) * 0.36 * c.font;
          const t = pol(c.cx, c.cy, rOut - 32 - 12 - ext, a);
          el('text', {
            class: v >= c.redFrom - 1e-9 ? 'red' : '',
            x: t[0].toFixed(2), y: t[1].toFixed(2), dy: '.35em', 'text-anchor': 'middle',
          }, nums, txt);
        }
      }
      c.unit.forEach((u, i) => {
        el('text', {
          class: 'unit', x: c.cx, y: c.cy + 108 + i * 30, 'text-anchor': 'middle',
          'font-size': i === 0 ? 26 : 20,
        }, lit, u);
      });

      // Nadel
      const wrap = el('g', { class: 'needle-wrap', transform: 'translate(' + c.cx + ' ' + c.cy + ')' }, g);
      const rot = el('g', null, wrap);
      el('path', { class: 'needle-shape', d: 'M-4.2 48L-2.3 0L-0.9 -252L0.9 -252L2.3 0L4.2 48Z', fill: 'url(#gNeedle)' }, rot);
      el('circle', { cx: c.cx, cy: c.cy, r: 36, fill: 'url(#gHub)', stroke: '#6b6e75', 'stroke-width': 2 }, g);
      el('circle', { cx: c.cx, cy: c.cy, r: 12, fill: '#0a0a0b', stroke: '#2a2b2f', 'stroke-width': 2 }, g);

      const u = c.scale || 1;   // Nadelwerte in echten Einheiten (U/min), Beschriftung in Tausend
      this._addNeedle(c.name, rot, c.min * u, c.max * u, SWEEP[0], SWEEP[1], c.spring);
    }

    _mini(c) {
      const g = el('g', { class: 'mini mini-' + c.name }, this.svg);
      const lit = el('g', { class: 'lit' }, g);
      const aLo = Math.min(c.a0, c.a1), aHi = Math.max(c.a0, c.a1);
      el('path', { class: 'mini-arc', d: arc(c.cx, c.cy, c.r, aLo, aHi), fill: 'none' }, lit);
      const ang = (f) => c.a0 + f * (c.a1 - c.a0);
      if (c.redFrom != null) el('path', { class: 'mini-red', d: arc(c.cx, c.cy, c.r, Math.min(ang(c.redFrom), ang(1)), Math.max(ang(c.redFrom), ang(1))), fill: 'none' }, lit);
      if (c.redTo != null) el('path', { class: 'mini-red', d: arc(c.cx, c.cy, c.r, Math.min(ang(0), ang(c.redTo)), Math.max(ang(0), ang(c.redTo))), fill: 'none' }, lit);
      c.ticks.forEach((f) => {
        const p0 = pol(c.cx, c.cy, c.r + 11, ang(f)), p1 = pol(c.cx, c.cy, c.r - 11, ang(f));
        el('line', { class: 'tick mid', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, lit);
      });
      const nums = el('g', { class: 'numerals', 'font-size': 20 }, lit);
      c.labels.forEach((l) => {
        const p = pol(c.cx, c.cy, c.r - 32, ang(l[1]));
        el('text', { x: p[0], y: p[1], dy: '.35em', 'text-anchor': 'middle' }, nums, l[0]);
      });
      // Piktogramm unter dem Bogen
      const icon = el('g', { class: 'unit-icon', transform: 'translate(' + c.cx + ' ' + (c.cy + 215) + ') scale(.9)' }, lit);
      icon.innerHTML = c.name === 'coolant' ? ICONS.overheat :
        '<path d="M-9 14V-12a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V14M-12 14H11M-3 -9h8v8h-8zM8 -6l6 3v12a3 3 0 0 0 6 0V-6l-4-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

      const wrap = el('g', { class: 'needle-wrap mini-needle', transform: 'translate(' + c.cx + ' ' + c.cy + ')' }, g);
      const rot = el('g', null, wrap);
      el('path', { class: 'needle-shape', d: 'M-2.6 -' + (c.r - 22) + 'L0 -' + (c.r - 14) + 'L2.6 -' + (c.r - 22) + 'L1.6 -' + (c.r + 20) + 'L-1.6 -' + (c.r + 20) + 'Z', fill: '#ff5a1c' }, rot);
      this._addNeedle(c.name, rot, c.min, c.max, c.a0, c.a1, c.spring);
    }

    _center() {
      const svg = this.svg;
      // Leuchtenfeld
      const lamps = el('g', { class: 'lamps' }, svg);
      const xs = [722, 774, 826, 878];
      LAMP_ORDER.forEach((id, i) => {
        const row = i < 4 ? 0 : 1;
        const x = i < 4 ? xs[i] : xs[i - 4] + 26;
        const m = LAMP_META[id];
        const g = el('g', { class: 'lamp ' + m[0], transform: 'translate(' + x + ' ' + (178 + row * 62) + ') scale(.95)' }, lamps);
        el('title', null, g, m[1]);
        g.insertAdjacentHTML('beforeend', ICONS[id]);
        this.lamps[id] = g;
      });
      // Blinker
      const arrow = (x, dir) => {
        const g = el('g', { class: 'lamp green turn', transform: 'translate(' + x + ' 112) scale(' + dir + ' 1)' }, svg);
        el('path', { d: 'M-17 0L-3 -15V-6H15V6H-3V15Z', fill: 'currentColor' }, g);
        return g;
      };
      this.lamps.left = arrow(740, 1);
      this.lamps.right = arrow(860, -1);
      this.lamps.left.setAttribute('aria-label', 'Blinker links');
      this.lamps.right.setAttribute('aria-label', 'Blinker rechts');

      // Mittendisplay
      const lcd = el('g', { class: 'lcd' }, svg);
      el('rect', { x: 702, y: 292, width: 196, height: 250, rx: 14, fill: 'url(#gLcd)', stroke: '#26272b', 'stroke-width': 3 }, lcd);
      const t = (key, attrs, text) => { this.lcd[key] = el('text', attrs, lcd, text); };
      t('temp', { x: 716, y: 326, 'font-size': 22 }, '');
      t('clock', { x: 884, y: 326, 'font-size': 22, 'text-anchor': 'end' }, '');
      el('line', { x1: 714, y1: 342, x2: 886, y2: 342, class: 'lcd-rule' }, lcd);
      t('gear', { x: 800, y: 428, 'font-size': 78, 'text-anchor': 'middle', 'font-weight': 700 }, '');
      el('text', { x: 800, y: 454, 'font-size': 14, 'text-anchor': 'middle', class: 'lcd-dim' }, lcd, 'GANG');
      t('odo', { x: 800, y: 496, 'font-size': 26, 'text-anchor': 'middle' }, '');
      t('trip', { x: 800, y: 526, 'font-size': 18, 'text-anchor': 'middle', class: 'lcd-dim' }, '');
    }

    _addNeedle(name, rot, min, max, a0, a1, spring) {
      const k = spring[0], zeta = spring[1];
      this.needles[name] = {
        rot, min, max, a0, a1, k, c: 2 * zeta * Math.sqrt(k),
        f: 0, v: 0, target: 0, drawn: null,
      };
      this._draw(this.needles[name]);
    }

    // ---------- Bedienung ----------

    /** Nadelziele setzen: { rpm, speed, coolant, fuel } in Anzeigeeinheiten (fuel 0..1) */
    set(values) {
      for (const k in values) {
        const n = this.needles[k];
        if (n && isFinite(values[k])) n.target = clamp01((values[k] - n.min) / (n.max - n.min));
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
      this.svg.style.setProperty('--lit', String(night ? 0.45 + 0.55 * dim : 0.8 + 0.2 * dim));
      this.svg.style.setProperty('--glow', String(night ? dim : 0.12));
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
