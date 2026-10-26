/* ESP32-Anbindung über Web Serial (Chrome/Edge). Protokoll: docs/usb-interface.md
 *
 *   const link = new Esp32Link({ onStatus: (text, kind) => ... });
 *   await link.connect();            // Port-Dialog, Handshake, CFG wdt
 *   link.sync({ rpm: 3000, ... });   // regelmäßig aufrufen, sendet nur Änderungen
 *   await link.disconnect();         // ZERO, Port schließen
 */
(function (global) {
  'use strict';

  const BAUD = 115200;
  const FILTERS = [0x10c4, 0x1a86, 0x0403, 0x303a].map((usbVendorId) => ({ usbVendorId }));
  const REPLY = new Set(['OK', 'ERR', 'PONG', 'STATE', 'CFG', 'HELP']);
  const WDT_MS = 2000;
  const HEARTBEAT_MS = 1000;
  const POLL_MS = 2000;
  const MAX_PAIRS = 10;   // Firmware erlaubt 11 Paare je SET

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Aus dem App-Zustand die SET-Werte (nur ganze Zahlen) bilden. */
  function quantize(s) {
    const q = (v, step, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v / step) * step));
    return {
      rpm: q(s.rpm, 10, 0, 7000),
      speed: q(s.speed, 1, 0, 240),
      coolant: q(s.coolant, 1, 40, 130),
      oil: q(s.oil, 1, 40, 150),
      ign: s.ign ? 1 : 0,
      mil: s.mil ? 1 : 0,
      cruise: s.cruise ? 1 : 0,
      eml: s.eml ? 1 : 0,
      overheat: s.overheat ? 1 : 0,
      oilwarn: s.oilwarn ? 1 : 0,
      battery: s.battery ? 1 : 0,
      oilpress: s.oilpress ? 1 : 0,
    };
  }

  /** Geänderte Schlüssel in SET-Zeilen mit höchstens MAX_PAIRS Paaren aufteilen. */
  function setLines(want, sent) {
    const pairs = [];
    for (const k in want) if (sent[k] !== want[k]) pairs.push([k, want[k]]);
    const lines = [];
    for (let i = 0; i < pairs.length; i += MAX_PAIRS) {
      lines.push('SET ' + pairs.slice(i, i + MAX_PAIRS).map((p) => p[0] + ' ' + p[1]).join(' '));
    }
    return { lines, pairs };
  }

  class Esp32Link {
    constructor(opts) {
      this.onStatus = (opts && opts.onStatus) || function () {};
      this.port = null;
      this.writer = null;
      this.reader = null;
      this.waiter = null;
      this.queue = Promise.resolve();
      this.sent = {};
      this.busy = false;
      this.lastTx = 0;
      this.lastPoll = 0;
      this.failures = 0;
      this.connected = false;
      this.info = '';
    }

    static supported() { return typeof navigator !== 'undefined' && 'serial' in navigator; }

    async connect() {
      this.port = await navigator.serial.requestPort({ filters: FILTERS });
      await this.port.open({ baudRate: BAUD });
      // Auto-Reset-Schaltung möglichst ruhig halten (nach dem Öffnen, früher geht es im Browser nicht)
      try { await this.port.setSignals({ dataTerminalReady: false, requestToSend: false }); } catch (e) { /* optional */ }

      this.writer = this.port.writable.getWriter();
      this._readLoop();
      this.onStatus('Verbinde …', '');
      try {
        await this._handshake();
        await this._cmd('CFG wdt ' + WDT_MS);
      } catch (e) {
        await this._close();
        throw e;
      }
      this.sent = {};
      this.connected = true;
      this.failures = 0;
      this.lastTx = performance.now();
      this.onStatus('Verbunden: ' + this.info, 'ok');
    }

    async _handshake() {
      // Nach einem Reset antwortet die Firmware etwa 1 s lang nicht, deshalb wiederholen
      for (let i = 0; i < 10; i++) {
        try {
          const r = await this._cmd('PING', 1000);
          if (r.indexOf('PONG') === 0) { this.info = r.slice(5); return; }
        } catch (e) { /* nächster Versuch */ }
        await sleep(300);
      }
      throw new Error('Keine Antwort auf PING. Richtiger Port, Baudrate 115200, Firmware geflasht?');
    }

    async _readLoop() {
      const dec = new TextDecoder();
      let buf = '';
      try {
        while (this.port && this.port.readable) {
          this.reader = this.port.readable.getReader();
          try {
            for (;;) {
              const { value, done } = await this.reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              let i;
              while ((i = buf.indexOf('\n')) >= 0) {
                this._line(buf.slice(0, i).trim());
                buf = buf.slice(i + 1);
              }
            }
          } finally {
            this.reader.releaseLock();
            this.reader = null;
          }
        }
      } catch (e) {
        if (this.connected) this._lost('USB-Verbindung verloren.');
      }
    }

    _line(line) {
      if (!line) return;
      const word = line.split(/\s+/, 1)[0];
      if (REPLY.has(word)) {
        if (this.waiter) { const w = this.waiter; this.waiter = null; w(line); }
        return;
      }
      if (word === 'EVT') this.onStatus('Cluster-Meldung: ' + line.slice(4), 'err');
      // READY, RX und Bootloader-Text werden bewusst ignoriert
    }

    /** Ein Kommando senden und genau eine Antwortzeile abwarten, Kommandos laufen nacheinander. */
    _cmd(line, timeout) {
      const run = () => new Promise((resolve, reject) => {
        const timer = setTimeout(() => { this.waiter = null; reject(new Error('Timeout bei ' + line)); }, timeout || 1000);
        this.waiter = (reply) => { clearTimeout(timer); resolve(reply); };
        this.writer.write(new TextEncoder().encode(line + '\n')).catch((e) => {
          clearTimeout(timer); this.waiter = null; reject(e);
        });
      });
      const p = this.queue.then(run);
      this.queue = p.catch(() => {});
      return p;
    }

    /** Aufrufen, so oft man will: sendet höchstens ein Paket gleichzeitig und nur Änderungen. */
    async sync(state) {
      if (!this.connected || this.busy) return;
      this.busy = true;
      try {
        const want = quantize(state);
        const { lines, pairs } = setLines(want, this.sent);
        for (const l of lines) {
          const r = await this._cmd(l);
          if (r.indexOf('OK') !== 0) throw new Error('Cluster lehnt ab: ' + r);
        }
        pairs.forEach((p) => { this.sent[p[0]] = p[1]; });

        const now = performance.now();
        if (lines.length) this.lastTx = now;
        else if (now - this.lastPoll > POLL_MS) {
          const r = await this._cmd('GET');
          this.lastPoll = this.lastTx = now;
          this._state(r);
        } else if (now - this.lastTx > HEARTBEAT_MS) {
          await this._cmd('PING');
          this.lastTx = now;
        }
        this.failures = 0;
      } catch (e) {
        if (++this.failures >= 3) this._lost(String(e.message || e));
      } finally {
        this.busy = false;
      }
    }

    _state(line) {
      const kv = {};
      line.split(/\s+/).slice(1).forEach((p) => { const i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1); });
      const ok = kv.can === 'running' && Number(kv.tx_fail || 0) === 0;
      this.onStatus('Verbunden: ' + this.info + ' · CAN ' + (kv.can || '?') + ' · gesendet ' + (kv.tx_ok || 0) +
        (kv.tx_fail && kv.tx_fail !== '0' ? ' · Fehler ' + kv.tx_fail : ''), ok ? 'ok' : 'err');
    }

    _lost(msg) {
      this.connected = false;
      this.onStatus(msg + ' Bitte neu verbinden.', 'err');
      this._close();
    }

    async disconnect() {
      if (this.connected) {
        this.connected = false;
        try {
          await this._cmd('ZERO');
          await this._cmd('SET mil 0 cruise 0 eml 0 overheat 0 oilwarn 0 battery 0 oilpress 0');
        } catch (e) { /* Watchdog nullt ohnehin */ }
      }
      await this._close();
      this.onStatus('Getrennt.', '');
    }

    async _close() {
      this.connected = false;
      const port = this.port;
      this.port = null;
      try { if (this.reader) await this.reader.cancel(); } catch (e) { /* egal */ }
      try { if (this.writer) { this.writer.releaseLock(); this.writer = null; } } catch (e) { /* egal */ }
      try { if (port) await port.close(); } catch (e) { /* egal */ }
    }
  }

  Esp32Link._quantize = quantize;
  Esp32Link._setLines = setLines;
  global.Esp32Link = Esp32Link;
  if (typeof module !== 'undefined') module.exports = Esp32Link;
})(typeof window !== 'undefined' ? window : globalThis);
