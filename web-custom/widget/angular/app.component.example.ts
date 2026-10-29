/*
 * Beispiel: Kombi in einer Angular-Seite, gespeist von einem Observable (z. B. aus einem Jira-Service) und von Hand ansteuerbar.
 * In ein Angular-Projekt kopieren, die Datei e46-jira-kombi.component.ts liegt daneben.
 */
import { AsyncPipe } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { interval, startWith, switchMap } from 'rxjs';
import { E46JiraKombiComponent } from './e46-jira-kombi.component';

interface JiraZahlen { defects: number; nightrun: number; sprintRest: number; erfolg: number; closedProTag: number }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [E46JiraKombiComponent, AsyncPipe],
  template: `
    @if (zahlen$ | async; as z) {
      <app-e46-jira-kombi #kombi style="width: 900px"
        [defects]="z.defects" [nightrun]="z.nightrun" [sprint]="z.sprintRest" [success]="z.erfolg" [closed]="z.closedProTag"
        [night]="nacht" (kombiReady)="log($event)">
      </app-e46-jira-kombi>
    }
    <button (click)="nacht = !nacht">Nachtmodus</button>
    <button (click)="chaos()">Chaos</button>
  `,
})
export class AppComponent {
  @ViewChild('kombi') kombi?: E46JiraKombiComponent;
  nacht = false;

  /** Alle 30 s neue Zahlen holen; hier nur ein Platzhalter für den echten Aufruf (HttpClient o. Ä.). */
  zahlen$ = interval(30_000).pipe(
    startWith(0),
    switchMap(() => Promise.resolve<JiraZahlen>({ defects: 31, nightrun: 9, sprintRest: 0.5, erfolg: 87, closedProTag: 8 })),
  );

  log(zustand: unknown): void { console.log('Kombi bereit', zustand); }

  chaos(): void {
    // direkt per Befehl, wie am ESP32; Antwort: "OK"
    this.kombi?.command('SET chaos 1');
    setTimeout(() => this.kombi?.command('SET chaos 0'), 5000);
  }
}
