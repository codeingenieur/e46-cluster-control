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
  if (typeof module !== 'undefined') module.exports = DriveSim;
})(typeof window !== 'undefined' ? window : globalThis);
