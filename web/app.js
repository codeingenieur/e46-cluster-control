(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const cluster = new E46Cluster($('#cluster'));
  const sim = new DriveSim();

  const LAMPS = ['mil', 'eml', 'cruise', 'overheat', 'oilwarn', 'battery', 'oilpress'];
  const state = {
    mode: 'demo',
    ign: true,
    rpm: 0, speed: 0, coolant: 40, oil: 40, fuel: 0.65, fco: 0,
    mil: false, eml: false, cruise: false, overheat: false, oilwarn: false, battery: false, oilpress: false,
    turn: { left: false, right: false, hazard: false },
    odo: 148213, trip: 0,
  };
  let selfTest = null;   // { t } während des Nadelsweeps nach "Zündung an"

  // ---------- Steuerelemente ----------
  const sliders = {
    rpm: ['#s-rpm', '#o-rpm', (v) => Math.round(v) + ' /min'],
    speed: ['#s-speed', '#o-speed', (v) => Math.round(v) + ' km/h'],
    coolant: ['#s-coolant', '#o-coolant', (v) => Math.round(v) + ' °C'],
    oil: ['#s-oil', '#o-oil', (v) => Math.round(v) + ' °C'],
    fco: ['#s-fco', '#o-fco', (v) => v.toFixed(1) + ' L'],
    fuel: ['#s-fuel', '#o-fuel', (v) => Math.round(v * 100) + ' %'],
  };
  Object.keys(sliders).forEach((k) => {
    $(sliders[k][0]).addEventListener('input', (e) => { state[k] = Number(e.target.value); });
  });

  function setMode(mode) {
    state.mode = mode;
    $('#m-demo').setAttribute('aria-pressed', String(mode === 'demo'));
    $('#m-manual').setAttribute('aria-pressed', String(mode === 'manual'));
    Object.keys(sliders).forEach((k) => { $(sliders[k][0]).disabled = mode === 'demo'; });
    if (mode === 'demo') sim.reset();
  }
  $('#m-demo').addEventListener('click', () => setMode('demo'));
  $('#m-manual').addEventListener('click', () => setMode('manual'));

  function toggle(btn, fn) {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      fn(on);
    });
  }
  toggle($('#b-ign'), (on) => {
    state.ign = on;
    cluster.setPower(on);
    selfTest = on ? { t: 0 } : null;
  });
  toggle($('#b-night'), (on) => cluster.setLight({ night: on }));
  $('#s-dim').addEventListener('input', (e) => cluster.setLight({ dim: Number(e.target.value) }));
  document.querySelectorAll('#lamps [data-lamp]').forEach((b) => toggle(b, (on) => { state[b.dataset.lamp] = on; }));
  document.querySelectorAll('#turn [data-turn]').forEach((b) => toggle(b, (on) => { state.turn[b.dataset.turn] = on; }));

  // Vollbild
  const stage = $('#stage');
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen();
  }
  $('#fs').addEventListener('click', fullscreen);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) fullscreen();
  });

  // ---------- ESP32 ----------
  const statusEl = $('#link-status');
  const btnConnect = $('#b-connect'), btnDisconnect = $('#b-disconnect');
  const link = new Esp32Link({
    onStatus: (text, kind) => {
      statusEl.textContent = text;
      statusEl.className = 'link-status' + (kind ? ' ' + kind : '');
      const on = link.connected;
      btnConnect.disabled = on;
      btnDisconnect.disabled = !on;
    },
  });
  if (!Esp32Link.supported()) {
    btnConnect.disabled = true;
    statusEl.textContent = 'Web Serial wird von diesem Browser nicht unterstützt. Chrome oder Edge am Desktop verwenden.';
  }
  btnConnect.addEventListener('click', async () => {
    btnConnect.disabled = true;
    try { await link.connect(); }
    catch (e) {
      if (e && e.name === 'NotFoundError') link.onStatus('Kein Port gewählt.', '');
      else link.onStatus('Verbindung fehlgeschlagen: ' + (e.message || e), 'err');
    }
    btnConnect.disabled = link.connected;
    btnDisconnect.disabled = !link.connected;
  });
  btnDisconnect.addEventListener('click', () => link.disconnect());
  window.addEventListener('pagehide', () => { if (link.connected) link.disconnect(); });

  // Was der ESP32 bekommt: der echte Zustand, ohne Sweep-Animation, bei Zündung aus alles null
  function wire() {
    const o = { ign: state.ign, coolant: state.coolant, oil: state.oil };
    LAMPS.forEach((k) => { o[k] = state.ign && state[k]; });
    o.rpm = state.ign ? state.rpm : 0;
    o.speed = state.ign ? state.speed : 0;
    return o;
  }
  setInterval(() => link.sync(wire()), 50);

  // ---------- Hauptschleife ----------
  let last = performance.now(), uiTimer = 0;

  function gearLabel() {
    if (state.mode === 'demo') return sim.gearLabel;
    if (state.speed < 3) return 'N';
    const ratio = state.rpm / state.speed;   // nächstliegende Gangübersetzung
    let best = 1, err = Infinity;
    DriveSim.RATIOS.forEach((r, i) => {
      const e = Math.abs(Math.log(ratio / (r * DriveSim.RPM_PER_KMH)));
      if (e < err) { err = e; best = i + 1; }
    });
    return err < 0.35 ? String(best) : '–';
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (state.mode === 'demo') {
      sim.update(dt);
      state.rpm = sim.rpm; state.speed = sim.speed;
      state.coolant = sim.coolant; state.oil = sim.oil; state.fuel = sim.fuel; state.fco = sim.fco;
      state.trip = sim.dist;
    } else {
      state.trip += state.speed / 3600 * dt;
    }

    // Anzeigeziele (Zündung aus: Nadeln auf 0; Sweep wie beim echten Kombi)
    let tgt = state.ign
      ? { rpm: state.rpm, speed: state.speed, coolant: state.coolant, fuel: state.fuel, fco: state.fco }
      : { rpm: 0, speed: 0, coolant: 40, fuel: 0, fco: 0 };
    let allLamps = false;
    if (selfTest && state.ign) {
      selfTest.t += dt;
      const t = selfTest.t;
      if (t < 1.1) tgt = { rpm: 7000, speed: 240, coolant: 130, fuel: 1, fco: 20 };
      else if (t < 2.2) tgt = { rpm: 0, speed: 0, coolant: 40, fuel: 0, fco: 0 };
      else selfTest = null;
      allLamps = t < 2.6;
    }
    cluster.set(tgt);
    cluster.frame(dt);

    const lamps = {};
    LAMPS.forEach((k) => { lamps[k] = state.ign && (allLamps || state[k]); });
    cluster.setLamps(lamps);

    const blink = state.turn.hazard;
    cluster.setLamps({ left: state.ign && (state.turn.left || blink), right: state.ign && (state.turn.right || blink) });

    const d = new Date();
    cluster.setLcd({
      temp: '18.5 °C',
      clock: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
      gear: state.ign ? gearLabel() : '',
      odo: String(Math.floor(state.odo + state.trip)) + ' km',
      trip: 'A ' + state.trip.toFixed(1) + ' km',
    });

    // Regler und Zahlenwerte nachziehen, gedrosselt auf 10 Hz
    uiTimer += dt;
    if (uiTimer > 0.1) {
      uiTimer = 0;
      Object.keys(sliders).forEach((k) => {
        if (state.mode === 'demo') $(sliders[k][0]).value = state[k];
        $(sliders[k][1]).textContent = sliders[k][2](state[k]);
      });
    }
    requestAnimationFrame(frame);
  }

  setMode('demo');
  selfTest = { t: 0 };
  requestAnimationFrame(frame);
})();
