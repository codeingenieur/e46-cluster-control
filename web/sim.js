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
      return this;
    }

    get gearLabel() { return this.speed < 3 ? 'N' : String(this.gear); }
  }

  global.DriveSim = DriveSim;
  global.DriveSim.RATIOS = RATIOS;
  global.DriveSim.RPM_PER_KMH = RPM_PER_KMH;
  if (typeof module !== 'undefined') module.exports = DriveSim;
})(typeof window !== 'undefined' ? window : globalThis);
