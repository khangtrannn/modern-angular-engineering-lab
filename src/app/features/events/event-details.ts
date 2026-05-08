import { Component, inject, input } from '@angular/core';
import { EventsService } from '../../core/events.service';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { VenueMap } from './venue-map';
import { TabGroup } from '../../shared/tabs/tab-group';
import { Tab } from '../../shared/tabs/tab';
import { CartStore } from '../../core/cart.store';

@Component({
  selector: 'app-event-details',
  imports: [DatePipe, RouterLink, VenueMap, NgOptimizedImage, TabGroup, Tab],
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

            <app-tab-group>
              <app-tab label="Overview">
                <p class="text-gray-700 leading-relaxed text-lg">{{ event.description }}</p>
              </app-tab>

              <app-tab label="Venue">
                <p class="mb-4 text-gray-600">Location: {{ event.location }}</p>

                <!-- Move our Defer block from Mod 1 here! -->
                @defer (hydrate on viewport) {
                  <app-venue-map />
                } @placeholder {
                  <div class="h-64 bg-gray-100 flex items-center justify-center">
                    Loading Map...
                  </div>
                }
              </app-tab>

              <app-tab label="Speakers">
                @if (event.speakers.length > 0) {
                  <ul class="space-y-3">
                    @for (speaker of event.speakers; track speaker) {
                      <li class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div
                          class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold"
                        >
                          {{ speaker.charAt(0) }}
                        </div>
                        <span class="text-gray-700 font-medium">{{ speaker }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <div class="p-4 bg-yellow-50 text-yellow-800 rounded">
                    Speaker list coming soon.
                  </div>
                }
              </app-tab>
            </app-tab-group>
          </div>

          <!-- Right: Actions -->
          <div class="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
            <div class="h-48 bg-gray-200 rounded mb-4 overflow-hidden">
              <!-- We will optimize this image in Day 2 -->
              <img
                [ngSrc]="event.image"
                height="200"
                width="200"
                priority
                class="w-full h-full object-cover"
              />
            </div>

            @defer (hydrate on interaction) {
              <button
                class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition"
                (click)="addTicket()"
              >
                @if (cartStore.isPending()) {
                  Processing...
                } @else {
                  Buy Tickets
                }
              </button>
            } @placeholder {
              <button
                class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition"
              >
                Buy Tickets
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class EventDetails {
  readonly id = input.required<string>();

  readonly eventsService = inject(EventsService);

  // readonly cartService = inject(CartService);
  readonly cartStore = inject(CartStore);

  readonly eventResource = this.eventsService.getEventResource(this.id);

  addTicket() {
    // this.cartService.addTicket(this.id());
    this.cartStore.addToCart({ eventId: this.id() });
  }
}
