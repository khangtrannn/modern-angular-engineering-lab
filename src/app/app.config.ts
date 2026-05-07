import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { API_URL } from './core/tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    // Day 1: Zone.js enabled. Day 2: switch to provideZonelessChangeDetection()
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    provideHttpClient(withFetch()),

    { provide: API_URL, useValue: 'http://localhost:3000' },
  ],
};
