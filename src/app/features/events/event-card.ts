import { Component } from '@angular/core';

@Component({
  selector: 'app-event-card',
  template: `
    <div
      class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <!-- TODO: Add Image -->

      <div class="p-6">
        <div class="flex justify-between items-center mt-4">
          <!-- TODO Mod 1: Add Date using DatePipe -->
          <p class="text-sm text-blue-600 font-semibold mb-2">TBA</p>

          <!-- TODO Mod 1: Add daysUntil() using @let -->
          <div
            class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm"
          ></div>
        </div>

        <!-- TODO Mod 1: Add Title Input -->
        <h3 class="text-xl font-bold text-gray-800 my-2">Title Placeholder</h3>

        <div class="flex justify-between items-center mt-4">
          <!-- TODO Mod 1: Add Derived State (Like Button) -->
          <button class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
            ♡ Like
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
  // TODO Mod 1: Implement input(), output(), and model()
}
