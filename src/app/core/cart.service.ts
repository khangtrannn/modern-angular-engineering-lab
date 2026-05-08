import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, exhaustMap, Subject, tap, throwError } from 'rxjs';
import { TICKETS_URL } from './tokens';

export interface TicketEntry {
  id: string;
  eventId: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  #http = inject(HttpClient);
  #ticketsUrl = inject(TICKETS_URL);

  #ticketIds = signal<string[]>([]);

  #addTicket$ = new Subject<string>();

  readonly count = computed(() => this.#ticketIds().length);

  constructor() {
    this.#loadTickets();
    this.#handleAddTicket();
  }

  addTicket(eventId: string) {
    this.#addTicket$.next(eventId);
  }

  #handleAddTicket() {
    this.#addTicket$
      .pipe(
        exhaustMap((eventId) => {
          const previousIds = this.#ticketIds();
          this.#ticketIds.set([...previousIds, eventId]);

          return this.#http.post<TicketEntry>(this.#ticketsUrl, { eventId }).pipe(
            tap(() => console.log('Ticket synced to backend', eventId)),
            catchError((err) => {
              console.error('Sync failed, reverting state', err);
              this.#ticketIds.set(previousIds);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe();
  }

  #loadTickets() {
    this.#http
      .get<TicketEntry[]>(this.#ticketsUrl)
      .pipe(catchError(() => EMPTY))
      .subscribe({
        next: (data) => {
          const ids = data.map((t) => t.eventId);
          this.#ticketIds.set(ids);
        },
      });
  }
}
