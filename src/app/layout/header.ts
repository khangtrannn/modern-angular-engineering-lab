import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../core/cart.service';
import { CartStore } from '../core/cart.store';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="bg-blue-700 text-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <a routerLink="/" class="text-2xl font-bold flex items-center gap-2">
          <span>🎟️</span> DevFest Manager
        </a>
        <nav class="flex gap-6 items-center">
          <a
            routerLink="/"
            routerLinkActive="bg-blue-800 text-white shadow-inner"
            [routerLinkActiveOptions]="{ exact: true }"
            class="px-3 py-2 rounded-md font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
          >
            Events
          </a>
          <a
            routerLink="/admin/create"
            routerLinkActive="bg-blue-800 text-white shadow-inner"
            class="px-3 py-2 rounded-md font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
          >
            Admin
          </a>

          <!-- Day 1 Mod 5: Cart Counter will go here -->
          <button
            class="bg-white text-blue-700 px-4 py-2 rounded-full font-bold shadow hover:bg-gray-100 transition"
          >
            Tickets: {{ count() }}
          </button>
        </nav>
      </div>
    </header>
  `,
})
export class Header {
  // readonly count = inject(CartService).count;
  readonly count = inject(CartStore).count;
}
