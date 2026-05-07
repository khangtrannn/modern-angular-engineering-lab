import { Component, computed, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-event-card',
  template: `
    <div
      class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div class="relative h-48 w-full bg-gray-200">
        <img
          [src]="image()"
          class="object-cover w-full h-full max-h-full max-w-full"
          alt="Event thumbnail"
        />
      </div>

      <div class="p-6">
        <div class="flex justify-between items-center mt-4">
          <!-- TODO Mod 1: Add Date using DatePipe -->
          <p class="text-sm text-blue-600 font-semibold mb-2">TBA</p>

          @let days = daysUntil();
          @if (days !== null) {
            <div
              class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm"
            >
              {{ days }}
            </div>
          }
        </div>

        <h3 class="text-xl font-bold text-gray-800 my-2">{{ title() }}</h3>

        <div class="flex justify-between items-center mt-4">
          <button
            class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            [class.text-red-500]="isFavorite()"
            (click)="toggleFavorite()"
          >
            <span>{{ isFavorite() ? '♥' : '♡' }}</span> Like
          </button>

          <!-- TODO Mod 1: Add Output -->
          <button class="text-gray-400 text-sm hover:text-gray-600 cursor-pointer">Remove</button>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100 text-right">
          <a class="text-blue-600 font-medium hover:underline cursor-pointer"> View Details → </a>
        </div>
      </div>
    </div>
  `,
})
export class EventCard {
  title = input.required<string>();
  image = input.required<string>();
  date = input<string>();
  initialLike = input(false);

  isFavorite = linkedSignal(() => this.initialLike());

  daysUntil = computed(() => {
    const eventDate = this.date();
    if (!eventDate) return null;

    const today = new Date();
    const eventDay = new Date(eventDate);
    const diffTime = eventDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `In ${diffDays} days` : diffDays < 0 ? 'Past Event' : 'Happening Now!';
  });

  toggleFavorite() {
    this.isFavorite.set(!this.isFavorite());
  }
}
