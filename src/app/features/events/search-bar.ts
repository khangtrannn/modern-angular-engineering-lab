import { Component } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  template: `
    <div class="relative mb-6">
      <input
        placeholder="Search events..."
        class="w-full p-4 pl-12 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <span class="absolute left-4 top-4 text-gray-400">🔍</span>
    </div>
  `,
})
export class SearchBar {
  // TODO add model
}
