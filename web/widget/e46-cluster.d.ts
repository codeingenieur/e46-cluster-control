/** Typen für das <e46-cluster>-Element (Web Component). Kopiere diese Datei neben e46-cluster.js. */

export interface E46ClusterState {
  rpm: number; speed: number; coolant: number; oil: number; fuel: number; fco: number; dim: number;
  ignition: boolean; night: boolean; demo: boolean;
  mil: boolean; lab: boolean; cruise: boolean; overheat: boolean; oilwarn: boolean; battery: boolean; oilpress: boolean;
  arrk: boolean; tt: boolean; defect: boolean;
  turnLeft: boolean; turnRight: boolean; hazard: boolean;
  odometer: number; trip: number; clock: string;
}

export declare class E46ClusterElement extends HTMLElement {
  /** U/min, 0 bis 7000 */ rpm: number;
  /** km/h, 0 bis 260 (der ESP32 begrenzt auf 240) */ speed: number;
  /** °C, 40 bis 130 */ coolant: number;
  /** °C, 40 bis 150 (nur Anzeige im Widget) */ oil: number;
  /** Tankinhalt 0 bis 1. Bei 0 leuchtet die Reserveleuchte, sobald die Nadel dort angekommen ist */ fuel: number;
  /** Momentanverbrauch L/100 km, 0 bis 20 */ fco: number;
  /** Helligkeit der Beleuchtung 0 bis 1 */ dim: number;
  /** false: Nadeln auf 0, Lampen aus, Display dunkel. true löst den Selbsttest aus. */ ignition: boolean;
  night: boolean;
  /** Demo-Fahrt: überschreibt rpm, speed, coolant, oil, fuel, fco */ demo: boolean;
  /** lab: Labor-Leuchte (roter Erlenmeyerkolben, Kontur). Der ESP32-Schlüssel eml gilt im Widget als Alias dafür. */
  mil: boolean; lab: boolean; cruise: boolean; overheat: boolean; oilwarn: boolean; battery: boolean; oilpress: boolean;
  /** arrk-Logo (blau), TT-Logo (orange) und Jira-Defect-Symbol (rotes Quadrat mit ausgestanztem Kreis) als Leuchten, nur Anzeige */
  arrk: boolean; tt: boolean; defect: boolean;
  turnLeft: boolean; turnRight: boolean; hazard: boolean;
  odometer: number; trip: number;
  /** "HH:MM" oder "auto" (Systemzeit) */ clock: string;
  /** false: kein Selbsttest beim Start */ selftestOnStart: boolean;
  readonly state: E46ClusterState;

  set(values: Partial<E46ClusterState>): this;
  selftest(): this;
  /** Einen Befehl ausführen, z. B. "SET rpm 3000 speed 80". Antwort: "OK", "ERR …", "STATE …", "PONG …". */
  command(line: string): string;
  /** Mehrere Befehle (je Zeile oder durch ; getrennt), Antworten als Array. */
  commands(text: string): string[];

  addEventListener(type: 'clusterready' | 'clusterchange', listener: (ev: CustomEvent<E46ClusterState>) => void, options?: boolean | AddEventListenerOptions): void;
}

declare global {
  interface HTMLElementTagNameMap { 'e46-cluster': E46ClusterElement; }
}
