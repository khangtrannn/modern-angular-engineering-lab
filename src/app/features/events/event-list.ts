import { Component, inject, signal } from '@angular/core';
import { EventCard } from './event-card';
import { SearchBar } from './search-bar';
import { EventsService } from '../../core/events.service';

@Component({
  selector: 'app-event-list',
  imports: [EventCard, SearchBar],
  template: `
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
      <!-- <app-search-bar [(query)]="searchQuery" /> -->
      <app-search-bar [query]="searchQuery()" (queryChange)="searchQuery.set($event)" />
      {{ searchQuery() }}
    </div>

    @if (events.error()) {
      <div class="bg-red-100 text-red-700 p-4 rounded-lg mb-6">Failed to load events</div>
    }

    @if (events.isLoading()) {
      <div class="text-center py-12 text-gray-500 animate-pulse">Loading events...</div>
    }

    @if (events.hasValue()) {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (event of events.value(); track event.id) {
          <app-event-card
            [title]="event.title"
            [image]="event.image"
            [date]="event.date"
            (delete)="deleteEvent(event.id)"
          />
        }
      </div>
    }
  `,
})
export class EventList {
  readonly console = console;
  readonly eventsService = inject(EventsService);

  searchQuery = signal('');

  readonly events = this.eventsService.getEventsResource(this.searchQuery);

  deleteEvent(id: string) {
    this.eventsService.deleteEvent(id).subscribe({
      next: () => {
        this.events.reload();
      },
      error: (err) => {
        console.error('Failed to delete event', err);
        alert('Could not delete event. Please try again later.');
      },
    });
  }
}
