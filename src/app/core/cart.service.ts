import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { TICKETS_URL } from './tokens';

interface TicketEntry {
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

  readonly count = computed(() => this.#ticketIds().length);

  constructor() {
    this.#loadTickets();
  }

  addTicket(eventId: string) {
    const previousIds = this.#ticketIds();

    this.#ticketIds.set([...previousIds, eventId]);

    this.#http.post(this.#ticketsUrl, { eventId }).subscribe({
      next: () => console.log('Ticket synced to backend', eventId),
      error: (err) => {
        console.error('Sync failed, reverting state', err);
        this.#ticketIds.set(previousIds);
        alert('Failed to add ticket to cart.');
      },
    });
  }

  #loadTickets() {
    this.#http.get<TicketEntry[]>(this.#ticketsUrl).subscribe({
      next: (data) => {
        const ids = data.map((t) => t.eventId);
        this.#ticketIds.set(ids);
      },
    });
  }
}
