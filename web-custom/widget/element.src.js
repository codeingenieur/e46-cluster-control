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
  defect: false, nr: false,     // schalten sich über die Werte; true erzwingt die Leuchte
  turnLeft: false, turnRight: false, hazard: false,
};
const LAMPS = ['mil', 'lab', 'cruise', 'oilwarn', 'battery', 'oilpress', 'arrk', 'tt'];   // von Hand schaltbar

// Befehlsschlüssel -> Property. Wo es sie am ESP32 gibt, heißen sie gleich (docs/protocol.md): ign, mil, cruise, oilwarn,
// battery, oilpress. Neu in dieser Variante: defects, nightrun, sprint, success (Testresults statt speed), closed (Defects closed/Day statt fco).
const KEYS = {
  defects: 'defects', nightrun: 'nightrun', sprint: 'sprint',
  success: 'success', closed: 'closed',
  ign: 'ignition', mil: 'mil', cruise: 'cruise', oilwarn: 'oilwarn',
  battery: 'battery', oilpress: 'oilpress',
  lab: 'lab', arrk: 'arrk', tt: 'tt', defect: 'defect', nr: 'nr',
  left: 'turnLeft', right: 'turnRight', hazard: 'hazard', night: 'night', dim: 'dim', demo: 'demo',
  odo: 'odometer', trip: 'trip', clock: 'clock',
};
const ATTRS = Object.keys(NUMBERS).concat(Object.keys(BOOLS), ['odometer', 'trip', 'clock', 'selftest']);

const CSS = '__CSS__';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const toBool = (v) => !(v === false || v === null || v === 'false' || v === '0' || v === 0);

let fontsInjected = false;
function injectFonts() {
  // schon vom Original-Widget gesetzt? Dann nichts doppelt einfügen
  if (fontsInjected || typeof document === 'undefined' || document.querySelector('style[data-e46-cluster-fonts]')) return;
  fontsInjected = true;
  const st = document.createElement('style');
  st.setAttribute('data-e46-cluster-fonts', '');
  st.textContent = '__FONTS__';
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
    LAMPS.forEach((k) => { lit[k] = s.ignition && (all || s[k]); });
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
