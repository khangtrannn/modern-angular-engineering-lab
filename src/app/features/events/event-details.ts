import { Component, inject, input } from '@angular/core';
import { EventsService } from '../../core/events.service';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-details',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
      <!-- Back Button -->
      <a routerLink="/" class="text-blue-600 hover:underline mb-6 inline-block">
        ← Back to Events
      </a>

      <!-- Loading State -->
      @if (eventResource.isLoading()) {
        <div class="animate-pulse h-64 bg-gray-100 rounded-lg"></div>
      }

      <!-- Error State -->
      @if (eventResource.error()) {
        <div class="text-red-600 p-4 bg-red-50 rounded">Event not found.</div>
      }

      <!-- Success State -->
      <!-- Always check hasValue() before accessing value() -->
      @if (eventResource.hasValue()) {
        @let event = eventResource.value()!;

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[600px]">
          <!-- Left: Content -->
          <div class="md:col-span-2 space-y-4">
            <h1 class="text-4xl font-bold text-gray-900">{{ event.title }}</h1>
            <p class="text-gray-500 text-lg">
              {{ event.date | date: 'fullDate' }} • {{ event.location }}
            </p>
            <p class="text-gray-700 leading-relaxed text-lg">{{ event.description }}</p>
          </div>

          <!-- Right: Actions -->
          <div class="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
            <div class="h-48 bg-gray-200 rounded mb-4 overflow-hidden">
              <!-- We will optimize this image in Day 2 -->
              <img [src]="event.image" class="w-full h-full object-cover" />
            </div>

            <button
              class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition"
            >
              Buy Tickets
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class EventDetails {
  readonly id = input.required<string>();

  readonly eventsService = inject(EventsService);
  readonly eventResource = this.eventsService.getEventResource(this.id);
}
