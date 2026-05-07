import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule],
  template: `
    <div class="relative mb-6">
      <!-- <input
        [value]="query()"
        (input)="query.set($event.target.value)"
        placeholder="Search events..."
        class="w-full p-4 pl-12 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
      /> -->
      <input
        [(ngModel)]="query"
        placeholder="Search events..."
        class="w-full p-4 pl-12 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <span class="absolute left-4 top-4 text-gray-400">🔍</span>
    </div>
  `,
})
export class SearchBar {
  query = model('');
}
