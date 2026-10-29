/** Typen für das <e46-jira-cluster>-Element (Web Component, Jira-Variante). Kopiere diese Datei neben e46-jira-cluster.js. */

export interface E46JiraClusterState {
  /** aktive Defects, Nadel 0 bis 50 */ defects: number;
  /** offene Nightrun-Tickets, Nadel 0 bis 20 */ nightrun: number;
  /** Sprint-Restzeit 0 bis 1 */ sprint: number;
  /** Testresults: BAC30 Success in %, 0 bis 100 */ success: number;
  /** Defects closed/Day, 0 bis 20 */ closed: number;
  dim: number;
  ignition: boolean; night: boolean; demo: boolean;
  mil: boolean; lab: boolean; cruise: boolean; oilwarn: boolean; battery: boolean; oilpress: boolean;
  arrk: boolean; tt: boolean;
  door_dev: boolean; door_test: boolean; door_stage: boolean; door_prod: boolean; trunk: boolean; hood: boolean;
  /** true erzwingt die Leuchte; sonst schaltet sie sich bei 50 Defects selbst */ defect: boolean;
  /** true erzwingt die Leuchte; sonst schaltet sie sich bei mehr als 20 Nightrun-Tickets selbst */ nr: boolean;
  turnLeft: boolean; turnRight: boolean; hazard: boolean;
  odometer: number; trip: number; clock: string;
}

export declare class E46JiraClusterElement extends HTMLElement {
  /** Aktive Defects (Drehzahlmesser), 0 bis 100; die Nadel stoppt bei 50, ab 50 leuchtet die Jira-Defect-Leuchte */ defects: number;
  /** Offene Nightrun-Tickets (Füllstandsanzeige ohne Skala), 0 bis 40; ab mehr als 20 leuchtet NR */ nightrun: number;
  /** Sprint-Restzeit 0 bis 1 (Tank). Bei 0 leuchtet die Reserveleuchte, sobald die Nadel dort angekommen ist */ sprint: number;
  /** Testresults: BAC30 Success in %, 0 bis 100 (Tacho) */ success: number;
  /** Defects closed/Day: pro Tag abgearbeitete Defects (kleine Anzeige im Drehzahlmesser), 0 bis 20 */ closed: number;
  /** Helligkeit der Beleuchtung 0 bis 1 */ dim: number;
  /** false: Nadeln auf 0, Lampen aus. true löst den Selbsttest aus. */ ignition: boolean;
  night: boolean;
  /** Demo: überschreibt defects, nightrun, sprint, success, closed */ demo: boolean;
  mil: boolean; lab: boolean; cruise: boolean; oilwarn: boolean; battery: boolean; oilpress: boolean;
  /** arrk-Logo (blau) und TT-Logo (orange), nur Anzeige */ arrk: boolean; tt: boolean;
  /** Auto links vom Display: offene Türen Dev, Test, Staging, Prod (rot), Kofferraum = Release, Haube = Hotfix; in der Demo gehen sie von selbst auf */
  door_dev: boolean; door_test: boolean; door_stage: boolean; door_prod: boolean; trunk: boolean; hood: boolean;
  defect: boolean; nr: boolean;
  turnLeft: boolean; turnRight: boolean; hazard: boolean;
  odometer: number; trip: number;
  /** "HH:MM" oder "auto" (Systemzeit) */ clock: string;
  /** false: kein Selbsttest beim Start */ selftestOnStart: boolean;
  readonly state: E46JiraClusterState;

  set(values: Partial<E46JiraClusterState>): this;
  selftest(): this;
  /** Einen Befehl ausführen, z. B. "SET defects 23 nightrun 7". Antwort: "OK", "ERR …", "STATE …", "PONG …". */
  command(line: string): string;
  /** Mehrere Befehle (je Zeile oder durch ; getrennt), Antworten als Array. */
  commands(text: string): string[];

  addEventListener(type: 'clusterready' | 'clusterchange', listener: (ev: CustomEvent<E46JiraClusterState>) => void, options?: boolean | AddEventListenerOptions): void;
}

declare global {
  interface HTMLElementTagNameMap { 'e46-jira-cluster': E46JiraClusterElement; }
}
