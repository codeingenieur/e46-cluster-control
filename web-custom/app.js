(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const cluster = new E46Cluster($('#cluster'));
  const drive = new DriveSim();       // nur noch für die Wegstrecke im Mittendisplay
  const tickets = new TicketSim();    // Defects, Nightrun, Sprint

  // Von Hand schaltbare Leuchten. NR und Jira Defect schalten sich über die Werte.
  const LAMPS = ['mil', 'lab', 'cruise', 'oilwarn', 'battery', 'oilpress', 'arrk', 'tt', 'door_dev', 'door_test', 'door_stage', 'door_prod'];
  const MAX_DEFECTS = 50, MAX_NIGHTRUN = 20;
  const state = {
    mode: 'demo',
    ign: true,
    defects: 0, nightrun: 0, sprint: 0.65, success: 0, closed: 0,
    mil: false, lab: false, cruise: false, oilwarn: false, battery: false, oilpress: false,
    arrk: false, tt: false,
    door_dev: false, door_test: false, door_stage: false, door_prod: false,
    turn: { left: false, right: false, hazard: false },
    odo: 148213, trip: 0,
  };
  let selfTest = null;   // { t } während des Nadelsweeps nach "Zündung an"

  // ---------- Steuerelemente ----------
  const sliders = {
    defects: ['#s-defects', '#o-defects', (v) => Math.round(v) + ' Defects'],
    success: ['#s-success', '#o-success', (v) => Math.round(v) + ' %'],
    nightrun: ['#s-nightrun', '#o-nightrun', (v) => Math.round(v) + ' Tickets'],
    closed: ['#s-closed', '#o-closed', (v) => v.toFixed(1) + ' / Tag'],
    sprint: ['#s-sprint', '#o-sprint', (v) => Math.round(v * 100) + ' %'],
  };
  Object.keys(sliders).forEach((k) => {
    $(sliders[k][0]).addEventListener('input', (e) => { state[k] = Number(e.target.value); });
  });

  function setMode(mode) {
    state.mode = mode;
    $('#m-demo').setAttribute('aria-pressed', String(mode === 'demo'));
    $('#m-manual').setAttribute('aria-pressed', String(mode === 'manual'));
    Object.keys(sliders).forEach((k) => { $(sliders[k][0]).disabled = mode === 'demo'; });
    if (mode === 'demo') { drive.reset(); tickets.reset(); }
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

  // ---------- Warnleuchten über die Werte ----------
  // Erst wenn die Nadel am Anschlag angekommen ist (nicht schon beim Zielwert), wie bei der Tankleuchte.
  const defectLampOn = () => state.ign && state.defects >= MAX_DEFECTS && cluster.needles.rpm.f >= 0.985;
  const nrLampOn = () => state.ign && state.nightrun > MAX_NIGHTRUN && cluster.needles.coolant.f >= 0.985;

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

  // Kühlmittel-Nadelstellung (Anteil 0..1) zurück in °C, damit die Nadel des echten Kombis genauso steht wie hier
  const COOLANT = [[40, 0], [60, 0.2], [80, 0.44], [100, 0.56], [115, 0.78], [130, 1]];
  function coolantFor(f) {
    f = Math.min(1, Math.max(0, f));
    for (let i = 1; i < COOLANT.length; i++) {
      if (f <= COOLANT[i][1]) {
        const a = COOLANT[i - 1], b = COOLANT[i];
        return a[0] + ((f - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
      }
    }
    return 130;
  }

  // Was der ESP32 bekommt: Nadelstellungen als Drehzahl und Kühlmittel, bei Zündung aus alles null
  function wire() {
    const o = { ign: state.ign, oil: 90 };
    ['mil', 'cruise', 'oilwarn', 'battery', 'oilpress'].forEach((k) => { o[k] = state.ign && state[k]; });
    o.overheat = nrLampOn();
    o.rpm = state.ign ? (Math.min(state.defects, MAX_DEFECTS) / MAX_DEFECTS) * 7000 : 0;
    o.coolant = state.ign ? coolantFor(state.nightrun / MAX_NIGHTRUN) : 40;
    o.speed = state.ign ? 30 + state.success * 2 : 0;   // 0..100 % entspricht den km/h-Strichen 30..230 (gleiche Nadelstellung wie hier)
    return o;
  }
  setInterval(() => link.sync(wire()), 50);

  // ---------- Hauptschleife ----------
  let last = performance.now(), uiTimer = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (state.mode === 'demo') {
      drive.update(dt); tickets.update(dt);
      state.success = tickets.success; state.closed = tickets.closed; state.trip = drive.dist;   // Fahrsimulation läuft nur noch für die Wegstrecke
      state.defects = tickets.defects; state.nightrun = tickets.nightrun; state.sprint = tickets.sprint;
    }

    // Anzeigeziele (Zündung aus: Nadeln auf 0; Sweep wie beim echten Kombi). Needle-Namen im Zifferblatt: rpm = Defects, coolant = Nightrun, fuel = Sprint, speed = Testresults
    let tgt = state.ign
      ? { rpm: state.defects, speed: state.success, coolant: state.nightrun, fuel: state.sprint, fco: state.closed }
      : { rpm: 0, speed: 0, coolant: 0, fuel: 0, fco: 0 };
    let allLamps = false;
    if (selfTest && state.ign) {
      selfTest.t += dt;
      const t = selfTest.t;
      if (t < 1.1) tgt = { rpm: MAX_DEFECTS, speed: 100, coolant: MAX_NIGHTRUN, fuel: 1, fco: 20 };
      else if (t < 2.2) tgt = { rpm: 0, speed: 0, coolant: 0, fuel: 0, fco: 0 };
      else selfTest = null;
      allLamps = t < 2.6;
    }
    cluster.set(tgt);
    cluster.frame(dt);

    const lamps = {};
    // Türen: von Hand oder, in der Demo, aus den Demo-Daten
    LAMPS.forEach((k) => { lamps[k] = state.ign && (allLamps || state[k] || (state.mode === 'demo' && !!tickets.doors[k])); });
    lamps.defect = allLamps || defectLampOn();
    lamps.nr = allLamps || nrLampOn();
    // Tankleuchte: erst wenn die Sprint-Restzeit leer ist und die Nadel wirklich auf 0 angekommen ist
    lamps.fuelwarn = state.ign && (allLamps || (state.sprint <= 0.02 && cluster.needles.fuel.f <= 0.012));
    cluster.setLamps(lamps);

    const blink = state.turn.hazard;
    cluster.setLamps({ left: state.ign && (state.turn.left || blink), right: state.ign && (state.turn.right || blink) });

    const d = new Date();
    cluster.setLcd({
      odo: String(Math.floor(state.odo + state.trip)).padStart(6, '0'),
      trip: state.trip.toFixed(1),
      clock: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
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
