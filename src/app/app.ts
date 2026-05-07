import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <app-header />
      <main class="flex-grow container mx-auto px-4 py-8">
        <router-outlet />
      </main>
      <footer class="bg-gray-800 text-gray-400 py-6 text-center">
        <p>© 2026 DevFest Manager</p>
      </footer>
    </div>
  `,
})
export class App {}
