/* <e46-cluster>: das Kombiinstrument als Web Component. Wird von build.py mit cluster.js, sim.js, grain.js und den Schriften
 * zu e46-cluster.js zusammengesetzt (E46Cluster, DriveSim und E46_GRAIN sind dort im selben Closure sichtbar).
 *
 * Steuerung: Attribute, Properties, Methoden oder Befehle im Format des ESP32-Protokolls ("SET rpm 3000 speed 80").
 */
const VERSION = '1.0.0';

const NUMBERS = {          // Property: [min, max, Standard]
  rpm: [0, 7000, 0], speed: [0, 260, 0], coolant: [40, 130, 40], oil: [40, 150, 40],
  fuel: [0, 1, 0.65], fco: [0, 20, 0], dim: [0, 1, 0.85],
};
const BOOLS = {            // Property: Standard
  ignition: true, night: false, demo: false,
  mil: false, eml: false, cruise: false, overheat: false, oilwarn: false, battery: false, oilpress: false,
  turnLeft: false, turnRight: false, hazard: false,
};
const LAMPS = ['mil', 'eml', 'cruise', 'overheat', 'oilwarn', 'battery', 'oilpress'];

// Befehlsschlüssel -> Property. Die ersten Schlüssel sind identisch zum ESP32-Protokoll (docs/protocol.md).
const KEYS = {
  rpm: 'rpm', speed: 'speed', coolant: 'coolant', oil: 'oil', fco: 'fco',
  ign: 'ignition', mil: 'mil', cruise: 'cruise', eml: 'eml', overheat: 'overheat', oilwarn: 'oilwarn',
  battery: 'battery', oilpress: 'oilpress',
  // nur im Widget
  fuel: 'fuel', left: 'turnLeft', right: 'turnRight', hazard: 'hazard', night: 'night', dim: 'dim', demo: 'demo',
  odo: 'odometer', trip: 'trip', clock: 'clock',
};
const ATTRS = Object.keys(NUMBERS).concat(Object.keys(BOOLS), ['odometer', 'trip', 'clock', 'selftest']);

const CSS = '__CSS__';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const toBool = (v) => !(v === false || v === null || v === 'false' || v === '0' || v === 0);

let fontsInjected = false;
function injectFonts() {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  const st = document.createElement('style');
  st.setAttribute('data-e46-cluster-fonts', '');
  st.textContent = '__FONTS__';
  document.head.appendChild(st);
}

class E46ClusterElement extends HTMLElement {
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

  /** Mehrere Werte auf einmal setzen: el.set({ rpm: 3000, speed: 80, mil: true }). Unbekannte Schlüssel werfen. */
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

  _startSim() { this._sim = new DriveSim(); }

  // ---------- Selbsttest ----------

  /** Nadelsweep und Lampentest wie beim Einschalten des echten Kombis. */
  selftest() { if (this._s.ignition) this._test = { t: 0 }; return this; }

  // ---------- Befehle ----------

  /**
   * Einen Befehl im Format des ESP32-Protokolls ausführen und die Antwortzeile zurückgeben ("OK", "ERR …", "STATE …").
   * SET k v [k v …], GET, ZERO, PING, SELFTEST, RESET, HELP. Schlüssel: siehe README.
   */
  command(line) {
    const w = String(line).trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '';
    const cmd = w[0].toUpperCase();
    if (cmd === 'PING') return 'PONG e46-cluster-widget ' + VERSION;
    if (cmd === 'HELP') return 'HELP SET k v [k v ...] | GET | ZERO | SELFTEST | RESET | PING | keys: ' + Object.keys(KEYS).join(' ');
    if (cmd === 'GET') {
      const s = this.state, p = [];
      for (const k in KEYS) { const v = s[KEYS[k]]; p.push(k + '=' + (typeof v === 'boolean' ? (v ? 1 : 0) : (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v))); }
      return 'STATE ' + p.join(' ');
    }
    if (cmd === 'ZERO') { this.rpm = 0; this.speed = 0; this.fco = 0; return 'OK'; }
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
      this._sim.update(dt);
      s.rpm = this._sim.rpm; s.speed = this._sim.speed; s.coolant = this._sim.coolant; s.oil = this._sim.oil;
      s.fuel = this._sim.fuel; s.fco = this._sim.fco;
    }
    s.trip += (s.speed / 3600) * dt;
    s.odometer += (s.speed / 3600) * dt;

    let tgt = s.ignition
      ? { rpm: s.rpm, speed: s.speed, coolant: s.coolant, fuel: s.fuel, fco: s.fco }
      : { rpm: 0, speed: 0, coolant: 40, fuel: 0, fco: 0 };
    let all = false;
    if (this._test && s.ignition) {
      this._test.t += dt;
      const t = this._test.t;
      if (t < 1.1) tgt = { rpm: 7000, speed: 240, coolant: 130, fuel: 1, fco: 20 };
      else if (t < 2.2) tgt = { rpm: 0, speed: 0, coolant: 40, fuel: 0, fco: 0 };
      else this._test = null;
      all = t < 2.6;
    }
    c.set(tgt);
    c.frame(dt);

    const lit = {};
    LAMPS.forEach((k) => { lit[k] = s.ignition && (all || s[k]); });
    lit.fuelwarn = s.ignition && (all || s.fuel < 0.1);
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
  Object.defineProperty(E46ClusterElement.prototype, k, {
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
  Object.defineProperty(E46ClusterElement.prototype, k, {
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
  Object.defineProperty(E46ClusterElement.prototype, k, {
    get() { return k === 'odometer' ? Math.floor(this._s.odometer) : this._s.trip; },
    set(v) { v = Number(v); if (Number.isFinite(v) && v >= 0) { this._s[k] = v; this._changed(); } },
    enumerable: true,
  });
});
Object.defineProperty(E46ClusterElement.prototype, 'clock', {
  get() { return this._s.clock; },
  set(v) { this._s.clock = v == null || v === '' ? 'auto' : String(v); this._changed(); },
  enumerable: true,
});
Object.defineProperty(E46ClusterElement.prototype, 'selftestOnStart', {
  get() { return this._s.selftest; }, set(v) { this._s.selftest = toBool(v); },
});

if (!customElements.get('e46-cluster')) customElements.define('e46-cluster', E46ClusterElement);
globalThis.E46ClusterElement = E46ClusterElement;
