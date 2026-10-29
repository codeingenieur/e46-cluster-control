/*
 * Angular-Hülle um <e46-jira-cluster>: Standalone-Komponente mit typisierten Inputs und Outputs.
 *
 * Einbinden: Paket installieren (npm install ./e46-jira-cluster-1.1.0.tgz), diese Datei nach src/app/ kopieren und
 * <app-e46-jira-kombi [defects]="12" [nightrun]="6" [sprint]="0.8"></app-e46-jira-kombi> verwenden.
 * Die Komponente setzt die Properties des Elements, die Bildschleife des Elements läuft an zone.js vorbei (keine Change Detection je Bild).
 */
import {
  AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, EventEmitter, Input, OnChanges, OnInit,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import 'e46-jira-cluster';   // registriert <e46-jira-cluster> (Seiteneffekt)
import type { E46JiraClusterElement, E46JiraClusterState } from 'e46-jira-cluster';

/** Alle Werte, die als Input durchgereicht werden (gleiche Namen wie die Properties des Elements). */
const KEYS: (keyof E46JiraClusterState)[] = [
  'defects', 'nightrun', 'sprint', 'success', 'closed', 'dim',
  'ignition', 'night', 'chaos', 'xmas', 'demo',
  'mil', 'lab', 'cruise', 'oilwarn', 'battery', 'oilpress', 'arrk', 'tt',
  'door_dev', 'door_test', 'door_stage', 'door_prod', 'defect', 'nr',
  'turnLeft', 'turnRight', 'hazard', 'odometer', 'trip', 'clock',
];

@Component({
  selector: 'app-e46-jira-kombi',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<e46-jira-cluster #kombi
    (clusterready)="kombiReady.emit($any($event).detail)"
    (clusterchange)="kombiChange.emit($any($event).detail)"></e46-jira-cluster>`,
  styles: [`:host { display: block; } e46-jira-cluster { display: block; width: 100%; }`],
})
export class E46JiraKombiComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('kombi', { static: true }) private ref!: ElementRef<E46JiraClusterElement>;

  /** Drehzahlmesser: aktive Defects, Nadel 0 bis 50 (ab 50 leuchtet das Defect-Symbol) */ @Input() defects?: number;
  /** Kühlmittel: offene Nightrun-Tickets, Nadel 0 bis 20 (darüber leuchtet NR) */ @Input() nightrun?: number;
  /** Tank: Sprint-Restzeit 0 bis 1 */ @Input() sprint?: number;
  /** Tacho: Testresults, BAC30 Success in %, 0 bis 100 */ @Input() success?: number;
  /** Kleine Anzeige im Drehzahlmesser: Defects closed/Day, 0 bis 20 */ @Input() closed?: number;
  /** Helligkeit 0 bis 1 */ @Input() dim?: number;
  /** false: Nadeln auf 0, Lampen aus; true: Selbsttest */ @Input() ignition?: boolean;
  @Input() night?: boolean;
  /** Chaosmodus */ @Input() chaos?: boolean;
  /** Weihnachtsmodus */ @Input() xmas?: boolean;
  /** Demo-Daten */ @Input() demo?: boolean;
  @Input() mil?: boolean; @Input() lab?: boolean; @Input() cruise?: boolean; @Input() oilwarn?: boolean;
  @Input() battery?: boolean; @Input() oilpress?: boolean; @Input() arrk?: boolean; @Input() tt?: boolean;
  /** Türen des Autos: Dev, Test, Staging, Prod */
  @Input() door_dev?: boolean; @Input() door_test?: boolean; @Input() door_stage?: boolean; @Input() door_prod?: boolean;
  @Input() defect?: boolean; @Input() nr?: boolean;
  @Input() turnLeft?: boolean; @Input() turnRight?: boolean; @Input() hazard?: boolean;
  @Input() odometer?: number; @Input() trip?: number;
  /** "HH:MM" oder "auto" */ @Input() clock?: string;
  /** Mehrere Werte auf einmal, z. B. [values]="{ defects: 23, nightrun: 7 }" */ @Input() values?: Partial<E46JiraClusterState>;

  /** Element ist aufgebaut (Zustand als Wert) */ @Output() kombiReady = new EventEmitter<E46JiraClusterState>();
  /** Werte haben sich geändert (Zustand als Wert) */ @Output() kombiChange = new EventEmitter<E46JiraClusterState>();

  private synced = false;

  /** Das Element selbst, für alles, was die Inputs nicht abdecken. */
  get element(): E46JiraClusterElement { return this.ref.nativeElement; }

  /** Befehl im Stil des ESP32-Protokolls, z. B. command('SET defects 23'). Liefert "OK", "ERR …" oder "STATE …". */
  command(line: string): string { return this.element.command(line); }
  commands(text: string): string[] { return this.element.commands(text); }
  selftest(): void { this.element.selftest(); }

  ngOnInit(): void {
    // erster Abgleich: alle gesetzten Inputs auf einmal, nicht gesetzte behalten die Standardwerte des Elements
    const el = this.element as unknown as Record<string, unknown>;
    for (const k of KEYS) { const v = (this as unknown as Record<string, unknown>)[k]; if (v !== undefined) el[k] = v; }
    if (this.values) this.element.set(this.values);
    this.synced = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.synced) return;   // der erste Abgleich passiert in ngOnInit
    const el = this.element as unknown as Record<string, unknown>;
    for (const k of Object.keys(changes)) {
      const v = changes[k].currentValue;
      if (k === 'values') { if (v) this.element.set(v); }
      else if (v !== undefined) el[k] = v;
    }
  }

  ngAfterViewInit(): void { /* Element steht im DOM, clusterready kommt vom Element selbst */ }
}
