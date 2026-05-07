import { Component, signal } from '@angular/core';
import { EventCard } from './event-card';
import { SearchBar } from './search-bar';

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

    <!-- TODO Mod 2: Wrap in @if (events.isLoading()) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- TODO Mod 2: Use @for to iterate over resource -->

      <!-- Static Placeholders for initial verify -->
      <app-event-card
        title="Angular Keynote"
        image="/images/angular-keynote.png"
        date="2025-12-10T09:00:00.000Z"
        (delete)="console.log('Delete Clicked')"
      />
      <app-event-card title="Signals Deep Dive" image="/images/signals-deep-dive.png" />
    </div>
  `,
})
export class EventList {
  readonly console = console;

  searchQuery = signal('');
}
